# On-Site Waiver: Sign, Then Activate

## How to think about it

The waiver is a **gate**, not a side task. Nobody's wristband turns on until their name is on a signed record. Three separate concerns, kept separate so one failing never blocks check-in:

1. **Consent capture** (blocking) — typed name saved to the database before activation runs.
2. **Proof of record** (non-blocking) — a PDF receipt stored in the backend so you always have the signed document.
3. **Notification** (non-blocking, optional) — a copy emailed to melanatedcampout@gmail.com.

Email must never be able to stop a line at the gate. Storage-first, email second.

## What exists today

- `waiver_signatures` table with a trigger that flips `attendees.waiver_signed` on insert.
- `WaiverSigningDialog` (typed-name signing) and `waiverService.signWaiver`.
- Activation preview already flags people as `waiver_required` and shows a "Sign Waiver" button.
- `buildWaiverReceipt` generates the branded PDF (currently only downloadable client-side).

Gaps: after signing, the attendee must re-run the lookup; the PDF is never persisted; nothing is emailed.

## Changes

### 1. Sign-then-activate in one flow
- On the self check-in preview, when anyone in the order is waiver-blocked, show a stacked "Sign for each person" list.
- Signing a person updates their row in place (green check), no page reset, no re-lookup.
- The "Activate" button stays disabled until every person in the order is signed, then activates the whole order in the same session.
- Same behaviour for the staff hub, so staff can sign on a tablet on behalf of a person present (records `signed_by_self = false` and the staff name in `witnessed_by`).

### 2. Store the signed waiver
- Create a private storage bucket `waivers`.
- After the signature row is inserted, generate the PDF and upload it to `waivers/{event_id}/{attendee_id}.pdf`.
- Store the path on the signature row (`receipt_path` column) so any staff view can open a signed copy on demand.
- Upload failure logs a warning and never blocks activation.

### 3. Email a copy to melanatedcampout@gmail.com
- Requires an email sender domain. You already own melanatedcampout.com, so set up a sender subdomain (e.g. `notify.melanatedcampout.com`) — that is a DNS step you complete in the setup dialog.
- Once verified: an app email fires per signature to melanatedcampout@gmail.com with attendee name, typed name, timestamp, event, and a signed link to the stored PDF (attachments aren't supported, links are).
- Sent from an edge function, fire-and-forget, so it never delays the gate.
- If you prefer not to set up a domain, skip this step: the Google Sheets mirror already carries the `waiver_signatures` table, and stored PDFs are downloadable from the staff panel.

### 4. Staff visibility
- `WaiverStatusPanel` gets a "View signed waiver" link per signed attendee and a bulk "Download all signed PDFs" action for the event.

## Technical notes

- New migration: `receipt_path text` on `waiver_signatures`; storage bucket `waivers` (private) with policies allowing authenticated read/insert.
- PDF generation moves behind a small helper that both downloads and uploads, reusing `buildWaiverReceipt`.
- Email path uses the standard app-email infrastructure (queue + `send-transactional-email`) with an idempotency key of `waiver-{signature_id}` so retries don't duplicate.

## Order of work

1. Sign-then-activate flow (unblocks the gate) — no dependencies.
2. Storage bucket + PDF persistence.
3. Email domain setup, then the notification email.
