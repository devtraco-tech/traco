import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BASE_URL = 'https://abogoias.lovable.app';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all approved/in_progress courses
    const { data: courses, error } = await supabase
      .from('courses')
      .select('slug, updated_at')
      .in('status', ['approved', 'in_progress'])
      .eq('is_archived', false)
      .not('slug', 'is', null);

    if (error) {
      console.error('Error fetching courses:', error);
      throw error;
    }

    const today = new Date().toISOString().split('T')[0];

    // Build sitemap XML
    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${BASE_URL}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${BASE_URL}/cursos</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>`;

    // Add each course
    if (courses && courses.length > 0) {
      for (const course of courses) {
        const lastmod = course.updated_at 
          ? new Date(course.updated_at).toISOString().split('T')[0]
          : today;
        
        sitemap += `
  <url>
    <loc>${BASE_URL}/curso/${course.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
      }
    }

    sitemap += `
</urlset>`;

    console.log(`Sitemap generated with ${courses?.length || 0} courses`);

    return new Response(sitemap, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Error generating sitemap:', error);
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${BASE_URL}/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <priority>1.0</priority>
  </url>
</urlset>`,
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/xml; charset=utf-8',
        },
      }
    );
  }
});
