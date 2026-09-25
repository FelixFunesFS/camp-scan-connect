# Group progress line: count the whole group

## How to think about it
Campers think in terms of "my whole group," not "people I can tick right now." The summary should count **everyone on the order** and split them into plain-language buckets that add up to the total.

```text
2 people in your group
  1 checked in
  1 needs to sign the waiver
```

## Buckets (shown only when the count is above 0)
- **Checked in** (already active)
- **Ready to check in** (signed, has a wristband, not yet active)
- **Needs to sign the waiver**
- **Needs a wristband from the Staff Tent**
- **See staff** (cancelled or transferred registration)

## What campers will see
- Headline: "1 of 2 checked in" (or "All 2 checked in!" in green when everyone's done).
- Under it, small colored chips for the other buckets, for example "1 needs waiver" (amber) or "1 ready" (green).
- Examples:
  - Jose active, Edna unsigned: **1 of 2 checked in** · 1 needs waiver
  - Nobody active, both signed: **0 of 2 checked in** · 2 ready to check in
  - Everyone active: **All 2 checked in!**
- The note at the bottom by the Check-In button uses the same wording, so both lines match.

## Technical details
- `MobileActivationPreview.tsx`: build the counts from `all` (`is_active`, `blocked_reason` of `waiver_required` / `needs_rfid` / `registration_*`, otherwise ready). Replace the current "X of Y ready" line with the headline and chips. Use semantic tokens (`success` and `warning`) for the chip colors.
- No changes to the data, the check-in logic, or the rules.
- Check at 320px, 393px and 768px with 863-412-6685.
