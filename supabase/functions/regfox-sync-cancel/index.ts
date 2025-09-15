import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CancelSyncRequest {
  syncId?: string;
  cancelAll?: boolean;
  reason?: string;
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

    const body: CancelSyncRequest = await req.json().catch(() => ({}));
    const { syncId, cancelAll = false, reason = 'Manual cancellation' } = body;

    console.log('RegFox sync cancellation requested:', { syncId, cancelAll, reason });

    let cancelledSyncs = 0;

    if (cancelAll) {
      // Cancel all in-progress syncs
      const { data: activeSyncs, error: fetchError } = await supabase
        .from('regfox_sync_log')
        .select('id')
        .eq('status', 'in_progress')
        .is('cancelled_at', null);

      if (fetchError) {
        throw new Error(`Failed to fetch active syncs: ${fetchError.message}`);
      }

      if (activeSyncs && activeSyncs.length > 0) {
        const { error: updateError } = await supabase
          .from('regfox_sync_log')
          .update({
            cancelled_at: new Date().toISOString(),
            cancelled_by: 'system',
            status: 'error',
            error_message: `Cancelled: ${reason}`,
            sync_completed_at: new Date().toISOString()
          })
          .eq('status', 'in_progress')
          .is('cancelled_at', null);

        if (updateError) {
          throw new Error(`Failed to cancel syncs: ${updateError.message}`);
        }

        cancelledSyncs = activeSyncs.length;

        // Release all sync locks
        const { error: lockError } = await supabase
          .from('sync_locks')
          .delete()
          .eq('lock_type', 'regfox_sync');

        if (lockError) {
          console.warn('Failed to release sync locks:', lockError);
        }
      }
    } else if (syncId) {
      // Cancel specific sync
      const { data: syncData, error: fetchError } = await supabase
        .from('regfox_sync_log')
        .select('id, status')
        .eq('id', syncId)
        .single();

      if (fetchError) {
        throw new Error(`Sync not found: ${fetchError.message}`);
      }

      if (syncData.status !== 'in_progress') {
        return new Response(JSON.stringify({
          success: false,
          error: `Cannot cancel sync with status: ${syncData.status}`,
          syncId
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { error: updateError } = await supabase
        .from('regfox_sync_log')
        .update({
          cancelled_at: new Date().toISOString(),
          cancelled_by: 'user',
          status: 'error',
          error_message: `Cancelled: ${reason}`,
          sync_completed_at: new Date().toISOString()
        })
        .eq('id', syncId);

      if (updateError) {
        throw new Error(`Failed to cancel sync: ${updateError.message}`);
      }

      // Release specific sync lock
      await supabase.rpc('release_sync_lock', { p_sync_id: syncId });

      cancelledSyncs = 1;
    } else {
      return new Response(JSON.stringify({
        success: false,
        error: 'Must provide either syncId or set cancelAll to true'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Successfully cancelled ${cancelledSyncs} sync(s)`);

    return new Response(JSON.stringify({
      success: true,
      message: `Cancelled ${cancelledSyncs} sync(s)`,
      cancelledCount: cancelledSyncs
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in regfox-sync-cancel function:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});