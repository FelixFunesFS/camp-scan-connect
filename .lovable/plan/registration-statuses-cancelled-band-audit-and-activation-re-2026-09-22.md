# Registration statuses, cancelled-band audit, and activation reset

## Where things stand today (verified in the live data)

For the active 2026 event:

- 918 Registered, 13 Pending, 31 Cancelled. There is no separate waiting-list status stored.
- Wristbands held by cancelled people: **8 bands across 7 people** — Jason Cooper (2 bands), Charlie Ellis, Elizabeth Harris, Harrietta J, Arsha Knowles, Jeffery Knox, Marjorie Stafford. All 8 are already retired (deactivated) by the hourly sync, so none can scan today.
- 459 people are currently marked checked in, with 451 bands showing Active — these are the test activations to undo.
- Test station activity so far: 30 drinks, 12 headphone check-outs, 10 check-ins, 4 gate entries, 4 gate exits.

## How to think about it

Three buckets, one rule each:

1. **Confirmed (Registered)** — normal, everything works.
2. **Pending final payment** — a real attendee: visible everywhere, can be given a band and checked in, but always carries an amber "Pending payment" label so staff can collect at the gate.
3. **Cancelled / refunded** — filtered out of every working screen by default, never activatable, and surfaced only in an admin audit list.

Waiting-list people currently arrive from RegFox mixed into Pending, and the original RegFox wording isn't saved anywhere, so they can't be told apart yet. The plan starts saving the raw RegFox status on every record; once that's flowing we can split waiting list out of Pending automatically.

## What will change

**1. Status handling everywhere**
- One shared status helper used by all screens: label, colour, and "can this person be checked in" answer.
- Cancelled is excluded by default from Credential Assignment, the Staff Activation Hub, station lookups, self check-in, reports, and exports; a "Cancelled only" view stays available.
- Pending shows everywhere with an amber badge; Registered shows green.
- Self check-in and station scans refuse cancelled people with a clear "This registration was cancelled — see staff" message.

**2. Status visible on the screens staff use**
- Status badge on the Staff Activation Hub rows/cards, the Credential Assignment list and mobile cards, attendee details, and the by-order view.
- Same colours and wording in every place, readable on phone widths.

**3. Cancelled-with-band audit**
- New admin section (in the Sync Integrity area of the Developer Dashboard) listing every cancelled person who was ever issued a band, the band number, and whether it is retired.
- Shows the 8 bands above, flags any that are still active, with a one-tap Retire action and a CSV export.

**4. Reset the test activations**
- Clear check-in and activation timestamps on all 459 attendees, and set their 451 active bands back to Assigned.
- Delete the test station activity (activations, drinks, headphones, gate scans).
- Band assignments, waivers, and registration data are all kept untouched.
- Cancelled people's bands stay retired.

## Technical notes

- Add `regfox_raw_status` to `attendees`, populated by `mapRegistrant`, so waiting-list vs pending-payment can be separated later; add a `waitlisted` value to the `registration_status` enum and map RegFox's waitlist wording to it once the raw values confirm what it's called.
- New `src/lib/registrationStatus.ts`: `getStatusLabel`, `getStatusVariant`, `isActivatable`, `WORKING_STATUSES = ['registered','pending']`.
- Apply that helper in `RfidAssignment.tsx`, `MobileRfidAssignmentCard.tsx`, `MobileOrderGroupList.tsx`, `GroupRfidView.tsx`, `StaffActivationHub.tsx`, `AttendeeDetailModal.tsx`, `AttendeeDetail.tsx`, `MobileActivationPreview.tsx`.
- Block cancelled at the source: add the status check inside `activate_selected_by_phone` / `activate_group_by_phone` / `credential_lookup` so scanners and self check-in can't bypass the UI.
- Cancelled-band audit extends `src/components/dev/SyncIntegrityPanel.tsx` to include retired bands, not just still-active ones.
- Reset runs as one SQL migration: null `activated_at`, `checked_in_at`, `most_recent_activation_at`, `most_recent_activation_method`; set `rfid_tags.status = 'assigned'` and null `activated_at`/`activation_method` where currently `active`; delete `station_transactions` for the 2026 event except `rfid_assign` rows; leave the 8 cancelled/deactivated bands alone.
