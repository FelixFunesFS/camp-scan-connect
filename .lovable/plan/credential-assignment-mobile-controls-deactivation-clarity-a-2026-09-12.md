# Credential Assignment: mobile controls, deactivation clarity, and detail fixes

## What I found today

**Mobile view is missing most of the controls the desktop view has.** On a phone, the assignment page only offers a search box, an "Unassigned Only" toggle, Export, Sync and Bulk Activate. There is no way to sort, no meal-plan / arrival-day / check-in-status filters, no "By Order" or "By Site" grouping, and no cancelled-registrant toggle. Those groupings exist as finished screens in the project but are not shown anywhere; the mobile control panel that was built for this page is also unused.

**"View Details" does nothing on either mobile or desktop.** The details window is rendered with an empty trigger and never opens, so tapping the button appears to do nothing.

**The "Details" badges** (on the mobile attendee card) are meant to show the extra facts about a person: veteran status, accommodation type, meal plan and arrival day. That card, however, is not the one currently rendered on the assignment page, so those badges never appear there.

**Deactivating a band is currently ambiguous.** Three unlabeled icon buttons sit next to an assigned band: pencil (change the code), circular arrows (replace lost/damaged band), and X (clear the assignment). On touch devices there are no tooltips, so staff cannot tell them apart. The X also removes the band with no confirmation and no reason recorded, even when the person is already checked in. A full deactivation screen with reason codes exists in the project but is not reachable from any page.

## What I will build

### 1. Mobile sorting, grouping and filtering
- Add a sticky control bar on mobile: search, a **Sort** menu (name, arrival day, order, status, most recent activation, with an ascending/descending toggle) and a **Filters** sheet containing meal plan, arrival day, check-in status, unassigned-only and cancelled registrants, with a count of active filters and a "Clear all" action.
- Add the same Individual / By Order / By Site switch that desktop supports, so shared-phone orders and site groups can be worked through on a phone.
- Show a result summary ("Showing 25 of 812") and keep the progress card above the list.
- Every control uses full-width, 44px-minimum touch targets, wraps instead of overflowing, and respects iOS safe areas (no cut-off bottom row on iPhone) and Android's smaller widths down to 320px.

### 2. Clear, safe deactivation
- Replace the three icon buttons with labeled actions on mobile (icons plus text) and keep icons with tooltips on desktop: **Change code**, **Replace band**, **Remove band**.
- **Remove band** opens a confirmation with a required reason (lost, damaged, replaced, checkout/departure, security, other) and a plain-language warning when the person is already checked in: "This person is checked in. Removing the band will check them out and they will not be able to use any station until a new band is assigned and activated."
- The reason is stored with the transaction so the audit report shows why a band was retired.
- Add a short "How to deactivate a band" entry to the page's FAQ describing the three actions and when to use each.

### 3. Details that actually open
- Fix the details window so the button opens it on both mobile and desktop.
- Render the richer attendee card on mobile so the Details badges (veteran, accommodation, meal plan, arrival day, email) show under a "More" toggle, using the shared accommodation names.

### 4. Things that could block assignment work
- Keep the code entry field usable with a USB/keyboard-wedge scanner and with the camera on phones; keep focus in the field after each scan so staff can scan continuously.
- Cancelled registrants stay hidden by default but can be revealed with the filter, so a cancelled person cannot be assigned a band by accident.
- Make sure long names, emails and order numbers truncate rather than push buttons off screen on narrow phones.

## Technical notes
- `src/pages/RfidAssignment.tsx`: mobile branch gains a control bar backed by the existing `uiState` (sortField, sortDirection, mealPlanFilter, arrivalDayFilter, checkInStatusFilter, showCancelledRegistrants, viewMode); wire the already-imported `GroupRfidView` and `SiteLocationRfidView`, and swap the inline card for `MobileRfidAssignmentCard`.
- Fix `AttendeeDetailModal` usage: pass a real trigger or drive it with a controlled `open`/`onOpenChange` prop.
- `EnhancedRfidAssignmentCell.tsx`: labeled action buttons, and route `handleClearRfid` through an AlertDialog with a required reason stored in `station_transactions.extra_data.reason`; keep the existing replace-and-retire flow unchanged.
- Reuse `DEACTIVATION_REASONS` from `StaffDeactivationPanel.tsx` as the shared reason list.
- Filter/sort logic already exists in the page's memoized pipeline — the mobile work is presentation only, no query changes.
