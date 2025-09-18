import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const regfoxApiKey = Deno.env.get('REGFOX_API_KEY');
    const regfoxFormId = Deno.env.get('REGFOX_FORM_ID');

    if (!regfoxApiKey || !regfoxFormId) {
      throw new Error('RegFox API key and Form ID are required');
    }

    console.log('Fetching RegFox data to debug ID fields...');

    // Fetch a small sample of RegFox data using the correct API endpoint
    const requestUrl = `https://api.webconnex.com/v2/public/search/registrants?product=regfox.com&formId=${encodeURIComponent(regfoxFormId)}&limit=10&sort=asc`;
    
    console.log('Making RegFox API call to:', requestUrl);
    
    const response = await fetch(requestUrl, {
      headers: {
        'apiKey': regfoxApiKey,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('RegFox API error response:', errorText);
      throw new Error(`RegFox API error: ${response.status} ${response.statusText}`);
    }

    const regfoxData = await response.json();
    
    console.log('RegFox API Response Structure:');
    console.log('Total registrants:', regfoxData.data?.length || 0);
    
    if (regfoxData.data && regfoxData.data.length > 0) {
      const firstRegistrant = regfoxData.data[0];
      
      console.log('\n=== FIRST REGISTRANT ID FIELDS ===');
      console.log('id:', firstRegistrant.id);
      console.log('displayId:', firstRegistrant.displayId);
      console.log('orderId:', firstRegistrant.orderId);
      console.log('formId:', firstRegistrant.formId);
      console.log('status:', firstRegistrant.status);
      console.log('amount:', firstRegistrant.amount);
      
      // Look for Bernard Hunter specifically
      const bernard = regfoxData.data.find((r: any) => {
        const fields = r.fieldData || [];
        const firstName = fields.find((f: any) => f.label?.includes('First Name') || f.path?.includes('firstName'))?.value || '';
        const lastName = fields.find((f: any) => f.label?.includes('Last Name') || f.path?.includes('lastName'))?.value || '';
        return firstName.toLowerCase().includes('bernard') && lastName.toLowerCase().includes('hunter');
      });
      
      if (bernard) {
        console.log('\n=== BERNARD HUNTER ID FIELDS ===');
        console.log('id:', bernard.id);
        console.log('displayId:', bernard.displayId);
        console.log('orderId:', bernard.orderId);
        console.log('formId:', bernard.formId);
        console.log('status:', bernard.status);
        console.log('amount:', bernard.amount);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Debug data logged to console',
      sampleData: regfoxData.data?.[0] ? {
        id: regfoxData.data[0].id,
        displayId: regfoxData.data[0].displayId,
        orderId: regfoxData.data[0].orderId,
      } : null
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in regfox-debug-ids function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});