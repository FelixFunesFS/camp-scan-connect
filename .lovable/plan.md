# Sync All Tables to Google Sheets (Native Connector)

## Goal
Push every reportable table from the Lovable Cloud database into a single Google Sheets workbook using the native Google Sheets connector — one tab per table, read-only from the Sheets side, refreshed on demand and on a schedule.

## What exists today
- Lovable Cloud backend holds `attendees`, `rfid_tags`, `station_transactions`, `waiver_signatures`, `scans`, `staff_assistance_requests`, `regfox_sync_log`, `admin_tasks`, and `events`.
- A `public-read-only` Edge Function already exposes a whitelisted subset over HTTP with an API key (used by Make).
- No Google Sheets connection exists in this workspace yet; the `google_sheets` connector is available and gateway-backed.

## Approach
The database pushes to Sheets. An Edge Function reads each table with the service-role client and writes the rows into a dedicated tab in one workbook through the connector gateway. Google Sheets never holds database credentials.

```text
Lovable Cloud DB  ->  sync-to-sheets Edge Function  ->  Connector Gateway  ->  Google Sheets workbook
                                                                              Attendees / Credentials /
                                                                              Transactions / Waivers /
                                                                              Scans / Assistance /
                                                                              Sync Log / Tasks / Events
```

## Tables and tabs

| Tab | Source table | Event-scoped | Notes |
|---|---|---|---|
| Attendees | `attendees` | yes | Core roster; largest table (~700 rows/year) |
| Credentials | `rfid_tags` | yes | Wristband/barcode assignment and status |
| Transactions | `station_transactions` | yes | Every station scan; grows fastest |
| Waivers | `waiver_signatures` | yes | In-app signatures only |
| Scans | `scans` | yes | Raw allow/deny scan log |
| Assistance | `staff_assistance_requests` | yes | Staff help queue |
| SyncLog | `regfox_sync_log` | yes | RegFox sync history |
| Tasks | `admin_tasks` | no | Admin/ops task list |
| Events | `events` | no | Year lookup table |

Each tab is fully replaced on every sync (clear then write), so the sheet is always an exact mirror rather than an append-only log. Columns are explicit per table — no `SELECT *` — so a schema change never silently shifts columns.

## Implementation steps

1. **Link the Google Sheets connector**
   - Connect `google_sheets` and link it to this project so the gateway credentials are available server-side.

2. **Choose or create the workbook**
   - Staff create one spreadsheet in the connected Google account's Drive and share the ID.
   - The function creates any missing tabs automatically via `batchUpdate` `addSheet`.
   - The spreadsheet ID is stored as a backend secret (`SHEETS_WORKBOOK_ID`) rather than passed from the browser.

3. **Build the `sync-to-sheets` Edge Function**
   - Verifies the caller is an authenticated staff user before doing anything.
   - Accepts optional `tables` (defaults to all) and `event_id` (defaults to the active event).
   - For each table: page through rows in batches of 1000, map to a fixed column list, flatten JSON columns to strings, format timestamps in Eastern Time.
   - Ensures the tab exists, clears it, then writes header + rows with a single `values` update.
   - Writes a `_Meta` tab recording last sync time, event, per-table row counts, and any errors.
   - Surfaces the gateway's status and body verbatim on failure instead of a generic 500.

4. **Add a Sync panel in the Developer Dashboard**
   - New card under Debug Tools: table checkboxes (all selected by default), event-year selector, and a "Sync now" button.
   - Shows per-table row counts, duration, last-sync timestamp, and a link to the workbook.
   - Disables the button while a sync is running to prevent overlapping writes.

5. **Schedule the sync**
   - Once manual runs are verified, add a scheduled trigger: hourly outside the event, every 15 minutes during event dates.
   - Sync is idempotent (full replace), so a missed or repeated run is harmless.

## Guardrails
- Sheets has a 10 million cell limit per workbook. Transactions and scans are the only tables that could approach it; the function caps each tab at a configurable row limit (default 50,000, newest first) and notes truncation in `_Meta`.
- The workbook is a mirror: edits made in Sheets are overwritten on the next sync. Any analysis should live in a separate workbook that references this one.
- No PII is added beyond what the tables already contain; the workbook stays private to the organizing team.
- The existing `public-read-only` endpoint and its Make integration are untouched.

## Technical details
- Gateway base: `https://connector-gateway.lovable.dev/google_sheets/v4`
- Write: `PUT /spreadsheets/{id}/values/{Tab}!A1?valueInputOption=RAW`
- Clear: `POST /spreadsheets/{id}/values/{Tab}!A:ZZ:clear`
- Tab creation: `POST /spreadsheets/{id}:batchUpdate` with `addSheet`
- Range strings are not URL-encoded (the `!` and `:` must stay literal).
- Auth headers are `Authorization: Bearer <LOVABLE_API_KEY>` plus the connector key — server-side only.
