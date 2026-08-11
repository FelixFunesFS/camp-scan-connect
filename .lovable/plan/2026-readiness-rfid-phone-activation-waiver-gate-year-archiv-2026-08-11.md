# 2026 Readiness: RFID + Phone Activation, Waiver Gate, Year Archiving

Direction confirmed: **keep RFID wristbands, keep phone-number self-activation.** No QR. This plan covers the three things you raised: edge cases, year separation, and the waiver gate.

---

## Critical finding first

The phone-activation engine is **not functional in the current Cloud database.** These database functions exist by name but every one of them is a stub that returns a hardcoded empty result:

- `lookup_attendees_by_phone` — always returns 0 attendees
- `activate_group_by_phone` — always returns 0 activated
- `activate_entire_order_by_phone` — always returns 0 activated
- `activate_remaining_rfids_by_phone` — always returns 0 activated
- `check_station_access` — always returns "access granted"
- `authenticate_staff_code` — returns the first admin regardless of the code entered

The Self-Service Check-In page calls these and will report "no attendees found" for every real phone number. `check_station_access` returning a blanket yes means **every station currently lets anyone through**. This is the first thing that has to be rebuilt — everything else in this plan sits on top of it.

Also verified: the database holds **0 attendees, 0 RFID tags, 0 transactions**. The events table already has 2024, 2025, and 2026 rows with 2026 marked active, and `attendees.event_id` already defaults to 2026.

**The RegFox sync is also broken**, which matters because it is what puts attendees in the database in the first place. Verified:

- Both `regfox-sync` and `regfox-scheduled-sync` call a database function named `can_start_sync` — **that function does not exist**. Every sync attempt throws before it does any work.
- `regfox-sync` invokes an edge function called `regfox-cleanup`, and the sync panel's Cancel and Force Reset buttons invoke `regfox-sync-cancel` and `regfox-cleanup` — **neither of those edge functions exists** in the project. Only `regfox-sync`, `regfox-scheduled-sync`, and `get-secrets` are deployed.
- `regfox_sync_log` has no `event_id`, so sync history cannot be separated by year.

So right now: no attendees can be imported, and no attendees can be activated. Both pipelines need to be repaired.

---

## Part 0 — RegFox API ingestion (do this first)

The RegFox API is sufficient on its own — no webhook needed. Polling the API is actually the safer choice for accuracy: the API is the source of truth, so each poll re-reads a window of records and self-heals anything missed, whereas a webhook can silently drop a delivery or double-fire on an edit and create duplicates.

`REGFOX_API_KEY` and `REGFOX_FORM_ID` are already stored as secrets.

**What gets built:**

1. **Sync locking.** Create the missing `can_start_sync()` and `release_sync_lock()` functions plus a stuck-sync reaper that clears any sync whose heartbeat has gone stale past `sync_timeout_minutes`. This alone unblocks the two existing functions.
2. **Create the two missing edge functions** — `regfox-cleanup` (clears stuck syncs) and `regfox-sync-cancel` (cancels a running sync) — so the Cancel and Force Reset buttons in the sync panel actually work.
3. **Rebuild `regfox-sync` against the current schema.** It pages through the WebConnex registrants API for the configured form, then **upserts on the RegFox registration ID** so re-running a sync can never create duplicates. Each record is written with the active `event_id` (2026).
4. **Field mapping.** RegFox returns a loose `fieldData` array rather than fixed columns, so an explicit mapping layer translates it into: name, email, phone, order ID, ticket type, meal plan, arrival day, **waiver signed**, t-shirt size, emergency contact, and dietary restrictions. Anything unmapped is preserved in `custom_fields` so nothing is lost. This mapping is the piece most likely to need a tweak once we see the real 2026 form.
5. **Status handling.** Cancelled and refunded registrations sync in but are marked so they cannot activate, rather than being skipped and silently reappearing as "not found" at the gate.
6. **Change detection.** A content hash per record means unchanged rows are skipped instead of rewritten, so the sync log's new/updated counts are meaningful.
7. **Scheduling.** A scheduled job runs the sync every 15 minutes normally, with an "event mode" toggle that drops it to every 2 minutes during the event so late registrations reach the gate quickly.
8. **Reconciliation view.** A panel comparing RegFox's roster against the database: counts by ticket type, records present in RegFox but missing locally, records present locally but gone from RegFox, and suspected duplicates. This is how you confirm the roster is correct before doors open.
9. **Event scoping.** `regfox_sync_log` gets an `event_id` so 2025 and 2026 sync history stay separate.

