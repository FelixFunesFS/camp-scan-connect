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
      // First, test API key with ping endpoint
      console.log('Testing API key with ping endpoint...');
      
      try {
        const pingResponse = await fetch('https://api.webconnex.com/v2/public/ping', {
          method: 'GET',
          headers: {
            'apiKey': regfoxApiKey,
            'Content-Type': 'application/json'
          }
        });

        console.log('Ping response status:', pingResponse.status);
        const pingData = await pingResponse.json();
        console.log('Ping response data:', pingData);

        if (!pingResponse.ok) {
          throw new Error(`API key validation failed: ${pingResponse.status} ${pingResponse.statusText}`);
        }

        console.log('API key validation successful');
      } catch (pingError) {
        console.error('API key ping test failed:', pingError.message);
        syncResult.errors.push(`API key validation error: ${pingError.message}`);
        throw pingError;
      }

      // Fetch attendees from RegFox API
      console.log('Fetching attendees from RegFox API...');
      
      let regfoxAttendees: RegFoxAttendee[] = [];
      
      try {
        // Try different product parameter formats
        const productParams = [
          'redpodium.com2',
          'redpodium.com',
          'redpodium'
        ];

        let successfulResponse = null;
        let lastError = null;

        for (const product of productParams) {
          const requestUrl = `https://api.webconnex.com/v2/public/search/registrants?product=${product}&pretty=true`;
          console.log(`Trying API call with product parameter: ${product}`);
          console.log(`Request URL: ${requestUrl}`);
          console.log(`Request headers: apiKey=[MASKED], Content-Type=application/json`);

          try {
            const regfoxResponse = await fetch(requestUrl, {
              method: 'GET',
              headers: {
                'apiKey': regfoxApiKey,
                'Content-Type': 'application/json'
              }
            });

            console.log(`Response status for ${product}:`, regfoxResponse.status);
            
            if (regfoxResponse.ok) {
              const responseData = await regfoxResponse.json();
              console.log(`Successful response for ${product}:`, responseData);
              successfulResponse = responseData;
              break;
            } else {
              const errorText = await regfoxResponse.text();
              lastError = `${regfoxResponse.status} ${regfoxResponse.statusText}: ${errorText}`;
              console.log(`Failed response for ${product}:`, lastError);
            }
            
          } catch (fetchError) {
            lastError = fetchError.message;
            console.error(`Fetch error for ${product}:`, fetchError.message);
          }
        }

        if (!successfulResponse) {
          throw new Error(`All product parameters failed. Last error: ${lastError}`);
        }

        // Handle WebConnex API response format - data is in responseData.data
        regfoxAttendees = successfulResponse.data || [];
        
        // Validate data format
        if (!Array.isArray(regfoxAttendees)) {
          throw new Error('Invalid RegFox API response format: expected array of attendees');
        }
        
        console.log(`Successfully retrieved ${regfoxAttendees.length} attendees`);
        
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