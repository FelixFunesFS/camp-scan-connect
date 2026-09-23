# Apparel Clarity and Mobile Workflow Hardening

## Goal

Make apparel fulfillment exact and make every camper, staff, station, report, and admin screen comfortable to view and operate across iPhone, Android, tablet, and desktop sizes.

## Apparel fulfillment

- Parse and preserve three separate attributes for every item: product line, garment style, and size.
- Recognize Souvenir 2026, Team Orange, Team Blue, Purpose Over Passion, and Volunteer products without combining same-size items from different lines.
- Show a clear product badge plus style, size, quantity, and pickup state at the T-Shirt Station.
- Record product line with every pickup and keep compatibility with prior pickup records that only contain style and size.
- Add an Overall view and product-line filters to the shirt report, with accurate ordered, picked-up, and remaining totals by size.
- Provide mobile cards for pending pickups while retaining the compact desktop table.

## Reports navigation and accessibility

- Add a sticky, horizontally scrollable “Go to” section bar for Overview, Recent Check-ins, Arrivals, Main Gate, Services, and On-Site.
- A section button will expand its destination, scroll it below the sticky controls, and indicate the current section while scrolling.
- Give section navigation and collapsible controls clear accessible names, relationships, focus states, and 44px minimum touch targets.
- Keep wide report content inside its own scrolling area and use stacked mobile cards where tables would be difficult to read.

## All-page mobile pass

- Review every registered route and the shared scanner, attendee, assignment, station, report, and staff controls they use.
- Fix horizontal page overflow, clipped labels, compacted headers, fixed-width controls, rigid column layouts, and undersized transaction buttons.
- Keep phone workflows single-column and thumb-friendly while preserving dense desktop layouts.
- Ensure long names, emails, codes, badges, and status text wrap or truncate predictably without hiding actions.
- Keep transaction state, database rules, permissions, and existing business logic unchanged outside the apparel identity improvement.

## Technical details

- Use existing semantic colors, shared buttons/cards, responsive helpers, and the current `sm`/`md`/`lg` layout conventions.
- Use stable apparel keys based on product line, style, and size; fall back to legacy style-and-size matching for old transactions.
- Avoid separate mobile-only business logic: responsive presentations will use the same data and actions as desktop.

## Verification

- Check all routes at 320px, 390px, 412px, 768px, 1024px, and 1440px.
- Assert there is no page-level horizontal scrolling and inspect key screenshots for overlap or clipped actions.
- Exercise the staff unlock, self check-in, station selection, scanner controls, shirt item selection, pickup confirmation, reports navigation, assignment controls, and attendee detail flows.
- Confirm the preview build, runtime console, and focused regression checks are clean.