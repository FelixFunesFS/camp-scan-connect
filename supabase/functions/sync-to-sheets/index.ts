import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/google_sheets/v4';
const PAGE_SIZE = 1000;
const MAX_ROWS = 50000;

type TableSpec = {
  tab: string;
  table: string;
  columns: string[];
  eventScoped: boolean;
  orderBy: string;
  ascending?: boolean;
};

const SPECS: TableSpec[] = [
  {
    tab: 'Attendees',
    table: 'attendees',
    eventScoped: true,
    orderBy: 'last_name',
    ascending: true,
    columns: [
      'id', 'event_id', 'first_name', 'last_name', 'email', 'phone', 'order_id',
      'ticket_type', 'site_location_assignment', 'meal_plan', 'arrival_day', 'arrival_window',
      'registration_status', 'status', 'waiver_signed', 'checked_in_at', 'activated_at',
      'deactivated_at', 'most_recent_activation_method', 'most_recent_activation_at',
      'is_veteran', 'early_access', 't_shirt_size', 'dietary_restrictions',
      'emergency_contact_name', 'emergency_contact_phone', 'city', 'state',
      'regfox_registration_id', 'regfox_order_id', 'created_at', 'updated_at',
    ],
  },
  {
    tab: 'Credentials',
    table: 'rfid_tags',
    eventScoped: true,
    orderBy: 'issued_at',
    columns: [
      'uid', 'event_id', 'attendee_id', 'status', 'credential_type', 'issued_at',
      'activated_at', 'deactivated_at', 'activation_method', 'reason',
    ],
  },
  {
    tab: 'Transactions',
    table: 'station_transactions',
    eventScoped: true,
    orderBy: 'created_at',
    columns: [
      'id', 'event_id', 'attendee_id', 'station_type', 'transaction_type', 'rfid_uid',
      'activation_method', 'current_status', 'daily_count', 'staff_id', 'extra_data', 'created_at',
    ],
  },
  {
    tab: 'Waivers',
    table: 'waiver_signatures',
    eventScoped: true,
    orderBy: 'signed_at',
    columns: [
      'id', 'event_id', 'attendee_id', 'typed_name', 'agreement_version', 'signed_by_self',
      'witnessed_by', 'name_match', 'signed_at', 'created_at',
    ],
  },
  {
    tab: 'Scans',
    table: 'scans',
    eventScoped: true,
    orderBy: 'scanned_at',
    columns: [
      'id', 'event_id', 'rfid_uid', 'location', 'action', 'result', 'reason',
      'device_id', 'staff_id', 'scanned_at',
    ],
  },
  {
    tab: 'Assistance',
    table: 'staff_assistance_requests',
    eventScoped: true,
    orderBy: 'created_at',
    columns: [
      'id', 'event_id', 'attendee_name', 'phone_number', 'email', 'issue_type',
      'error_message', 'priority', 'status', 'assigned_staff_id', 'resolution_notes',
      'resolved_at', 'created_at',
    ],
  },
  {
    tab: 'SyncLog',
    table: 'regfox_sync_log',
    eventScoped: true,
    orderBy: 'sync_started_at',
    columns: [
      'id', 'event_id', 'sync_type', 'status', 'total_records', 'new_records',
      'updated_records', 'error_message', 'sync_started_at', 'sync_completed_at',
    ],
  },
  {
    tab: 'Tasks',
    table: 'admin_tasks',
    eventScoped: false,
    orderBy: 'created_at',
    columns: [
      'id', 'title', 'description', 'task_type', 'category', 'priority', 'status',
      'assigned_to', 'created_by', 'estimated_hours', 'actual_hours', 'due_date',
      'completed_at', 'created_at', 'updated_at',
    ],
  },
  {
    tab: 'Events',
    table: 'events',
    eventScoped: false,
    orderBy: 'year',
    columns: ['id', 'name', 'year', 'starts_at', 'ends_at', 'is_active', 'regfox_form_id', 'created_at'],
  },
];

const ET = 'America/New_York';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') {
    // ISO timestamps -> Eastern Time for readability
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        return d.toLocaleString('en-US', { timeZone: ET, hour12: false });
      }
    }
    return value;
  }
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

