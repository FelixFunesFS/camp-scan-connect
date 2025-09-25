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

    console.log('Scheduled RegFox sync triggered');

    // Check if a sync is already in progress
    const { data: canStart } = await supabase.rpc('can_start_sync');
    
    if (!canStart) {
      console.log('Sync already in progress, skipping scheduled sync');
      return new Response(JSON.stringify({
        success: true,
        message: 'Sync already in progress, skipping scheduled sync',
        skipped: true
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Trigger the API sync function with scheduled flag
    const { data: syncResponse, error: syncError } = await supabase.functions.invoke('regfox-sync', {
      body: { 
        scheduled_sync: true,
        sync_type: 'scheduled'
      }
    });

    if (syncError) {
      console.error('Error triggering scheduled sync:', syncError);
      return new Response(JSON.stringify({
        success: false,
        error: `Failed to trigger scheduled sync: ${syncError.message}`
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Scheduled sync triggered successfully:', syncResponse);
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Scheduled sync triggered successfully',
      sync_response: syncResponse
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Scheduled sync error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: `Scheduled sync failed: ${(error as Error).message}`
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});