# Scanner cleanup: generic wording, reliable badges, no double scans

Three fixes, all confirmed against the live 2026 data.

## 1. Double scans (the urgent one)

**What's happening:** every station renders its action panel twice — once on the page and once inside the full-screen camera overlay. Both copies listen for the same "scan happened" signal, so one scan fires the action twice.

The data confirms it: Jocelyn's record has 6 drinks logged in a 7-second window, and 3 headphone checkouts with no checkin in between. The headphone case is worse than a duplicate — both copies read "not checked out" before either write lands, so they both write *checkout* instead of toggling. That's why the status looks stuck.

**Fix:**
- Render the action panel once. The overlay and the page share a single instance instead of mounting two.
- Replace the global event broadcast with a direct call, so there is exactly one path from scan to action.
- Add a per-scan guard: one scanned code produces one transaction until the scanner is reset or a different code is read. A re-scan of the same wristband inside a short window is ignored with a visible "already recorded" message rather than silently double-counting.
- Make the toggle stations decide from a fresh read taken *inside* the write, so two rapid taps can never both resolve to "checkout".

**Validation stays per scan:** each scan still looks the attendee up, checks the waiver and activation gate, and shows the result card. The change is that confirming a scan can only commit one transaction.

## 2. Badges showing "Unassigned" when the camper is assigned

Jocelyn's 2026 record is clean in the database: one wristband, status active, correctly scoped to the 2026 event. No duplicate 2026 registration. The wrong badge is a code problem, in two parts:

- **Four different status calculators** exist across the app (assignment table, mobile card, group view, station screens), each with slightly different rules and different fallbacks. Views disagree because they aren't asking the same question.
- **The bulk status lookup fails silently on big lists.** With ~680 attendees it packs every ID into one request, which the server rejects, and the error handler then labels *everyone* "Unassigned" — a wrong answer presented as fact.

**Fix:**
- One shared status function, used by every view. Rules stay as they are today: active wristband = Checked In, assigned wristband = Assigned, no wristband = Unassigned.
- Chunk bulk lookups into batches so large lists succeed.
- On a genuine lookup failure, show an "Unknown" state instead of falsely reporting "Unassigned", so staff never act on a fabricated status.
- Seed badges from data already loaded with the row, so they render correctly even before the bulk lookup returns.

## 3. Replace "RFID" wording with generic terms

"RFID" appears in roughly 320 places in the UI. Campers may present a wristband, a printed badge or a phone QR code, so the language should not name one technology.

Wording map:
- "RFID Scanner" -> "Scanner"
- "Scan RFID" / "Scan RFID tag" -> "Scan code"
- "RFID UID" / "Enter RFID" -> "Code" / "Enter code"
- "RFID not found" -> "Code not recognized"
- "RFID assignment" -> "Credential assignment"
- Wristband stays where staff are physically handling a wristband, since that is accurate at the assignment table.

This is display text only. Database columns, internal names and file names stay as they are — renaming those adds risk with no visible benefit, and the app already stores a credential type per code.

## Technical notes

- Station scanner: single child instance, `onScan` callback instead of `window.dispatchEvent('autoTrigger')`, an in-flight ref plus last-committed-code ref to enforce one commit per scan.
- Toggle stations (headphones, golf carts, walkies, fanny packs): resolve current state and write in one guarded step.
- New shared `useCheckInStatus` / `getCheckInStatus` source of truth; the redundant copies in `statusUtils.ts` and `optimizedStatusUtils.ts` collapse into it.
- Bulk queries chunk at ~100 IDs; failures surface as `unknown`, not `unassigned`.
- Copy changes are confined to UI strings in components and pages.

## Cleanup question

Jocelyn's test records (6 drinks, 3 headphone checkouts, duplicate assignment rows) are still in the 2026 data. Want me to clear the test transactions as part of this, or leave them?
