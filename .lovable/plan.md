# 2026 Check-In Hardening

Wristbands are assigned before the event, so tag inventory is out of scope. This plan covers the five remaining readiness items.

## 1. Multi-order phone disambiguation

Today a phone number pulls in every order it appears on and checks them all in at once, while showing only one order number. In the live 2026 data, 22 numbers cover more than one order (one covers six registrations).

- Lookup returns orders as a list: order number, party size, names, and per-person status.
- When there is more than one order, the attendee picks which party they are checking in — one tap per order card, no drag or typing.
- Activation takes the chosen order and only touches that order's people.
- Single-order lookups behave exactly as they do now: straight to the preview screen.

## 2. In-app waiver signing

359 of 692 attendees have not signed. Right now they are blocked with no way forward except finding staff.

- Blocked people get a "Sign waiver" button directly in the check-in preview.
- A sheet shows the waiver text, a typed full-name signature field, and an agree checkbox; minors or anyone under the age cutoff route to staff.
- On submit, the signature, typed name, and timestamp are recorded against that attendee, and they immediately become eligible in the same session — no re-lookup.
- Staff can also capture a waiver for someone from the staff activation screen.

## 3. Staff code and access lockdown

- The staff code check currently ignores the code entered and always returns an admin. Replace it with a real per-event code stored hashed, verified server-side, returning nothing on mismatch, with attempt rate limiting.
- The client-side fallback code (year-based string) is removed.
- Attendee, wristband, scan, transaction, and assistance tables are currently readable and writable by anyone with the app URL, exposing names, phones, emails, addresses, dates of birth, and emergency contacts. Lock them down: the public kiosk keeps working through narrow server functions that return only what the check-in screen needs, and everything else requires a signed-in staff account.
- Staff roles move to a dedicated roles table checked server-side.

## 4. Payment, walk-ups, and duplicate scans

- **Pending payment**: 68 attendees are unpaid or partially paid. Flag them at lookup with a clear "balance due — see staff" state, and let staff override with the (now real) staff code.
- **Walk-up / transfer / not-found**: the assistance modal currently only files a ticket. Add a staff-authenticated path to create a walk-up registration, correct a phone number, or transfer a registration to a different name, all scoped to the active event and logged.
- **Duplicate scans**: suppress repeat station transactions for the same wristband and station inside a short window, and show "already recorded a moment ago" instead of silently double-counting.
- **Archived years**: block all writes when a past event is selected, not just the read-only badge.

## 5. Check-in and station UX

- Per-person status chips (Ready / Needs waiver / Balance due / Already checked in) replace the stacked warning banners, so a party of six reads at a glance.
- Warnings move from toasts into a persistent per-person result list on the success screen, with a clear next step (proceed to gate vs. see staff).
- Error states split into not-found, blocked, and connection problem, each with its own guidance instead of a single generic modal.
- Station screens show the specific blocking reason inline on a denied scan.
- Offline detection with a "hold and retry" message rather than a generic failure.

## Technical notes

- New RPCs: order-scoped lookup and activation (replacing the phone-wide `activate_entire_order_by_phone` call path), waiver signing, staff code verification, walk-up create/transfer.
- New columns for waiver signature name/timestamp, and a payment-status flag derived from RegFox status during sync.
- New tables: hashed staff access codes, user roles.
- Policy rewrite on `attendees`, `rfid_tags`, `scans`, `station_transactions`, `staff`, `staff_assistance_requests`; anonymous access flows only through security-definer functions.
- Duplicate suppression enforced in the database so it holds across devices.

## Order of work

1. Multi-order disambiguation (lookup + activation + UI).
2. In-app waiver signing.
3. Staff code, roles, and access lockdown.
4. Pending payment, walk-up/transfer, duplicate suppression, archived-year write guard.
5. UX polish across check-in and station screens.
