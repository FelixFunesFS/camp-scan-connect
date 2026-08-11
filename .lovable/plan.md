# Reset 2026 check-in data to zero

## Current state

For the 2026 event (694 attendees), exactly one person is activated:

- **Jocelyn Mccants** — checked in today at 21:59 UTC, self-activated by phone
- Credential `92346902673388000059135708` (barcode), status `active` — the only credential row in the system
- 2 station transactions, both hers

Everyone else has no credential and no activation. So the "activated" count is 1, and it should be 0.

## What to clear

A migration that resets the 2026 event to a pre-event state:

1. **Attendees** — clear `checked_in_at`, `activated_at`, `deactivated_at`, `most_recent_activation_at`, and `most_recent_activation_method` for every 2026 attendee.
2. **Credentials** — delete the test credential row from `rfid_tags` for 2026, so no wristband/barcode is assigned to anyone.
3. **Station transactions** — delete the 2026 transaction history that came from testing.
4. **Scans** — delete any 2026 scan rows for the same reason.

Waiver signatures are left alone: they are real attendee consent (331 signed) and must survive the reset.

## Scope guard

Every statement is filtered to `event_id = '00000000-0000-0000-0000-000000002026'`, so 2025 and 2024 history is untouched.

## After the reset

Re-run the counts to confirm 0 activated, 0 checked in, 0 credentials, and 0 transactions for 2026, and report the verified numbers.

## Note for repeat testing

If you want to run test check-ins again without hand-cleaning the database afterward, a "Reset event check-in data" action can be added to the Developer Dashboard that performs exactly these steps for the active event behind a confirmation prompt. Say the word and it goes in the same change.
