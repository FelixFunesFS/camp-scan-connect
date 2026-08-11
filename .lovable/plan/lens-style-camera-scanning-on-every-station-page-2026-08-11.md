# Lens-Style Camera Scanning on Every Station Page

Goal: no hardware readers at all. Every station runs entirely on the in-app camera scanner: staff point a phone, tablet or laptop camera at a wristband, badge or confirmation QR and the station reacts instantly. Typing a code stays only as a fallback for damaged or unreadable codes.

## How it works

One shared full-screen camera surface, mounted once inside `UnifiedStationScanner`, so every station page (Meals, Drinks, Headphones, Golf Carts, Walkie Talkies, Fanny Packs, T-shirts, Main Gate) gets it for free without touching those pages.

```text
Station page
  └─ UnifiedStationScanner
       ├─ [Scan] — primary action on every device, opens the camera
       ├─ LensScanner (full-screen overlay)
       │     live camera → continuous decode → same handleRfidFound()
       └─ "Enter code manually" fallback (collapsed by default)
```

Key behaviors:
- Continuous decode, no shutter button. The code resolves the moment it lands in frame.
- The result appears as a card sliding up over the live camera — attendee name, ticket type, readiness/waiver state — with the station's action button right there. Camera keeps running behind it, so the next person can be scanned without reopening anything.
- Immediate feedback: green flash plus a short vibration on a hit, red frame with a reason on an unknown or duplicate code.
- Duplicate suppression: the same code inside a short window is ignored, so a code left in frame doesn't fire twice.
- Torch toggle, front/back camera switch, and a "type it instead" fallback for damaged codes.
- Overlay respects phone safe areas and stays one-handed: controls sit at the bottom.
- Closing the camera returns to the station screen with the scan button ready; reopening is one tap.
- If the camera is blocked or unavailable, the overlay explains how to grant access and drops straight into the manual-entry field so the station is never stuck.

## Making it feel like an app (PWA)

Add installability so staff can launch it from the home screen full-screen, without browser chrome — that is what makes the camera view read as "Lens" rather than "a website using my camera".
- Web app manifest with standalone display, app name, theme colors, and app icons.
- Matching head tags plus an app-specific title and description.
- No offline mode or service worker (not requested, and it causes stale-app problems).

## Station screen layout

- One large primary "Scan" button at the top of every station scanner, on every screen size.
- Manual entry is demoted to a small "Enter code manually" link below it, expanded only when tapped.
- The old keyboard-wedge input and its "Ready to scan" focus indicator are removed from station screens, since no USB readers are in use.

## Technical notes

- New `src/components/LensScanner.tsx`: full-screen overlay built from the decode logic already in `CameraBraceletScanner.tsx` (ZXing `BrowserMultiFormatReader`; QR, Code128/39, EAN/UPC, ITF, DataMatrix, PDF417) with a continuous callback, torch/facing controls, duplicate window, and a result slot rendered by the caller.
- `UnifiedStationScanner` gains camera state and routes decoded payloads through the existing `handleRfidFound`, so lookup, readiness, waiver gate, staff override, and transaction recording are unchanged.
- The `useRfidCapture` keyboard-wedge listener and `useScanFocus` / `ScanFocusIndicator` usage are dropped from `UnifiedStationScanner`; the hooks stay in the codebase for the RFID assignment screen.
- Payloads pass through `normalizeCredential` / `isValidCredentialFormat` in `src/lib/credentialFormat.ts`, so camera scans obey the same rules as wedge scans.
- Camera stream released on close, route change, and tab hide so no camera stays hot in the background.
- `CameraBraceletScanner` stays for the RFID assignment cell; shared decode logic is factored out rather than duplicated.
- Files: add `LensScanner.tsx`, `public/manifest.webmanifest` and icons; edit `UnifiedStationScanner.tsx` and `index.html`. Station pages unchanged.
- Camera capture requires HTTPS, which the published app and preview already use.