import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RegFoxWebhookPayload {
  event?: string;
  eventType?: string;
  formId?: number;
  data: {
    id?: string;
    registrants?: Array<{
      id: string;
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
    const regfoxFormId = Deno.env.get('REGFOX_FORM_ID')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('RegFox webhook received - trigger-only mode');

    const payload: RegFoxWebhookPayload = await req.json();
    console.log('Webhook payload:', { event: payload.event || payload.eventType, formId: payload.formId });

    // Validate form ID matches expected form
    const formId = payload.formId;
    if (formId && formId.toString() !== regfoxFormId) {
      console.log(`Form ID mismatch: received ${formId}, expected ${regfoxFormId}`);
      return new Response(JSON.stringify({ 
        success: false, 
        error: `Form ID mismatch: received ${formId}, expected ${regfoxFormId}` 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Determine event type
    const eventType = payload.event || payload.eventType;
    console.log('Processing event type:', eventType);

    // Only trigger sync for registration events
    if (eventType === 'registration.created' || eventType === 'registration.updated' || eventType === 'registration' || 
        eventType === 'registrant_cancel' || eventType === 'registrant_edit') {
      
      console.log('Valid registration event detected, triggering API sync...');
      
      // Trigger the API sync function with increased timeout
      const { data: syncResponse, error: syncError } = await supabase.functions.invoke('regfox-sync', {
        body: { 
          webhook_triggered: true,
          event_type: eventType,
          registrant_id: payload.data.id || payload.data.registrants?.[0]?.id
        },
        // Increase timeout to 10 minutes for webhook-triggered syncs
        timeout: 600000
      });

      if (syncError) {
        console.error('Error triggering API sync:', syncError);
        return new Response(JSON.stringify({
          success: false,
          error: `Failed to trigger API sync: ${syncError.message}`,
          webhook_event: eventType
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log('API sync triggered successfully:', syncResponse);
      
      return new Response(JSON.stringify({
        success: true,
        message: 'Webhook received and API sync triggered',
        webhook_event: eventType,
        sync_response: syncResponse
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      console.log('Non-registration event, ignoring:', eventType);
      
      return new Response(JSON.stringify({
        success: true,
        message: 'Non-registration event ignored',
        webhook_event: eventType
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('Webhook processing error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: `Webhook processing failed: ${error.message}`,
      webhook_event: payload.event || payload.eventType
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});