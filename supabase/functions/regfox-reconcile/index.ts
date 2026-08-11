import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  ACTIVE_EVENT_FALLBACK,
  corsHeaders,
  fetchAllRegistrants,
  isAbandoned,
  mapRegistrant,
} from '../_shared/regfox.ts';

/**
 * Compares the live RegFox roster against the database without writing
 * anything. This is the pre-doors-open confidence check.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const apiKey = Deno.env.get('REGFOX_API_KEY');
    const formId = Deno.env.get('REGFOX_FORM_ID');
    if (!apiKey) throw new Error('REGFOX_API_KEY is not configured');
    if (!formId) throw new Error('REGFOX_FORM_ID is not configured');

    const { data: activeEvent } = await supabase
      .from('events')
      .select('id, name')
      .eq('is_active', true)
      .maybeSingle();
    const eventId = activeEvent?.id ?? ACTIVE_EVENT_FALLBACK;

    const registrants = (await fetchAllRegistrants(apiKey, formId)).filter(
      (r) => !isAbandoned(r.status),
    );

    const { data: rows, error } = await supabase
      .from('attendees')
      .select('id, regfox_registration_id, first_name, last_name, email, phone, ticket_type')
      .eq('event_id', eventId);
    if (error) throw new Error(error.message);

    const dbById = new Map<string, Record<string, unknown>>();
    for (const row of rows ?? []) {
      if (row.regfox_registration_id) {
        dbById.set(row.regfox_registration_id as string, row);
      }
    }

    const remoteIds = new Set(registrants.map((r) => String(r.id)));

    // In RegFox but not in our database.
    const missingLocally = registrants
      .filter((r) => !dbById.has(String(r.id)))
      .map((r) => {
        const m = mapRegistrant(r, eventId);
        return {
          regfox_registration_id: m.regfox_registration_id,
          name: `${m.first_name} ${m.last_name}`.trim(),
          email: m.email,
          ticket_type: m.ticket_type,
        };
      });

    // In our database but no longer in RegFox (deleted or refunded away).
    const orphanedLocally = (rows ?? [])
      .filter((r) => r.regfox_registration_id && !remoteIds.has(r.regfox_registration_id as string))
      .map((r) => ({
        id: r.id,
        regfox_registration_id: r.regfox_registration_id,
        name: `${r.first_name} ${r.last_name}`.trim(),
        email: r.email,
      }));

    // Rows never linked to a RegFox record at all (walk-ups, manual adds).
    const unlinkedLocally = (rows ?? [])
      .filter((r) => !r.regfox_registration_id)
      .map((r) => ({ id: r.id, name: `${r.first_name} ${r.last_name}`.trim(), email: r.email }));

    // Suspected duplicates: same normalised name + email appearing twice.
    const seen = new Map<string, string[]>();
    for (const r of rows ?? []) {
      const key = `${String(r.first_name ?? '').toLowerCase().trim()}|${String(r.last_name ?? '').toLowerCase().trim()}|${String(r.email ?? '').toLowerCase().trim()}`;
      if (!key.replace(/\|/g, '')) continue;
      seen.set(key, [...(seen.get(key) ?? []), r.id as string]);
    }
    const duplicates = [...seen.entries()]
      .filter(([, ids]) => ids.length > 1)
      .map(([key, ids]) => ({ key, attendee_ids: ids, count: ids.length }));

    // Ticket-type counts on both sides.
    const countByTicket = (list: string[]) =>
      list.reduce<Record<string, number>>((acc, t) => {
        acc[t] = (acc[t] ?? 0) + 1;
        return acc;
      }, {});

    const regfoxTickets = countByTicket(
      registrants.map((r) => mapRegistrant(r, eventId).ticket_type),
    );
    const dbTickets = countByTicket((rows ?? []).map((r) => String(r.ticket_type)));

    return new Response(
      JSON.stringify({
        success: true,
        event: { id: eventId, name: activeEvent?.name ?? null },
        totals: {
          regfox: registrants.length,
          database: rows?.length ?? 0,
          difference: registrants.length - (rows?.length ?? 0),
        },
        ticket_breakdown: { regfox: regfoxTickets, database: dbTickets },
        missing_locally: missingLocally,
        orphaned_locally: orphanedLocally,
        unlinked_locally: unlinkedLocally,
        duplicates,
        in_sync:
          missingLocally.length === 0 &&
          orphanedLocally.length === 0 &&
          duplicates.length === 0,
        checked_at: new Date().toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    const message = (error as Error).message;
    console.error('RegFox reconcile failed:', message);
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});