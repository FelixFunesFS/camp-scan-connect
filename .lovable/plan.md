# Pre-Event Hardening: Pick-List Activation, Band Replacement, Offline Scan Queue

Three approved workstreams based on your decisions. Walk-up/transfer creation is **out of scope** (not needed).

## 1. Shared-Phone Activation: Pick-List + "Activate All"

61 phone numbers map to multiple attendees (group orders). Today, phone activation is all-or-nothing per order.

- **Activation Station / Mobile Activation Preview**: after phone lookup returns multiple people, show a checklist of the order members with per-person status chips (Signed / Unsigned waiver, Has band / Needs band, Already active).
- Staff/attendee checks individual people, or taps **"Activate everyone"** as a shortcut.
- Only eligible people activate: unsigned-waiver people stay blocked with the existing "Sign waiver to continue" flow; activation runs through the existing `activate_entire_order_by_phone` path but scoped to the selected attendee set (new DB function `activate_selected_by_phone(p_phone, p_attendee_ids uuid[], p_method)` reusing the same waiver/band gates, warnings, and transaction logging).
- Per-person result rows after activation (activated / already active / blocked + reason), matching current behavior.

## 2. Lost Wristband: Replace + Retire

- **Assignment page + Staff Hub**: "Replace band" action on an assigned/active attendee.
- Flow: scan/type the new code → confirm → old tag set to `status = 'lost'` with `reason` (required note field, e.g. "lost at gate"), new tag assigned (`status = 'assigned'`, same event), and if the old band was active, the new band is activated immediately with method `staff_assisted`.
- Audit: log `rfid_assign` + `deactivate`/`activate` transactions in `station_transactions` with `extra_data.reason` so the debrief/reporting can see replacements.
- Safety: block replacing with a code already assigned to someone else (unique check + friendly error).

## 3. Offline Scan Queue for Stations

Scans currently fail silently-ish when connectivity drops. Add a device-local queue:

- **Queue store**: `localStorage`-backed queue keyed per device/station (`src/lib/offlineScanQueue.ts`). On scan, attempt live write first; on network failure, push `{station, transaction fields, queued_at}` to the queue and show a queued confirmation to the operator (scan still "counts" for the camper in the moment).
- **Sync worker**: on reconnect (online event + interval retry), flush queue in order with idempotency key `client_scan_id` (uuid per scan) to prevent duplicates on retry. Failed rows surface in a small station banner ("3 scans pending sync") with manual "Retry now".
- **Database**: add `client_scan_id uuid` column to `station_transactions` with a **unique index** — this also fixes the cross-device double-scan concern at the DB level for retried writes (in-event duplicates like 2 drinks remain a business rule, already handled by the 4s client guard + dedupe on the same key).
- **UI**: pending-count badge on station pages and the Staff Hub; queued scans appear in station history with a "pending" state once flushed (server timestamp preserved as `created_at`, `extra_data.queued_at` keeps original scan time).

## 4. Wording + Verification

- Replace any remaining user-facing "RFID" strings touched by these flows ("wristband" / "code"); Debrief page and code/DB internals stay as-is.
- Verify: build clean, phone pick-list flow with a real shared number (e.g. multi-attendee order), replace-band flow end-to-end, offline queue by throttling network in the browser and confirming flush on reconnect.

## Technical details

- New DB function: `activate_selected_by_phone(text, uuid[], text)` — mirrors `activate_entire_order_by_phone` gating (waiver signed, band assigned) but iterates the provided attendee set.
- Migration: `station_transactions.client_scan_id uuid` + unique partial index `WHERE client_scan_id IS NOT NULL`.
- Files (expected): `src/pages/ActivationStation.tsx`, `src/components/MobileActivationPreview.tsx`, `src/components/EnhancedRfidAssignmentCell.tsx`, `src/components/StaffActivationHub.tsx`, new `src/lib/offlineScanQueue.ts`, `src/services/stationTransactionService.ts` (idempotent insert path), `src/services/rfidService.ts` (replaceBand).
- Existing enums reused: `tag_status` already has `lost`; `transaction_type` already has `rfid_assign`, `activate`, `deactivate` — no enum changes needed.

## Out of scope

- Walk-up / transfer attendee creation (you confirmed not needed).
- Emailing waiver receipts (deferred earlier; storage-first remains).
