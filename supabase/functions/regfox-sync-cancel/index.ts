import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/regfox.ts';

/** Cancels a specific running sync, or all of them when `cancelAll` is set. */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    let body: Record<string, unknown> = {};
    try {
      const text = await req.text();
      if (text) body = JSON.parse(text);
    } catch {
      // empty body means cancel all
    }

    const syncId = typeof body.syncId === 'string' ? body.syncId : null;

    const { data: cancelled, error } = await supabase.rpc('release_sync_lock', {
      p_sync_id: syncId,
    });
    if (error) throw new Error(error.message);

    return new Response(
      JSON.stringify({ success: true, cancelled_count: cancelled ?? 0 }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    const message = (error as Error).message;
    console.error('RegFox sync cancel failed:', message);
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});