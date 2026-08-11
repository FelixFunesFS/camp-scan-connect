# Fix: RFID Assignment shows everyone as "Unassigned"

## Status in the database (unchanged, correct)

For the 2026 event (694 attendees):

- **Jocelyn Mccants** is the only activated person — checked in today at 21:59 UTC, self-activated
- Her credential `92346902673388000059135708` (barcode) is `active` and correctly linked to her
- Nobody else has a credential; 0 assigned, 0 other activations

So the data says "Checked In" for Jocelyn. The page saying "Unassigned" is a display bug.

## Root cause

The RFID Assignment page loads all 682 visible attendees, then asks for their statuses in one bulk call. That call passes every attendee ID into a URL query string:

```text
station_transactions?...&attendee_id=in.(<682 UUIDs>)
```

The resulting URL is roughly 25,000 characters, which the API rejects with **400 Bad Request** — visible in the network log for both the `station_transactions` and follow-up requests.

The status helper catches that failure and, instead of surfacing it, silently falls back to `getCheckInStatus(null, null)` for every attendee — which is literally the "Unassigned" state. It then caches that wrong answer for 30 seconds. That's why Jocelyn flips from Active to Unassigned: the request failed, and the failure looks identical to "no credential".

## The fix

**1. Chunk the bulk status query**
- Split attendee IDs into batches (roughly 100 per request) and issue the batches in parallel, merging the results. This keeps every URL comfortably under the length limit regardless of how many attendees load.

**2. Stop the fallback from lying**
- On a genuine query failure, do not write "Unassigned" into the results or the cache. Leave those attendees in an "unknown" state, keep the last known good value if there is one, and let the page show a "Couldn't load status — retry" indicator instead of a false red badge.
- Only cache statuses that came from a successful query.

**3. Use the data already on the page**
- The attendee load already fetches `rfid_tags(uid, status, activated_at)` for each row. Seed each attendee's status from that nested data first, so the table renders correct badges immediately and the bulk call only enriches it with activation-transaction detail. Even if the enrichment call fails, badges stay correct.

**4. Reset the poisoned cache**
- Clear the status cache when the bulk call errors, so a retry isn't served the bad 30-second-cached "Unassigned" values.

## Technical notes

- Files: `src/utils/optimizedStatusUtils.ts` (chunking, honest failure handling, no caching of fallbacks) and `src/pages/RfidAssignment.tsx` (seed statuses from the nested `rfid_tags` already loaded, show a retry affordance).
- No database or schema changes — the schema and the row data are correct.
- The same chunking guard applies to any other place that builds an `in.(...)` filter from a full attendee list, so those call sites get the same treatment to prevent the bug reappearing elsewhere.
