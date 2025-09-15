import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CleanupResult {
  cleanedUpSyncs: number;
  cleanedUpLocks: number;
  forceResetSyncs: number;
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

    console.log('Starting RegFox sync cleanup...');

    const result: CleanupResult = {
      cleanedUpSyncs: 0,
      cleanedUpLocks: 0,
      forceResetSyncs: 0
    };

    // 1. Clean up expired locks
    await supabase.rpc('cleanup_expired_locks');
    console.log('Cleaned up expired locks');

    // 2. Find and force-complete stuck syncs (in progress for more than 30 minutes)
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    
    const { data: stuckSyncs, error: fetchError } = await supabase
      .from('regfox_sync_log')
      .select('id, sync_started_at, sync_type')
      .eq('status', 'in_progress')
      .is('cancelled_at', null)
      .lt('sync_started_at', thirtyMinutesAgo);

    if (fetchError) {
      console.error('Error fetching stuck syncs:', fetchError);
    } else if (stuckSyncs && stuckSyncs.length > 0) {
      console.log(`Found ${stuckSyncs.length} stuck syncs to clean up`);

      // Mark stuck syncs as errored with timeout
      const { error: updateError } = await supabase
        .from('regfox_sync_log')
        .update({
          status: 'error',
          error_message: 'Sync timed out after 30 minutes',
          sync_completed_at: new Date().toISOString()
        })
        .eq('status', 'in_progress')
        .is('cancelled_at', null)
        .lt('sync_started_at', thirtyMinutesAgo);

      if (updateError) {
        console.error('Error updating stuck syncs:', updateError);
      } else {
        result.forceResetSyncs = stuckSyncs.length;
        console.log(`Force-reset ${stuckSyncs.length} stuck syncs`);
      }

      // Release locks for stuck syncs
      for (const sync of stuckSyncs) {
        await supabase.rpc('release_sync_lock', { p_sync_id: sync.id });
      }
    }

    // 3. Clean up old sync logs (keep only last 100 records)
    const { data: oldSyncs, error: oldSyncsError } = await supabase
      .from('regfox_sync_log')
      .select('id')
      .order('created_at', { ascending: false })
      .range(100, 999999); // Skip first 100, get the rest

    if (oldSyncsError) {
      console.error('Error fetching old syncs:', oldSyncsError);
    } else if (oldSyncs && oldSyncs.length > 0) {
      const { error: deleteError } = await supabase
        .from('regfox_sync_log')
        .delete()
        .in('id', oldSyncs.map(s => s.id));

      if (deleteError) {
        console.error('Error deleting old syncs:', deleteError);
      } else {
        result.cleanedUpSyncs = oldSyncs.length;
        console.log(`Cleaned up ${oldSyncs.length} old sync records`);
      }
    }

    // 4. Clean up any remaining orphaned locks
    const { data: orphanedLocks, error: locksError } = await supabase
      .from('sync_locks')
      .select('id')
      .eq('lock_type', 'regfox_sync')
      .lt('expires_at', new Date().toISOString());

    if (locksError) {
      console.error('Error fetching orphaned locks:', locksError);
    } else if (orphanedLocks && orphanedLocks.length > 0) {
      const { error: deleteLockError } = await supabase
        .from('sync_locks')
        .delete()
        .in('id', orphanedLocks.map(l => l.id));

      if (deleteLockError) {
        console.error('Error deleting orphaned locks:', deleteLockError);
      } else {
        result.cleanedUpLocks = orphanedLocks.length;
        console.log(`Cleaned up ${orphanedLocks.length} orphaned locks`);
      }
    }

    console.log('RegFox cleanup completed:', result);

    return new Response(JSON.stringify({
      success: true,
      message: 'Cleanup completed successfully',
      result
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in regfox-cleanup function:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
