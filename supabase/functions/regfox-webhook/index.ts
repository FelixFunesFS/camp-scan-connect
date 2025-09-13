import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RegFoxWebhookPayload {
  event?: string;
  eventType?: string;
  data: {
    id?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    registrationPath?: string;
    registrationDate?: string;
    status?: string;
    // New format fields
    registrants?: Array<{
      id: string;
      data: Array<{
        fieldId?: number;
        fieldName?: string;
        fieldValue?: string;
      }>;
    }>;
    registrationTimestamp?: string;
    billing?: {
      name?: {
        first?: string;
        last?: string;
      };
      email?: string;
      phone?: string;
    };
    tickets?: Array<{
      ticketKey?: string;
      ticketLabel?: string;
    }>;
  };
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

    console.log('RegFox webhook received');

    const payload: RegFoxWebhookPayload = await req.json();
    console.log('Webhook payload:', payload);

    // Create sync log entry for webhook
    const { data: syncLog, error: syncLogError } = await supabase
      .from('regfox_sync_log')
      .insert({
        sync_type: 'webhook',
        status: 'in_progress',
        sync_started_at: new Date().toISOString()
      })
      .select()
      .single();

    if (syncLogError) {
      console.error('Error creating sync log:', syncLogError);
      throw syncLogError;
    }

    let result = {
      newRecords: 0,
      updatedRecords: 0,
      errors: [] as string[]
    };

    try {
      // Determine event type and process accordingly
      const eventType = payload.event || payload.eventType;
      console.log('Processing event type:', eventType);

      if (eventType === 'registration.created' || eventType === 'registration.updated' || eventType === 'registration') {
        let attendeeData: any = null;
        let attendeeId: string | null = null;

        // Handle original format (direct data structure)
        if (payload.data.firstName && payload.data.lastName) {
          console.log('Processing original format');
          attendeeData = {
            first_name: payload.data.firstName,
            last_name: payload.data.lastName,
            email: payload.data.email,
            phone: payload.data.phone || null,
            regfox_id: payload.data.id
          };
          attendeeId = payload.data.id;
        } 
        // Handle new format (registrants array)
        else if (payload.data.registrants && payload.data.registrants.length > 0) {
          console.log('Processing new format with registrants');
          const registrant = payload.data.registrants[0];
          
          // Extract name and email from billing or registrant data
          const firstName = payload.data.billing?.name?.first || 
                          registrant.data?.find(d => d.fieldName?.toLowerCase().includes('first'))?.fieldValue || 'Unknown';
          const lastName = payload.data.billing?.name?.last || 
                         registrant.data?.find(d => d.fieldName?.toLowerCase().includes('last'))?.fieldValue || 'User';
          const email = payload.data.billing?.email || 
                       registrant.data?.find(d => d.fieldName?.toLowerCase().includes('email'))?.fieldValue;
          const phone = payload.data.billing?.phone || 
                       registrant.data?.find(d => d.fieldName?.toLowerCase().includes('phone'))?.fieldValue;

          attendeeData = {
            first_name: firstName,
            last_name: lastName,
            email: email,
            phone: phone || null,
            regfox_id: registrant.id
          };
          attendeeId = registrant.id;
        }

        if (attendeeData && attendeeId) {
          // Enhanced ticket type mapping to match database enum and sync function logic
          const ticketTypeMap: Record<string, string> = {
            'Premium Power Site': 'premium_power',
            'Dry Site': 'dry_site',
            'RV Site': 'rv_site',
            'Glamping': 'glamping',
            'Glamping Tent': 'glamping',
            'Cabin': 'cabin',
            'Day Pass': 'day_pass',
            'Staff': 'staff',
            'Vendor': 'vendor'
          };

          // Enhanced ticket type determination logic matching sync function
          let ticketType = 'dry_site';
          
          // Helper function to determine ticket type from RegFox data (matching sync function)
          const determineTicketTypeFromPayload = (payloadData: any) => {
            // Check for accommodation type in registrant data
            if (payloadData.registrants && payloadData.registrants.length > 0) {
              const registrant = payloadData.registrants[0];
              const accommodationField = registrant.data?.find(d => 
                d.fieldName?.toLowerCase().includes('accommodation') || 
                d.fieldName?.toLowerCase().includes('tent') ||
                d.fieldName?.toLowerCase().includes('staying')
              );
              
              if (accommodationField && accommodationField.fieldValue) {
                const accommodation = accommodationField.fieldValue.toLowerCase();
                if (accommodation.includes('glamping')) return 'glamping';
                if (accommodation.includes('cabin')) return 'cabin';
                if (accommodation.includes('rv')) return 'rv_site';
                if (accommodation.includes('premium') || accommodation.includes('power')) return 'premium_power';
              }
            }
            
            // Fallback to registration path mapping
            if (payloadData.registrationPath && ticketTypeMap[payloadData.registrationPath]) {
              return ticketTypeMap[payloadData.registrationPath];
            }
            
            // Fallback to ticket mapping
            if (payloadData.tickets && payloadData.tickets.length > 0) {
              const ticket = payloadData.tickets[0];
              const ticketLabel = ticket.ticketLabel || ticket.ticketKey || '';
              if (ticketTypeMap[ticketLabel]) {
                return ticketTypeMap[ticketLabel];
              }
            }
            
            return 'dry_site'; // Safe default
          };

          ticketType = determineTicketTypeFromPayload(payload.data);

          // Complete attendee data
          const completeAttendeeData = {
            ...attendeeData,
            ticket_type: ticketType,
            waiver_signed: false,
            checked_in_at: null,
            created_at: payload.data.registrationDate || payload.data.registrationTimestamp || new Date().toISOString()
          };

          // Check if attendee already exists
          const { data: existingAttendee } = await supabase
            .from('attendees')
            .select('id')
            .eq('regfox_id', attendeeId)
            .maybeSingle();

          if (existingAttendee && (eventType === 'registration.updated' || eventType === 'registration')) {
            console.log('Updating existing attendee:', attendeeId);
            // Update existing attendee (removed manual updated_at field)
            const { error: updateError } = await supabase
              .from('attendees')
              .update(completeAttendeeData)
              .eq('id', existingAttendee.id);

            if (updateError) {
              console.error('Update error:', updateError);
              result.errors.push(`Error updating attendee: ${updateError.message}`);
            } else {
              result.updatedRecords = 1;
              console.log('Successfully updated attendee');
            }
          } else if (!existingAttendee) {
            console.log('Creating new attendee:', attendeeId);
            // Insert new attendee
            const { error: insertError } = await supabase
              .from('attendees')
              .insert(completeAttendeeData);

            if (insertError) {
              console.error('Insert error:', insertError);
              result.errors.push(`Error inserting attendee: ${insertError.message}`);
            } else {
              result.newRecords = 1;
              console.log('Successfully created attendee');
            }
          } else {
            console.log('Attendee already exists, no action needed');
          }
        } else {
          result.errors.push('Unable to extract attendee data from webhook payload');
          console.error('Failed to extract attendee data from payload');
        }
      } else {
        console.log('Unhandled event type:', eventType);
        result.errors.push(`Unhandled event type: ${eventType}`);
      }

      // Update sync log with results
      const { error: updateSyncLogError } = await supabase
        .from('regfox_sync_log')
        .update({
          status: result.errors.length > 0 ? 'error' : 'success',
          total_records: 1,
          new_records: result.newRecords,
          updated_records: result.updatedRecords,
          error_message: result.errors.length > 0 ? result.errors.join('; ') : null,
          sync_completed_at: new Date().toISOString()
        })
        .eq('id', syncLog.id);

      if (updateSyncLogError) {
        console.error('Error updating sync log:', updateSyncLogError);
      }

      console.log('Webhook processed successfully:', result);

      return new Response(JSON.stringify({
        success: true,
        syncId: syncLog.id,
        result
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
    console.error('Error in regfox-webhook function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});