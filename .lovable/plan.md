# Condensed scanner + always-visible station cards

Two changes, both about what the station screen shows at rest.

## 1. Hide the Raw Capture (Reader) card on Scan Tester

The Scan Tester keeps the camera panel, last-scan breakdown and session history. The "Raw Capture (Reader)" card is removed from the render (its state and handler stay in the file behind a single flag so it can come back later). The remaining camera card goes full width instead of half a two-column grid.

File: `src/pages/ScanTester.tsx`

## 2. Station pages: condensed scanner, station info always shown

Today the camera panel is large (up to 45% of the screen height) and the station's own card only renders after a successful, ready scan. So before a scan the page looks empty, and after a scan the camera pushes everything down.

How to think about it: the scanner is a **tool strip**, not the page. The station card is the page. Order becomes:

```text
Station page
  ├─ header + offline badge
  ├─ Scan strip  (condensed, ~140px tall camera + status line)
  │     └─ scanned result inline: name, ticket, ready/blocked
  ├─ Station card  (ALWAYS visible: counts, status, instructions)
  └─ Action panel (appears/enables once an attendee is resolved)
```

Specifics:

- **Condensed camera**: shrink the inline preview to a short strip (fixed ~120-160px tall, full width, cropped) rather than 16:9 at 45vh. Torch / switch / full-screen stay as small icon buttons on the strip. Full screen remains available for anyone who wants the big target.
- **Collapse on result**: after a code resolves, the camera strip collapses further to a thin "Scanning… / Scanned ABC123" bar so the attendee + action own the viewport. It re-expands on Clear or after the auto-reset.
- **Scanned info below the strip**: the attendee block (name, ticket, veteran badge, ready/blocked message, Clear) stays directly under the scan strip, unchanged in content.
- **Station cards always render**: the child station content renders on every station page even with no attendee — in an idle state showing its own data (drink count, equipment status, meal counts, T-shirt info) with the action button disabled and a "Scan a wristband to record…" hint. Today each station returns a placeholder card instead; that placeholder becomes the idle state of the real card so counts are visible while waiting.

## Technical notes

- `src/components/InlineCameraScanner.tsx`: add a `compact` (and `collapsed`) presentation mode — smaller fixed-height video with `object-cover`, icon-only controls. No decode changes; `useBarcodeCamera` untouched.
- `src/components/UnifiedStationScanner.tsx`: use the compact camera, collapse it while `selectedRfid` is set, and always call `children({...})` — passing `selectedRfid: null` / `attendeeReadiness: null` when nothing is scanned so stations can render their idle state. The existing "only when ready" gate moves into the station components' action buttons.
- Station pages (`DrinksStation`, `MealStation`, `HeadphonesStation`, `GolfCartsStation`, `WalkieTalkiesStation`, `FannyPacksStation`, `TShirtsStation`, `MainGateStation`): replace the early-return placeholder with the real card in a disabled/idle state; each loads its counts/status on mount, not only after a scan.
- Mobile-first: strip is full width, controls are 44px touch targets, no horizontal overflow; desktop caps the strip width with the rest of the column.