Waiver status arriving from RegFox feeds directly into the waiver gate in Part 2 — anyone who signed during online registration is pre-cleared, and only the gaps get prompted at check-in.

---

## Part 1 — Rebuild the activation engine (foundation)

Replace the six stubs with real implementations:

**`lookup_attendees_by_phone(phone)`** — normalizes to last 10 digits, matches against `attendees.phone`, returns everyone on the same `order_id` scoped to the active event, with each person's waiver status, RFID assignment, and current activation state.

**`activate_by_phone(phone, method, attendee_ids[])`** — activates only the specific people selected (not blanket "whole order"), writes `rfid_tags.status = 'active'`, `activated_at`, `activation_method`, and logs a row in `station_transactions`. Returns per-person success/skip/blocked with a reason for each.

**`check_station_access(attendee_id, station_type)`** — real checks: is the RFID active, is the waiver signed, is the person deactivated, does their ticket/meal plan entitle them to this station.

**`authenticate_staff_code(code)`** — actually validates the submitted code.

All functions become `SECURITY DEFINER` with a pinned `search_path` and are scoped to the active event.

---

## Part 2 — The waiver gate

Waiver status is currently **displayed** in six places in the UI but **never blocks anything**. New rule:

```text
Phone lookup
   |
   +-- Waiver signed?  YES --> [Activate] button enabled
   |
   +-- Waiver signed?  NO  --> [Activate] disabled
                               [Sign Waiver] shown instead
                                    |
                                    v
                          Waiver screen (scrollable full text,
                          typed legal name + date, checkbox
                          "I have read and agree")
                                    |
                                    v
                          waiver_signed = true, timestamp +
                          signature recorded --> auto-continues
                          to activation
```

- Enforced in the **database function**, not just the UI — a blocked attendee cannot be activated even if the button is bypassed.
- Group orders: each person is gated individually. If 3 of 5 signed, those 3 activate and the other 2 show a "Sign waiver" action. No all-or-nothing failure.
- New `waiver_signatures` table: attendee, event, typed name, signed timestamp, IP, and whether it was signed by the attendee or by staff on their behalf.
- Minors: if `date_of_birth` shows under 18, the waiver requires a guardian name field.
- Staff override exists but is logged with the staff member's identity and a required reason.

---

## Part 3 — Edge cases

Every one of these currently dead-ends at "No attendees found with this phone number" with no path forward. Each gets an explicit resolution path.

