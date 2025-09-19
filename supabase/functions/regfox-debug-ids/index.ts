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

    console.log('Fetching comprehensive RegFox data for analysis...');
    
    // Fetch multiple pages to get more comprehensive data
    const allRegistrants: any[] = [];
    let page = 1;
    const limit = 100;
    
    while (allRegistrants.length < 500 && page <= 5) { // Limit to 5 pages max
      console.log(`Fetching page ${page}...`);
      
      const requestUrl = `https://api.webconnex.com/v2/public/search/registrants?product=regfox.com&formId=${encodeURIComponent(regfoxFormId)}&limit=${limit}&page=${page}&sort=asc`;
      
      const response = await fetch(requestUrl, {
        headers: {
          'apiKey': regfoxApiKey,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('RegFox API error response:', errorText);
        break;
      }

      const regfoxData = await response.json();
      
      if (!regfoxData.data || regfoxData.data.length === 0) {
        console.log('No more data found, stopping pagination');
        break;
      }
      
      allRegistrants.push(...regfoxData.data);
      page++;
      
      // Small delay to be respectful to the API
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`Fetched ${allRegistrants.length} registrants total`);
    
    // Analyze order ID patterns
    const orderIdPatterns: { [key: string]: { count: number; examples: string[] } } = {};
    const registrantIdSamples: string[] = [];
    
    allRegistrants.forEach((registrant) => {
      // Collect registrant ID samples
      if (registrant.id && registrantIdSamples.length < 20) {
        registrantIdSamples.push(registrant.id);
      }
      
      // Analyze order ID patterns
      if (registrant.orderId) {
        const range = registrant.orderId.toString().substring(0, 2) + 'M';
        if (!orderIdPatterns[range]) {
          orderIdPatterns[range] = { count: 0, examples: [] };
        }
        orderIdPatterns[range].count++;
        if (orderIdPatterns[range].examples.length < 5) {
          orderIdPatterns[range].examples.push(registrant.orderId.toString());
        }
      }
    });
    
    // Log analysis results
    console.log('Order ID Patterns Found:', orderIdPatterns);
    console.log('Registrant ID Samples:', registrantIdSamples.slice(0, 10));
    
    // Log first few registrants' key fields
    const sampleAnalysis = allRegistrants.slice(0, 5).map(reg => ({
      id: reg.id,
      displayId: reg.displayId,
      orderId: reg.orderId,
      formId: reg.formId,
      status: reg.status,
      createdAt: reg.createdAt
    }));
    
    console.log('Sample Registrant Analysis:', sampleAnalysis);

    // Look for Bernard Hunter specifically
    const bernard = allRegistrants.find((r: any) => {
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
    }

    return new Response(JSON.stringify({
      success: true,
      totalFetched: allRegistrants.length,
      orderIdPatterns,
      registrantIdSamples: registrantIdSamples.slice(0, 10),
      sampleAnalysis,
      sampleData: allRegistrants.slice(0, 10)
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