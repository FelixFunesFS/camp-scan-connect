import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

/**
 * Read-only JSON API for external automations (e.g. Make).
 *
 * Auth: `Authorization: Bearer <READONLY_API_KEY>` or `x-api-key: <key>`.
 * Only whitelisted tables and columns are exposed, and only SELECTs run.
 */
const TABLES: Record<string, { columns: string; timeColumn: string }> = {
  attendees: {
    columns:
      'id, event_id, first_name, last_name, email, phone, order_id, ticket_type, registration_status, payment_status, waiver_signed, checked_in_at, activated_at, most_recent_activation_at, most_recent_activation_method, is_veteran, created_at, updated_at',
    timeColumn: 'updated_at',
  },
  rfid_tags: {
    columns:
      'uid, event_id, attendee_id, status, credential_type, issued_at, activated_at, deactivated_at, activation_method',
    timeColumn: 'issued_at',
  },
  station_transactions: {
    columns:
      'id, event_id, attendee_id, station_type, transaction_type, rfid_uid, activation_method, current_status, created_at',
    timeColumn: 'created_at',
  },
  waiver_signatures: {
    columns: 'id, event_id, attendee_id, typed_name, signed_at, waiver_version',
    timeColumn: 'signed_at',
  },
  events: { columns: 'id, name, year, is_active, created_at', timeColumn: 'created_at' },
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const expected = Deno.env.get('READONLY_API_KEY');
  if (!expected) return json({ error: 'API key is not configured' }, 500);

  const provided =
    req.headers.get('x-api-key') ??
    (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');

  if (!provided || provided !== expected) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const url = new URL(req.url);
  const table = url.searchParams.get('table') ?? 'attendees';
  const spec = TABLES[table];
  if (!spec) {
    return json({ error: `Unknown table. Allowed: ${Object.keys(TABLES).join(', ')}` }, 400);
  }

  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') ?? 500) || 500, 1), 1000);
  const offset = Math.max(Number(url.searchParams.get('offset') ?? 0) || 0, 0);
  const since = url.searchParams.get('since');
  const eventId = url.searchParams.get('event_id');

  if (since && Number.isNaN(Date.parse(since))) {
    return json({ error: '`since` must be an ISO 8601 timestamp' }, 400);
  }
  if (eventId && !/^[0-9a-f-]{36}$/i.test(eventId)) {
    return json({ error: '`event_id` must be a UUID' }, 400);
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  let query = supabase
    .from(table)
    .select(spec.columns, { count: 'exact' })
    .order(spec.timeColumn, { ascending: false })
    .range(offset, offset + limit - 1);

  if (since) query = query.gte(spec.timeColumn, since);
  if (eventId && table !== 'events') query = query.eq('event_id', eventId);

  const { data, error, count } = await query;
  if (error) {
    console.error('Read-only query failed:', error.message);
    return json({ error: error.message }, 400);
  }

  return json({
    table,
    count: data?.length ?? 0,
    total: count ?? null,
    limit,
    offset,
    next_offset: (data?.length ?? 0) === limit ? offset + limit : null,
    data,
  });
});
