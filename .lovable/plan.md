# Fix the Check-In Disconnect + Station-by-Station Verification

## What's actually happening with Jocelyn

There is only one database — but two different *event scopes* are being read at the same time.

Confirmed from the data:

- Jocelyn Mccants exists **three times**: two 2025 records (no wristband, waiver not signed) and one 2026 record (`QX6-AR4B`, status `active`, waiver signed, checked in 21:25 UTC today).
- The phone lookup used by self check-in (`lookup_attendees_by_phone` → server's active event) correctly returns the 2026 record: has wristband, active, waiver signed.
- Screens that query the tables directly filter on the **event picked in the browser**, which is stored in `localStorage` and sticks. Any device that ever viewed 2025 keeps reading 2025 rows — where Jocelyn has no wristband and no waiver. That renders exactly "needs credentials / not assigned / not checked in".

So: activation writes go to 2026 (server-decided), while the registration view read 2025 (device-decided). Same person, two different years.

A second, smaller inconsistency: some views compute "checked in" from `attendees.activated_at`, others from the wristband status. These disagree the moment a band is replaced or deactivated.

## Fixes

### 1. One event, everywhere
- The year switcher appears **only** on the Developer Dashboard and the admin/reporting views. It is removed from the global header, so stations, assignment, staff hub, activation and every other view always run on the live event.
- Any other year selected in dev/admin applies only while on those pages and never leaks into operational screens — operational pages always resolve to the active event, ignoring the stored device preference.
- The archived-data banner shows only on the dev/admin views where a past year can be selected.
- Never send a null/stale event id into a query: services get a resolved-event guard that throws (and logs) instead of silently returning "no rows".


### 2. One definition of "checked in"
- A single server-side status source: the wristband row is the truth (`assigned` = has credential, `active` = checked in), waiver flag from the attendee record.
- All list/detail/preview components read that same shape, so the assignment table, the registration/check-in preview, the staff hub, and the reports never disagree.

### 3. Duplicate people
- Add a staff-visible duplicate indicator on lookup: when the same phone or name matches more than one record in the current event, the picker shows both with order id and status so staff pick the right one instead of one being silently chosen.
- Cross-year duplicates are expected (same camper, new year) and stay separate.

## Station-by-station end-to-end pass

For each station: scan an assigned+active band, scan an assigned-but-not-active band, scan an unknown code, scan the same band twice fast, and scan with the network off.

| Station | Must verify |
| --- | --- |
| Assignment | Assign, edit, clear, replace (old band retired as lost, new band carries check-in), scan focus returns to input after every action |
| Activation / self check-in | Phone lookup returns current-year people only, pick-list selection, waiver gate blocks unsigned, "activate everyone" |
| Main gate | Entry/exit logged, inactive band denied with the reason shown |
| Meals | Per-meal-period counting, no double count within the lock window, meal plan respected |
| Drinks | Single increment per scan (double-scan guard), daily count accurate |
| T-shirts | Size captured, band uid stored on the transaction, one pickup per camper |
| Headphones / walkies / golf carts / fanny packs | Checkout and check-in pair correctly, outstanding-items report matches |
| Reports | Counts match the station transactions for the active event only |

Anything failing gets fixed in the same pass, with the checklist re-run.

## What else is missing

- **Deactivate/lost band at the gate**: staff need a fast "this band is void" action from the scanner, not only from the assignment page.
- **Waiver for a companion signing on someone else's phone**: currently one signature flow per person; confirm the group flow signs each person individually.
- **Unknown-code handling**: scanning a band that exists in 2025 but not 2026 should say "band from a previous year — reassign", not "not found".
- **Offline queue visibility**: the pending-sync banner exists on staff pages; add it to every station page so a runner sees pending scans wherever they are.

## Technical details

- `EventContext`: active-event default for operational routes, archived-mode banner, ignore stale `localStorage` id outside reporting.
- New RPC `attendee_status_for_event(attendee_ids uuid[])` (or a view) returning `{has_credential, credential_status, is_checked_in, waiver_signed}`; `optimizedStatusUtils`/`statusUtils` delegate to it.
- Guard in `src/lib/eventRuntime.ts`: `requireCurrentEventId()` used by every service query instead of `getCurrentEventId()`.
- Touched: `src/contexts/EventContext.tsx`, `src/lib/eventRuntime.ts`, `src/services/enhancedActivationService.ts`, `src/services/rfidLookupService.ts`, `src/utils/statusUtils.ts`, `src/utils/optimizedStatusUtils.ts`, station pages, `src/components/UnifiedStationScanner.tsx`.
