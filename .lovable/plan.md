# Phone-camera-first scanning and FAQ accuracy

## Goal
Make scanning with the phone’s camera inside the web app the primary workflow. Keep USB/Bluetooth readers and typed codes available as clearly labeled backup methods.

## Implementation

### 1. Make the phone camera the default
- Change credential assignment from USB-first to camera-first.
- Present a clear **Scan with phone camera** action as the primary assignment action; do not automatically open hundreds of cameras in attendee lists.
- Keep the camera inside the current web workflow and return the decoded code to the selected attendee’s assignment field for validation and saving.
- Relabel USB as **USB reader (backup)** and manual entry as **Type code instead**.
- Keep Change and Replace workflows camera-capable so staff do not need USB hardware for corrections or lost bands.
- Preserve the existing duplicate-code validation, scan normalization, assignment confirmation, and replacement/deactivation safeguards.

### 2. Standardize scanner defaults across operational pages
- Keep station pages camera-first and in-page, with automatic camera start where the current page has one shared scanner.
- Make Staff Hub/deactivation scanner views start with the in-page camera rather than waiting for a USB reader.
- Keep the scan test page camera-first; USB diagnostics remain hidden/secondary as currently intended.
- When camera permission is denied, unavailable, or interrupted, show understandable recovery guidance and expose USB/manual fallback without blocking the workflow.
- Continue releasing the camera when the tab is hidden or the page is left, and prevent duplicate station transactions.

### 3. Correct the Credential Assignment Guide
Replace hardware-first and legacy wording with the actual workflow:
- Search for the attendee, open **Scan with phone camera**, frame the printed barcode/QR code, then confirm the validated assignment.
- Explain that scanning is automatic and that staff should verify the attendee and displayed code before saving.
- Describe USB keyboard-style readers as backup equipment, including field focus and Enter behavior.
- Replace “UID,” “tap near scanner,” “RFID,” and “program a wristband” where the screen handles a generic printed credential code.
- Update current view names to **Individual**, **By Order**, and **By Site**.
- Update sorting/filtering guidance to match the current phone and desktop controls, including A–Z/Z–A sorting.
- Retain and verify the Change, Replace, and Remove explanations, including that Replace preserves check-in when appropriate and Remove requires a reason and can check someone out.
- Rewrite troubleshooting in this order: camera permission, lighting/distance/focus, switch camera/flashlight, retry, USB backup, manual entry, duplicate assignment, and connectivity.
- Replace status descriptions with the actual statuses: Unassigned, Assigned, and Checked In.

### 4. Correct the self-check-in FAQ
- Explain that a shared phone number opens a pick-list; eligible people are preselected, but the user may choose individuals or **Check-In Everyone**.
- Clarify that each person without a signed waiver must sign before activation, while eligible companions can continue.
- Explain that **Unassigned** means no credential code is linked to that attendee; staff assign it before check-in.
- Remove inaccurate claims that every companion is always activated automatically or that a wristband must be “programmed.”
- Keep phone lookup, meal plan, and staff-assistance answers, revising terminology and capitalization for consistency.

## Technical details
- Update the scanner mode and controls in the assignment cell without auto-mounting a live camera per attendee card.
- Reuse the existing camera dialog/controller and credential normalization rather than adding a second scanning path.
- Enable `autoStart` only on pages with one shared in-page camera; retain explicit camera launch for repeated attendee rows.
- Keep USB keyboard capture registered as a fallback and preserve focus restoration after scans.
- No database, assignment-rule, activation-rule, or station-transaction changes are included.

## Verification
- Test camera assignment, Change, Replace, USB fallback, and manual entry on phone and desktop layouts.
- Test camera permission allowed, denied, retry, tab background/return, and camera switching.
- Confirm one physical scan produces one assignment or station transaction.
- Verify the updated FAQ text against the visible controls and actual status behavior.
- Check 320px, 375px, 390px, 430px, tablet, and desktop widths for readable guidance and controls without overlap.
