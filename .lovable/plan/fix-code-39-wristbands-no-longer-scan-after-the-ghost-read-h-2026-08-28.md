# Fix: Code 39 wristbands no longer scan after the ghost-read hardening

## What went wrong

The anti-ghost changes were too strict for a Code 39 read:

- **Confirmation window is too tight.** A payload must decode twice within **350 ms**. ZXing is configured with `delayBetweenScanAttempts: 120` *plus* `TRY_HARDER`, so on a phone a single decode pass can take longer than 350 ms. The second matching read lands after the window, the pending read expires, and the code is discarded forever — the scan never fires.
- **Warm-up compounds it.** The first 600 ms are dropped, so the very first good read is often thrown away and the confirmation cycle restarts.
- Code 39 is a lower-density symbology than Code 128; the printed `*QX6-AR4B*` band decodes less often per second, which makes both problems worse.

The retail-shape guard is not the cause — `QX6-AR4B` has letters and a dash, so it never trips it.

## Plan

1. **Loosen confirmation to a rolling match, not a 350 ms race.** Keep a pending payload alive for **1500 ms** and fire as soon as the same value decodes a second time inside that window. Real barcodes still confirm in a fraction of a second; blur artifacts still never repeat.

2. **Skip confirmation for high-confidence payloads.** If a decode already matches our credential shape (letters + digits, correct length, e.g. `QX6-AR4B`), accept it on the first read. Only ambiguous, all-numeric reads have to earn a second confirmation. This restores instant scanning at stations while keeping the EAN/ITF ghosts out.

3. **Shorten the warm-up to 300 ms** — enough to cover the black pre-stream frames without swallowing a real first read.

4. **Speed up decoding.** Drop `delayBetweenScanAttempts` to 60 ms so repeat decodes arrive quickly and confirmation is near-instant.

5. **Keep the diagnostics.** The Scan Tester keeps listing discarded reads with the reason, so if a band still misses we can see whether it is "unconfirmed", "warmup" or simply never decoding.

## Technical notes

All changes are in `src/hooks/useBarcodeCamera.ts`: `CONFIRM_WINDOW_MS` 350 → 1500, `WARMUP_MS` 600 → 300, `delayBetweenScanAttempts` 120 → 60, and a fast-path in `handleDetected` that bypasses confirmation when `isValidCredentialFormat(code)` passes and the payload is not retail-shaped. No other files change; no schema changes.
