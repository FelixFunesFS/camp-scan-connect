import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import {
  ACTIVE_EVENT_FALLBACK,
  contentHash,
  corsHeaders,
  fetchAllRegistrants,
  isAbandoned,
  mapRegistrant,
} from '../_shared/regfox.ts';

/**
 * The roster can run to thousands of registrants, which exceeds the edge
 * runtime's per-request CPU budget if we do it inline. So the request only
 * opens the sync log and returns immediately; the work itself continues as a
 * background task and reports progress through `regfox_sync_log`.
 */
async function runSync(
  supabase: SupabaseClient,
  syncId: string,
  eventId: string,
  apiKey: string,
  formId: string,
) {
  const touch = (patch: Record<string, unknown>) =>
    supabase
      .from('regfox_sync_log')
      .update({ heartbeat_at: new Date().toISOString(), ...patch })
      .eq('id', syncId);

  try {
    const registrants = await fetchAllRegistrants(apiKey, formId, async (loaded) => {
      await touch({ progress_info: { processed: 0, total: loaded, phase: 'fetching' } });
    });

    // Abandoned registrations are never imported.
    const usable = registrants.filter((r) => !isAbandoned(r.status));

    const { data: existingRows, error: existingError } = await supabase
      .from('attendees')
      .select('id, regfox_registration_id, sync_hash')
      .eq('event_id', eventId)
      .not('regfox_registration_id', 'is', null);

    if (existingError) throw new Error(`Failed to read attendees: ${existingError.message}`);

    const existing = new Map<string, string | null>();
    for (const row of existingRows ?? []) {
      existing.set(row.regfox_registration_id as string, row.sync_hash as string | null);
    }

    const toUpsert: Record<string, unknown>[] = [];
    const errors: string[] = [];
    let skipped = 0;
    let newCount = 0;
    let updatedCount = 0;

    for (const r of usable) {
      try {
        const mapped = mapRegistrant(r, eventId);
        const hash = contentHash(mapped);
        const known = existing.has(mapped.regfox_registration_id);

        if (known && existing.get(mapped.regfox_registration_id) === hash) {
          skipped += 1;
          continue;
        }

        if (known) updatedCount += 1;
        else newCount += 1;

        toUpsert.push({
          ...mapped,
          sync_hash: hash,
          last_synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      } catch (e) {
        errors.push(`Registrant ${r.id}: ${(e as Error).message}`);
      }
    }

    // Idempotent on (event_id, regfox_registration_id).
    const chunkSize = 200;
    for (let i = 0; i < toUpsert.length; i += chunkSize) {
      const chunk = toUpsert.slice(i, i + chunkSize);
      const { error: upsertError } = await supabase
        .from('attendees')
        .upsert(chunk, { onConflict: 'event_id,regfox_registration_id' });

      if (upsertError) errors.push(`Batch at ${i}: ${upsertError.message}`);

      await touch({
        progress_info: {
          processed: Math.min(i + chunkSize, toUpsert.length),
          total: toUpsert.length,
          phase: 'writing',
        },
      });
    }

    const failedEverything = errors.length > 0 && newCount + updatedCount === 0;

    await touch({
      status: failedEverything ? 'error' : 'success',
      total_records: usable.length,
      new_records: newCount,
      updated_records: updatedCount,
      error_message: errors.length ? errors.slice(0, 10).join(' | ') : null,
      sync_completed_at: new Date().toISOString(),
      progress_info: {
        processed: toUpsert.length,
        total: toUpsert.length,
        skipped_unchanged: skipped,
        phase: 'done',
      },
    });
  } catch (error) {
    const message = (error as Error).message;
    console.error('RegFox sync failed:', message);
    await supabase
      .from('regfox_sync_log')
      .update({
        status: 'error',
        error_message: message,
        sync_completed_at: new Date().toISOString(),
        heartbeat_at: new Date().toISOString(),
      })
      .eq('id', syncId);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  try {
    let body: Record<string, unknown> = {};
    try {
      const text = await req.text();
      if (text) body = JSON.parse(text);
    } catch {
      // an empty body is fine
    }

    const syncType = (body.sync_type as string) ?? 'manual_sync';

    const apiKey = Deno.env.get('REGFOX_API_KEY');
    const formId = Deno.env.get('REGFOX_FORM_ID');
    if (!apiKey) throw new Error('REGFOX_API_KEY is not configured');
    if (!formId) throw new Error('REGFOX_FORM_ID is not configured');

    const { data: activeEvent } = await supabase
      .from('events')
      .select('id')
      .eq('is_active', true)
      .maybeSingle();
    const eventId = activeEvent?.id ?? ACTIVE_EVENT_FALLBACK;

    // Only one sync may run at a time.
    const { data: canStart, error: lockError } = await supabase.rpc('can_start_sync');
    if (lockError) throw new Error(`Failed to check sync lock: ${lockError.message}`);
    if (!canStart) {
      return new Response(
        JSON.stringify({ success: false, error: 'SYNC_IN_PROGRESS', skipped: true }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { data: logRow, error: logError } = await supabase
      .from('regfox_sync_log')
      .insert({
        sync_type: syncType,
        status: 'in_progress',
        event_id: eventId,
        sync_started_at: new Date().toISOString(),
        heartbeat_at: new Date().toISOString(),
        sync_timeout_minutes: 10,
        progress_info: { processed: 0, total: 0, phase: 'starting' },
      })
      .select('id')
      .single();

    if (logError) throw new Error(`Failed to open sync log: ${logError.message}`);

    const syncId = logRow.id as string;

    // Keep running after the response is sent.
    // @ts-ignore EdgeRuntime is provided by the Supabase edge runtime.
    EdgeRuntime.waitUntil(runSync(supabase, syncId, eventId, apiKey, formId));

    return new Response(
      JSON.stringify({
        success: true,
        started: true,
        syncId,
        message: 'Sync started. Poll regfox_sync_log for progress.',
      }),
      { status: 202, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    const message = (error as Error).message;
    console.error('Failed to start RegFox sync:', message);
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});