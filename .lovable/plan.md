# Stations page asks for the passcode itself

## What you asked

The stations page should have the same code entry — a station phone opens the stations page and enters 062019 right there, instead of being bounced to a separate sign-in page first.

## What changes

1. **Stations page (`/stations`) becomes self-gating.**
   - If the device isn't unlocked, the stations page shows the same passcode box (same code, 062019) instead of the station cards.
   - Enter the correct code and the station cards appear immediately — no detour, no extra page.
   - If the device is already unlocked, the cards show directly, exactly as now.

2. **Everything else stays the same.**
   - The hidden `/staff` entry point keeps working as it does today (code box, then the staff dashboard).
   - Unlocking from either place unlocks the whole staff side on that device, and "Sign out" in the sidebar still clears it.
   - All other staff screens keep redirecting to `/staff` when the device is locked.

## Technical notes

- Extract the passcode card from `src/pages/StaffLogin.tsx` into a shared `src/components/StaffPasscodeGate.tsx` (input + Unlock button + success/error toasts, calling `useStaffAuth().unlock`).
- `src/pages/StationsPage.tsx`: when `!isUnlocked`, render `StaffPasscodeGate` (on success it just re-renders to the cards, no navigation); otherwise render the card grid as now.
- `src/pages/StaffLogin.tsx`: swap its inline card for the shared component, keeping its redirect-to-dashboard behavior on success.
- `src/App.tsx`: remove the staff gate wrapper from the `/stations` route only (the page now gates itself); every other route keeps `RequireStaff`.
- No database changes; the code stays 062019.
