Hide the Raw Capture (Reader) card on the Scan Tester page

What to change
- Conditionally hide (or remove) the "Raw Capture (Reader)" Card in `src/pages/ScanTester.tsx`.
- Adjust the surrounding grid so the remaining Camera Scan card still lays out cleanly on mobile and desktop.
- Keep the hidden reader logic intact (state, `handleScan`, focus hooks) so it can be re-enabled later; only remove/hide the rendered UI card.

Files
- `src/pages/ScanTester.tsx`
