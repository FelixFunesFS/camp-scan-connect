# In-Page Camera Scanning at Every Station

Today every station page (Meals, Drinks, Headphones, Golf Carts, Walkie Talkies, Fanny Packs, T-shirts, Main Gate) has one primary button, "Scan with camera", which throws up a full-screen camera overlay. The station screen disappears behind it, the action panel has to be duplicated inside the overlay, and staff lose sight of counts and status.

The fix: the camera becomes a panel inside the scan card, sitting directly above the attendee result and the station action button. Full screen becomes an optional mode, not the default.

## How to think about it

A camera preview is just a video element — it can be any size. Full screen is only worth it when the operator is far from the code and needs a big target. At these stations the wristband is at arm's length, so a card-sized preview is enough and keeps everything in one view:

```text
Station page
  Scan card
    ├─ live camera panel (16:9, inside the card)
    ├─ [Stop] [Torch] [Switch] [Full screen]
    └─ "Code won't scan? Enter it manually"
  Attendee result (name, ticket, readiness)
  Station action panel (Serve meal / Record drink / Check out cart ...)
```

One scan → the result and the action appear right below the still-running camera. No overlay, no duplicated panels, next person scans immediately.

## Changes

1. **UnifiedStationScanner** — replace the full-screen-first flow with the existing `InlineCameraScanner` embedded in the scan card. It already handles start/stop, torch, camera switch, duplicate suppression, green/red flash plus haptics, and manual fallback on camera errors.
2. **Camera auto-starts** on station pages so staff don't tap twice; it stops on unmount, route change, and tab hide.
3. **Full screen stays available** via an "Full screen" button that opens the current `LensScanner`, for anyone who prefers it. The duplicated in-overlay action panel is kept only for that mode.
4. **Result and action stay on the page** — remove the conditional that hides the station action panel while the camera overlay is open, since the inline camera no longer covers it.
5. **Manual entry** stays as the collapsed "Code won't scan?" link under the camera.
6. **Assignment page** (`EnhancedRfidAssignmentCell` → `CameraBraceletScanner`) keeps its dialog: it is a per-row action inside a table, where a modal is the right pattern. No change.
7. **Staff Hub deactivation scanner** (`RfidScanner`) currently has no camera at all — add the same inline camera panel so a staff member can scan a band to deactivate instead of typing it.

## Technical notes

- No new scanning logic: `useBarcodeCamera` and `InlineCameraScanner` already exist and are used by the Scan Tester. This is wiring, not new decode work.
- `InlineCameraScanner` gains an `autoStart` prop and an `active` pause hook for tab visibility; everything else is reused as-is.
- Layout is mobile-first: the camera panel is full width on phones, capped height on desktop so the action button stays above the fold.
- Files touched: `src/components/UnifiedStationScanner.tsx`, `src/components/InlineCameraScanner.tsx`, `src/components/RfidScanner.tsx`. Station pages unchanged — they inherit through the shared scanner.
