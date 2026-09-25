# Group check-in: clearer waiver messaging

## Findings
- Nothing is broken in group check-in. Anyone who hasn't signed is blocked on purpose; members who have signed still check in.
- 132 of 266 active 2026 groups have at least one person who hasn't signed (68 groups with nobody signed, 64 with some signed).
- Real snag: after someone signs, the list refreshes, but that person's checkbox stays **unticked**. If nobody in the group had signed, the Check-In button stays greyed out with no explanation, so it looks like the group "can't be checked in."

## Changes (check-in screen only, no rule changes)
1. **Progress line at the top:** "2 of 4 ready to check in — 2 still need to sign the waiver."
2. **Status on each person's card:** a "Needs waiver" tag with its own Sign button, or a "Ready" tag.
3. **Auto-tick after signing:** once someone signs, they're ticked automatically so the group can keep going without tapping again.
4. **Clear reason on the greyed-out button:** when no one can check in yet, the button reads "Sign waivers above to continue" instead of just going grey.
5. **After a partial check-in:** the success screen lists who still needs to sign, with a "Sign now" option that takes them back to their group.

## Technical details
- `MobileActivationPreview.tsx`: sync `selectedIds` with `eligibleIds` whenever the lookup result changes, adding newly eligible IDs and keeping any the camper cleared on purpose. Add a progress summary, per-card badge and Sign button, and button text that changes with state.
- `MobileActivationSuccess.tsx`: the waiver-blocked section gets a "Sign now" button that runs the lookup again.
- No database or function changes.
- Check with Playwright at 320px, 393px and 768px using a real partially signed group.
