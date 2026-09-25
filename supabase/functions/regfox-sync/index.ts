import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import {
  buildOrderAccommodations,
  buildOrderExtras,
  contentHash,
  corsHeaders,
  fetchAllRegistrants,
  isAbandoned,
  mapRegistrant,
  resolveSyncTarget,
} from '../_shared/regfox.ts';
import { authErrorResponse, requireAdmin } from '../_shared/regfoxAuth.ts';

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

    // Companions on a group order do not answer the stay question themselves,
    // so resolve one accommodation per order before mapping any row.
    const orderAccommodations = buildOrderAccommodations(usable);
    const orderExtras = buildOrderExtras(usable);

    const { data: existingRows, error: existingError } = await supabase
      .from('attendees')
      .select('id, regfox_registration_id, sync_hash, waiver_signed, locked_fields')
      .eq('event_id', eventId)
      .not('regfox_registration_id', 'is', null);

    if (existingError) throw new Error(`Failed to read attendees: ${existingError.message}`);

    const existing = new Map<string, string | null>();
    const localWaiverSigned = new Set<string>();
    const attendeeIdByRegistration = new Map<string, string>();
    // Fields staff changed by hand; syncs must never overwrite them.
    const lockedByRegistration = new Map<string, string[]>();
    for (const row of existingRows ?? []) {
      const regId = row.regfox_registration_id as string;
      existing.set(regId, row.sync_hash as string | null);
      attendeeIdByRegistration.set(regId, row.id as string);
      if (row.waiver_signed) localWaiverSigned.add(regId);
      const locked = (row.locked_fields as string[] | null) ?? [];
      if (locked.length) lockedByRegistration.set(regId, locked);
    }

    // A waiver signed on site must never be reset by a RegFox form answer.
    const { data: signatureRows } = await supabase
      .from('waiver_signatures')
      .select('attendee_id');
    const signedAttendeeIds = new Set((signatureRows ?? []).map((s) => s.attendee_id as string));
    for (const [regId, attendeeId] of attendeeIdByRegistration) {
      if (signedAttendeeIds.has(attendeeId)) localWaiverSigned.add(regId);
    }


    const toUpsert: Record<string, unknown>[] = [];
    const errors: string[] = [];
    let skipped = 0;
    let plannedNew = 0;
    let plannedUpdated = 0;
    let newCount = 0;
    let updatedCount = 0;

    const cancelledRegistrationIds: string[] = [];

    for (const r of usable) {
      try {
        const mapped = mapRegistrant(r, eventId, orderAccommodations, orderExtras);
        const lockedFields = lockedByRegistration.get(mapped.regfox_registration_id) ?? [];
        const unlocked: Record<string, unknown> = { ...mapped };
        for (const f of lockedFields) {
          if (f !== 'regfox_registration_id' && f !== 'event_id') delete unlocked[f];
        }
        const hash = contentHash(unlocked as typeof mapped);
        const known = existing.has(mapped.regfox_registration_id);

        if (mapped.registration_status === 'cancelled' && !lockedFields.includes('registration_status')) {
          cancelledRegistrationIds.push(mapped.regfox_registration_id);
        }

        if (known && existing.get(mapped.regfox_registration_id) === hash) {
          skipped += 1;
          continue;
        }

        if (known) plannedUpdated += 1;
        else plannedNew += 1;

        const row: Record<string, unknown> = {
          ...unlocked,
          sync_hash: hash,
          last_synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        // Operational state is owned on site, never by the form answer.
        if (!lockedFields.includes('waiver_signed') && !mapped.waiver_signed && localWaiverSigned.has(mapped.regfox_registration_id)) {
          row.waiver_signed = true;
        }
        delete row.checked_in_at;
        delete row.activated_at;
        delete row.most_recent_activation_at;
        delete row.most_recent_activation_method;

        toUpsert.push(row);
      } catch (e) {
        errors.push(`Registrant ${r.id}: ${(e as Error).message}`);
      }
    }


    // Rows with locked fields have fewer columns; a bulk upsert would null the
    // missing ones, so they are updated one at a time with only their own keys.
    const lockedRows = toUpsert.filter((r) => lockedByRegistration.has(String(r.regfox_registration_id)));
    const bulkRows = toUpsert.filter((r) => !lockedByRegistration.has(String(r.regfox_registration_id)));
    for (const row of lockedRows) {
      const { event_id, regfox_registration_id, ...patch } = row;
      const { error: lockErr } = await supabase
        .from('attendees')
        .update(patch)
        .eq('event_id', event_id as string)
        .eq('regfox_registration_id', regfox_registration_id as string);
      if (lockErr) errors.push(`Registrant ${regfox_registration_id}: ${lockErr.message}`);
      else updatedCount += 1;
    }

    // Idempotent on (event_id, regfox_registration_id).
    const chunkSize = 200;
    for (let i = 0; i < bulkRows.length; i += chunkSize) {
      const chunk = bulkRows.slice(i, i + chunkSize);
      const { error: upsertError } = await supabase
        .from('attendees')
        .upsert(chunk, { onConflict: 'event_id,regfox_registration_id' });

      if (upsertError) {
        errors.push(`Batch at ${i}: ${upsertError.message}`);
      } else {
        for (const row of chunk) {
          if (existing.has(String(row.regfox_registration_id))) updatedCount += 1;
          else newCount += 1;
        }
      }

      await touch({
        progress_info: {
          processed: Math.min(i + chunkSize, bulkRows.length),
          total: bulkRows.length,
          phase: 'writing',
        },
      });
    }

    const remoteIds = new Set(usable.map((r) => String(r.id)));
    const missingIds = [...existing.keys()].filter((id) => !remoteIds.has(id));
    // Manually overridden status is never changed by a sync; flag for review instead.
    const cancelledWithOverride = missingIds.filter((id) =>
      (lockedByRegistration.get(id) ?? []).includes('registration_status'));
    const removedIds = missingIds.filter((id) => !cancelledWithOverride.includes(id));
    if (removedIds.length > 0) {
      const { error: removalError } = await supabase
        .from('attendees')
        .update({ registration_status: 'cancelled', last_synced_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('event_id', eventId)
        .in('regfox_registration_id', removedIds);
      if (removalError) errors.push(`Removal reconciliation: ${removalError.message}`);
    }

    // A cancelled or removed registration must not keep a working credential.
    let deactivatedCredentials = 0;
    const cancelledAll = [...new Set([...removedIds, ...cancelledRegistrationIds])];
    if (cancelledAll.length > 0) {
      const { data: cancelledAttendees } = await supabase
        .from('attendees')
        .select('id')
        .eq('event_id', eventId)
        .in('regfox_registration_id', cancelledAll);
      const cancelledIds = (cancelledAttendees ?? []).map((a) => a.id as string);
      for (let i = 0; i < cancelledIds.length; i += 200) {
        const slice = cancelledIds.slice(i, i + 200);
        const { data: retired, error: tagError } = await supabase
          .from('rfid_tags')
          .update({
            status: 'deactivated',
            deactivated_at: new Date().toISOString(),
            reason: 'Registration cancelled in RegFox',
          })
          .eq('event_id', eventId)
          .in('attendee_id', slice)
          .in('status', ['assigned', 'active'])
          .select('uid');
        if (tagError) errors.push(`Credential retirement: ${tagError.message}`);
        else deactivatedCredentials += retired?.length ?? 0;
      }
    }


    const failedEverything = errors.length > 0 && newCount + updatedCount === 0;
    const finalStatus = failedEverything ? 'error' : errors.length > 0 ? 'partial' : 'success';

    await touch({
      status: finalStatus,
      total_records: usable.length,
      new_records: newCount,
      updated_records: updatedCount,
      error_message: errors.length ? errors.slice(0, 10).join(' | ') : null,
      sync_completed_at: new Date().toISOString(),
      progress_info: {
        processed: toUpsert.length,
        total: toUpsert.length,
        skipped_unchanged: skipped,
        planned_new: plannedNew,
        planned_updated: plannedUpdated,
        cancelled_missing_from_regfox: removedIds.length,
        credentials_deactivated: deactivatedCredentials,

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
    await requireAdmin(req);
    let body: Record<string, unknown> = {};
    try {
      const text = await req.text();
      if (text) body = JSON.parse(text);
    } catch {
      // an empty body is fine
    }

    const syncType = (body.sync_type as string) ?? 'manual_sync';

    const apiKey = Deno.env.get('REGFOX_API_KEY');
    if (!apiKey) throw new Error('REGFOX_API_KEY is not configured');

    // Each event owns its RegFox form, so the caller can target a specific
    // year; otherwise the currently active event is used.
    const target = await resolveSyncTarget(supabase, (body.event_id as string) ?? null);
    const { eventId, formId, warning: routingWarning } = target;

    const { data: syncId, error: lockError } = await supabase.rpc('begin_regfox_sync', {
      p_sync_type: syncType,
      p_event_id: eventId,
      p_progress_info: {
        processed: 0,
        total: 0,
        phase: 'starting',
        regfox_form_id: formId,
        event_name: target.eventName,
        routing_warning: routingWarning,
      },
    });
    if (lockError) throw new Error(`Failed to reserve sync: ${lockError.message}`);
    if (!syncId) {
      return new Response(
        JSON.stringify({ success: false, error: 'SYNC_IN_PROGRESS', skipped: true }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Keep running after the response is sent.
    // @ts-ignore EdgeRuntime is provided by the Supabase edge runtime.
    EdgeRuntime.waitUntil(runSync(supabase, String(syncId), eventId, apiKey, formId));

    return new Response(
      JSON.stringify({
        success: true,
        started: true,
        syncId,
        eventId,
        eventName: target.eventName,
        formId,
        warning: routingWarning,
        message: 'Sync started. Poll regfox_sync_log for progress.',
      }),
      { status: 202, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    const authResponse = authErrorResponse(error, corsHeaders);
    if (authResponse) return authResponse;
    const message = (error as Error).message;
    console.error('Failed to start RegFox sync:', message);
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});