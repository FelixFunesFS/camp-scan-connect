# Registration View Badge & Order ID Cleanup

## Goal
Polish the self-service registration/activation preview so it clearly communicates when attendees are already checked in, and remove visual clutter from the order ID badge.

## Changes

1. **Show a "Checked In" badge in the registration preview**
   - In `src/components/MobileActivationPreview.tsx`, compute whether all found attendees are already active (`is_active` true, not selectable).
   - When everyone is already checked in, render a prominent green success badge at the top of the preview (next to the existing group/individual badge) reading **"Checked In"**.
   - Keep this badge distinct from the per-card "Active" wristband badge already shown inside `MobileAttendeeCard`.

2. **Improve the disabled action button label**
   - When `selectedCount === 0` because all attendees are already checked in, change the button text from **"Nothing to check in"** to **"Already checked in"** to match user expectations.
   - Keep the existing "Nothing to check in" wording only if nothing is selectable for other reasons (e.g., missing wristband assignment).

3. **Remove the green order ID badge from this view**
   - Remove the secondary `#{lookupResult.order_id}` badge from the header summary card in `MobileActivationPreview.tsx`.
   - The order ID is already visible inside each `MobileAttendeeCard`, so removing the duplicate badge reduces visual noise.

## Technical Details
- `MobileActivationPreview.tsx` already knows `eligibleIds` (selectable attendees) and `all` (everyone on this phone/order). A new `allCheckedIn` boolean can be derived with `useMemo` as `all.length > 0 && eligibleIds.length === 0 && all.every(a => a.is_active || a.activated_at)`.
- Use the existing shadcn `Badge` component and success color tokens; do not hardcode colors.
- The per-card status logic inside `MobileAttendeeCard` does not need to change.

## Out of Scope
- No database or API changes.
- No behavior changes to activation, waiver gating, or wristband assignment.
- No changes to other views that also show order IDs.
