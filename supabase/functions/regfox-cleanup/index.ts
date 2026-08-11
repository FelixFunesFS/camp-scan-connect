import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/regfox.ts';

/** Clears stuck / stale syncs so a new sync can start. */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Reap anything past its heartbeat timeout.
    const { data: reaped, error: reapError } = await supabase.rpc('cleanup_stuck_syncs');
    if (reapError) throw new Error(reapError.message);

    // Force-release anything still marked in progress.
    const { data: released, error: releaseError } = await supabase.rpc('release_sync_lock', {
      p_sync_id: null,
    });
    if (releaseError) throw new Error(releaseError.message);

    return new Response(
      JSON.stringify({
        success: true,
        stuck_syncs_cleared: reaped ?? 0,
        locks_released: released ?? 0,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    const message = (error as Error).message;
    console.error('RegFox cleanup failed:', message);
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});