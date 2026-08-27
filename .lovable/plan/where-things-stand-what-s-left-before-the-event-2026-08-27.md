# Where things stand + what's left before the event

## Duplicate scans — status

Two guards are in place, verified in the code:

- **Client guard** (`UnifiedStationScanner`): an in-flight lock plus a 4-second "same band + same station + same action" commit window, reset when a different code is scanned. This is what stopped the barcode reader adding 2 drinks per scan.
- **Database guard**: every write carries a device-generated `client_scan_id`, and the unique index on `station_transactions.client_scan_id` makes a retried or offline-flushed write land exactly once.

Not covered (by design): the same camper scanned twice minutes apart, or on two different devices — those are genuinely distinct scans and remain a business rule, not a bug. If you want a hard rule (e.g. one drink per camper per hour, one t-shirt ever), that's a separate change.

## Remaining work from the hardening plan

1. **Offline queue placement** — the pending-sync banner is mounted in the station scanner only. Add it to the Staff Hub and the assignment page so a staffer sees pending counts wherever they're working.
2. **Wording sweep** — final pass on leftover user-facing "RFID" strings in staff panels and dialogs (Debrief page and code/DB internals stay as-is).
3. **End-to-end verification** — the part that actually matters now:
   - Assign a real band, confirm every view shows "assigned".
   - Walk each station (gate, meals, drinks, headphones, t-shirts, equipment) with one band; confirm one transaction per scan and correct daily counts.
   - Shared-phone activation with a real multi-person order: pick-list, partial select, "activate everyone", unsigned-waiver blocked.
   - Lost-band replace: old code retired as lost, new code assigned, check-in carried over, audit rows written.
   - Offline queue: throttle the network, scan, confirm the queued toast and banner, restore network, confirm flush with no duplicates.

## Technical details

- Files to touch: `src/components/StaffActivationHub.tsx`, `src/pages/RfidAssignment.tsx` (mount `OfflineQueueBadge`), plus string-only edits in staff panels.
- No schema changes needed; `client_scan_id` and `activate_selected_by_phone` are already live.
