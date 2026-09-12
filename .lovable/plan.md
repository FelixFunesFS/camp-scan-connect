# Mobile credential cards and “By Order” redesign

## Goal
Make Credential Assignment comfortable and reliable on 320–430px iOS and Android screens, especially when order groups are expanded. Use the selected **Modern stacked list** direction, adapted to the existing design system and operational workflows.

## What the review confirmed
- The mobile **By Order** view currently renders the same five-column summary table used on desktop.
- Expanding an order inserts another seven-column table inside it. At 390px, phone numbers, badges, labels, and assignment controls collapse into character-wide columns.
- The current sort control changes direction only when the same option is selected again, so A–Z versus Z–A is not obvious.
- Individual attendee cards use workable mobile spacing, but the separate “View full details” row and expanded content add unnecessary vertical space.

## Implementation

### 1. Replace mobile order tables with stacked accordions
- Keep the existing table-based **By Order** experience at tablet/desktop widths.
- Add a dedicated phone layout made of full-width accordion groups with 12px gaps and 12–16px internal spacing.
- A collapsed group will show:
  - lead attendee name as the primary label;
  - shortened/copyable order ID;
  - site or accommodation;
  - attendee count;
  - assigned/total progress and Complete, Partial, or Unassigned status;
  - one clear 44px expand target across the group header.
- An expanded group will reveal vertically stacked attendee rows—not a nested table or nested decorative cards—with name, phone, relevant badges, current credential status, assignment controls, and More/details.
- Keep Expand all and Collapse all, but make them compact, equal-width phone controls.
- Preserve the currently open groups when sorting so staff do not lose their place.

### 2. Make alphabetical direction explicit
- Separate the sort field from its direction instead of requiring a second tap on the same menu item.
- Show a clear direction control: **A–Z / Z–A** for names and ascending/descending labels appropriate to Order ID, progress, status, and recent activation.
- In **Individual**, Name sorting will compare last name, then first name, case-insensitively.
- In **By Order**, Name sorting will use the lead attendee’s last name, then first name; attendees inside every expanded order will follow the same A–Z or Z–A direction.
- Retain Order ID, group size, progress, and completion-status sorting in the order view.
- Reset pagination only when needed; sorting will not collapse expanded groups.

### 3. Normalize mobile card spacing and prevent overlaps
- Use one outer page margin at 16px, 12px between cards/groups, and consistent 12–16px card interiors.
- Remove double padding and redundant wrappers around attendee cards and detail actions.
- Give names and status priority: names truncate safely, order codes and emails wrap or copy without widening the page, and badges wrap onto additional rows.
- Put assignment buttons on their own stable row when space is limited; all actions remain at least 44px high.
- Integrate “View full details” into the attendee card’s More area instead of rendering a detached button below each card.
- Keep expanded content concise so one attendee does not unnecessarily fill the whole viewport.

### 4. Preserve behavior and desktop density
- Reuse the existing assignment, replacement, removal, details, filtering, and optimistic-update behavior.
- Do not change credential rules, database queries, or desktop table density.
- Keep the existing search, filter sheet, Individual / By Order / By Site switch, export, sync, and bulk activation controls.

## Verification
- Test collapsed and expanded order groups at 320, 375, 390, and 430px, plus tablet and desktop widths.
- Verify no horizontal page scroll, clipped text, overlapping badges, or compressed assignment controls.
- Verify A–Z and Z–A results in Individual and By Order views, including people within expanded groups.
- Verify Expand all, Collapse all, individual expansion, assignment, replacement, removal, and full details remain functional.
- Confirm the desktop order table remains unchanged and the production build passes.
