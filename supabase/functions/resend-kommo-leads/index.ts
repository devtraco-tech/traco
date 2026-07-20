import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

async function sendLeadToKommo(lead: {
  name: string;
  email: string;
  phone?: string | null;
  courseTitle: string;
}): Promise<string | null> {
  const subdomain = Deno.env.get('KOMMO_SUBDOMAIN');
  const accessToken = Deno.env.get('KOMMO_ACCESS_TOKEN');
  if (!subdomain || !accessToken) {
    throw new Error('Kommo credentials not configured');
  }

  const kommoUrl = `https://${subdomain}.kommo.com/api/v4/leads/complex`;
  const payload = [{
    name: `Lead via API - Curso: ${lead.courseTitle}`,
    price: 0,
    pipeline_id: 10883891,
    status_id: 83466699,
    custom_fields_values: [
      { field_id: 997134, values: [{ value: lead.courseTitle }] }
    ],
    _embedded: {
      tags: [{ name: "SITE ABO" }],
      contacts: [{
        name: lead.name,
        custom_fields_values: [
          { field_id: 263916, values: [{ value: lead.email, enum_code: "WORK" }] },
          ...(lead.phone ? [{ field_id: 263914, values: [{ value: lead.phone, enum_code: "MOB" }] }] : [])
        ]
      }]
    }
  }];

  const response = await fetch(kommoUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify(payload)
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(`Kommo API error ${response.status}: ${JSON.stringify(result)}`);
  }

  // Scan response for first numeric id
  const scanForId = (obj: any): any => {
    if (!obj) return undefined;
    if (typeof obj === 'number' || (typeof obj === 'string' && /^[0-9]+$/.test(obj))) return obj;
    if (Array.isArray(obj)) {
      for (const item of obj) {
        const id = scanForId(item);
        if (id) return id;
      }
    }
    if (typeof obj === 'object') {
      for (const k of Object.keys(obj)) {
        const id = scanForId(obj[k]);
        if (id) return id;
      }
    }
    return undefined;
  };
  const found = scanForId(result);
  return found ? String(found) : null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Require authenticated admin caller
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { data: roleRow } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userData.user.id)
      .eq('role', 'admin')
      .maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(req.url);
    const sinceParam = url.searchParams.get('since') || '2026-04-08';
    const dryRun = url.searchParams.get('dry_run') === 'true';

    const { data: leads, error } = await supabase
      .from('course_leads')
      .select('id, name, email, phone, course_id, created_at, courses(title)')
      .is('kommo_lead_id', null)
      .gte('created_at', sinceParam)
      .order('created_at', { ascending: true });

    if (error) throw error;

    console.log(`Found ${leads?.length ?? 0} pending leads since ${sinceParam} (dry_run=${dryRun})`);

    const results: any[] = [];
    let success = 0;
    let failed = 0;

    for (const lead of (leads || [])) {
      const courseTitle = (lead as any).courses?.title || 'Curso';
      if (dryRun) {
        // Avoid leaking PII in dry-run output
        results.push({ id: lead.id, course_id: lead.course_id, dry_run: true });
        continue;
      }

      try {
        const kommoId = await sendLeadToKommo({
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          courseTitle,
        });

        if (kommoId) {
          await supabase.from('course_leads').update({ kommo_lead_id: kommoId }).eq('id', lead.id);
        }
        results.push({ id: lead.id, name: lead.name, kommo_lead_id: kommoId, status: 'sent' });
        success++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`Failed to resend lead ${lead.id}:`, msg);
        results.push({ id: lead.id, name: lead.name, status: 'failed', error: msg });
        failed++;
      }

      // Rate-limit delay between Kommo calls
      await new Promise((r) => setTimeout(r, 350));
    }

    return new Response(
      JSON.stringify({ success: true, total: leads?.length ?? 0, sent: success, failed, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal error';
    console.error('resend-kommo-leads error:', msg);
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
