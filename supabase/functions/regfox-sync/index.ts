import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RegFoxAttendee {
  id: string;
  displayId?: string;
  formId: string;
  orderId?: string;
  status: string;
  amount?: number;
  currency?: string;
  fieldData: Record<string, any>;
  checkedIn?: boolean;
  dateCreated: string;
  dateUpdated: string;
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

    // Get RegFox API key and Form ID
    const regfoxApiKey = Deno.env.get('REGFOX_API_KEY');
    const regfoxFormId = Deno.env.get('REGFOX_FORM_ID');
    
    if (!regfoxApiKey) {
      throw new Error('RegFox API key not configured');
    }
    
    if (!regfoxFormId) {
      throw new Error('RegFox Form ID not configured');
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

      // Fetch attendees from RegFox API with pagination
      console.log('Fetching attendees from RegFox API...');
      
      let regfoxAttendees: RegFoxAttendee[] = [];
      let startingAfter: string | null = null;
      let hasMore = true;
      
      try {
        // Use pagination to fetch all registrants
        while (hasMore) {
          let requestUrl = `https://api.webconnex.com/v2/public/search/registrants?product=regfox.com&formId=${encodeURIComponent(regfoxFormId)}&limit=250&sort=asc`;
          
          if (startingAfter) {
            requestUrl += `&startingAfter=${encodeURIComponent(startingAfter)}`;
          }
          
          console.log(`Making RegFox API call to: ${requestUrl}`);
          console.log(`Request headers: apiKey=[MASKED], Content-Type=application/json`);

          const regfoxResponse = await fetch(requestUrl, {
            method: 'GET',
            headers: {
              'apiKey': regfoxApiKey,
              'Content-Type': 'application/json'
            }
          });

          console.log(`Response status:`, regfoxResponse.status);

          if (!regfoxResponse.ok) {
            const errorText = await regfoxResponse.text();
            console.error(`RegFox API error response:`, errorText);
            throw new Error(`RegFox API error: ${regfoxResponse.status} ${regfoxResponse.statusText} - ${errorText}`);
          }

          const responseData = await regfoxResponse.json();
          console.log(`RegFox API response (page):`, {
            totalResults: responseData.totalResults,
            hasMore: responseData.hasMore,
            dataLength: responseData.data?.length || 0,
            startingAfter: responseData.startingAfter
          });

          // Handle WebConnex API response format
          const pageAttendees = responseData.data || [];
          
          if (!Array.isArray(pageAttendees)) {
            throw new Error('Invalid RegFox API response format: expected array of attendees');
          }
          
          regfoxAttendees.push(...pageAttendees);
          
          // Check pagination
          hasMore = responseData.hasMore === true;
          startingAfter = responseData.startingAfter || null;
          
          console.log(`Fetched ${pageAttendees.length} attendees from this page. Total so far: ${regfoxAttendees.length}`);
          
          // Safety check to prevent infinite loops
          if (regfoxAttendees.length > 10000) {
            console.warn('Reached safety limit of 10,000 attendees. Stopping pagination.');
            break;
          }
        }
        
        console.log(`Successfully retrieved ${regfoxAttendees.length} total attendees`);
        
      } catch (apiError) {
        console.error('RegFox API call failed:', apiError.message);
        syncResult.errors.push(`RegFox API error: ${apiError.message}`);
        regfoxAttendees = []; // Empty array means no new data to sync
      }

      syncResult.totalRecords = regfoxAttendees.length;
      console.log(`Processing ${syncResult.totalRecords} attendees from RegFox`);

      // Process each attendee from RegFox
      for (let i = 0; i < regfoxAttendees.length; i++) {
        const regfoxAttendee = regfoxAttendees[i];
        try {
          // Extract data from fieldData (RegFox custom fields)
          const fieldData = regfoxAttendee.fieldData || {};
          
          // DEBUG: Log the complete structure of the first 3 attendees to understand the data format
          if (i < 3) {
            console.log(`=== DEBUG: RegFox Attendee ${i + 1} Structure ===`);
            console.log('Full attendee object:', JSON.stringify(regfoxAttendee, null, 2));
            console.log('Available fieldData keys:', Object.keys(fieldData));
            console.log('fieldData structure:', JSON.stringify(fieldData, null, 2));
            console.log('=== End Debug ===');
          }
          
          // Map common field names (adjust these based on your actual RegFox form fields)
          const firstName = fieldData['First Name'] || fieldData['firstName'] || fieldData['first_name'] || '';
          const lastName = fieldData['Last Name'] || fieldData['lastName'] || fieldData['last_name'] || '';
          const email = fieldData['Email'] || fieldData['email'] || '';
          const phone = fieldData['Phone'] || fieldData['phone'] || fieldData['Phone Number'] || null;
          
          // Map RegFox ticket type to our enum (update these mappings based on your form)
          const ticketTypeMap: Record<string, string> = {
            'Premium Power Site': 'premium_power',
            'Dry Site': 'dry_site', 
            'Day Pass': 'day_pass',
            'Staff': 'staff',
            'Vendor': 'vendor'
          };

          // Try to determine ticket type from fieldData or use a default
          const registrationType = fieldData['Registration Type'] || fieldData['Ticket Type'] || fieldData['registrationType'] || 'Dry Site';
          const ticketType = ticketTypeMap[registrationType] || 'dry_site';

          // Check if attendee already exists by regfox_id
          const { data: existingAttendee } = await supabase
            .from('attendees')
            .select('id, updated_at')
            .eq('regfox_id', regfoxAttendee.id)
            .single();

          const attendeeData = {
            regfox_id: regfoxAttendee.id,
            first_name: firstName,
            last_name: lastName,
            email: email,
            phone: phone,
            ticket_type: ticketType,
            waiver_signed: false,
            checked_in_at: regfoxAttendee.checkedIn ? new Date().toISOString() : null,
            created_at: regfoxAttendee.dateCreated
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