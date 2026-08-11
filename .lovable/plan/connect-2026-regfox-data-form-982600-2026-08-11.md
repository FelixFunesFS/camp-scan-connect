# Connect 2026 RegFox Data (form 982600)

## Verified this turn (live API probe, read-only)
Form **982600** is confirmed correct:
- `formName` = **"Melanated Campout Signature 2026"** — it is a single-event form, so **no year/Signature filter is needed**.
- **716 registrants**, newest dated **Aug 11, 2026** (actively selling).
- Sample of 100 statuses: 70 `completed`, 29 `pending final payment`, 1 `abandoned`.

For contrast, the currently-configured form `821092` is the **2025** form (654 records, registrations Jan–Sep 2025). The 2026 event row is active but empty and unbound.

## Mapping gaps found (must fix, or 2026 imports land wrong)
The existing mapper was written against the 2025 form. Against 2026 data it breaks in four places:

1. **37% of registrants have no `multipleChoice` field.** Of 100 sampled, 37 lack it — 24 are *companions on a group order* where another registrant has it, 13 are standalone (day-pass / add-on wristband buyers: `additionalActivityWristband2`, `additionalActivityWristbandRv`, `weekendDayPassOnly`). Today all 37 silently default to `dry_site`. Companions should **inherit the accommodation from their order**; standalone pass-holders should map to `day_pass`.
2. **New `villa` accommodation value** (`multipleChoice: villa`) is unhandled and falls through to `dry_site`. Needs its own mapping — likely `cabin` or `glamping`; needs your call.
3. **New/renamed fields** not in the mapper: `registrationOptions2`, `weekendDayPassOnly`, `premiumTentSite3`, `dryCampingTentSite`, `areYouRentingAn2`, `whatTypeOfRental`, `wantHelpFiguringOut`, `howDidYouHear2`. These currently land in `custom_fields` (not lost, just not mapped to columns).
4. **`pending final payment` (29% of sample)** maps to `pending`. Confirm these should be imported and whether they may activate at the gate.

Good news: core identity fields are unchanged and map correctly — `name2.first/last`, `email`, `phone`, `dateOfBirth`, `gender`, `address.*`, `emergencyContactNameNumber`, `areYouVeteran`, `merchandise`, `status`. The **waiver field works as before** (`false` when unsigned, a `.pdf` filename when signed) — 34 of 100 sampled are already signed, so the waiver gate is live and meaningful.

## Architecture: per-event form IDs
`events.regfox_form_id` becomes the single source of truth for which form each year uses — 2025 stays on `821092`, 2026 on `982600`. The API key stays global (one key covers all forms). This avoids swapping the `REGFOX_FORM_ID` secret every year and makes any year re-syncable for comparison.

## Steps

### Step 1 — Bind 2026 and switch sync to per-event form IDs
- Set `events.regfox_form_id = '982600'` on the 2026 row.
- `regfox-sync` and `regfox-reconcile`: read the target event's `regfox_form_id` from the event row instead of the global secret (secret kept only as a fallback). Sync/reconcile the **currently selected event**.
- `RegFoxSyncPanel`: show the selected event's bound form ID and registrant count so the admin can see exactly where data will land before running.

### Step 2 — Fix the mapper for the 2026 form
In `supabase/functions/_shared/regfox.ts`:
- **Order-level accommodation inheritance**: resolve ticket type per *order*, so companions get the buyer's site type instead of defaulting to `dry_site`.
- **Standalone pass-holders** (`weekendDayPassOnly` / wristband-only, no accommodation) map to `day_pass`.
- **Add `villa`** to `mapAccommodation`.
- Map the new site-selection fields (`premiumTentSite3`, `dryCampingTentSite`, `registrationOptions2`) into the premium/dry determination.
- Keep everything unmapped flowing into `custom_fields` as it does now.

### Step 3 — Dry-run, then import
- Run `regfox-reconcile` against 2026 **first** (it writes nothing) and review the ticket-type breakdown for all 716 before importing.
- Then run a Full Sync with 2026 selected. Expect ~715 usable rows (abandoned excluded).
- Verify: counts match, ticket breakdown sane, no orphans/duplicates, spot-check names/phones/waiver flags.

### Step 4 — Archive 2025 and set event dates
- Year-switcher should show **2026 (live)** and **2025 (archived — read only)**; the 654 2025 records stay for comparison.
- Set `starts_at`/`ends_at` on both events (all three are currently null) so report and debrief date buckets work — I need the 2026 campout dates from you.
- Decide the 2 stragglers registered Feb 2026 that sit under the 2025 event: leave in 2025 or move to 2026.

### Step 5 — Ongoing sync
The 2026 form is still selling, so schedule the existing `regfox-scheduled-sync` against 2026 (hourly is plenty) to keep the roster current through the event.

## Questions I still need answered
1. **`villa`** — should it map to `cabin` or `glamping`?
2. **`pending final payment`** registrants — import them, and may they activate a wristband at the gate?
3. **2026 campout dates** (start/end) for the event row.

## Technical notes
- Files touched: `supabase/functions/_shared/regfox.ts` (mapper), `supabase/functions/regfox-sync/index.ts`, `supabase/functions/regfox-reconcile/index.ts`, `src/components/RegFoxSyncPanel.tsx`, plus one migration to bind the form ID and set event dates.
- No change to the RFID/phone activation flow or the waiver gate — those already work and the 2026 waiver field format is identical to 2025.