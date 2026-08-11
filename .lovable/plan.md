# Connect 2026 RegFox Data

## Current state (verified this turn)
- Three events exist: **2024** (empty, unbound), **2025** (654 attendees, bound to form `821092`, archived), **2026** "Melanated Campout Signature 2026" (active, **0 attendees**, `regfox_form_id` is null).
- The `REGFOX_FORM_ID` secret is currently `821092`. `regfox-config` confirms this is bound to the 2025 event.
- Decoding the order-ID (ULID) timestamps of all 654 imported 2025 registrants shows registration ran **Jan 7 → Sep 26, 2025**, then a **143-day gap**, then only 2 stragglers in Feb 2026. So **form `821092` is the 2025 form** — it is not a 2026 form.
- No explicit "year"/"event" field is stored on registrants today.
- All three events have `starts_at`/`ends_at` = null (no campout dates recorded).

## The core problem
The sync engine reads one form ID from the global `REGFOX_FORM_ID` secret and imports into whichever event that form is bound to. Since that's `821092` (2025), every sync lands in 2025. To pull 2026 we must point the system at the **2026 form** — which you believe is `37085` — and the 2026 form may itself contain registrants for more than one Melanated Campout edition, so a "Signature 2026" filter may be needed.

There is one open unknown I will **not** guess: the exact 2026 form ID and how "Signature 2026" registrants are distinguished inside it. Step 0 confirms it before anything is written.

## Recommended architecture: per-event form IDs (annual-friendly)
The `events` table already has a `regfox_form_id` column. Make **that column the single source of truth** for which form each year uses:

- 2025 stays bound to `821092` (re-syncable any time).
- 2026 gets bound to its form (`37085`, pending Step 0 confirmation).
- The **API key stays global** (one RegFox account key works across all your forms).
- The sync reads the *target event's* `regfox_form_id` instead of the global secret, so you never swap secrets and never accidentally import one year's roster into another.

This beats the "swap the secret to 2026" alternative, because swapping makes 2025 un-re-syncable without swapping back — painful for an annual system that needs year-over-year comparison.

## Steps

### Step 0 — Diagnostic (read-only, do first)
Probe the RegFox API directly to settle the two unknowns before any data moves:
1. Confirm which form ID holds the 2026 "Signature" registrants — verify `37085` returns data (vs `821092` which is 2025), and confirm its registrant date range is recent/ongoing (2026).
2. Inspect a few raw registrants' full `fieldData` (paths + labels) on the 2026 form to find how "Melanated Campout Signature 2026" registrants are distinguished — an explicit field/label, or whether the form is already scoped to a single event.
3. Capture the total registrant count and a ticket-type sample so we can sanity-check the import.

Output: confirmed 2026 form ID + the exact filter key (or "no filter needed"). Everything below depends on this.

### Step 1 — Bind the 2026 form + add the Signature filter
- Set `events.regfox_form_id = '<2026 form id>'` for the 2026 row (via the `regfox-config` binding flow or a migration).
- If Step 0 found a distinguishing field, add a filter in `supabase/functions/_shared/regfox.ts` (`fetchAllRegistrants` / `mapRegistrant`) so only "Signature 2026" registrants are imported. If the form is already single-event, skip the filter.

### Step 2 — Refactor sync to read form_id from the event row
- `regfox-sync`: accept the target `event_id` (default = selected/active event), read that event's `regfox_form_id`, and use it for the API call. Keep `REGFOX_API_KEY` from env. The global `REGFOX_FORM_ID` secret becomes an optional fallback only.
- `regfox-reconcile`: same change — reconcile the selected event using its own form_id.
- `regfox-config`: keep, but it should report each event's bound form (already does).
- Frontend `RegFoxSyncPanel`: sync/reconcile against the **currently selected event** (from `EventContext`), and display that event's bound form ID + registrant count so the admin sees exactly where data will land.

### Step 3 — Run the 2026 sync and verify
- With 2026 selected in the header, trigger a Full Sync. Confirm the 2026 event populates.
- Run reconcile: 2026 RegFox count vs DB count should match; ticket breakdown sane; no orphans/duplicates.
- Spot-check a few 2026 attendees (name, phone, waiver, ticket type).

### Step 4 — Archive 2025, set dates, year-switcher
- 2025 is already `is_active=false`; confirm the year-switcher shows **2026 (live)** and **2025 (archived — read only)**. 2025's 654 records remain for comparison.
- Set `starts_at`/`ends_at` on 2025 and 2026 events (campout dates) so reports/debrief date buckets work. 2025 ≈ late Sept 2025 (from the registration cutoff). 2026 dates — confirm with you.
- Decide the 2 Feb-2026 stragglers currently under 2025 (reg_id 82201832 etc.): leave as 2025 or move to 2026 based on Step 0.

### Step 5 — Waiver gate (already delivered in Part 1)
Phone-based self-activation already blocks until the liability waiver is signed, then activates. No further work unless Step 0 reveals a new waiver field path.

## Notes for you
- The earlier "QR pivot" is off the table — confirmed: stick with RFID + phone self-activation.
- The "missing RFID detection / T-shirt capture" and the infinite-loading fixes from prior turns are independent of this and stay as-is.
- After Step 0 I'll know whether `37085` is correct; if it's a different ID I'll surface it before touching the secret or bindings.