| Edge case | What happens today | Proposed handling |
|---|---|---|
| **Wrong / mistyped phone** | Dead end | Fuzzy fallback: search last 7 digits, then last name + email. Show "Did you mean…?" with masked matches. |
| **Phone not in system at all** | Dead end | Escalates to a staff assistance request with the entered number attached, plus a "Search by name or email instead" option. |
| **Didn't purchase / no registration** | Dead end | Routes to a **Walk-Up / On-Site Registration** flow: capture name, phone, email, ticket type, waiver, then assign a wristband. Flagged `registration_status = 'walk_up'` and marked for reconciliation against RegFox. |
| **Ticket transfer** (bought by A, attending as B) | Only a `'transferred'` status label exists — no workflow at all | New **Transfer** action: enter the new person's name/phone/email, original record marked `transferred`, a new attendee row created and linked to the original, waiver must be re-signed by the new person. Full audit trail. |
| **Group order, one phone** | Whole order activates blindly | Per-person checkboxes. Activate only who is physically present. |
| **Same phone across multiple orders** | Returns first match only | Order picker: "This number matches 2 orders — which one?" |
| **Already activated** | Counted as a failure | Reported as "Already checked in at 4:12 PM" — not an error. |
| **No wristband assigned yet** | Activation silently no-ops | Prompts staff to scan and assign a wristband first, then continues. |
| **Lost / replacement wristband** | No path | Deactivate old tag with a reason, assign and activate a new one, both logged. |
| **Refunded / cancelled after sync** | Would still activate | Blocked with "Registration cancelled — see staff". |
| **Duplicate registration** | Two separate records | Flagged in a Duplicates review queue for merge. |

---

## Part 4 — Year archiving and 2026-only display

Requirement: 2026 is what everyone sees; 2025 stays retrievable for comparison.

1. **Every query filters by event.** A global event context sets the active event (2026 by default). Attendee lists, reports, stations, exports, and the developer dashboard all filter by `event_id`. Right now no page filters by event at all.
2. **Archive flag** on the events table — 2024 and 2025 marked archived. Archived events are **read-only**: no activations, no transactions, no edits. Prevents accidentally writing 2025 data during a live 2026 event.
3. **Year switcher** in the top bar, admin-only. Selecting 2025 puts the app in a clearly-marked read-only "Viewing archived event" mode with a persistent banner.
4. **Stations are locked to the active event** and ignore the switcher entirely — a staff tablet can never accidentally check someone into 2025.
5. **Year-over-year comparison view** in Reports: 2025 vs 2026 side by side on registrations, activation rate, self-service vs staff-assisted split, station throughput, and peak arrival times.
6. **2025 data import.** The database is empty, so there is nothing to archive yet. Getting 2025 in requires an export from the previous system (CSV or database dump). Once provided, it imports tagged to the 2025 event. Until then the comparison view shows 2026 only.

---

## Technical notes

- Database functions rebuilt via migration, all `SECURITY DEFINER` with pinned `search_path`, event-scoped.
- New tables: `waiver_signatures`, `attendee_transfers`. New columns: `events.is_archived`, `attendees.transferred_from_id`, and `registration_status` extended with `walk_up` and `transferred`.
- Write-blocking on archived events enforced by database triggers, not just UI.
- All new tables get RLS policies and explicit grants.
- Existing `RfidScanner`, `StationRfidScanner`, and `useRfidCapture` are unchanged — the RFID hardware path stays exactly as it is.

## Suggested build order

1. Repair RegFox API ingestion (nothing exists to activate until attendees are in)
2. Rebuild the six stub activation functions
3. Waiver gate, database-enforced
4. Event scoping + archive flag + year switcher
5. Edge cases: fuzzy lookup, walk-up, transfers, group selection
6. Year-over-year comparison
7. 2025 data import when the export is available

## Sizing for your invoice

| Part | Effort |
|---|---|
| RegFox API ingestion repair + reconciliation | 2 days |
| Rebuild activation engine | 2 days |
| Waiver gate | 1 day |
| Event scoping, archiving, year switcher | 1.5 days |
| Edge case flows (walk-up, transfer, fuzzy, group) | 2.5 days |
| Year-over-year comparison | 1 day |
| 2025 import + QA dry run | 1 day |
| **Total** | **~11 days** |

## Open items

- Confirm the 2026 RegFox form ID — the stored `REGFOX_FORM_ID` currently points at the prior year's form.
- Confirm the waiver is collected as a field on the RegFox registration form, so signed status can sync in rather than being collected at the gate.
- 2025 data export from the previous system, to make the archive real.
- Final liability waiver text from the client (legal copy).
- Confirm whether walk-up registrations collect payment on site or are comp only.