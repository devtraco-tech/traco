import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-wp-nonce, x-requested-with',
  'Cache-Control': 'public, max-age=60',
};

// Pre-initialize Supabase clients at module level for faster cold starts
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

// Function to send lead to Kommo CRM
async function sendLeadToKommo(lead: {
  name: string;
  email: string;
  phone?: string;
  cpf?: string;
  notes?: string;
  courseTitle: string;
  courseId: string;
  localLeadId?: string;
}, supabaseClient?: any) {
  const subdomain = Deno.env.get('KOMMO_SUBDOMAIN');
  const accessToken = Deno.env.get('KOMMO_ACCESS_TOKEN');
  
  if (!subdomain || !accessToken) {
    console.log('Kommo credentials not configured, skipping CRM integration');
    return null;
  }
  
  const kommoUrl = `https://${subdomain}.kommo.com/api/v4/leads/complex`;
  
  const payload = [{
    name: `Lead via API - Curso: ${lead.courseTitle}`,
    price: 0,
    pipeline_id: 10883891,
    status_id: 83466699,
    custom_fields_values: [
      {
        field_id: 997134,
        values: [{ value: lead.courseTitle }]
      }
    ],
    _embedded: {
      tags: [{ name: "SITE ABO" }],
      contacts: [{
        name: lead.name,
        custom_fields_values: [
          {
            field_id: 263916,
            values: [{ value: lead.email, enum_code: "WORK" }]
          },
          ...(lead.phone ? [{
            field_id: 263914,
            values: [{ value: lead.phone, enum_code: "MOB" }]
          }] : [])
        ]
      }]
    }
  }];
  
  // Log sem PII - apenas metadados estruturais
  console.log('Sending lead to Kommo:', { pipelineId: payload[0].pipeline_id, courseTitle: lead.courseTitle });
  
  try {
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
      console.error('Kommo API error:', result);
      throw new Error(`Kommo API error: ${response.status}`);
    }
    
    console.log('Lead created in Kommo successfully:', result);
    let kommoLeadId: string | undefined;
    try {
      // Kommo may return various structures; look for first numeric id
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
      if (found) kommoLeadId = String(found);
    } catch (err) {
      console.warn('Error scanning Kommo response for lead id:', err);
    }

    // Update the local database row with kommo_lead_id, if a supabase client and lead id exist
    if (kommoLeadId && supabaseClient && lead && typeof (lead as any).localLeadId !== 'undefined') {
      try {
        await supabaseClient
          .from('course_leads')
          .update({ kommo_lead_id: kommoLeadId })
          .eq('id', (lead as any).localLeadId);
      } catch (err) {
        console.error('Failed to update course_leads with kommo_lead_id:', err);
      }
    }

    return result;
  } catch (error) {
    console.error('Failed to send lead to Kommo:', error);
    throw error;
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests - respond immediately
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders 
    });
  }

  try {
    // Use pre-initialized credentials for faster response
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const path = url.pathname;
    console.log('Request received:', req.method, path);

    // GET /wordpress-courses - Get published courses
    if (req.method === 'GET' && path.includes('/wordpress-courses')) {
      const upcomingOnly = url.searchParams.get('upcoming') === 'true';
      const filterArea = url.searchParams.get('area');
      const filterModality = url.searchParams.get('modality');
      const filterTargetAudience = url.searchParams.get('target_audience');
      const getFilters = url.searchParams.get('filters') === 'true';
      
      console.log('Fetching published courses for WordPress', {
        upcomingOnly,
        filterArea,
        filterModality,
        filterTargetAudience,
        getFilters
      });

      // Build query (use service role to bypass RLS for public endpoint - filtered by status)
      let query = supabaseService
        .from('courses')
        .select(`
          id,
          title,
          slug,
          area,
          description,
          prerequisites,
          differentials,
          program,
          workload,
          investment,
          investment_details,
          vacancies,
          language,
          modality,
          target_audience,
          suggested_start_date,
          effective_start_date,
          registration_deadline,
          end_date,
          duration,
          periodicity,
          photo_1_url,
          photo_2_url,
          photo_3_url,
          photo_4_url,
          teacher_id,
          other_professors,
          status,
          installment_suggestion,
          effective_installment,
          currency,
          display_status,
          teachers (
            id,
            name,
            bio,
            photo_url
          )
        `)
        .in('status', ['approved', 'in_progress']);

      // Apply filters
      if (filterArea) {
        query = query.eq('area', filterArea);
      }
      if (filterModality) {
        query = query.eq('modality', filterModality);
      }
      if (filterTargetAudience) {
        query = query.eq('target_audience', filterTargetAudience);
      }

      // Filter for upcoming courses if requested
      if (upcomingOnly) {
        const today = new Date().toISOString().split('T')[0];
        query = query
          .not('effective_start_date', 'is', null)
          .gte('effective_start_date', today)
          .order('effective_start_date', { ascending: true })
          .limit(20);
      } else {
        query = query.order('created_at', { ascending: false });
      }

      const { data: courses, error: coursesError } = await query;

      if (coursesError) {
        console.error('Error fetching courses:', coursesError);
        throw coursesError;
      }

      // Calculate available vacancies for each course and add public URL
      const baseUrl = 'https://abogoias.lovable.app';
      const coursesWithVacancies = await Promise.all(
        (courses || []).map(async (course: any) => {
          const { count } = await supabaseService
            .from('course_registrations')
            .select('*', { count: 'exact', head: true })
            .eq('course_id', course.id)
            .eq('status', 'active');

          const occupiedVacancies = count || 0;
          const availableVacancies = Math.max(0, course.vacancies - occupiedVacancies);
          const courseSlug = course.slug || course.id;
          const publicUrl = `${baseUrl}/curso/${courseSlug}`;

          return {
            ...course,
            occupied_vacancies: occupiedVacancies,
            available_vacancies: availableVacancies,
            public_url: publicUrl,
            seo: {
              title: `${course.title} | ABO Goiás`,
              description: course.description?.substring(0, 160) || `Curso de ${course.area}`,
              image: course.photo_1_url,
              url: publicUrl,
            },
          };
        })
      );

      // Get filter options if requested
      let filterOptions = null;
      if (getFilters) {
        // Get all approved courses for filter options
        const { data: allCourses } = await supabaseService
          .from('courses')
          .select('area, modality, target_audience')
          .in('status', ['approved', 'in_progress']);

        if (allCourses) {
          const areas = [...new Set(allCourses.map(c => c.area).filter(Boolean))].sort();
          const modalities = [...new Set(allCourses.map(c => c.modality).filter(Boolean))].sort();
          const targetAudiences = [...new Set(allCourses.map(c => c.target_audience).filter(Boolean))];

          // Fixed modalities - always return these 3 options
          filterOptions = {
            areas,
            modalities: modalities.map(value => ({
              value,
              label: value === 'presencial' ? 'Presencial' :
                     value === 'online' ? 'Online' :
                     value === 'hibrido' ? 'Híbrido' : value
            })),
            targetAudiences: targetAudiences.map(t => ({
              value: t,
              label: t === 'cirurgioes_dentistas' ? 'Cirurgiões-Dentistas' :
                     t === 'tecnicos' ? 'Técnicos' :
                     t === 'auxiliares' ? 'Auxiliares' :
                     t === 'estudantes' ? 'Estudantes' : 'Outros'
            }))
          };
        }
      }

      console.log(`Successfully fetched ${coursesWithVacancies.length} courses`);

      return new Response(
        JSON.stringify({
          success: true,
          data: coursesWithVacancies,
          ...(filterOptions && { filters: filterOptions }),
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // POST /wordpress-courses/leads OR POST /wordpress-courses - Create a new lead
    if (req.method === 'POST' && path.includes('/wordpress-courses')) {
      console.log('Received lead submission from WordPress');

      const body = await req.json();
      const { course_id, name, email, phone, cpf, notes } = body;

      // Validate required fields
      if (!course_id || !name || !email) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'course_id, name, and email are required',
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Invalid email format',
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Check if course exists
      const { data: course, error: courseError } = await supabaseService
        .from('courses')
        .select('id, title')
        .eq('id', course_id)
        .single();

      if (courseError || !course) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Course not found',
          }),
          {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Insert lead using service role to bypass RLS
      const { data: lead, error: leadError } = await supabaseService
        .from('course_leads')
        .insert({
          course_id,
          name: name.trim(),
          email: email.toLowerCase().trim(),
          phone: phone?.trim() || null,
          cpf: cpf?.trim() || null,
          notes: notes?.trim() || null,
          source: 'wordpress',
          status: 'pending',
        })
        .select()
        .single();

      if (leadError) {
        console.error('Error creating lead:', leadError);
        throw leadError;
      }

      console.log(`Lead created successfully: ${lead.id}`);

      // Send confirmation email to the lead (non-blocking)
      const sendConfirmationEmail = async () => {
        try {
          const response = await fetch(
            `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-lead-confirmation`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
              },
              body: JSON.stringify({
                lead_id: lead.id,
                lead_name: name.trim(),
                lead_email: email.toLowerCase().trim(),
                course_id: course_id
              })
            }
          );
          const result = await response.json();
          console.log('Lead confirmation email result:', result);
        } catch (emailError) {
          console.error('Failed to send lead confirmation email:', emailError);
        }
      };
      
      // Fire and forget the confirmation email
      sendConfirmationEmail();

      // Send lead to Kommo CRM in background (non-blocking)
      const _backgroundPromise = sendLeadToKommo({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        phone: phone?.trim(),
        cpf: cpf?.trim(),
        notes: notes?.trim(),
        courseTitle: course.title,
        courseId: course_id,
        localLeadId: lead.id
      }, supabaseService);

      // Schedule background promise with runtime waitUntil if available
      try {
        const runtime: any = (globalThis as any);
        if (runtime && typeof runtime.waitUntil === 'function') {
          runtime.waitUntil(_backgroundPromise);
        } else if (runtime && runtime.EdgeRuntime && typeof runtime.EdgeRuntime.waitUntil === 'function') {
          runtime.EdgeRuntime.waitUntil(_backgroundPromise);
        } else {
          // best-effort background execution without waiting
          _backgroundPromise.catch(err => console.error('Failed to send lead to Kommo (non-critical):', err));
        }
      } catch (err) {
        // if scheduling fails, still ensure we log promise errors
        _backgroundPromise.catch(error => console.error('Failed to send lead to Kommo (non-critical):', error));
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Pre-registration submitted successfully',
          data: {
            id: lead.id,
            course_title: course.title,
          },
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Route not found
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Route not found',
      }),
      {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
