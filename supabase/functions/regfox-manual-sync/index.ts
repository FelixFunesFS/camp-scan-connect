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

    console.log('Manual RegFox sync triggered');

    // Call the main regfox-sync function
    const syncResponse = await supabase.functions.invoke('regfox-sync', {
      body: {}
    });

    console.log('Sync response:', syncResponse);

    if (syncResponse.error) {
      console.error('Sync function error details:', syncResponse.error);
      throw new Error(`Sync function error: ${syncResponse.error.message}`);
    }

    if (!syncResponse.data) {
      throw new Error('Sync function returned no data');
    }

    console.log('Manual sync completed:', syncResponse.data);

    return new Response(JSON.stringify({
      success: true,
      message: 'Manual sync completed successfully',
      data: syncResponse.data
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in regfox-manual-sync function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});