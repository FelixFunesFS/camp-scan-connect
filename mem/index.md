# Project Memory

## Core
- `rfid_tags.activation_method` is strictly 'self_activated' or 'staff_assisted'.
- "Checked In" status is defined by `rfid_tags.status === 'active'` (overrides `activated_at`).
- Do not add the Event Debrief page (`/debrief`) to the sidebar navigation menu.
- Wristband assignment logs `transaction_type = 'rfid_assign'`, never `activate`.

## Memories
- [RFID Activation Constraints](mem://database/constraints) — Allowed values for rfid_tags.activation_method
- [Check-In Status Logic](mem://logic/activation-status) — Business logic for determining 'Checked In' status
- [Event Debrief Page](mem://features/debrief-page) — Debrief page components and sidebar constraint
- [T-shirt Station Workflow](mem://features/t-shirt-station) — Data capture requirements for T-shirt pickup
- [RFID Assignment Pagination](mem://performance/rfid-assignment) — Pagination and refresh rules for RFID Assignment page
- [Waiver policy and records](mem://features/waiver-policy) — Consent rules at check-in, signature storage, PDF receipts, assignment-vs-activation logging