async function gateway(
  path: string,
  init: { method?: string; body?: unknown } = {},
) {
  const res = await fetch(`${GATEWAY_URL}${path}`, {
    method: init.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
      'X-Connection-Api-Key': `${Deno.env.get('GOOGLE_SHEETS_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });

  const text = await res.text();
  if (!res.ok) {
    console.error(`Sheets gateway ${path} failed [${res.status}]: ${text}`);
    throw new Error(`[${res.status}] ${text}`);
  }
  return text ? JSON.parse(text) : {};
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startedAt = Date.now();

  try {
    if (!Deno.env.get('LOVABLE_API_KEY') || !Deno.env.get('GOOGLE_SHEETS_API_KEY')) {
      return json({ error: 'Google Sheets connector is not configured' }, 500);
    }

    const spreadsheetId = Deno.env.get('SHEETS_WORKBOOK_ID');
    if (!spreadsheetId) {
      return json({ error: 'SHEETS_WORKBOOK_ID is not configured' }, 500);
    }

    let body: Record<string, unknown> = {};
    try {
      const text = await req.text();
      if (text) body = JSON.parse(text);
    } catch {
      // empty body is fine
    }

    const requestedTabs = Array.isArray(body.tables)
      ? (body.tables as string[])
      : null;
    const specs = requestedTabs
      ? SPECS.filter((s) => requestedTabs.includes(s.tab))
      : SPECS;

    if (specs.length === 0) return json({ error: 'No valid tables requested' }, 400);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Resolve event scope
    let eventId = typeof body.event_id === 'string' ? body.event_id : null;
    if (!eventId) {
      const { data } = await supabase
        .from('events')
        .select('id')
        .eq('is_active', true)
        .maybeSingle();
      eventId = data?.id ?? null;
    }

    // Ensure all tabs exist
    const meta = await gateway(`/spreadsheets/${spreadsheetId}`);
    const existing = new Set<string>(
      (meta.sheets ?? []).map((s: any) => s.properties?.title),
    );
    const missing = [...specs.map((s) => s.tab), '_Meta'].filter(
      (t) => !existing.has(t),
    );
    if (missing.length > 0) {
      await gateway(`/spreadsheets/${spreadsheetId}:batchUpdate`, {
        method: 'POST',
        body: {
          requests: missing.map((title) => ({ addSheet: { properties: { title } } })),
        },
      });
    }

    const results: Array<{ tab: string; rows: number; truncated: boolean; error?: string }> = [];

    for (const spec of specs) {
      try {
        const rows: string[][] = [];
        let from = 0;
        let truncated = false;

        while (rows.length < MAX_ROWS) {
          let query = supabase
            .from(spec.table)
            .select(spec.columns.join(', '))
            .order(spec.orderBy, { ascending: spec.ascending ?? false, nullsFirst: false })
            .range(from, from + PAGE_SIZE - 1);

          if (spec.eventScoped && eventId) query = query.eq('event_id', eventId);

          const { data, error } = await query;
          if (error) throw new Error(error.message);
          if (!data || data.length === 0) break;

          for (const record of data as Record<string, unknown>[]) {
            rows.push(spec.columns.map((c) => formatCell(record[c])));
          }

          if (data.length < PAGE_SIZE) break;
          from += PAGE_SIZE;
        }

        if (rows.length > MAX_ROWS) {
          truncated = true;
          rows.length = MAX_ROWS;
        }

        // Clear then write the full mirror
        await gateway(`/spreadsheets/${spreadsheetId}/values/${spec.tab}!A:ZZ:clear`, {
          method: 'POST',
          body: {},
        });
        await gateway(
          `/spreadsheets/${spreadsheetId}/values/${spec.tab}!A1?valueInputOption=RAW`,
          { method: 'PUT', body: { values: [spec.columns, ...rows] } },
        );

        results.push({ tab: spec.tab, rows: rows.length, truncated });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`Failed syncing ${spec.tab}:`, message);
        results.push({ tab: spec.tab, rows: 0, truncated: false, error: message });
      }
    }

    const finishedAt = new Date();
    const durationMs = Date.now() - startedAt;

    // _Meta tab
    const metaRows = [
      ['Last sync (ET)', finishedAt.toLocaleString('en-US', { timeZone: ET, hour12: false })],
      ['Event id', eventId ?? 'all'],
      ['Duration (ms)', String(durationMs)],
      ['', ''],
      ['Tab', 'Rows', 'Truncated', 'Error'],
      ...results.map((r) => [r.tab, String(r.rows), r.truncated ? 'yes' : '', r.error ?? '']),
    ];
    try {
      await gateway(`/spreadsheets/${spreadsheetId}/values/_Meta!A:ZZ:clear`, {
        method: 'POST',
        body: {},
      });
      await gateway(
        `/spreadsheets/${spreadsheetId}/values/_Meta!A1?valueInputOption=RAW`,
        { method: 'PUT', body: { values: metaRows } },
      );
    } catch (err) {
      console.error('Failed writing _Meta:', err);
    }

    return json({
      success: results.every((r) => !r.error),
      spreadsheet_id: spreadsheetId,
      spreadsheet_url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
      event_id: eventId,
      duration_ms: durationMs,
      synced_at: finishedAt.toISOString(),
      results,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('sync-to-sheets failed:', message);
    return json({ error: 'Sheets sync failed', details: message }, 500);
  }
});
