import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Classified {
  id: string;
  title: string;
  category: string;
  description: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  price: number | null;
  location: string | null;
  photo_1_url: string | null;
  photo_2_url: string | null;
  photo_3_url: string | null;
  created_at: string;
  expires_at: string | null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const category = url.searchParams.get('category');
    const search = url.searchParams.get('search');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
    const offset = parseInt(url.searchParams.get('offset') || '0');

    console.log('Fetching classifieds with params:', { category, hasSearch: !!search, limit, offset });

    // Build query
    let query = supabase
      .from('classifieds')
      .select('*', { count: 'exact' })
      .eq('status', 'approved')
      .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString());

    // Apply filters
    if (category) {
      query = query.eq('category', category);
    }

    if (search) {
      // Escape special ILIKE pattern characters to prevent SQL injection
      const escapedSearch = search
        .slice(0, 100) // Limit search length
        .replace(/[%_\\]/g, '\\$&');
      query = query.or(`title.ilike.%${escapedSearch}%,description.ilike.%${escapedSearch}%`);
    }

    // Apply pagination and ordering
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching classifieds:', error);
      throw error;
    }

    console.log(`Successfully fetched ${data?.length} classifieds`);

    // Format response
    const formattedData = data.map((item: Classified) => ({
      id: item.id,
      title: item.title,
      category: item.category,
      description: item.description,
      contact_name: item.contact_name,
      contact_email: item.contact_email,
      contact_phone: item.contact_phone,
      price: item.price,
      location: item.location,
      photos: [item.photo_1_url, item.photo_2_url, item.photo_3_url].filter(Boolean),
      created_at: item.created_at,
      expires_at: item.expires_at,
    }));

    const response = {
      success: true,
      data: formattedData,
      total: count || 0,
      page: Math.floor(offset / limit) + 1,
      limit,
      offset,
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    console.error('Error in public-classifieds function:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
