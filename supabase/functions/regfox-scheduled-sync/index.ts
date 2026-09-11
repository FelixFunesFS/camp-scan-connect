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

    const response = await fetch(`${Deno.env.get('SUPABASE_URL')!}/functions/v1/regfox-sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')!}`,
        'apikey': Deno.env.get('SUPABASE_ANON_KEY')!,
        'x-regfox-internal': Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      },
      body: JSON.stringify({ sync_type: 'scheduled' }),
    });
    const data = await response.json();
    if (!response.ok && response.status !== 409) throw new Error(data?.error ?? `Sync returned ${response.status}`);

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