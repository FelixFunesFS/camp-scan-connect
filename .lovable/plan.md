# Fix: "Assigned" badge on an already checked-in attendee

## What's actually happening

Jocelyn Mccants is already checked in. Her 2026 record shows an active wristband (`92346902673388000059135708`), waiver signed, self-activated at 21:59:51 UTC today. So the system correctly refused to check her in a second time.

The problem is purely how that is communicated. Two mismatches in the check-in screen:

1. **Wrong badge.** The attendee card decides "Active vs Assigned" by reading `is_activated` / `activated_at`, but the phone lookup returns `is_active` / `rfid_status`. Neither field it looks for exists in the response, so an already-active person always falls through to the yellow **Assigned** badge.

2. **Silent dead-end button.** The check-in button counts only people who are not yet active. With everyone already active, the count is zero and the button greys out reading "Nothing to check in" — with no explanation that this is because they're already checked in.

Together it reads as "she's only assigned, and the app won't let me activate her."

## The fix

**Correct the status badge**
- Read activation from the fields the lookup actually returns (`is_active`, `rfid_status === 'active'`) in addition to the existing ones, so already-active attendees show the green **Active** badge everywhere the card is used.

**Make the already-checked-in state explicit**
- Show a clear confirmation panel at the top of the preview when everyone on the order is already active: "Already checked in" with each person's name and the time they were checked in.
- Change the disabled button label from "Nothing to check in" to "Already checked in" when the reason is prior activation (keep "Nothing to check in" when the block is a waiver or a missing wristband).
- Surface the per-person reason on each card when they can't be checked in: already active / waiver required / no wristband.

**Confirmation after the action**
- The check-in handler already shows an "Everyone on this order was already checked in" toast, but it clears the screen at the same time so it's easy to miss. Keep the result on screen instead of resetting, so staff see the outcome.

## Technical notes

- Files: `src/components/shared/MobileAttendeeCard.tsx` (badge logic), `src/components/MobileActivationPreview.tsx` (already-active panel, button label, per-person reason), `src/pages/ActivationStation.tsx` (don't reset the view on a no-op result).
- No database or RPC changes — `activate_entire_order_by_phone` is behaving correctly, returning `activated_count: 0` / `already_active_count: 1`.
- The lookup response already carries `rfid_status` and `is_active` per attendee; the fix consumes what's there rather than adding fields.
