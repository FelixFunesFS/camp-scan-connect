# Barcode vs. RFID: decision and swap plan

## The short answer

The app never really cares that a credential is RFID. Every station, activation, scan and report keys off a single text value (`rfid_tags.uid`) that arrives as typed characters. USB RFID readers and USB barcode scanners both behave as keyboards: they "type" the code and press Enter. So a switch to barcodes is mostly a **medium and labeling change, not a rewrite** — the capture hook, the lookup service, the station scanners and the assignment table all keep working if a barcode scanner is plugged in instead of an RFID reader.

The parts that genuinely change:

- **Code format validation.** The current capture rule requires 8-20 characters, rejects pure letters, and requires a digit. Barcode payloads (especially QR) can be longer or purely alphanumeric, so the validator has to accept whatever format gets printed.
- **Camera scanning.** The existing camera scanner reads text with OCR, which is slow and error-prone. A real barcode/QR decoder replaces it and is dramatically more reliable.
- **Naming.** ~130 files reference "rfid". Renaming everything is cosmetic churn and risk; the safer path is to keep the storage column and rename only what a user sees.
- **Physical production.** Barcodes must be printed on wristbands, badges, or delivered digitally — that's a vendor and cost decision, not a code one.

## How attendees would "scan their own" barcode

Three workable models, in order of throughput:

1. **Attendee presents, station scans (recommended).** The attendee's code lives in their confirmation email or phone wallet. Staff scan it with a handheld scanner or a tablet camera. Fastest, no attendee-device dependency, works with bad signal.
2. **Attendee scans their own wristband/badge with their phone.** They open the check-in link and point their camera at their own printed code. Works, but is awkward one-handed and needs camera permission plus a decent connection. Best as a self-service fallback, not the primary lane.
3. **Station displays a QR, attendee scans it.** The station poster's QR opens the check-in page with the station pre-selected; the attendee then confirms with their phone number. This is the least equipment-dependent option and pairs well with the current phone-based activation.

Given the current plan is phone-number activation with pre-assigned wristbands, model 1 for staff lanes plus the existing phone flow for self-service covers everyone without requiring attendees to scan anything.

## What a full swap entails

**Keep as-is (no change needed):** the tag table and its `uid` column, station transactions, scan logs, activation RPCs, reports, exports, the keyboard-wedge capture hook (with a widened format rule), the assignment table, and every station screen.

**Change:**
- Credential type recorded per tag (`rfid` / `barcode` / `qr`) so both media can coexist during transition and reports can tell them apart.
- Format validation widened and made configurable per credential type, with the ambiguity guard kept so search text is never mistaken for a scan.
- Camera scanner swapped from OCR to a real barcode/QR decoder, with torch toggle, continuous scan, and duplicate-frame suppression.
- User-facing labels: "wristband"/"credential" instead of "RFID", scanner setup guidance updated, staff guide screens updated.
- Assignment flow: bulk-import a batch of printed codes, then scan-to-link, rather than typing UIDs one at a time.
- Optional printed-code generation if codes are produced in-house rather than pre-printed by a vendor.

**Do not change:** internal column names, service filenames, or the 130 internal "rfid" references. Renaming those buys nothing and risks breaking working flows before an event.

## How to think about the decision

- **Cost:** barcode wristbands and handheld scanners are far cheaper than RFID tags and readers; attendee-owned phones can replace scanners entirely.
- **Speed:** RFID taps beat barcode scans slightly, but the current bottleneck is the phone lookup and waiver gate, not the read.
- **Durability:** printed codes on wristbands smudge, tear, and get wet over a 3-day outdoor event — this is the main risk, and it argues for a plain-text fallback code printed next to the barcode so staff can key it in.
- **Reversibility:** with a credential-type column, the system supports both at once, so a barcode pilot at one station is possible without committing the whole event.

## Recommended sequencing

1. Add the credential-type column and widen scan validation so barcodes are accepted alongside RFID (no visible change yet).
2. Replace OCR camera scanning with a real barcode/QR decoder and add a manual fallback-code entry field.
3. Pilot barcode at one station with a printed test batch; compare read failure rate against RFID.
4. Only if the pilot is clean: relabel the UI to credential-neutral wording and switch assignment to batch import.

## Unchanged hardening work

The five readiness items still come first, since they apply regardless of medium: multi-order phone disambiguation, in-app waiver signing, staff code and access lockdown, pending-payment/walk-up/duplicate-scan handling, and check-in UX polish.
