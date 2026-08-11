# Test Barcode Generator

Goal: produce a real, printable/displayable barcode you can assign to an attendee and then scan with the in-app camera scanner — a full end-to-end loop with no hardware needed.

## How to think about it

A barcode is just a picture of a string. The whole system already treats a credential as "a string that arrives from a scanner". So a test barcode only needs to:

1. Generate a code string that looks like a real credential (passes the shared format rules).
2. Render it as a scannable image on screen or on paper.
3. Be assigned to an attendee like any other wristband.
4. Decode back to the exact same string through the camera scanner, proving the loop.

No new backend concepts — the generated code is stored in the existing credential table with `credential_type` set to `barcode` (or `qr`).

## What gets built

**Test Credential Studio** — a new tab in the Developer Dashboard:
- Generate one code or a batch (e.g. 10, 25, 50).
- Choose format: Code 128 (linear barcode) or QR.
- Prefix defaults to `TEST-` so test codes are always identifiable and easy to purge.
- Each code renders as an actual scannable image with the raw string printed beneath it.
- Actions: copy string, download PNG, and a print sheet view laying out a grid of codes for badge printing.
- "Purge test credentials" button removes every unassigned `TEST-` code.

**Assignment**
- From the studio, pick an unassigned 2026 attendee and assign a generated code directly, or leave codes unassigned and use the existing RFID Assignment page (typing/pasting the code works the same as scanning it).

**Scan verification**
- A "Verify scan" mode: the generated barcode shows on one device (or printed), and scanning it at any station resolves to the assigned attendee.
- The studio shows the last scan result for each test code (matched attendee, station, timestamp) so you can confirm the round trip.

## Technical notes

- Encoding uses `@zxing/library`'s `MultiFormatWriter` (already installed for decoding) to render Code 128 and QR to a canvas — no new dependency.
- Generated strings follow `TEST-` + 8 alphanumeric chars, which satisfies `isValidCredentialFormat` and infers as `barcode`; QR variants infer as `qr`.
- Codes are inserted into `rfid_tags` with `status = 'unissued'`, `credential_type` set from the chosen format, and scoped to the active event.
- Assignment reuses the existing assignment path so tests exercise the same code as production.
- Purge deletes only `TEST-`-prefixed rows with no attendee attached, so it can never touch real wristbands.
