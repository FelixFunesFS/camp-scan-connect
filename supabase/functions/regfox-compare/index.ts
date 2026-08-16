import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  buildOrderAccommodations,
  corsHeaders,
  fetchAllRegistrants,
  isAbandoned,
  mapRegistrant,
  resolveSyncTarget,
} from '../_shared/regfox.ts';

/**
 * Server-side RegFox <-> database comparison.
 *
 * The RegFox API key never leaves the edge runtime: the browser only receives
 * aggregated totals and a discrepancy list.
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

    let body: Record<string, unknown> = {};
    try {
      const text = await req.text();
      if (text) body = JSON.parse(text);
    } catch {
      // no body is fine
    }

    const target = await resolveSyncTarget(
      supabase,
      typeof body.eventId === 'string' ? body.eventId : null,
    );

    const apiKey = Deno.env.get('REGFOX_API_KEY');
    if (!apiKey) throw new Error('REGFOX_API_KEY is not configured');

    const registrants = (await fetchAllRegistrants(apiKey, target.formId)).filter(
      (r) => !isAbandoned(r.status),
    );
    const orderAccommodations = buildOrderAccommodations(registrants);

    const emptyBreakdown = () => ({ dry_site: 0, glamping: 0, cabin: 0, rv_site: 0 });
    const bump = (b: Record<string, number>, type: string) => {
      if (type in b) b[type] += 1;
    };

    const regfoxBreakdown = emptyBreakdown();
    const regfoxIds = new Set<string>();
    for (const r of registrants) {
      try {
        const mapped = mapRegistrant(r, target.eventId, orderAccommodations);
        regfoxIds.add(String(mapped.regfox_registration_id));
        bump(regfoxBreakdown, String(mapped.ticket_type));
      } catch {
        regfoxIds.add(String(r.id));
      }
    }

    const { data: attendees, error: attendeesError } = await supabase
      .from('attendees')
      .select(
        'id, first_name, last_name, order_id, ticket_type, activated_at, registration_status, regfox_registration_id',
      )
      .eq('event_id', target.eventId)
      .eq('registration_status', 'registered');
    if (attendeesError) throw new Error(attendeesError.message);

    const rows = attendees ?? [];

    const { count: withCredentials } = await supabase
      .from('rfid_tags')
      .select('attendee_id', { count: 'exact', head: true })
      .eq('event_id', target.eventId)
      .not('attendee_id', 'is', null);

    const { data: lastSyncRow } = await supabase
      .from('regfox_sync_log')
      .select('sync_completed_at')
      .eq('status', 'success')
      .order('sync_completed_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const dbBreakdown = emptyBreakdown();
    for (const a of rows) bump(dbBreakdown, String(a.ticket_type));

    const database = {
      total_attendees: rows.length,
      unique_orders: new Set(rows.filter((a) => a.order_id).map((a) => a.order_id)).size,
      with_order_ids: rows.filter((a) => a.order_id && a.order_id !== '').length,
      ticket_breakdown: dbBreakdown,
      activated_count: rows.filter((a) => a.activated_at).length,
      with_rfid: withCredentials ?? 0,
      last_sync: lastSyncRow?.sync_completed_at ?? null,
    };

    const regfox = {
      total_attendees: registrants.length,
      ticket_breakdown: regfoxBreakdown,
      last_updated: new Date().toISOString(),
    };

    const dbIds = new Set(
      rows.map((a) => a.regfox_registration_id).filter(Boolean).map((v) => String(v)),
    );

    const discrepancies: Record<string, unknown>[] = [];
    for (const r of registrants) {
      const id = String(r.id);
      if (!dbIds.has(id)) {
        discrepancies.push({
          type: 'missing_in_db',
          regfox_id: id,
          // deno-lint-ignore no-explicit-any
          attendee_name: `${(r as any).firstName ?? ''} ${(r as any).lastName ?? ''}`.trim(),
          details: 'Exists in RegFox but not in the database',
          impact: 'high',
        });
      }
    }
    for (const a of rows) {
      const id = a.regfox_registration_id ? String(a.regfox_registration_id) : null;
      if (id && !regfoxIds.has(id)) {
        discrepancies.push({
          type: 'extra_in_db',
          regfox_id: id,
          attendee_name: `${a.first_name} ${a.last_name}`,
          details: 'Exists in the database but not in RegFox',
          impact: 'medium',
        });
      }
    }

    const ticket_differences = {
      dry_site: dbBreakdown.dry_site - regfoxBreakdown.dry_site,
      glamping: dbBreakdown.glamping - regfoxBreakdown.glamping,
      cabin: dbBreakdown.cabin - regfoxBreakdown.cabin,
      rv_site: dbBreakdown.rv_site - regfoxBreakdown.rv_site,
    };
    const total_difference = database.total_attendees - regfox.total_attendees;

    return new Response(
      JSON.stringify({
        success: true,
        event: { id: target.eventId, name: target.eventName },
        comparison: {
          database,
          regfox,
          discrepancies: { total_difference, ticket_differences },
          sync_needed:
            total_difference !== 0 ||
            Object.values(ticket_differences).some((d) => d !== 0),
        },
        discrepancy_list: discrepancies,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    const message = (error as Error).message;
    console.error('RegFox compare failed:', message);
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
