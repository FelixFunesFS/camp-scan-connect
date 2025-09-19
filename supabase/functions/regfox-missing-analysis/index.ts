import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RegFoxRegistrant {
  id: string;
  displayId: string;
  orderId?: string;
  formId: string;
  status: string;
  amount: number;
  fieldData: Array<{
    label: string;
    path: string;
    value: string;
  }>;
  dateCreated: string;
  dateUpdated: string;
}

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

    const { providedRegfoxIds } = await req.json();
    
    if (!providedRegfoxIds || !Array.isArray(providedRegfoxIds)) {
      throw new Error('providedRegfoxIds array is required');
    }

    console.log(`Analyzing ${providedRegfoxIds.length} provided RegFox IDs...`);

    // Get current attendees from database
    const { data: dbAttendees, error: dbError } = await supabase
      .from('attendees')
      .select('regfox_id, order_id, first_name, last_name, email')
      .not('regfox_id', 'is', null);

    if (dbError) {
      throw new Error(`Database query error: ${dbError.message}`);
    }

    const dbRegfoxIds = new Set(dbAttendees?.map(a => a.regfox_id) || []);
    const providedIds = new Set(providedRegfoxIds.map(id => id.toString()));

    // Find missing IDs
    const missingFromDb = Array.from(providedIds).filter(id => !dbRegfoxIds.has(id));
    const extraInDb = Array.from(dbRegfoxIds).filter(id => !providedIds.has(id));

    console.log(`Found ${missingFromDb.length} IDs missing from database`);
    console.log(`Found ${extraInDb.length} extra IDs in database`);

    // Fetch details for missing IDs from RegFox API
    const missingDetails = [];
    let allRegfoxData: RegFoxRegistrant[] = [];
    
    if (missingFromDb.length > 0) {
      console.log('Fetching missing registration details from RegFox...');
      
      // Fetch registrants in batches
      let page = 1;
      const limit = 100;
      
      while (true) {
        const requestUrl = `https://api.webconnex.com/v2/public/search/registrants?product=regfox.com&formId=${encodeURIComponent(regfoxFormId)}&limit=${limit}&page=${page}&sort=desc`;
        
        const response = await fetch(requestUrl, {
          headers: {
            'apiKey': regfoxApiKey,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          console.error(`RegFox API error: ${response.status} ${response.statusText}`);
          break;
        }

        const regfoxData = await response.json();
        
        if (!regfoxData.data || regfoxData.data.length === 0) {
          break;
        }

        allRegfoxData = allRegfoxData.concat(regfoxData.data);
        
        // If we got less than the limit, we're done
        if (regfoxData.data.length < limit) {
          break;
        }
        
        page++;
        
        // Safety break to avoid infinite loops
        if (page > 50) {
          console.warn('Reached maximum page limit (50)');
          break;
        }
      }

      console.log(`Fetched ${allRegfoxData.length} total registrants from RegFox`);

      // Filter to only the missing ones and extract details
      for (const registrant of allRegfoxData) {
        if (missingFromDb.includes(registrant.id.toString())) {
          const firstName = registrant.fieldData?.find(f => 
            f.label?.toLowerCase().includes('first name') || 
            f.path?.toLowerCase().includes('firstname')
          )?.value || '';
          
          const lastName = registrant.fieldData?.find(f => 
            f.label?.toLowerCase().includes('last name') || 
            f.path?.toLowerCase().includes('lastname')
          )?.value || '';
          
          const email = registrant.fieldData?.find(f => 
            f.label?.toLowerCase().includes('email') || 
            f.path?.toLowerCase().includes('email')
          )?.value || '';

          const phone = registrant.fieldData?.find(f => 
            f.label?.toLowerCase().includes('phone') || 
            f.path?.toLowerCase().includes('phone')
          )?.value || '';

          missingDetails.push({
            regfox_id: registrant.id,
            display_id: registrant.displayId,
            order_id: registrant.orderId || null,
            first_name: firstName,
            last_name: lastName,
            email: email,
            phone: phone,
            status: registrant.status,
            amount: registrant.amount,
            date_created: registrant.dateCreated,
            date_updated: registrant.dateUpdated
          });
        }
      }
    }

    // Group missing registrations by order ID
    const missingByOrder = {};
    missingDetails.forEach(reg => {
      const orderId = reg.order_id || 'NO_ORDER';
      if (!missingByOrder[orderId]) {
        missingByOrder[orderId] = [];
      }
      missingByOrder[orderId].push(reg);
    });

    // Get order statistics
    const orderStats = Object.keys(missingByOrder).map(orderId => ({
      order_id: orderId,
      missing_count: missingByOrder[orderId].length,
      registrants: missingByOrder[orderId]
    }));

    return new Response(JSON.stringify({
      success: true,
      analysis: {
        provided_count: providedIds.size,
        database_count: dbRegfoxIds.size,
        missing_from_db_count: missingFromDb.length,
        extra_in_db_count: extraInDb.length,
        missing_from_db: missingFromDb,
        extra_in_db: extraInDb,
        missing_details: missingDetails,
        missing_by_order: orderStats,
        total_fetched_from_regfox: allRegfoxData.length
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in regfox-missing-analysis function:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});