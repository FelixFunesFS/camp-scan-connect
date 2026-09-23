# Consolidate Staff Hub waiver and attendee management

## Goal
Make the Staff Hub faster on phones, tablets, and desktops by keeping each attendee’s waiver, activation, and detailed information together instead of requiring staff to scroll between separate sections.

## Recommended experience

### 1. One Attendee Management workspace
- Remove the separate full-size **Waivers** block from the page flow.
- Rename **Individual Search & Management** to **Attendee Management**.
- Keep its existing search, status filters, sorting, expandable attendee rows, and cancelled-registration control.
- Keep **Waiver Missing** as a quick filter with its live count, so staff can immediately see the unsigned queue.

### 2. Sign the waiver from the attendee row
- Show a clear **Waiver missing** warning in the collapsed row when an attendee has not signed.
- Add a prominent **Sign waiver** action beside the attendee’s other available actions.
- Open the existing full waiver agreement and signature flow for that attendee without navigating or scrolling elsewhere.
- After signing, refresh the attendee immediately: the warning becomes **Waiver signed**, activation becomes available when the other requirements are met, and the missing-waiver count updates.
- Keep the expanded **Credential & Waiver** details, but make its waiver status and signing action consistent with the collapsed row.

### 3. Preserve waiver records without another large block
- Add a compact **Waiver records & exports** control inside the Attendee Management toolbar.
- From there, staff can search signed records, open stored copies, regenerate PDFs, download all in-app signed waivers, or export the unsigned list.
- Keep these administrative tools collapsed by default so the everyday search-and-sign workflow stays uncluttered.

### 4. Simplify the page header
- Keep **Staff Hub** as the single page title because the page contains assistance, activation, attendee management, deactivation, and activity—not only the assistance queue.
- Remove the visible `Staff: aaaaaaaa-bbbb-cccc-dddd-222222222222` badge; the internal identifier is not useful to staff.
- Keep Back, Export Activity, and Logout, but arrange them responsively: title and Back first, actions wrapping cleanly or using a compact menu on narrow screens.
- Shorten the section title from **Staff Assistance Queue** to **Assistance Queue** to avoid repeating “Staff.”

## Responsive behavior
- Use full-width primary actions on narrow phones and compact inline actions on wider screens.
- Keep all tap targets at least 44px and allow action groups to wrap without covering names or status badges.
- Avoid fixed-height inner scrolling for waiver tools and attendee results; use the page’s natural scrolling on iOS and Android.
- Verify the consolidated flow at phone, tablet/split-screen, current 935px, and large desktop widths.

## Technical details
- Reuse the existing waiver signing dialog and saved-receipt flow.
- Move the useful record/export behavior from the current waiver panel into a compact management control rather than duplicating it.
- Pass waiver-signing callbacks into each attendee row and refresh both the attendee data and waiver counts after success.
- Remove obsolete table configuration and waiver-panel wiring left behind by the previous Staff Hub layouts.
- Confirm the current activation gate still blocks unsigned attendees and that cancelled registrations remain non-activatable.

## Verification
- Search for an unsigned attendee, sign from the same row, and confirm the row and filter count update without leaving the workspace.
- Confirm signed-record lookup and all waiver downloads/exports remain available.
- Confirm no staff UUID appears in the header and all header actions remain usable at every target width.
- Confirm attendee expansion, individual/group activation, sorting, filters, assistance handling, and logout still work.
