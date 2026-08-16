# Workflow edge-case review + read-only data access

## What the live 2026 data shows

- 694 attendees, **2 credentials issued**, 0 station transactions
- 335 waivers signed / 359 unsigned
- 22 phone numbers tied to more than one order
- `staff` table is **empty** — nobody is a real staff user
- Meal plans: 609 "none", 85 "standard"

## Blocking issues (before gates open)

1. **Credentials not loaded.** Only 2 of 694 attendees have a wristband/barcode. Every station refuses service without one, so meals, drinks, gates and shirts are all blocked until a bulk assignment pass runs.
2. **Staff login is not real.** The staff code check ignores the code entirely and returns the first admin, and the staff list is empty. Anyone who opens the app is effectively an admin.
3. **Every table is world-open.** Current policies allow anonymous read *and write* on attendees — names, emails, phones, addresses, emergency contacts. Anyone with the app's public key can read or delete the roster. Must be restricted to signed-in staff.

## Station / workflow bugs found

4. **Meal double-serve window.** Meal history is filtered to "today in UTC" while meals are labelled by day (Fri Lunch, Sat Dinner). After 8pm ET the day flips, so an already-served meal can be served again, and earlier days read as unclaimed. Claims should be checked per meal for the whole event, not per calendar day.
5. **Meal station is still in test mode.** Time windows are disabled and a "reset weekend meals" button is exposed to staff at the station.
6. **Gate toggle can flip twice.** The duplicate-scan guard keys on the specific action, so an entry followed by a fast re-read records an exit — the person reads off-site while standing on site. The guard should cover the station for the window, not just the exact action.
7. **Assignment still logs as an activation.** The older credential service (used by attendee detail and legacy assignment paths) writes an `activate` transaction when a band is merely assigned. Only the newer assignment cell was fixed, so check-in counts can inflate.
8. **Duplicate credential rows show "Unassigned".** The lookup expects exactly one row; a replacement or lost-band case leaves both an `assigned` and an `active` row, the query errors, and the badge falls back to unassigned. It should pick the most relevant row instead of failing.
9. **Multi-order phones.** 22 phone numbers map to more than one order, so self-activation by phone can surface strangers' names. The pick-from-list disambiguation still needs to cover this path.
10. **Waiver load at the gate.** 359 unsigned means 359 in-line signings. Worth a pre-event text/email signing link plus the fast "sign now" step already on the check-in screen.
11. **Year rollover.** Transaction, scan and credential inserts don't set the event; they rely on a database default hard-coded to 2026. Next year's data would silently land in this year's event. Inserts should carry the active event.

## T-shirt station specifically

Data reads correctly now — orders parse, sizes classify, pickups store the scanned code. Remaining gaps:

- Pickup requires an active credential, so shirts can't be handed out before check-in. Reasonable as policy, but the screen should say so instead of just showing a block.
- No partial pickup: an order of 3 is all-or-nothing.
- No staff note or size-swap override, so the log won't reconcile with the physical box count.

## Read-only / API access for another person

- **Read-only viewer login** (best for a person): roles of `admin` / `staff` / `viewer`, sign-in required, viewers see reports only. Depends on fix #3 anyway.
- **Read-only API endpoint** (best for a system): a server function serving JSON for attendees, check-ins and station activity, protected by an API key you can issue and revoke. No database credentials leave the app.
- **Scheduled export**: CSV drop on a schedule if they only want numbers.

Direct database credentials can't be handed out on this hosting, so it's one of the three above.

## Technical notes

- Waiver + active-credential gating stays in `check_station_access` / `checkAttendeeReadiness`; none of the fixes change that contract.
- Policy lockdown and staff auth must ship together or the app goes dark.
- The meal fix is a query change: drop the `created_at >= today` filter and keep per-meal uniqueness.

## Suggested order

1. Staff auth + roles + policy lockdown (2, 3)
2. Credential bulk load (1)
3. Station correctness: meals (4, 5), gate (6), assignment logging (7), duplicate rows (8)
4. Phone disambiguation + waiver push (9, 10)
5. Read-only access for the other user
6. Year-rollover hardening (11)