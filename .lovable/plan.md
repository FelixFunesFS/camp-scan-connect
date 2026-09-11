# Split Villa and Premium categories on reports

Today the arrivals chart collapses distinct RegFox choices into six buckets:
Villa bookings are counted as Cabin, and premium tent + premium RV are merged
into one "Premium Power" bucket. This plan separates them and applies the same
names everywhere in the app.

## New category list

| Category | What it covers | Current 2026 count |
|---|---|---|
| Premium Tent | tent option 2 (powered tent) | part of the 277 |
| Premium RV | premium RV (powered) | part of the 277 |
| Dry Site | tent option 1, van/rooftop | 195 |
| RV Site | dry RV, paved dry RV | 147 |
| Day Pass | day-pass-only and weekend passes | 101 |
| Cabin | cabin | 47 |
| Villa | villa | 35 |
| Glamping | glamping tent | 9 |

Exact splits inside the current Premium Power bucket are confirmed when the
re-sync runs.

## Work

1. **Database**: add `villa`, `premium_tent`, and `premium_rv` to the ticket
   type list. Existing `premium_power` rows stay valid until the re-sync
   rewrites them, so nothing breaks mid-change. Site assignment for Villa
   stays with the cabin group (it is a built structure).
2. **RegFox mapping**: villa returns Villa; premium RV returns Premium RV;
   premium tent returns Premium Tent. Non-premium mappings unchanged.
3. **Backfill**: run a full RegFox reconciliation so all 888 records get the
   new categories. Operational data (check-in, activation, wristbands,
   waivers) is untouched — the sync already preserves those fields.
4. **Consistency sweep**: use the same labels, colors, and ordering in the
   arrivals chart, check-in tables, attendee detail, assignment views, staff
   panels, mobile cards, exports/sheets sync, and the read-only API.
5. **Layout**: the arrivals grid grows from 6 to 8 cards — switch to a
   responsive grid that stays readable on phones (1 col), tablets (2), and
   desktop (4).

## Technical notes

- Migration: `ALTER TYPE ticket_type ADD VALUE` for the three new values
  (separate statement per value, committed before use).
- `supabase/functions/_shared/regfox.ts` `rawAccommodation()`: villa branch
  returns `ticket_type: 'villa'`, `site_location_assignment: 'cabin'`; RV
  premium returns `premium_rv`; tent option2 returns `premium_tent`.
- Add a shared `src/lib/ticketTypes.ts` exporting label, badge/progress token,
  and sort order per ticket type; `ArrivalsBreakdown.tsx` and other components
  currently switch-casing on ticket type import from it instead of duplicating
  their own maps.
- Legacy `premium_power` keeps a label ("Premium (legacy)") in the shared map
  so archived 2025 rows still render correctly.
- Re-deploy `regfox-sync` and trigger `regfox-scheduled-sync`, then verify
  counts per ticket type with a query before reporting done.
