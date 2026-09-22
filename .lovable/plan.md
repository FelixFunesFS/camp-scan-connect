# Show the actual site number, not just the site type

## What's happening today

Every camper's "site location" in the system is only a broad category: dry site, RV site, cabin, or glamping. That's why the check-in card reads "Site dry_site" instead of something useful, and why no numbers ever appear.

The registration data does hold the real spot each person picked. It's sitting unused in the registration details:

- Premium tent: `greenSpaceForTent25`
- Tailgate / dry camping: `dryCampingTent200`, `row2TailgateCamping`, `tailgateCampingRv398`, `partyZone`
- RV: `pad02lakefront30Amp`, `pad14lakefront50Amp`, Winnebago lot choices
- Van/rooftop: `pad29lakefront30Amp`
- Glamping / cabin: `cabin5`, king / double-queen tent choices
- Some entries are `waitlistChoice` (no spot yet)

Roughly 800 of the 962 people with accommodation data have one of these; 134 have no site at all.

## What will change

1. The specific spot becomes the person's assigned site everywhere it matters: the self check-in card, the credential assignment list and mobile cards, attendee details, the staff hub, reports, and CSV exports.
2. The raw codes get translated into readable text: `greenSpaceForTent25` becomes "Green Space Tent 25", `pad02lakefront30Amp` becomes "Pad 02 Lakefront 30 Amp", `cabin5` becomes "Cabin 5". The display logic for this already exists and is currently unused.
3. Display format is "Premium Tent: Green Space Tent 25" — type plus number — so staff can direct people without another lookup.
4. Waitlist entries display "Waitlist". People with no site at all show no site line.
5. New registrations and edits coming from RegFox keep the spot in sync automatically.

## Technical details

- Add a text column `attendees.site_detail` (the existing `site_location_assignment` is a four-value enum and cannot hold spot codes; it stays as the category).
- Extraction in `supabase/functions/_shared/regfox.ts`: read the first non-empty of `premiumTentSite`, `premiumTentSite3`, `dryCampingTentSite`, `preferredRvSpaceNote`, `preferredPremiumVanRoof`, `preferredPremiumVanRoof2`, `winnebagoLotPreferredRv`, `whichGlampingTentKing`, `glampingTent`, `glampingTentKingBunks`, `glampingTentDoubleQueen`. Companions inherit their order's value the same way accommodation already does via `buildOrderAccommodations`.
- Backfill migration: populate `site_detail` for existing attendees from `custom_fields` using the same key order, so today's roster is correct without waiting for a resync.
- Display: build the combined string `"<Ticket type label>: <detail>"` and pass it through the existing `parseSiteLocationAssignment` / `formatSiteLocationForDisplay` in `src/utils/siteLocationUtils.ts`, which already handles green-space, pad, cabin, and waitlist formatting. Add a small helper so every screen formats identically.
- Extend `attendees_for_phone` and `lookup_attendees_by_phone` to return `site_detail`, and widen the lookup types in `src/services/phoneActivationService.ts`.
- Update `MobileAttendeeCard.tsx` to render the formatted site line instead of the raw enum, plus `MobileRfidAssignmentCard.tsx`, `RfidAssignment.tsx`, `AttendeeDetailModal.tsx`, `AttendeeDetail.tsx`, `SiteLocationRfidView.tsx`, reports, CSV export, and the Sheets mirror.
- Regenerate database types after the migration.
