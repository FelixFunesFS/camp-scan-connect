import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

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
    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { batch_size = 100 } = await req.json();

    console.log(`Starting bulk RFID generation for up to ${batch_size} attendees...`);

    // Call the bulk generation function
    const { data, error } = await supabase.rpc('bulk_generate_mock_rfids', {
      p_limit: batch_size
    });

    if (error) {
      console.error('Error generating mock RFIDs:', error);
      throw error;
    }

    console.log(`Generated ${data?.length || 0} mock RFID tags`);

    // Get current statistics
    const { data: stats } = await supabase
      .from('attendees')
      .select(`
        id,
        rfid_tags!inner(uid, status)
      `);

    const totalWithRfids = stats?.length || 0;

    // Get total attendee count
    const { count: totalAttendees } = await supabase
      .from('attendees')
      .select('*', { count: 'exact', head: true });

    return new Response(JSON.stringify({
      success: true,
      generated_count: data?.length || 0,
      generated_rfids: data || [],
      statistics: {
        total_attendees: totalAttendees || 0,
        attendees_with_rfids: totalWithRfids,
        attendees_without_rfids: (totalAttendees || 0) - totalWithRfids
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in bulk-generate-rfids function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});