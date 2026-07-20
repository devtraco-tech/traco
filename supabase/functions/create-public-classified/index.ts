import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Only accept POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ success: false, error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json();
    // Log sem PII - apenas metadados
    console.log('Received classified submission:', { 
      category: body.category, 
      hasTitle: !!body.title,
      hasPhotos: !!(body.photo_1_url || body.photo_2_url || body.photo_3_url)
    });

    const {
      title,
      category,
      description,
      contact_name,
      contact_email,
      contact_phone,
      price,
      location,
      photo_1_url,
      photo_2_url,
      photo_3_url,
    } = body;

    // Validate required fields
    if (!title || title.trim().length < 5) {
      return new Response(
        JSON.stringify({ success: false, error: 'Título deve ter no mínimo 5 caracteres' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!category) {
      return new Response(
        JSON.stringify({ success: false, error: 'Categoria é obrigatória' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!description || description.trim().length < 20) {
      return new Response(
        JSON.stringify({ success: false, error: 'Descrição deve ter no mínimo 20 caracteres' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!contact_name || contact_name.trim().length < 3) {
      return new Response(
        JSON.stringify({ success: false, error: 'Nome para contato é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!contact_email || !emailRegex.test(contact_email)) {
      return new Response(
        JSON.stringify({ success: false, error: 'E-mail inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate expiration date (30 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Insert classified using service role (bypass RLS)
    const { data: classified, error } = await supabaseService
      .from('classifieds')
      .insert({
        title: title.trim(),
        category,
        description: description.trim(),
        contact_name: contact_name.trim(),
        contact_email: contact_email.toLowerCase().trim(),
        contact_phone: contact_phone?.trim() || null,
        price: price ? parseFloat(price) : null,
        location: location?.trim() || null,
        photo_1_url: photo_1_url || null,
        photo_2_url: photo_2_url || null,
        photo_3_url: photo_3_url || null,
        status: 'pending_approval',
        created_by: null, // Anonymous submission
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating classified:', error);
      throw error;
    }

    console.log('Classified created successfully:', classified.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Anúncio enviado para aprovação com sucesso!',
        data: { id: classified.id },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
