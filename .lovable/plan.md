# Connect Database to Google Sheets

## Goal
Expose the Lovable Cloud database (attendees, transactions, waivers, etc.) to Google Sheets so workspace members can read the data for reporting, mail merges, and other tasks, without requiring a third-party automation tool like Make.

## What exists today
- A `public-read-only` Edge Function is already deployed at `https://camp-scan-connect.lovable.app/functions/v1/public-read-only`.
- It returns a read-only JSON feed of whitelisted tables (`attendees`, `rfid_tags`, `station_transactions`, `waiver_signatures`, `events`).
- A `READONLY_API_KEY` secret controls access.
- No Google Sheets connection exists in this workspace yet.
- The Lovable Google Sheets connector (`google_sheets`) is available and supports gateway-backed read/write calls.

## What “directly” means here
Google Sheets cannot connect to a database the same way a server does. The realistic options are:

| Approach | How it works | Needs connector? | Best for |
|---|---|---|---|
| **A. Database pushes to Google Sheets** | Edge function or scheduled job pulls rows from the DB and writes them to a spreadsheet via the Lovable Google Sheets connector gateway. | Yes | Live/auto-updated sheets, no Make required. |
| **B. Google Sheets pulls from the API** | Google Apps Script inside a spreadsheet calls the `public-read-only` endpoint and populates rows. | No | Simplest, no connector, runs on Google side. |
| **C. Make/Zapier pulls from the API** | Already configured; Make calls `public-read-only` and writes to Google Sheets. | No | Low-code, visual workflows. |

## Recommended approach
**Option A: Database pushes to Google Sheets via the Lovable connector.**

Reasons:
- No extra tools (Make) required after setup.
- Runs from the Lovable side so the workspace controls credentials and schedules.
- Keeps the `READONLY_API_KEY` separate; Google Sheets auth is handled through the connector.
- Can be triggered manually from the app or on a schedule.

## Implementation steps

1. **Create a Google Sheets connection in Lovable**
   - Use `standard_connectors--connect` with `connector_id: google_sheets`.
   - Choose the workspace Google account that owns the target spreadsheet.
   - Link it to the project. This adds the Google Sheets connector env vars.

2. **Create a target spreadsheet in Google Drive**
   - One sheet per table: `Attendees`, `Transactions`, `Waivers`, etc.
   - Share the spreadsheet with the same Google account used for the connector.
   - Copy the spreadsheet ID from the URL.

3. **Build a `sync-to-sheets` Edge Function**
   - Server-side function that:
     - Reads the requested table from the DB using the service-role client.
     - Calls the Lovable connector gateway at `https://connector-gateway.lovable.dev/google_sheets/v4/spreadsheets/{spreadsheetId}/values/{range}:clear` and then `.../values/{range}?valueInputOption=USER_ENTERED` with `PUT`.
   - Accepts `table`, `event_id`, `spreadsheet_id`, and `sheet_name` as parameters.
   - Supports `attendees`, `station_transactions`, `waiver_signatures`, and `rfid_tags` initially.
   - Returns a summary: rows written, spreadsheet URL, errors.

4. **Add a UI trigger in the Developer Dashboard**
   - A “Sync to Google Sheets” button in the Debug Tools or Admin Requests tab.
   - Lets staff choose the table and event year, then invokes the Edge Function.
   - Shows the result and a link to the spreadsheet.

5. **Optional: schedule the sync**
   - Once the manual sync works, add a cron trigger or a scheduled Edge Function that runs every 15–60 minutes during the event.
   - Start with manual-only to avoid overwriting accidental edits in Sheets.

## Security considerations
- The Google Sheets connector uses the workspace/builder’s Google account, not each app user’s account. It is appropriate for workspace-owned reporting sheets.
- The Edge Function must verify the caller is an authenticated staff member before syncing.
- Keep the spreadsheet private to the organizing team; do not publish it publicly.
- The `public-read-only` endpoint remains available for Make and other tools; the Google Sheets path does not expose the `READONLY_API_KEY`.

## Alternative (fastest, no connector)
If the connector setup is unnecessary, use **Google Apps Script** inside a spreadsheet to call the existing `public-read-only` endpoint. This avoids any new connector, credentials, or Lovable code changes. It is a good short-term option while the connector path is being built.

## Open questions
- Which tables should be synced to Google Sheets first? (attendees is the most likely starting point)
- Should the sync be manual, scheduled, or both?
- Should the Google Sheets spreadsheet be created by staff in their own Drive, or should the app create it via the Sheets API?
