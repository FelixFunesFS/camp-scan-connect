# Scan Tester Page (Barcode Diagnostics)

## Goal
A standalone diagnostic page where you can scan any barcode/wristband and immediately see the **raw digits/characters the scanner picked up**, plus what the system resolves it to — so hardware mismatches (missing chars, case, stray suffixes like Enter) are visible before event day.

## What to build

**New page: `src/pages/ScanTester.tsx` at route `/scan-test`** (linked from the Developer Dashboard, not the staff sidebar).

### 1. Raw capture panel
- An always-focused input (using the existing scan-focus behavior) that accepts keyboard-wedge scanner input.
- On each scan (Enter-terminated), display:
  - **Raw value** — exactly what was received (with invisible chars shown, e.g. `QX6-AR4B↵`, spaces as `␣`).
  - **Character count** and a per-character breakdown (code points), so you can spot a dropped first digit, doubled characters, or trailing modifiers.
  - **Normalized value** — trimmed + uppercased, matching what lookup uses.

### 2. Resolution panel
- Runs `credential_lookup` on the scan and shows: matched attendee name, event year, status (active/lost/inactive), waiver signed, checked-in state — or "no match" with the reason.

### 3. Scan history log
- Session list of the last ~20 scans with raw value, length, resolution result, and a flag when raw ≠ normalized (the mismatch indicator).

### 4. No writes
- The page records nothing to the database — pure read/diagnostic, safe to test at any time.

## Technical details
- Route added in `App.tsx`: `/scan-test` → `ScanTester`.
- Reuses `credentialFormat.ts` normalization, `credential_lookup` RPC, and the scan-focus hook.
- Link added in Developer Dashboard for discoverability.
- Works with both keyboard-wedge scanners and manual typing (paste also allowed).
