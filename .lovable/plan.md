# On-Site Waiver Gate + "Assignment" URL Rename

## How to think about the waiver

The waiver is a **gate**, not a side task. Nobody's wristband activates until their name is on a signed record. Two concerns, kept separate so one failing never blocks the check-in line:

1. **Consent capture** (blocking) — typed name saved to the database before activation runs.
2. **Proof of record** (non-blocking) — a PDF copy stored in the backend, downloadable any time.

No emailing for now. Storage is the system of record; the Google Sheets mirror already carries the `waiver_signatures` table if you want a spreadsheet view.

### What already exists
- `waiver_signatures` table with a trigger that flips `attendees.waiver_signed` on insert.
- `WaiverSigningDialog` (typed-name signing) and `waiverService.signWaiver`.
- Activation blocks unsigned attendees with `blocked_reason = 'waiver_required'`; the preview already shows a "Sign Waiver" button.
- `buildWaiverReceipt` builds the branded PDF, but it's only downloadable client-side and never saved.

### Changes

**1. Sign-then-activate in one flow**
- On the self check-in preview, unsigned people appear as a stacked "Sign for each person" list.
- Signing updates that person in place (green check) — no re-lookup, no page reset.
- "Activate" stays disabled until everyone in the order is signed, then activates the whole order in the same session.
- Same behaviour in the staff hub, so staff can sign on a tablet with the person present (records `signed_by_self = false`, staff name in `witnessed_by`).

**2. Store the signed waiver**
- New private storage bucket `waivers`.
- After the signature row inserts, generate the PDF and upload to `waivers/{event_id}/{attendee_id}.pdf`; save the path on the signature row.
- Upload failure logs a warning and never blocks activation.
- `WaiverStatusPanel` gets a "View signed waiver" link per person and a bulk download for the event.

## URL rename: /rfid-assignment → /assignment

`/rfid-assignment` is the only route with RFID in the path. Change it to `/assignment`, keep a redirect from the old path so existing bookmarks and printed staff links keep working, and update the two internal links (sidebar, home dashboard tile).

## Remaining RFID references

Three tiers — only the first is user-facing and worth changing now:

1. **Staff/attendee-facing text still saying RFID** — Developer Dashboard tab copy, Production Readiness cards, Abandoned Records manager, Staff Guide "RFID Technology Basics", RFID Management Panel, mock-generation toasts. Reword to "wristband" / "code" to match the pass already done on stations and scanners.
2. **Event Debrief page** — keeps the RFID wording deliberately (it's a retrospective about the RFID system itself). Leave as is.
3. **Code internals** — file names (`RfidAssignment.tsx`), component names, hooks, service names, and the `rfid_tags` / `rfid_uid` database columns. Leave untouched: renaming them is high-risk churn with zero user benefit, and the database columns are wired into edge functions, the Sheets mirror, and the read-only API.

## Technical notes

- Migration: `receipt_path text` on `waiver_signatures`; private `waivers` bucket with policies for authenticated read/insert.
- A shared helper wraps `buildWaiverReceipt` for both download and upload.
- Route redirect handled with a `<Navigate replace>` route on the old path.

## Order of work

1. Sign-then-activate flow.
2. Bucket + PDF persistence + staff download links.
3. URL rename and redirect.
4. Wording cleanup on the remaining dev/staff panels.
