# Waiver receipt email — parked, with prep work

Emailing the receipt is on hold until a sender domain is in place. This plan keeps the work moving in two parts: what gets built now (no domain needed), and what stays queued until you're ready.

## Current state

- Signing a waiver in-app produces a PDF receipt in the browser; the attendee can download it right then, and staff can re-download it from the Waivers panel.
- Nothing is emailed, and no copy of the PDF is stored anywhere — if the attendee closes the dialog without downloading, the receipt is gone (it can be regenerated on demand from the signature record).
- All 694 attendees for the active event have an email address on file, so no data gap blocks sending later.

## Part 1 — Build now (no email domain required)

1. **Store a copy of each receipt.** On signing, generate the PDF and upload it to a private storage bucket, keyed by the signature record. Regenerating the same signature is idempotent — it overwrites rather than duplicates.
2. **Serve it through a short-lived signed link.** Both the attendee's download button and the staff Waivers panel pull from stored copies, falling back to on-the-fly generation if a file is missing.
3. **Queue the delivery intent.** Record on each signature whether a receipt copy was requested for the attendee's email, with a not-yet-sent state. Nothing sends; this is the backlog that gets flushed once email is live.

## Part 2 — Queued until a sender domain exists

1. Set up the sender domain (e.g. `notify.yourdomain.com`) and email infrastructure.
2. Add a receipt email template matching the app's look: attendee name, event, signing timestamp, agreement version, and a link to the stored PDF. Attachments are not supported, so the link is the delivery mechanism.
3. Send on signing, and offer a one-time backfill that sends receipts to everyone flagged in Part 1's backlog.
4. Add a resend action in the Waivers panel for staff.

## Technical notes

- New private storage bucket for waiver receipts; access only via signed URLs generated server-side.
- Receipt generation moves into a shared helper so the browser and any future server-side send produce an identical PDF.
- Two columns on `waiver_signatures` track the delivery state (requested / sent timestamp) so Part 2 is a flush, not a rebuild.
- No change to the waiver gate: signing still flips `waiver_signed` and unblocks activation regardless of email state.

## Open question

If you'd rather not add storage plumbing yet either, I can stop after keeping the current download-only behavior and revisit the whole thing when the domain is ready — say the word and I'll trim this to nothing.
