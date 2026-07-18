
# Melanated Campout Signature 2026 — Readiness Plan

## Current state (verified)
- Lovable Cloud database is **empty**: 0 attendees, 0 rfid_tags, 0 station_transactions, 0 scans. The historical event data lives in the previous (external) Supabase project the app used before Cloud was enabled — nothing from prior events is currently live here.
- Schema itself is intact (attendees, rfid_tags, station_transactions, scans, staff, staff_assistance_requests, regfox_sync_log) but has **no `event_id` / `year` column** anywhere yet.
- `regfox-scheduled-sync` and `regfox-sync` edge functions exist. No webhook endpoint exists yet.
- All station scanners are built around RFID UID reads (rfid_tags table, rfid_uid on transactions/scans). No QR pipeline yet.

## Phase 1 — Multi-year foundation + historical migration

1. Add an `events` table (`id`, `name`, `year`, `starts_at`, `ends_at`, `is_active`) with rows for the prior event(s) and one for **Melanated Campout Signature 2026**.
2. Add `event_id uuid references events(id)` to `attendees`, `rfid_tags`, `station_transactions`, `scans`, `staff_assistance_requests`. Backfill all existing (once migrated) rows to the correct historical event. Index each `event_id`.
3. Add a global `EventContext` in the admin UI + a year/event dropdown in the top bar. Every list query, report, and CSV export filters by the selected `event_id`. Default = active event (2026).
4. Migrate historical data from the old Supabase project into Cloud. Requires the old project's DB URL or a CSV/SQL export (you'll need to provide access or the dump — service-role credentials for the old project aren't reachable from Cloud). Migration order: attendees → rfid_tags → station_transactions → scans → staff_assistance_requests, tagged with the correct historical `event_id`.

## Phase 2 — RegFox ingestion for 2026

1. **Webhook** — new edge function `regfox-webhook` (public, signature-verified with a shared secret). RegFox posts on registration create/update/cancel → upsert into `attendees` for the active event. You'll register the webhook URL + shared secret inside RegFox.
2. **Hourly reconciliation** — extend `regfox-scheduled-sync` to run hourly via `pg_cron`, diffing the full RegFox roster against attendees to catch anything the webhook missed (edits, refunds, late adds). Writes to `regfox_sync_log`.
3. Admin panel gains a "RegFox Sync" status card: last webhook received, last reconciliation, drift count.

Recommendation for the invoice: both together, because webhook-only misses edits and sync-only lags by minutes at check-in.

## Phase 3 — QR replaces RFID

Since QR is replacing RFID entirely for 2026, the changes touch every station:

1. **Data model** — add `qr_code text unique` to `attendees` (or a `credentials` table if you'll issue replacements). Generate a signed short code per attendee at registration ingest time. Keep `rfid_tags` intact for historical years.
2. **Scanner component** — new `QrScanner` (camera-based, using existing browser MediaDevices API; `CameraBraceletScanner.tsx` is a good starting point). Replace `RfidScanner` / `StationRfidScanner` usage at each station: Main Gate, Check-in, Activation, Meal, Drinks, Headphones, T-Shirts, Fanny Packs, Walkie Talkies, Golf Carts, RFID Assignment (renamed to "Credential Assignment").
3. **Lookup layer** — `rfidLookupService` and `stationTransactionService` gain a `lookupByQr(code)` path; transactions store the code in a new `qr_code` column alongside the legacy `rfid_uid` (null for 2026).
4. **Printed credentials** — admin can bulk-generate a PDF/PNG sheet of QR badges per attendee (uses existing attendee export flow).
5. **Assignment / activation flow** — simplified: scan QR → confirm attendee → activate. No pre-assignment step needed (QR is printed with the badge).

## Technical details

- New tables/columns via migration tool (with GRANTs + RLS).
- Webhook function: `verify_jwt = false`, HMAC signature check against `REGFOX_WEBHOOK_SECRET` (you'll provide when we wire it up).
- `pg_cron` + `pg_net` enabled for hourly reconciliation.
- QR generation: `qrcode` npm package client-side for badge printing; scanning via `@zxing/browser` or `html5-qrcode`.
- No changes to `src/integrations/supabase/client.ts` or `types.ts` (auto-generated).

## Suggested rough sizing for your invoice

| Phase | Scope | Est. effort |
|---|---|---|
| 1 | Events table + event_id everywhere + year dropdown + historical migration | 2–3 days |
| 2 | RegFox webhook + hourly reconciliation + sync status UI | 1–2 days |
| 3 | QR replaces RFID across all stations + badge PDF generation + assignment flow rework | 4–6 days |
| QA | End-to-end dry run with staged data | 1 day |
| **Total** | | **~8–12 working days** |

QR portion alone (Phase 3): **4–6 days**. Add ~1 day if you also want offline-capable scanning for spotty venue wifi.

## Open items before I build

- Access to the previous Supabase project (DB URL or a full export) so historical data can be migrated. Without it, Phase 1 ships schema + year dropdown but no history.
- Confirm RegFox form ID for 2026 is the same as `REGFOX_FORM_ID` currently stored, or a new one.
- Confirm the QR content: signed opaque code (recommended) vs plain attendee UUID vs order ID.
