# Fix: scanned band not found at stations (Jocelyn Mccants)

## What the database actually shows

Jocelyn Mccants has one 2026 record (`7308680d…`) with:
- credential `QX6-AR4B`, `credential_type = barcode`, status **active**
- waiver signed, `checked_in_at` and `activated_at` = 2026-08-27 21:25 UTC

So in the current event she is assigned **and** activated. There are also two older "Jocelyn/jocelyn mccants" rows, but both belong to the archived 2025 event, so they are not what stations read.

## Why the scan did not pick her up

The station scan path (`rfidService.findAttendeeByRfid`) does an exact, case-sensitive match:

```
.eq('event_id', getCurrentEventId())
.eq('uid', uid)              // raw value from the reader, no trim/uppercase
.in('status', ['assigned','active'])
.single()
```

The server-side `credential_lookup` RPC does `upper(trim(uid))` — and it finds her from `qx6-ar4b` — while the station query does not. Anything the reader emits with different case, a leading/trailing space, or an invisible suffix character misses the row and the station reports "not found". The RPC is currently only used to build the *error message*, never to resolve the scan, so the two paths can disagree — which is exactly the symptom you saw.

Secondary contributors to check in the same pass:
- `.single()` throws (and returns null) if a camper somehow has two rows in `assigned`/`active`, producing the same "not found".
- `getCurrentEventId()` on the client vs the server's active event — if the client value is stale the query is scoped to the wrong year.
- The registration view's "assigned, not checked in" reading is consistent with her state *before* 21:25 activation; a stale cached list would keep showing it after. Refresh-on-focus needs confirming rather than assuming a bug.

## Plan

1. **One resolver for every scan.** Replace `findAttendeeByRfid`'s hand-rolled query with a call to the `credential_lookup` RPC (case/whitespace-normalised, event-aware, reports `wrong_event` and retired statuses), then hydrate attendee details from the returned `attendee_id`. Every station, the assignment page, and the staff hub go through this one function.
2. **Normalise at capture.** Trim and uppercase in `normalizeCredential`, and apply it in the keyboard-wedge capture, the camera scanner, and manual entry so the same string is used for lookup and for storage.
3. **Normalise at write.** Uppercase/trim the uid when assigning a band so no mixed-case rows can be created going forward; add a one-off data pass to uppercase existing `rfid_tags.uid` values.
4. **Remove the `.single()` trap.** Use `maybeSingle()` with deterministic ordering (`active` first, newest `issued_at`) so a duplicate assignment degrades to "most recent band" instead of "not found", and surface a staff-visible duplicate warning.
5. **Trust the server for the event scope.** Stations resolve the event from `current_event_id()` via the RPC rather than the client's cached id, so a stale browser can no longer scope a scan to 2025.
6. **Verify end to end.** Scan `QX6-AR4B` (and lower-case / padded variants) at Meals and Headphones, confirm Jocelyn resolves and exactly one `station_transactions` row is written per scan, then repeat on Main Gate, Drinks, T-shirts and the equipment stations.

## Technical notes

Files: `src/services/rfidService.ts` (resolver), `src/lib/credentialLookup.ts` (add a `resolveCredential` that returns the full tag + attendee), `src/lib/credentialFormat.ts` (`normalizeCredential` uppercases), `src/contexts/RfidCaptureContext.tsx` and `src/hooks/useRfidCapture.ts` (normalise on capture), `src/components/UnifiedStationScanner.tsx`, `src/components/LensScanner.tsx`, `src/pages/RfidAssignment.tsx` / `src/components/EnhancedRfidAssignmentCell.tsx` (normalise on assign). One small migration to uppercase existing uids; no schema change.
