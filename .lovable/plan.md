# Lens-Style Camera Scanning in an Installable App

## How to think about this

"Google Lens" is really two separate things, and it helps to keep them apart:

1. **The container** — Lens feels like an app because it launches from a home-screen icon, fills the screen, and has no browser chrome. That is the installable-app (PWA) part: a web app manifest plus icons. No offline caching needed.
2. **The experience** — Lens feels magical because the camera is *always live and always decoding*. You don't press "scan", frame a shot, and confirm. You point, it reads, it acts, it stays open for the next one.

The app already has the hard part: `CameraBraceletScanner` decodes QR, Code 128, Code 39, PDF417 and more with ZXing, with torch, camera flip, and duplicate suppression. What's missing is that it is a small dialog used as a fallback, and stations are built keyboard-wedge-first (`useRfidCapture` + `useScanFocus`). The work is to promote the camera to a first-class, full-screen, continuous mode — and to make the app installable so it opens like a native scanner.

Important reality check: a phone camera is slower and less reliable than a hardware wedge scanner in bad lighting. So camera mode is the **mobile/roaming staff** path, not a replacement. Hardware scanners stay the default at fixed stations.

## Part 1 — Make the app installable (manifest only)

- Add `public/manifest.webmanifest`: app name "Camp Scan", short name, `display: "standalone"`, portrait orientation, brand theme + background colors, and icon entries (192, 512, maskable).
- Generate app icons into `public/` and add `manifest`, `theme-color`, and `apple-touch-icon` tags to `index.html`.
- No service worker, no offline caching — staff are online at stations, and offline caching risks serving stale screens mid-event.

Result: staff open the app once, "Add to Home Screen", and thereafter launch a full-screen scanner with no address bar stealing vertical space.

## Part 2 — A Lens-style full-screen scan mode

New component `LensScanner` (built from the existing ZXing logic, so decoding behavior is unchanged):

- Full-viewport live camera, safe-area aware, with a dimmed overlay and a centered reticle.
- **Continuous decode loop** — no shutter button. Found codes fire immediately.
- **Result as an overlay card**, not a page change: the attendee name, ticket type, waiver/payment status chips, and the station action button slide up over the live feed. Camera keeps running behind it.
- **Scan-next without leaving**: after an action succeeds, show a brief confirmation chip and re-arm. The same credential is ignored for a cooldown window (reuse the existing duplicate suppression) so one wristband can't be double-counted.
- **Failure states are on-camera**: "Not found", "Waiver not signed — Sign now", "Payment pending" as overlay banners with the recovery action, instead of dumping the user back to a form.
- Controls: torch, camera flip, close, and a "Type code" fallback that opens the manual input.

## Part 3 — Wiring it into the stations

- Add a shared `ScanSource` toggle to `UnifiedStationScanner`: **Scanner** (current keyboard-wedge input, default on desktop/tablet) and **Camera** (default on small screens).
- Both paths feed the *same* handler that the wedge input uses today, so lookup, waiver gate, transaction recording, and staff override behave identically regardless of source.
- When camera mode is active, suspend `useScanFocus` re-focus attempts so the two systems don't fight over focus.
- Keep the current dialog scanner working; `LensScanner` supersedes it as the mobile default.

## Part 4 — Attendee-facing self scan (optional, flagged)

The same component can back a public self-service screen where an attendee points their own phone at a station QR to check in. Worth building only after staff-side camera mode is proven at the event; noted here so the component is designed to be reusable rather than station-coupled.

## Technical notes

- Camera requires HTTPS — works on the published domain and preview, not on plain `http://` LAN addresses.
- iOS Safari requires a user gesture to start the stream; the mode opens on an explicit "Camera" tap, never auto-starts.
- Stop all tracks on unmount, tab hide, and dialog close to avoid a hot camera draining staff phones.
- Reuse `normalizeCredential` / `isValidCredentialFormat` so camera reads and wedge reads validate through one code path.
- No database or edge-function changes.
