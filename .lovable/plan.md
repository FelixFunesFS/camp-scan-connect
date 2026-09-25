# Syncs Never Undo Manual Changes or Overrides

## Goal
Anything staff change by hand (meal plans, shirt size, site, ticket type, names, contact info, status) stays put. RegFox syncs keep adding new people and updating fields nobody has touched.

## How it will work
- Each attendee gets a list of "locked" fields. A field is locked when staff change it in the app or when an admin grants an override (like the Bostick meal plans).
- Every sync (webhook, hourly, manual) skips locked fields for that person and still updates the rest.
- Check-in, wristband, waiver and station history stay protected as they are today.
- Cancellations: if RegFox cancels someone who has a manual override, the sync still marks them cancelled but flags them for staff review instead of quietly turning off their band.
- Staff can see a small "Manual override" tag on the person's detail page and can clear it to let RegFox take over again.

## Apply to existing data
- Lock `meal_plan` for Jil and Dejr Bostick right away. Their current records already carry the override note.
- Leave the other 10 group companions alone.

## Verify
- Run a manual sync. Confirm both Bosticks still show a standard meal plan and their other fields still update normally.
- Edit a test field in the app, sync again, and confirm the edit survives.

## Technical details
- Migration: add `attendees.locked_fields text[] not null default '{}'` plus a nullable `override_log jsonb`.
- `supabase/functions/regfox-sync/index.ts` and `regfox-scheduled-sync`/`regfox-webhook` share the sync path. Read `locked_fields` alongside `sync_hash`, and before upsert delete each locked key from the row. Compute the hash from the unlocked fields only, so locked people aren't rewritten every run.
- Removal/cancel path: skip credential deactivation for attendees with non-empty `locked_fields`, and record them in `progress_info.cancelled_with_override` for review.
- Staff edit paths (AttendeeDetail edits, meal/shirt overrides) append the edited column to `locked_fields`.
- Backfill: set `locked_fields = '{meal_plan}'` for the two Bostick IDs.
- Fix `update_group_meal_plans()` trigger so it never overwrites a row whose `locked_fields` contains `meal_plan`.
