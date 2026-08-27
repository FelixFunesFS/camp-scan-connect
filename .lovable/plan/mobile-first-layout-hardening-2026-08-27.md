# Mobile-First Layout Hardening

Goal: every screen (station scanning, assignment, reports, dev tools) reads cleanly on a 320-430px phone in both iOS Safari and Android Chrome, with no overlapping badges, clipped text, or horizontal page scroll — while desktop keeps its dense, table-driven layout.

## How to think about mobile here

Three rules applied consistently everywhere:

1. **One column below `sm`, density above it.** Phones get stacked cards; tablets/desktop get grids and tables. Never render a data table as the only view on a phone.
2. **Badges wrap, never truncate the name.** Badge rows use `flex flex-wrap gap-1.5` with `shrink-0` badges; the attendee name gets `min-w-0 truncate` so long names shorten instead of pushing badges off screen.
3. **Nothing is allowed to force horizontal page scroll.** Wide content (tables, tab strips) scrolls inside its own container, not the page.

## What gets fixed

### Global
- Add mobile-safe base rules in `index.css`: `html, body { overflow-x: hidden }` guard, `overflow-wrap: anywhere` on long values (emails, codes, order IDs), and iOS safe-area padding (`env(safe-area-inset-*)`) on fixed/sticky bars so the notch and Android gesture bar don't cover content.
- Prevent iOS input zoom: text/number/search inputs use a minimum 16px font on mobile.
- Standardize helper classes already present (`mobile-card`, `mobile-stack`, `touch-target`) and fix `.mobile-card` being applied to both the Card and CardContent in `MobileAttendeeCard.tsx` (double padding today).

### Badge / text overlap
- Introduce one shared badge-row wrapper and one truncating title pattern; apply it in `MobileAttendeeCard.tsx`, `reports/MobileTableCard.tsx`, `EnhancedRfidAssignmentCell.tsx`, `GroupRfidView.tsx`, `SiteLocationRfidView.tsx`.
- Remove hardcoded `min-w-[250px]/[280px]/[300px]` in `EnhancedRfidAssignmentCell.tsx` in favor of `w-full sm:min-w-[280px]` so cells don't overflow on phones.

### Fixed grids that break on small screens
- `RfidAssignment.tsx` stat block `grid-cols-4` → `grid-cols-2 sm:grid-cols-4`.
- `PostProductionAnalysis.tsx` `grid-cols-4` → responsive.
- `DeveloperDashboard.tsx` `TabsList grid-cols-7` → horizontally scrollable tab strip on mobile, grid on desktop.
- `EventDebrief.tsx`, `BusinessPriorityMatrix.tsx`, `RegFoxSyncPanel.tsx`, `StaffActivationHub.tsx` stat grids get a `grid-cols-2` mobile step instead of jumping 1 → 4.
- Fixed-width selects (`w-[180px]`, `w-[220px]`) → `w-full sm:w-[180px]`.

### Tables
- Every remaining desktop table gets the existing `desktop-table` / `mobile-table-card` split: table hidden below `sm`, card list shown instead. Applies to `RfidAssignment.tsx`, `CheckInStatusTables.tsx`, `RecentlyCheckedIn.tsx`, `EquipmentTracker.tsx`, `SyncHistoryTable.tsx`, `SiteLocationRfidView.tsx`, `GroupRfidView.tsx`.
- Where a card list already exists, verify it renders the same columns the table does.

### Station pages (primary phone surface)
- Station pages already skip the sidebar. Tighten them for one-handed use: full-width scan field pinned near the top, action buttons at least 44px tall and full-width below `sm`, result panel stacked, and multi-option grids (meal selection, sizes) at `grid-cols-2` on phones.

### Desktop
- No density loss: all changes are additive `sm:`/`lg:` breakpoints, so desktop keeps tables, 4-up stat grids, and sidebar layout.

## Verification

Playwright pass at 320, 390 (iPhone), 412 (Android), 768, 1024, and 1440 across: Index, `/assignment`, Reports, Equipment Hub, Developer Dashboard, Event Debrief, and every station page. For each: screenshot, assert `document.documentElement.scrollWidth <= clientWidth` (no horizontal page scroll), and check no badge/text element overlaps its sibling. Fix and re-run until clean.

## Notes

This is a presentation-only pass — no query, service, or business-logic changes.
