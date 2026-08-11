# T-Shirt Station Data Review + Waivers Section in Staff Hub

## Part 1 — What the T-shirt data actually looks like right now

Checked the live 2026 records rather than the code alone:

| Check | Result |
| --- | --- |
| 2026 attendees synced | 692 |
| Attendees with any shirt field from RegFox | 140 |
| `merchandise.tshirt` order strings (the good, detailed ones) | 129 |
| Volunteer shirt fields (`volunteerShirt*`) | 13 |
| T-shirt pickups recorded | 0 (expected — pre-event) |
| Wristband/credential records in the whole database | **0** |

So the RegFox side **is** current 2026 data. Three real problems sit on top of it:

**1. The tracker is invisible until wristbands exist.** `getTShirtPickupData()` joins `rfid_tags!inner`, so an attendee with no assigned wristband is dropped entirely. With zero credential records today, the T-Shirt Distribution Tracking card reports 0 ordered / 0 remaining even though 140 people bought shirts. Fix: make the credential join optional and show "No wristband yet" in the RFID column, so ordered counts are true from day one and don't depend on assignment progress.

**2. Volunteer shirts are partly missed.** The bare `volunteerShirt` field (13 attendees) isn't recognized as a shirt product at all, and the sized variants (`volunteerShirt.unisexMed`, etc.) get relabeled "Unisex Crew Neck" instead of "Volunteer Shirt". Fix: recognize any `*shirt*` key, and give volunteer shirts their own style label so staff hand out the right garment.

**3. The parser logs on every record.** `extractTShirtInfo` prints dozens of debug lines per attendee. Across 692 records that's thousands of console writes per page load on staff tablets. Fix: gate the logging behind a debug flag.

Also worth doing while in here: a small "Ordered vs. Assigned" note on the tracker so staff understand a 0% pickup rate before the event is normal, not a bug.

## Part 2 — Waivers section in the Staff Hub

Current state: 333 of 692 attendees are marked waiver-signed and **359 are not** — that's 52% of the event blocked from activation by the waiver gate. Every one of those 333 came from the RegFox import; zero waivers have been signed in-app yet. Staff have no screen that shows this, so they'd discover it one attendee at a time at the gate.

The right way to think about it: the waiver isn't a report, it's a **queue of work staff must clear**. So it belongs on `/staff-hub` as an actionable panel, not a chart.

Add a **Waivers** section to the Staff Activation Hub with:

- **Three headline counts** — Signed, Not signed, and % complete, scoped to the active event year.
- **A filter chip row** on the existing attendee list: "Waiver missing" as a one-tap quick filter, so a staffer can work the unsigned list directly.
- **An unsigned list** with name, phone, order ID, and a **Sign waiver** button that opens the existing `WaiverSigningDialog` — same typed-name flow already built, so the attendee types their own name on the staff device.
- **Source badge per attendee** — "Signed at registration" vs. "Signed on-site", read from whether a `waiver_signatures` row exists. This matters for disputes: the on-site ones have a typed name, timestamp, and agreement version on file; the imported ones only have RegFox's flag.
- **Group awareness** — when one person in an order is unsigned, show the order's other unsigned members together, since families arrive as a unit.
- **CSV export** of the unsigned list for pre-event outreach.

Placement: a collapsible card near the top of the Staff Hub, above the attendee list, so the count is visible on arrival without pushing the scan tools off screen. Collapsed by default on mobile.

## Technical notes

- No schema changes. Waiver counts come from `attendees.waiver_signed` scoped by `event_id`; signature provenance comes from `waiver_signatures`.
- Reuse `WaiverSigningDialog`, `waiverService`, and the existing `UnifiedSearchFilter` quick-filter pattern rather than adding parallel UI.
- T-shirt fixes are confined to `src/services/tshirtService.ts` and the RFID column in `src/components/reports/TShirtTracker.tsx`; pickup recording logic is unchanged.
- Refresh the waiver panel on the same background-refresh interval the hub already uses.
