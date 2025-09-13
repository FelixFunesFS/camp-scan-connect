import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RegFoxAttendee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  registrationPath: string;
  registrationDate: string;
  status: string;
}

interface SyncResult {
  totalRecords: number;
  newRecords: number;
  updatedRecords: number;
  errors: string[];
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

    // Get RegFox API key
    const regfoxApiKey = Deno.env.get('REGFOX_API_KEY');
    if (!regfoxApiKey) {
      throw new Error('RegFox API key not configured');
    }

    console.log('Starting RegFox sync...');

    // Create sync log entry
    const { data: syncLog, error: syncLogError } = await supabase
      .from('regfox_sync_log')
      .insert({
        sync_type: 'initial_sync',
        status: 'in_progress',
        sync_started_at: new Date().toISOString()
      })
      .select()
      .single();

    if (syncLogError) {
      console.error('Error creating sync log:', syncLogError);
      throw syncLogError;
    }

    const syncResult: SyncResult = {
      totalRecords: 0,
      newRecords: 0,
      updatedRecords: 0,
      errors: []
    };

    try {
      // Fetch attendees from RegFox API
      console.log('Fetching attendees from RegFox API...');
      
      let regfoxAttendees: RegFoxAttendee[] = [];
      
      try {
        // Make API call to WebConnex (RegFox)
        const regfoxResponse = await fetch(`https://api.webconnex.com/v2/public/search/registrants?product=redpodium.com2&pretty=true&apiKey=${regfoxApiKey}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (!regfoxResponse.ok) {
          throw new Error(`RegFox API error: ${regfoxResponse.status} ${regfoxResponse.statusText}`);
        }

        const responseData = await regfoxResponse.json();
        console.log('RegFox API response received:', { count: responseData?.data?.length || 0 });
        
        // Handle RegFox API response format
        regfoxAttendees = responseData.data || [];
        
        // Validate data format
        if (!Array.isArray(regfoxAttendees)) {
          throw new Error('Invalid RegFox API response format: expected array of attendees');
        }
        
      } catch (apiError) {
        console.error('RegFox API call failed:', apiError.message);
        
        // For now, if RegFox API fails, log the error but don't fail the sync
        // This allows the function to work during development/testing
        syncResult.errors.push(`RegFox API error: ${apiError.message}`);
        regfoxAttendees = []; // Empty array means no new data to sync
      }

      syncResult.totalRecords = regfoxAttendees.length;
      console.log(`Processing ${syncResult.totalRecords} attendees from RegFox`);

      // Process each attendee from RegFox
      for (const regfoxAttendee of regfoxAttendees) {
        try {
          // Map RegFox ticket type to our enum
          const ticketTypeMap: Record<string, string> = {
            'Premium Power Site': 'premium_power',
            'Dry Site': 'dry_site',
            'Day Pass': 'day_pass',
            'Staff': 'staff',
            'Vendor': 'vendor'
          };

          const ticketType = ticketTypeMap[regfoxAttendee.registrationPath] || 'dry_site';

          // Check if attendee already exists
          const { data: existingAttendee } = await supabase
            .from('attendees')
            .select('id, updated_at')
            .eq('regfox_id', regfoxAttendee.id)
            .single();

          const attendeeData = {
            regfox_id: regfoxAttendee.id,
            first_name: regfoxAttendee.firstName,
            last_name: regfoxAttendee.lastName,
            email: regfoxAttendee.email,
            phone: regfoxAttendee.phone || null,
            ticket_type: ticketType,
            waiver_signed: false,
            checked_in_at: null,
            created_at: regfoxAttendee.registrationDate
          };

          if (existingAttendee) {
            // Update existing attendee
            const { error: updateError } = await supabase
              .from('attendees')
              .update({
                ...attendeeData,
                updated_at: new Date().toISOString()
              })
              .eq('id', existingAttendee.id);

            if (updateError) {
              syncResult.errors.push(`Error updating attendee ${regfoxAttendee.id}: ${updateError.message}`);
            } else {
              syncResult.updatedRecords++;
            }
          } else {
            // Insert new attendee
            const { error: insertError } = await supabase
              .from('attendees')
              .insert(attendeeData);

            if (insertError) {
              syncResult.errors.push(`Error inserting attendee ${regfoxAttendee.id}: ${insertError.message}`);
            } else {
              syncResult.newRecords++;
            }
          }
        } catch (error) {
          syncResult.errors.push(`Error processing attendee ${regfoxAttendee.id}: ${error.message}`);
        }
      }

      // Update sync log with results
      const { error: updateSyncLogError } = await supabase
        .from('regfox_sync_log')
        .update({
          status: syncResult.errors.length > 0 ? 'error' : 'success',
          total_records: syncResult.totalRecords,
          new_records: syncResult.newRecords,
          updated_records: syncResult.updatedRecords,
          error_message: syncResult.errors.length > 0 ? syncResult.errors.join('; ') : null,
          sync_completed_at: new Date().toISOString()
        })
        .eq('id', syncLog.id);

      if (updateSyncLogError) {
        console.error('Error updating sync log:', updateSyncLogError);
      }

      console.log('RegFox sync completed:', syncResult);

      return new Response(JSON.stringify({
        success: true,
        syncId: syncLog.id,
        result: syncResult
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (error) {
      // Update sync log with error
      await supabase
        .from('regfox_sync_log')
        .update({
          status: 'error',
          error_message: error.message,
          sync_completed_at: new Date().toISOString()
        })
        .eq('id', syncLog.id);

      throw error;
    }

  } catch (error) {
    console.error('Error in regfox-sync function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});