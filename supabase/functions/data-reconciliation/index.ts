import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReconciliationResult {
  success: boolean;
  orphanedTagsFixed: number;
  invalidDataCleaned: number;
  constraintsAdded: number;
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

    console.log('Starting data reconciliation process');

    const result: ReconciliationResult = {
      success: true,
      orphanedTagsFixed: 0,
      invalidDataCleaned: 0,
      constraintsAdded: 0,
      errors: []
    };

    // 1. Fix orphaned RFID tags (set them back to unissued status)
    console.log('Fixing orphaned RFID tags...');
    const { data: orphanedTags, error: orphanedTagsError } = await supabase
      .from('rfid_tags')
      .select('uid')
      .is('attendee_id', null)
      .neq('status', 'unissued');

    if (orphanedTagsError) {
      result.errors.push(`Error finding orphaned tags: ${orphanedTagsError.message}`);
    } else if (orphanedTags && orphanedTags.length > 0) {
      const { error: updateError } = await supabase
        .from('rfid_tags')
        .update({ 
          status: 'unissued',
          deactivated_at: new Date().toISOString(),
          reason: 'Data reconciliation - orphaned tag cleanup'
        })
        .is('attendee_id', null)
        .neq('status', 'unissued');

      if (updateError) {
        result.errors.push(`Error updating orphaned tags: ${updateError.message}`);
      } else {
        result.orphanedTagsFixed = orphanedTags.length;
        console.log(`Fixed ${orphanedTags.length} orphaned RFID tags`);
      }
    }

    // 2. Validate and clean invalid ticket types
    console.log('Validating ticket types...');
    const validTicketTypes = ['dry_site', 'premium_power', 'rv_site', 'glamping', 'cabin', 'day_pass', 'staff', 'vendor'];
    
    const { data: invalidTicketAttendees, error: invalidTicketError } = await supabase
      .from('attendees')
      .select('id, ticket_type')
      .not('ticket_type', 'in', `(${validTicketTypes.map(t => `'${t}'`).join(',')})`);

    if (invalidTicketError) {
      result.errors.push(`Error finding invalid ticket types: ${invalidTicketError.message}`);
    } else if (invalidTicketAttendees && invalidTicketAttendees.length > 0) {
      // Fix invalid ticket types by setting them to dry_site
      const { error: fixTicketError } = await supabase
        .from('attendees')
        .update({ 
          ticket_type: 'dry_site',
          notes: 'Ticket type corrected during data reconciliation'
        })
        .not('ticket_type', 'in', `(${validTicketTypes.map(t => `'${t}'`).join(',')})`);

      if (fixTicketError) {
        result.errors.push(`Error fixing invalid ticket types: ${fixTicketError.message}`);
      } else {
        result.invalidDataCleaned = invalidTicketAttendees.length;
        console.log(`Fixed ${invalidTicketAttendees.length} invalid ticket types`);
      }
    }

    // 3. Clean up attendees without required data
    console.log('Cleaning up invalid attendee data...');
    const { data: invalidAttendees, error: invalidAttendeesError } = await supabase
      .from('attendees')
      .select('id')
      .or('first_name.is.null,last_name.is.null,first_name.eq.,last_name.eq.');

    if (invalidAttendeesError) {
      result.errors.push(`Error finding invalid attendees: ${invalidAttendeesError.message}`);
    } else if (invalidAttendees && invalidAttendees.length > 0) {
      console.log(`Found ${invalidAttendees.length} attendees with missing required data`);
      // For now, just log this - we might want manual review before deletion
      result.errors.push(`Warning: ${invalidAttendees.length} attendees found with missing first_name or last_name`);
    }

    // 4. Validate RFID tag assignments
    console.log('Validating RFID tag assignments...');
    const { data: invalidTagAssignments, error: tagAssignmentError } = await supabase
      .from('rfid_tags')
      .select('uid, attendee_id')
      .not('attendee_id', 'is', null);

    if (tagAssignmentError) {
      result.errors.push(`Error validating tag assignments: ${tagAssignmentError.message}`);
    } else if (invalidTagAssignments) {
      // Verify that all assigned attendee_ids actually exist
      for (const tag of invalidTagAssignments) {
        const { data: attendeeExists } = await supabase
          .from('attendees')
          .select('id')
          .eq('id', tag.attendee_id)
          .single();

        if (!attendeeExists) {
          // Orphaned tag assignment - reset to unissued
          await supabase
            .from('rfid_tags')
            .update({ 
              attendee_id: null,
              status: 'unissued',
              deactivated_at: new Date().toISOString(),
              reason: 'Attendee no longer exists'
            })
            .eq('uid', tag.uid);
          
          result.orphanedTagsFixed++;
        }
      }
    }

    // Log results
    console.log('Data reconciliation completed:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in data reconciliation:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});