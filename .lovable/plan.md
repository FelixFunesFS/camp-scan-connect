# Scan Focus Discipline + Digital Waiver Signing

Two related "the station must never stall" problems: the cursor must always be in the scan field, and a blocked waiver must be resolvable on the spot.

## Part 1 — Scan focus: how to think about it

A keyboard-wedge scanner types into whatever has focus. If focus is lost, the scan goes nowhere (or into the wrong field) and staff think the hardware failed. So the rule is: **on any scan page, the scan input owns focus by default, and focus returns to it after every state change.**

Today this is inconsistent:
- `UnifiedStationScanner` focuses on mount and when the selection clears — good, but not after a toast, dialog close, tab switch, or window refocus.
- RFID assignment cells focus per-row via table navigation.
- Some station screens have no focus restore at all after a successful/failed scan.

The fix is one shared behavior rather than per-page patches:

**A `useScanFocus` hook** attached to the scan input on every scan surface. It restores focus:
- on mount and after page/route transition
- after a scan completes (success, duplicate, or error) once the result renders
- after any dialog/sheet/toast closes
- when the browser tab or window regains focus
- when the user clicks dead space on the page (not on another input or button)
- never when a real input (search, notes, phone entry) is intentionally focused, and never on touch devices where it would pop the on-screen keyboard

**A visible focus state** so staff can see the field is armed: a "Ready to scan" pill with a pulsing indicator when focused, and a muted "Tap here to scan" when not. Ambiguity about whether the field is live is the actual operational failure, so it must be visible, not implicit.

Applies to: main gate, meals, drinks, headphones, t-shirts, fanny packs, walkie talkies, golf carts, RFID assignment, and the staff activation hub.

## Part 2 — Digital waiver signing

The uploaded MC2026 Terms, Waiver & Consent Agreement becomes the in-app waiver. It already states that a typed electronic acknowledgment carries the same legal weight as a handwritten signature under E-SIGN, so **typed full name is sufficient** — a drawn signature is offered as an optional extra, not a requirement.

### Where it appears
1. **Self-service check-in** — when a person shows "waiver required", a "Sign Waiver" action opens the agreement instead of dead-ending.
2. **Staff activation hub / attendee detail** — staff can present the agreement on a tablet for the attendee to sign themselves; a separate staff-attested path is recorded as such.
3. Group orders gate each person individually: whoever signed activates, the rest each get their own sign action.

### The signing screen
- Full agreement text, section by section, scrollable, readable on a phone.
- Continue button stays disabled until the text has been scrolled to the end.
- Explicit checkboxes: 21+ confirmation, read and agree to terms including assumption of risk and liability release, and media/AI consent.
- Typed full legal name, which must reasonably match the registration name (mismatch is allowed but flagged).
- Optional finger/stylus signature pad.
- Date auto-stamped; consent language and E-SIGN notice shown above the submit button.
- On submit: waiver marked signed and the flow continues straight into activation, no re-lookup.

### What gets recorded
A `waiver_signatures` record per person per event: typed name, optional signature image, timestamp, which agreement version was shown, whether it was self-signed or staff-attested (with staff identity), and the device/IP. This is the audit trail that makes the signature defensible.

### Enforcement
The gate stays in the database function, not just the UI — an unsigned attendee cannot be activated even if the button is bypassed. Signing is the only thing that clears it, aside from a logged staff override with a required reason.

## Technical notes
- New `useScanFocus` hook plus a small `ScanFocusIndicator`; scan pages adopt it rather than each keeping bespoke focus effects.
- Waiver text stored as structured content in the app with a version string, so a future revision does not invalidate prior signatures.
- New `waiver_signatures` table with RLS and explicit grants; signature images (if drawn) go to a private storage bucket.
- Activation RPCs updated to read signed status from the new table as well as `attendees.waiver_signed`, so RegFox-synced signatures still count.

## Open items
- Should the drawn signature pad be offered at all, or typed name only?
- Should staff be allowed to sign on an attendee's behalf, or must the attendee always type their own name?
