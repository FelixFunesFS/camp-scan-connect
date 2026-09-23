# Client Invoice Report: March – September 2026

A clean, client-ready Excel invoice covering all development work on the Camp Scan Connect platform from March 2026 through September 22, 2026, billed at $35/hour and grouped by work area.

## What the client receives

Two files saved to Files, with identical figures:

- `MKQ-Consulting-Invoice-INV-2026-09.xlsx` — the working spreadsheet (three sheets below)
- `MKQ-Consulting-Invoice-INV-2026-09.pdf` — a clean, printable invoice to send the client directly

**Sheet 1 — Invoice**
- Header: consultant name, client (Melanated Campout), invoice number, issue date, billing period March 1 – September 22, 2026, rate $35/hour
- One row per work area with: item number, work area, plain-language description of what was delivered, hours, rate, line total
- Totals row with total hours and amount due, calculated with live formulas
- Short payment-terms note

**Sheet 2 — Work Detail**
- The individual changes inside each work area, so the client can see exactly what the hours bought
- Grouped under the same work-area headings as the invoice, no per-line pricing

**Sheet 3 — Activity Log**
- Dates work was performed and the number of changes delivered on each, as supporting evidence

**The PDF**
- Page 1: the invoice itself — header block, billed-to details, the itemized work-area table with hours and line totals, total hours and amount due, payment terms
- Page 2 onward: the same work detail as Sheet 2, so the client can see what each line covered
- Formatted for letter-size printing with clear margins, ruled table, and shaded header row

## Work areas to be itemized

Based on the actual change history in the project:

1. Platform setup, hosting backend, and 2025 archive / 2026 event switching
2. Credential (wristband) assignment system — desktop and mobile
3. Barcode and camera scanning engine across all devices
4. Station operations — meals, drinks, gate, t-shirts, walkie-talkies, headphones, plus the station launcher page
5. Self-service check-in app for campers (phone lookup, order groups, veteran / meal plan / site details)
6. Digital waiver capture, storage, and receipts
7. RegFox live integration — full sync, webhook, hourly reconciliation, integrity auditing
8. Registration status handling — confirmed, pending payment, cancelled filtering and audits
9. Site assignment extraction and display (specific site numbers, not just categories)
10. Reporting, exports, ticket-type breakdowns, and the Event Debrief tool
11. Access control — staff passcode gate, hidden staff entry, staff hub sign-in
12. Offline resilience, duplicate-scan protection, and data integrity safeguards
13. External data access — read-only API and Google Sheets mirror for automations
14. Mobile-first UI work, help/FAQ content, and testing tools
15. Ongoing debugging, live issue resolution, and client support

## How hours are derived

Hours are estimated from the recorded change history (565 individual changes across 14 active work days between March and September) and scaled by the size and complexity of each work area. Each work area gets a whole or half-hour figure so the invoice reads cleanly. The August invoice already on file is used as a baseline so the March–August portion stays consistent with what was previously quoted.

## Technical notes

- Spreadsheet built with openpyxl; all totals are live Excel formulas (`SUMPRODUCT` / `SUM`), not hardcoded numbers
- Arial throughout, currency formatted `$#,##0.00`, hours `0.0`
- Column widths set so nothing is clipped; header rows frozen
- Formulas recalculated and the workbook verified error-free
- PDF generated with reportlab from the same single source of line-item data, so the two files can never disagree
- Both files rendered to images page by page and visually inspected for clipping, overlap, or bad wrapping before delivery
- Output written to `/mnt/documents/` and grouped in one Files collection

## Confirmation needed at delivery

The invoice header will carry placeholder business details (consultant/business name, invoice number, payment terms) matching the previous August invoice. If any of those should change, they can be adjusted after review.
