import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const PIXEL_ID = "863086442771786";
const FB_API_VERSION = "v21.0";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const accessToken = Deno.env.get('FB_CAPI_ACCESS_TOKEN');
    if (!accessToken) {
      throw new Error('FB_CAPI_ACCESS_TOKEN is not configured');
    }

    const { event_name, event_time, event_source_url, user_data, custom_data, action_source } = await req.json();

    if (!event_name) {
      throw new Error('event_name is required');
    }

    const eventPayload = {
      data: [
        {
          event_name,
          event_time: event_time || Math.floor(Date.now() / 1000),
          event_source_url: event_source_url || undefined,
          action_source: action_source || "website",
          user_data: user_data || {},
          custom_data: custom_data || {},
        },
      ],
    };

    const url = `https://graph.facebook.com/${FB_API_VERSION}/${PIXEL_ID}/events?access_token=${accessToken}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventPayload),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Facebook CAPI error:', JSON.stringify(result));
      throw new Error(`Facebook API error [${response.status}]: ${JSON.stringify(result)}`);
    }

    console.log('Facebook CAPI event sent:', event_name, JSON.stringify(result));

    return new Response(JSON.stringify({ success: true, result }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('FB CAPI error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
