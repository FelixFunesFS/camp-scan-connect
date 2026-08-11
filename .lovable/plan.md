# Lens-Style Camera Scanning on Every Station Page

Goal: any staff phone can point at a wristband, badge or confirmation QR and have the station react instantly — no hardware reader, no typing — while fixed stations keep their USB keyboard-wedge readers exactly as they are today.

## How it works

One shared full-screen camera surface, mounted once inside `UnifiedStationScanner`, so every station page (Meals, Drinks, Headphones, Golf Carts, Walkie Talkies, Fanny Packs, T-shirts, Main Gate) gets it for free without touching those pages.

```text
Station page
  └─ UnifiedStationScanner
       ├─ hardware wedge input  (default on desktop stations)
       ├─ [Scan with camera] button (primary on mobile)
       └─ LensScanner (full-screen overlay)
             live camera → continuous decode → same handleRfidFound()
```

Key behaviors:
- Continuous decode, no shutter button. The code resolves the moment it lands in frame.
- The result appears as a card sliding up over the live camera — attendee name, ticket type, readiness/waiver state — with the station's action button right there. Camera keeps running behind it, so the next person can be scanned without reopening anything.
- Immediate feedback: green flash plus a short vibration on a hit, red frame with a reason on an unknown or duplicate code.
- Duplicate suppression: the same code inside a short window is ignored, so a code left in frame doesn't fire twice.
- Torch toggle, front/back camera switch, and a "type it instead" fallback for damaged codes.
- Overlay respects phone safe areas and stays one-handed: controls sit at the bottom.
- Closing the camera hands focus straight back to the wedge input, so a station can mix both methods.

## Making it feel like an app (PWA)

Add installability so staff can launch it from the home screen full-screen, without browser chrome — that is what makes the camera view read as "Lens" rather than "a website using my camera".
- Web app manifest with standalone display, app name, theme colors, and app icons.
- Matching head tags plus an app-specific title and description.
- No offline mode or service worker (not requested, and it causes stale-app problems).

## Where the camera button appears

- Mobile: prominent primary "Scan with camera" button at the top of every station scanner, since most phones have no reader attached.
- Desktop: secondary option; the wedge input stays the default and keeps focus.
- The existing "Ready to scan" indicator stays for wedge mode.

## Technical notes

- New `src/components/LensScanner.tsx`: full-screen overlay built from the decode logic already in `CameraBraceletScanner.tsx` (ZXing `BrowserMultiFormatReader`; QR, Code128/39, EAN/UPC, ITF, DataMatrix, PDF417) with a continuous callback, torch/facing controls, duplicate window, and a result slot rendered by the caller.
- `UnifiedStationScanner` gains camera state and routes decoded payloads through the existing `handleRfidFound`, so lookup, readiness, waiver gate, staff override, and transaction recording are unchanged.
- Payloads pass through `normalizeCredential` / `isValidCredentialFormat` in `src/lib/credentialFormat.ts`, so camera scans obey the same rules as wedge scans.
- Camera stream released on close, route change, and tab hide so no camera stays hot in the background.
- `CameraBraceletScanner` stays for the RFID assignment cell; shared decode logic is factored out rather than duplicated.
- Files: add `LensScanner.tsx`, `public/manifest.webmanifest` and icons; edit `UnifiedStationScanner.tsx` and `index.html`. Station pages unchanged.