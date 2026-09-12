# Sort credential assignment by first name

Update the alphabetical sort in the Credential Assignment page so "Name" sorts by first name, then last name, instead of last name first.

## Files to change

1. `src/pages/RfidAssignment.tsx` — change the `name` sort case from `${last_name} ${first_name}` to `${first_name} ${last_name}`.
2. `src/components/MobileOrderGroupList.tsx` — change `nameKey` from last-name-first to first-name-first so the mobile "By Order" name sort matches.

## Verification

- Build passes.
- Sorting by Name in Individual and By Order views lists attendees A–Z by first name.
