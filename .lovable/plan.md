# Is a scan running multiple times per event?

## What the data says

`station_transactions` currently holds exactly **1 row** (an activation, 21:25 UTC today) and no attendee has two rows of the same type in the same minute. So there is no evidence of duplicate writes in live data — but there is also almost no live data yet, so the data cannot confirm the fix either.

## What the code says

Three guard layers exist today:

1. **Commit guard** (`UnifiedStationScanner.executeAction`): an `inFlightRef` plus a `lastCommitRef` keyed by `uid:station:transactionType` with a 4s window. A second commit inside that window is refused with "Already recorded for this scan".
2. **Auto-trigger guard**: `autoTriggered` state so the `autoTrigger` window event is dispatched once per scan.
3. **Database idempotency**: unique `client_scan_id` on `station_transactions`, so an offline-queue retry cannot double-write.

Two places can still emit the same physical scan twice (they would be caught by guard 1 as "Already recorded", but they cause noisy UI and can slip past the 4s window):

- **Two keyboard listeners**: `RfidCaptureContext` and `useRfidCapture` both attach a global `keypress` listener and both fire `onCapture`. Any screen that mounts both gets two lookups from one swipe.
- **Buffer flush races in `useRfidCapture`**: the 100ms idle timeout, the Enter key, and the max-length overflow can each flush the same buffer, and no dedupe exists at the capture level.
- **Global `window` auto-trigger event**: it is dispatched on `window`, so if two station components were ever mounted at once (e.g. a station page plus the scanner inside `StaffActivationHub`), both handlers would run for one scan.

## Plan

1. Add a shared capture-level dedupe: ignore an identical code re-captured within ~1.5s, applied inside `RfidCaptureContext` and `useRfidCapture` so it covers every entry path (keyboard wedge, camera, manual).
2. Make `useRfidCapture` defer to `RfidCaptureContext` when the context is present, so only one keyboard listener is ever active.
3. Replace the global `window` `autoTrigger` event with a scoped callback passed through `StationActionProps`, so only the mounted station child can react.
4. Extend the `lastCommitRef` window from 4s to cover a full scan session: clear it only on reset or on a different code, rather than expiring by time.
5. Verify end to end on Drinks (quick/auto mode) and Meals (confirm mode): one physical scan → exactly one row, confirmed by querying `station_transactions` after each test scan.

## Technical notes

Files touched: `src/contexts/RfidCaptureContext.tsx`, `src/hooks/useRfidCapture.ts`, `src/components/UnifiedStationScanner.tsx`, and the six station pages that listen for `autoTrigger` (`DrinksStation`, `MainGateStation`, `HeadphonesStation`, `GolfCartsStation`, `WalkieTalkiesStation`, `FannyPacksStation`) plus `StaffDeactivationPanel` and `StaffActivationHub`. No schema change — the `client_scan_id` unique index already handles the database side.
