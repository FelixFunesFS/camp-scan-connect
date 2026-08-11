---
name: Waiver policy and records
description: Waiver consent rules at check-in, where signatures are stored, and how assignment vs activation is logged
type: feature
---
- Waiver gate: an attendee cannot be activated/checked in without `waiver_signed = true`.
- RegFox import flag counts as valid consent — those attendees walk through without re-signing.
- Anyone unsigned at check-in time must sign in-app on the spot (typed name only, attendee types their own name), then check-in continues.
- In-app signatures are stored in `waiver_signatures` (immutable: insert + select only). A trigger sets `attendees.waiver_signed = true`.
- After signing, attendees can download a PDF receipt (client-side jsPDF, `src/lib/waiverReceipt.ts`). No email delivery is set up.
- Staff can look up a signed attendee in the Waivers panel and re-download the PDF; records are labelled "signed in app" vs "flagged by import".
- Wristband assignment logs `transaction_type = 'rfid_assign'` / `station_type = 'rfid_assignment'` — never `activate`. Only real check-ins appear in activation history.
