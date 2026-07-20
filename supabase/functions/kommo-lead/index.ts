import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LeadData {
  name: string;
  email: string;
  phone?: string;
  cpf?: string;
  notes?: string;
  courseTitle: string;
  courseId: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const leadData: LeadData = await req.json();
    console.log('=== KOMMO LEAD FUNCTION STARTED ===');
    // Log sem PII - apenas metadados
    console.log('Received lead data:', { 
      courseId: leadData.courseId,
      courseTitle: leadData.courseTitle,
      hasEmail: !!leadData.email,
      hasPhone: !!leadData.phone,
      hasCpf: !!leadData.cpf
    });

    const kommoToken = Deno.env.get('KOMMO_API_TOKEN');
    if (!kommoToken) {
      throw new Error('KOMMO_API_TOKEN not configured');
    }

    // Prepare custom fields for contact
    const contactCustomFields = [];
    
    // Email field (field_id: 263916)
    if (leadData.email) {
      contactCustomFields.push({
        field_id: 263916,
        values: [{
          value: leadData.email,
          enum_code: "WORK"
        }]
      });
    }

    // Phone field (field_id: 263914)
    if (leadData.phone) {
      // Remove non-numeric characters and format phone
      const cleanPhone = leadData.phone.replace(/\D/g, '');
      contactCustomFields.push({
        field_id: 263914,
        values: [{
          value: cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`,
          enum_code: "MOB"
        }]
      });
    }

    // Prepare the lead payload for Kommo API
    const kommoPayload = [
      {
        name: `Lead via Site - Curso: ${leadData.courseTitle}`,
        price: 0,
        pipeline_id: 10883891,
        status_id: 83466699,
        custom_fields_values: [
          {
            field_id: 997134,
            values: [{
              value: leadData.courseTitle
            }]
          }
        ],
        _embedded: {
          tags: [{
            name: "SITE ABO"
          }],
          contacts: [{
            name: leadData.name,
            custom_fields_values: contactCustomFields
          }]
        }
      }
    ];

    // CPF and notes will be available in the lead data but not sent as custom fields
    // since the notes field (263918) is not configured in Kommo

    console.log('Sending to Kommo API...');
    // Log sem PII - apenas estrutura
    console.log('Kommo payload structure:', { 
      pipelineId: kommoPayload[0].pipeline_id,
      statusId: kommoPayload[0].status_id,
      hasContact: !!kommoPayload[0]._embedded?.contacts?.length
    });

    // Send to Kommo API
    const kommoResponse = await fetch('https://cursosabogoiasorgbr.kommo.com/api/v4/leads/complex', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'authorization': `Bearer ${kommoToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(kommoPayload),
    });

    if (!kommoResponse.ok) {
      const errorText = await kommoResponse.text();
      console.error('=== KOMMO API ERROR ===');
      console.error('Status:', kommoResponse.status);
      console.error('Response:', errorText);
      throw new Error(`Kommo API error: ${kommoResponse.status} - ${errorText}`);
    }

    const kommoData = await kommoResponse.json();
    console.log('=== LEAD CREATED SUCCESSFULLY ===');
    console.log('Kommo response:', JSON.stringify(kommoData, null, 2));

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Lead enviado com sucesso!',
        kommoData 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in kommo-lead function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
