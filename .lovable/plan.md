# Fix: first scan returns a bogus code (e.g. 9577171778768) before the real one

## What is most likely happening

The camera decoder is configured to accept ten barcode symbologies at once, including the ones most prone to false positives:

```text
QR_CODE, CODE_128, CODE_39, EAN_13, EAN_8, UPC_A, UPC_E, ITF, DATA_MATRIX, PDF_417
```

`useBarcodeCamera` also sets `TRY_HARDER`, which makes ZXing work much harder to find *something* in a blurry frame. During the first ~1 second the autofocus has not settled, so the wristband's Code-128 bars are smeared — and a smeared linear pattern very often decodes as a valid-checksum **EAN-13 / ITF / UPC** number. `9577171778768` is exactly that shape: 13 digits, no letters, no delimiter — nothing like the real credential format `QX6-AR4B`. Once focus locks, the true Code-128 read comes through.

So this is almost certainly a **decoder false positive on an out-of-focus frame**, not the reader sending two payloads.

Secondary possibilities worth ruling out in the same pass:
- A second barcode physically in frame (packaging, badge back, ticket) being picked up first.
- The credential-format guard being bypassed on the Scan Tester (`acceptAnyPayload`), which is why the junk read is visible there but would be rejected at a station.

## Plan

1. **Narrow the symbology set.** Restrict the camera decoder to what is actually printed on our wristbands and confirmation emails: `QR_CODE`, `CODE_128`, `CODE_39`, `DATA_MATRIX`. Drop `EAN_13`, `EAN_8`, `UPC_A`, `UPC_E`, `ITF` and `PDF_417` — none are used by this event, and they are the source of the numeric ghost reads. Keep the full list behind a "diagnostics" flag the Scan Tester can turn on.

2. **Require read confirmation.** Only emit a scan after the same payload decodes twice within a short window (~350 ms). A genuine barcode in frame re-decodes every frame; a focus-artifact almost never repeats identically. This kills the remaining false positives without noticeably slowing a real scan.

3. **Warm-up guard.** Ignore decodes for the first ~600 ms after the stream starts, so the pre-autofocus frames never produce a result.

4. **Shape check before accept.** At stations, reject payloads that do not look like our credentials (all-digit strings of EAN/UPC/ITF length) rather than sending them to lookup — currently they cause a pointless "not found" round-trip and a red flash.

5. **Make it visible in the Scan Tester.** Keep showing every raw decode there, but tag rejected/unconfirmed reads as "discarded (unconfirmed)" with the reason, so hardware behaviour stays diagnosable on event day.

## Technical notes

Files touched: `src/hooks/useBarcodeCamera.ts` (format list, confirmation buffer, warm-up window, optional `diagnostics` flag), `src/pages/ScanTester.tsx` (surface discarded reads and enable the wide format set), and `src/lib/credentialFormat.ts` (a small `looksLikeRetailBarcode` guard used by the shape check). No database or schema changes.
