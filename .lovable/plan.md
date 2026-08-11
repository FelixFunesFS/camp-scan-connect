# Fix: RFID Assignment shows "Unassigned" and "Not Activated" for everyone

## Status in the database (correct — the page is wrong)

For the 2026 event (694 attendees):

- **Jocelyn Mccants** is the only activated person — checked in today at 21:59 UTC
- Her credential `92346902673388000059135708` (barcode) is `active` and correctly linked to her
- She has **2** activation transactions: one at 21:59:22 (`pre_assignment`) and one at 21:59:51 (`self_activated`)
- Nobody else has a credential; 0 assigned, 0 other activations

So the data says "Checked In / Self Activated". Both wrong labels on the page come from the same failure.

## Root cause: over-long request URLs, failing silently

The page loads 682 attendees, then makes two follow-up calls that stuff every attendee ID into a URL query string:

```text
station_transactions?...&attendee_id=in.(<682 UUIDs>)
```

Each URL is roughly 25,000 characters, and the API rejects both with **400 Bad Request** (confirmed in the network log). Neither failure is handled honestly:

1. **Status column → "Unassigned".** The bulk status helper catches the error and falls back to `getCheckInStatus(null, null)` for every attendee — which *is* the "Unassigned" state — then caches that wrong answer for 30 seconds.

2. **Most Recent Activation column → "Not Activated".** The attendee loader never checks the error at all. The rejected response yields no rows, the activation map stays empty, so `most_recent_activation_method` is undefined for everyone and the column renders "Not Activated".

## The fix

**1. Chunk every bulk-ID query**
- Split attendee IDs into batches (roughly 100 per request), run the batches in parallel, and merge the results. URLs stay well under the limit no matter how many attendees load. Applies to both the status query and the activation-history query.

**2. Stop failures from masquerading as data**
- Check and surface the error on the activation query instead of ignoring it.
- On a genuine failure, don't write "Unassigned" into results or the cache — keep the last known good value, mark the rest unknown, and show a "Couldn't load status — retry" indicator rather than a false red badge.
- Only cache statuses that came from a successful query, and clear the cache on error so a retry isn't served poisoned values.

**3. Seed from data already on the page**
- The attendee query already returns `rfid_tags(uid, status, activated_at)` per row. Derive each badge from that first so the table is correct on first paint; the bulk calls then only enrich with activation-method detail.

**4. Same guard everywhere**
- Apply the chunking helper to any other call site that builds an `in.(...)` filter from a full attendee list, so this can't resurface on another page.

## Technical notes

- Files: `src/utils/optimizedStatusUtils.ts` (chunking, honest failure handling, no caching of fallbacks), `src/pages/RfidAssignment.tsx` (chunk the activation query, check its error, seed statuses from the nested tag data, retry affordance).
- A small shared `chunkedIn()` helper will hold the batching logic so both call sites and future ones use one implementation.
- No database or schema changes — schema and row data are correct.

## Side observation

One of Jocelyn's two activation rows has `activation_method = 'pre_assignment'`, which isn't one of the two allowed values (`self_activated`, `staff_assisted`). It doesn't affect the display since the newer row wins, but worth flagging — say the word and the plan can include normalizing that write path.
