import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/regfox.ts';

/** Cron entrypoint. Skips cleanly when a sync is already running. */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: canStart, error: lockError } = await supabase.rpc('can_start_sync');
    if (lockError) throw new Error(`Failed to check sync lock: ${lockError.message}`);

    if (!canStart) {
      return new Response(
        JSON.stringify({ success: true, skipped: true, message: 'Sync already in progress' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { data, error } = await supabase.functions.invoke('regfox-sync', {
      body: { sync_type: 'scheduled' },
    });
    if (error) throw new Error(error.message);

    return new Response(JSON.stringify({ success: true, sync_response: data }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = (error as Error).message;
    console.error('Scheduled sync failed:', message);
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});