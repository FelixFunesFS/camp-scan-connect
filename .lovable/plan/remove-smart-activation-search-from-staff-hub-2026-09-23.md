# Remove Smart Activation Search from Staff Hub

## Goal
Remove the "Smart Activation Search" card and all related state/UI from the staff hub page. Keep the Attendee Management section (search/filter/inline actions) and deactivation tools intact.

## What will change
1. In `src/components/StaffActivationHub.tsx`:
   - Remove the entire "Unified Multi-Criteria Activation Section" card (lines ~1046–1122) titled **Smart Activation Search**.
   - Remove now-unused state: `unifiedSearchQuery`, `unifiedSearchResult`, `showUnifiedPreview`, `isUnifiedProcessing`, `isUnifiedSearching`, `attendeeNotifications`.
   - Remove now-unused handlers: `handleUnifiedSearch`, `handleUnifiedActivateSearchGroup`, `handleUnifiedActivateEntireOrder`, `handleUnifiedBack`, `refreshUnifiedSearchResults`.
   - Remove now-unused helper calls inside `handleIndividualActivation`, `handleActivateRemainingByPhone`, and `handleGroupActivation` that refresh unified search results.
   - Remove imports for `UnifiedActivationPreview`, `UnifiedSearchResult`, and the `Zap` icon.
   - Keep `EnhancedActivationService.activateIndividual` because it is still used by `UnifiedStationScanner.tsx` and the individual activation handler.
2. Optionally delete `src/components/UnifiedActivationPreview.tsx` if it is no longer imported anywhere after the staff hub change.

## Outcome
The staff hub will show only the **Attendee Management** workspace, summary statistics, recent activity, and deactivation tools. Staff will activate attendees via the per-row **Activate** buttons and inline waiver signing instead of the separate smart search card.
