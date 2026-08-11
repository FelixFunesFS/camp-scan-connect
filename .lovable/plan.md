# Pre-Event Readiness Review: Edge Cases, Risks, and Fixes

A review of the live 2026 data plus the activation/check-in flows. Findings are ordered by risk, each with a concrete fix. Nothing below is implemented yet.

## What the live data shows

- 2026 is active with 692 attendees across 476 orders; 2025 (654) and 2024 (empty) are archived and read-only.
- 359 of 692 attendees have not signed the waiver — over half will hit the activation gate at the gate.
- 68 attendees are still "pending" (unpaid/partial) and are currently treated exactly like paid attendees.
- 0 wristbands exist in the system for 2026. No tag inventory means no one can be assigned or activated today.
- 22 phone numbers appear on more than one separate order (one number covers 6 registrations).
- Every phone number is a valid 10-digit value, so no malformed-phone cleanup is needed.

## Critical issues

### 1. No wristband inventory for 2026
Assignment, activation, and every station scan depend on tag records that do not exist. Need an inventory load step (bulk import or scan-to-create on first assignment) plus a visible "tags loaded" readiness indicator before gates open.

### 2. One phone, multiple orders
Phone check-in gathers every order tied to a matching number and activates all of them, while reporting only one order ID back to the attendee. A person who registered twice, or a host who booked two separate parties, silently activates people they may not be standing with. Fix: when a phone resolves to more than one order, show an order picker (order ID, party size, names) and activate only the chosen one.

### 3. Staff code authentication is a no-op
The staff-code check ignores the code entirely and always returns the first admin. Anything gated behind "staff override" is effectively open. Fix: validate a real per-event code (or per-staff PIN) server-side and return no row on mismatch.

### 4. Public read/write on attendee data
Attendees, RFID tags, scans, station transactions, and assistance requests are all fully open to anonymous clients — full PII (name, phone, email, address, DOB, emergency contacts) is readable and writable by anyone with the app URL. Fix: keep the self-service phone flow going through security-definer functions that return only what the kiosk needs, and require authentication for the admin/station tables.

## Workflow edge cases to close

- **Unpaid registrations**: pending attendees should be flagged at check-in ("balance due — see staff") rather than activated silently.
- **Waiver-blocked attendees**: the gate correctly blocks them, but there is no in-app way to sign. Needs an on-device waiver capture (name, timestamp, agreement text) that unblocks activation immediately.
- **Partial group activation**: a group where some members are waiver-blocked or lack a wristband currently activates the rest and returns warnings. Ensure the UI shows a clear per-person outcome list, not just toasts.
- **Not in the system**: walk-ups, transfers, wrong number, and name-change cases all funnel into the assistance modal, which only files a ticket. Needs a staff path to create or re-point a registration on the spot.
- **Lost/replaced wristbands**: deactivate old tag, issue new, keep history — confirm the reassignment path exists and is reachable at the gate.
- **Re-entry and double scans**: repeated activation is safe (already-active is reported), but station transactions can double-count; add short-window duplicate suppression per tag/station.
- **Offline and flaky connectivity**: the entire flow is live-query dependent. At minimum, detect offline state and show a clear "hold, retry" message instead of a generic failure.
- **Archived-year safety**: viewing 2025 shows a read-only badge, but write paths are not blocked. Guard mutations when a non-active event is selected.

## UX concerns

- Self check-in is a single mobile card; the preview/confirm step needs large per-person status chips (ready / needs waiver / needs wristband) so an attendee understands why someone in their party is blocked.
- Error handling collapses everything to "system error" plus a staff modal. Distinguish not-found, blocked, and outage with different guidance.
- The activation success screen should show what to do next (proceed to wristband pickup vs. see staff), not just a count.
- Station screens should surface the attendee's blocking reason inline rather than a generic deny.

## Technical notes

- `activate_entire_order_by_phone` derives orders from all direct phone matches; scoping it to a caller-supplied order ID is the minimal change for issue 2.
- `authenticate_staff_code` ignores `p_code`; replace with a hashed code compare, security definer, no fallback row.
- Table policies of the form `ALL ... using(true)` on `attendees`, `rfid_tags`, `scans`, `station_transactions`, `staff`, `staff_assistance_requests` are the exposure surface.
- Tag inventory needs an `event_id`-scoped bulk insert path; today `rfid_tags` is empty for the active event.

## Suggested order of work

1. Wristband inventory load + readiness check.
2. Multi-order phone disambiguation.
3. In-app waiver signing.
4. Staff code + RLS lockdown.
5. Pending-payment flag, walk-up/transfer path, duplicate-scan suppression.
6. UX polish on the check-in and station screens.
