import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RegFoxWebhookPayload {
  event: string;
  data: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    registrationPath: string;
    registrationDate: string;
    status: string;
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
      // Process the webhook data
      if (payload.event === 'registration.created' || payload.event === 'registration.updated') {
        const regfoxAttendee = payload.data;

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
          .select('id')
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

        if (existingAttendee && payload.event === 'registration.updated') {
          // Update existing attendee
          const { error: updateError } = await supabase
            .from('attendees')
            .update({
              ...attendeeData,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingAttendee.id);

          if (updateError) {
            result.errors.push(`Error updating attendee: ${updateError.message}`);
          } else {
            result.updatedRecords = 1;
          }
        } else if (!existingAttendee && payload.event === 'registration.created') {
          // Insert new attendee
          const { error: insertError } = await supabase
            .from('attendees')
            .insert(attendeeData);

          if (insertError) {
            result.errors.push(`Error inserting attendee: ${insertError.message}`);
          } else {
            result.newRecords = 1;
          }
        }
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