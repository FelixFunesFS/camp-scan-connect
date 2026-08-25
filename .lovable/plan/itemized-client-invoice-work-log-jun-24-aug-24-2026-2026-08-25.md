# Itemized Client Invoice — Work Log, Jun 24 – Aug 24, 2026

## Goal
Produce an Excel invoice workbook for MKQ Consulting LLC itemizing the development work delivered on the Melanated Campout event platform during the last two months, grouped by feature area, with pricing columns left blank for you to fill in.

## Source of truth
Line items are built from the actual project chat log and the archived plan documents. The billing window starts at the 2026 data review request (Jul 17, 2026) and runs through today. Before writing the workbook I will walk the full message range for the period so every line item maps to a real request and delivery, rather than working from memory.

## Feature areas (line-item groups)

1. **2026 Event Rollover & Multi-Year Architecture** — events table, active-event scoping, admin year switcher, de-yearing hard-coded 2025 strings/dates, archival of 2025 data.
2. **RegFox Integration (2026)** — form 982600 binding, sync rebuild, group-order inheritance, reconcile/compare/cleanup functions, sync history and monitoring.
3. **Credential Activation Engine** — phone-number lookup and activation, order/group activation, staff-assisted vs self-activated tracking, station access checks, transfer and edge-case handling.
4. **Liability Waiver System** — waiver_signatures table and trigger, in-app typed-signature dialog, waiver gate blocking activation, waiver status panel in the Staff Hub, branded PDF receipts.
5. **Scanning Platform (Barcode / QR / RFID)** — camera-based scanning, scan-focus return behavior, double-scan prevention, generic credential terminology across the app.
6. **Station Operations** — T-shirt, drinks, meals, headphones, equipment, gate; data corrections, badge/assignment accuracy, transaction logging.
7. **Reporting & Analysis** — RFID assignment table enhancements, post-production analysis, check-in and arrivals reporting, event debrief page and priority framework.
8. **Data API & Automation** — read-only public API endpoint with API key for Make.com, secure secret handling, removal of insecure endpoints.
9. **Google Sheets Database Mirror** — connector setup, sync-to-sheets function mirroring 9 tables with a metadata tab, Developer Dashboard sync panel.
10. **Performance, Security & Stability** — render-loop and crash fixes, query chunking, RLS/permission review, pagination and refresh behavior.

## Workbook structure

**Sheet 1 — Invoice**
Header block: MKQ Consulting LLC, client, invoice number, invoice date (Aug 24, 2026), billing period (Jun 24 – Aug 24, 2026).
Line-item table, grouped by feature area with subtotal rows:

| # | Feature Area | Work Item | Description | Date(s) | Qty/Hours | Rate | Amount |

Qty, Rate and Amount are left blank; Amount carries a `=Qty*Rate` formula so totals populate as soon as you fill in numbers. Subtotal, total, and an optional discount/deposit row use live SUM formulas.

**Sheet 2 — Detailed Work Log**
Chronological record of every request and delivery in the period (date, area, request, what was delivered, artifacts touched). This is the backup document if the client questions a line item.

**Sheet 3 — Summary**
Counts and blank hour/amount rollups per feature area, so the client sees a one-page picture.

## Formatting
Arial throughout, blue text for the input cells you fill in, black for formulas, currency as `$#,##0.00`, zeros shown as `-`, frozen header rows, column widths sized for printing, and no formula errors on delivery.

## Delivery
The workbook is written to the documents area for download; it is not added to the app.
