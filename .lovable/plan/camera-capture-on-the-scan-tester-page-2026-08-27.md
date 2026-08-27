# Camera capture on the Scan Tester page

## Answering the question

The camera does not have to take over the screen. A camera preview is just a `<video>` element — it can live inside a card on the page at any size, right next to the results. Full-screen is only a choice we made for the station scanner, because staff hold a phone at arm's length and want a big target area.

So there are two valid modes, and the Scan Tester should have both:

- **Inline (default here):** a camera panel sits in the page, roughly 16:9, with the raw-capture readout, normalization breakdown and history all visible below it at the same time. Best for diagnostics — you watch what the decode produces while you scan.
- **Full screen (optional):** a "Expand" button opens the existing full-screen scanner for aiming in bad light or at distance, then drops back to the page with the result already logged.

Right now the Scan Tester (`/scan-test`) only listens for USB/keyboard-wedge scans; it has no camera at all. That is the gap.

## What gets built

1. A shared, reusable camera-decode hook holding the logic that today is duplicated in `LensScanner` and `CameraBraceletScanner`: ZXing continuous decode, supported symbologies, duplicate-read suppression, torch toggle, front/back switch, stream cleanup.
2. A new inline camera panel component that renders the live preview in a normal page card with an aiming frame, torch and camera-switch buttons, a Start/Stop control, and a clear message plus manual-entry fallback if camera permission is blocked.
3. Scan Tester gains that panel at the top: a "Camera" card with Start Camera, and every camera decode flows into the exact same `handleScan()` the wedge input already uses — so raw string, invisible-character breakdown, normalization diff and credential lookup all behave identically for camera scans.
4. Each history entry is labeled with its source (Camera or Reader), so you can tell which path produced which string.
5. An "Expand to full screen" button that opens the existing `LensScanner` and feeds results into the same handler.
6. Camera stops on Stop, on unmount, on route change, and when the tab is hidden — no camera left hot.

## Layout behavior

- Mobile: camera panel full width at the top, results stack directly underneath, no horizontal overflow.
- Desktop: two columns — camera on the left, live capture readout on the right — so a scan and its decoded output are visible together.
- The wedge input stays and keeps focus behavior when the camera is off; when the camera is running, focus handling does not fight the camera panel.

## Technical notes

- New `src/hooks/useBarcodeCamera.ts` (decode + torch + facing + cleanup) and `src/components/InlineCameraScanner.tsx`.
- `LensScanner.tsx` refactored to consume the hook; its props and behavior are unchanged, so `UnifiedStationScanner` is untouched.
- `CameraBraceletScanner.tsx` also switched to the hook to remove the duplicate ZXing setup; the RFID assignment cell keeps using it as-is.
- `src/pages/ScanTester.tsx` gains camera state, the source label on `ScanEntry`, and the responsive two-column layout. No changes to `normalizeCredential`, `lookupCredential`, or any transaction logic — the tester remains read-only.
- Camera requires HTTPS; preview and published URLs already qualify.
