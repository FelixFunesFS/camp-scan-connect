# Pre-Event Readiness Review — Assignment, Scanning, Stations

Verified against the live 2026 event today: 694 attendees, 335 waivers signed (359 unsigned), 2 credential records total (1 assigned, 0 active), 0 station transactions. Nothing has been run for real yet, so this is the right moment to fix the defects below before wristband assignment starts.

## How to think about the system

Three gates, in order. Every station question reduces to "which gate failed?"

```text
REGISTRATION  ->  ASSIGNMENT      ->  ACTIVATION        ->  STATION SCAN
(RegFox sync)     (band -> person)    (waiver + arrival)    (service given)
 attendee row      status=assigned     status=active         transaction row
```

- Assignment is a pre-event, staff-only, bulk task. It never grants access.
- Activation is the check-in moment: waiver signed + band assigned -> active.
- Stations only ask one question: is this band active, and has this person already had this thing today?

Each station is the same scanner with a different transaction type and a different repeat rule:

| Station | Repeat rule to confirm |
|---|---|
| Main Gate | unlimited entry/exit, direction toggling |
| Meals | one per meal slot per day |
| Drinks | daily allowance count |
| T-Shirts | once per attendee, ever |
| Headphones / Walkies / Golf Carts / Fanny Packs | checkout must pair with check-in |

## Confirmed defects to fix

1. **Readiness flag mismatch.** `rfidService.checkAttendeeReadiness` compares `activation_status === 'activate'`, but the database returns `'active'` / `'inactive'`. `hasActivation` is always false, so stations show the wrong prompt even for a valid band.
2. **Readiness assignment flag mismatch.** Same function checks `rfid_status !== 'unassigned'`, but the database returns `'none'` when there is no band. Unassigned bands read as assigned.
3. **Check-in reports count zero.** `CheckInOverview` filters `activation_method === 'self'` / `'staff'`, but stored values are `self_activated` / `staff_assisted`. Self vs staff split will read 0/0 all weekend.
4. **Non-standard activation methods written.** `staff_override` (station scanner), `pre_assignment` and `edit_assignment` (enhanced assignment cell), `staff_remaining` (staff hub) are written into activation-method fields that are supposed to hold only `self_activated` or `staff_assisted`. This pollutes every activation report.
5. **Assignment writes no event scoping.** `RfidAssignmentCell` and the station transaction service insert rows without `event_id`, relying on a hardcoded 2026 column default. Correct this year, silently wrong the moment a 2027 event is created.
6. **Two competing assignment cells.** `RfidAssignmentCell` and `EnhancedRfidAssignmentCell` implement assignment differently (different logging, different clearing behaviour). One must be retired so assignment behaves identically everywhere.
7. **Reassignment leaves the old band usable.** Clearing sets a tag back to `unissued` but does not record why, and a replaced band keeps history that reports read as a second person.

## Open edge cases to decide

- **Shared phone numbers:** 61 phone numbers cover more than one attendee and 22 cover more than one order. Phone activation currently activates the whole order. Decide: activate everyone on the phone, or show a pick-list.
- **359 unsigned waivers** arriving at the gate. Decide the physical flow: sign on a staff tablet, or on the attendee's own phone via a link.
- **Walk-ups and transfers:** no in-app path to create an attendee who is not in RegFox, or move a band from one person to another with an audit trail.
- **Lost / broken band mid-event:** replacement flow exists in fragments; needs one obvious staff action that deactivates the old and issues the new.
- **Offline / weak signal at gate:** every scan is a live database write today. Decide whether that risk is accepted or a queue is needed.
- **Wrong-station scan:** scanning a meal band at drinks currently just records the wrong transaction type; no confirmation of what is about to be given.
- **Duplicate scans across devices:** the 4-second guard is per browser tab, so two staff scanning the same band at the same station within seconds both commit.

## Verbiage pass

The codebase still mixes "RFID", "code", "credential", "wristband", "tag". Standardise on: **wristband** in anything staff or attendees read, **credential** in code and data labels, and drop "RFID" from all user-facing text including error messages, placeholders, and the Assignment page FAQ.

## Test plan before the event

A written station-by-station test script, run against a small set of real bands:

1. Assign 5 bands, confirm all badges read Assigned in table, mobile card, group view, and site-location view.
2. Try to activate a waiver-unsigned attendee — must be blocked with a clear reason.
3. Sign that waiver in-app, re-activate — must succeed and show as staff assisted.
4. Activate by phone for a shared-phone order — confirm the decided behaviour.
5. Scan the same band twice at each station — confirm the repeat rule for that station.
6. Scan an unassigned band, a cleared band, and an unknown code at each station — confirm three distinct, plain-English messages.
7. Check out and check in each equipment type; confirm outstanding-item reporting.
8. Clear a band and reassign it to a different person; confirm reports attribute history correctly.
9. Confirm the check-in overview, recently-checked-in and on-site reports all agree after the above.

## Technical notes

- Fixes 1-3 are one-line comparison corrections in `src/services/rfidService.ts` and `src/components/reports/CheckInOverview.tsx`.
- Fix 4 routes override/assignment context into `station_transactions.extra_data` and keeps `activation_method` to the two allowed values.
- Fix 5 adds explicit `event_id: getCurrentEventId()` to every insert in `RfidAssignmentCell`, `EnhancedRfidAssignmentCell`, and `stationTransactionService`.
- Fix 6 consolidates on the enhanced cell and deletes the legacy one after porting its clearing behaviour.
- Cross-device duplicate protection needs a database-side guard (unique-per-window index or an RPC that checks the last transaction) rather than a client ref.

## Suggested order

1. Correctness fixes 1-5 (small, unblock accurate testing).
2. Verbiage pass and assignment-cell consolidation.
3. Decisions on the open edge cases, then build walk-up/transfer and lost-band flows.
4. Run the test script end to end and fix what it surfaces.
