# Part 1: Activation Engine + Year-Agnostic App

## The mental model (how to think about this annually)

Today the app has two hard-coded assumptions that break every year:

1. **Years live in the code.** Strings like "Melanated Campout 2025", `new Date('2025-09-19')`, `mc2025`, and "Souvenir 2025 T-Shirt" are scattered across pages, utils and services.
2. **Nothing is event-scoped at runtime.** Every query reads all attendees/tags/scans regardless of year — it only works because one year of data exists.

The fix is one rule applied everywhere:

> **The active event is the single source of truth. Nothing in code knows what year it is.**

Concretely:
- The `events` row flagged active defines the year, name, dates, and RegFox form.
- Every read and write is filtered/stamped by that event's id.
- Every year label, date boundary, and event-specific string is read from the event record, not typed into a component.

Rolling over to 2027 then becomes: create an events row, set it active, paste the RegFox form id. No code changes.

## What gets built

### 1. Event context (frontend)
- A global provider loads the active event once and exposes id, name, year, start and end dates.
- An admin year switcher lets admins view past years read-only; operational stations always use the active event.
- Every existing query in pages/services gets filtered by event, and every insert stamps the event.

### 2. Real activation functions (replacing the six stubs)
The stubs currently return empty/fake data, so phone check-in cannot work. Each is rewritten as event-scoped logic:

- `lookup_attendees_by_phone` — normalizes to the last 10 digits, returning the attendee, their order companions, RFID status, and **waiver state** per person.
- `activate_entire_order_by_phone` / `activate_group_by_phone` / `activate_remaining_rfids_by_phone` — activate assigned tags for the order, skip already-active ones, log a `station_transactions` row per activation with the activation method ('self_activated' or 'staff_assisted'), and return counts plus warnings.
- `check_station_access` — real access decision from tag status and activation state.
- `bulk_activate_assigned_rfids` — scoped to the active event only.

Rules enforced inside the functions (not in the UI, so staff and self-service behave identically):
- Only tags belonging to the active event.
- **Waiver gate:** an attendee whose waiver is unsigned is returned as blocked with reason `waiver_required` and is not activated. Others in the same order still activate; the response names who was blocked.
- Attendees with no assigned tag come back as `needs_rfid` warnings rather than silent failures.

### 3. De-yearing the codebase
- `src/pages/Index.tsx`, `ActivationStation.tsx` — event name/dates/copy from the event record.
- `src/utils/etTimezone.ts` — arrival-day and "day of event" math derived from the event start date instead of `2025-09-19`.
- `src/components/reports/CheckInOverview.tsx` — arrival-day buckets computed from event start/end, not Sept 25–26 constants.
- `src/components/dev/PostProductionAnalysis.tsx` — cutoff derived from event start.
- `src/services/tshirtService.ts` — match merchandise by pattern ("t-shirt") rather than the 2025 SKU string.
- `src/components/SafetyConfirmationDialog.tsx` — the `mc2025` staff code becomes year-derived/configured, not a literal.

### 4. 2026 data
2026 exists and is active but has 0 attendees, because the RegFox key currently points at the 2025 form (already bound to the 2025 event, so history stays archived and retrievable). Once the 2026 form id is available it gets bound to the 2026 event and sync fills it. Until then the app runs correctly against an empty 2026 roster.

## Out of scope here
Waiver *signing* UI, walk-up/transfer edge cases, and fuzzy phone matching stay in Part 2/3 — Part 1 only enforces the gate and reports the reason.

## Technical notes
- All functions resolve the event as the passed event id falling back to the active event, so signatures stay compatible with existing calls.
- Activation writes go through these functions only, keeping the audit trail consistent.
- Indexes on `attendees(event_id, phone)` and `rfid_tags(event_id, status)` for lookup speed.