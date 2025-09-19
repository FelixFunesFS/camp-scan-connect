import React, { createContext, useContext, useCallback } from 'react';
import { useUnifiedRfidNavigation } from '@/hooks/useUnifiedRfidNavigation';
import { useRfidCapture } from '@/hooks/useRfidCapture';
import { EnhancedAttendee, GroupedAttendee } from '@/types/attendee';
import { toast } from "sonner";

interface GroupRfidContextType {
  navigateToRow: (direction: 'up' | 'down') => void;
  focusFirstUnassignedRow: () => void;
  focusLastUnassignedRow: () => void;
  focusNextUnassigned: () => void;
  startGroupProcessing: (groupId: string) => void;
  expandedGroups: Set<string>;
  expandAllGroups: () => void;
  collapseAllGroups: () => void;
  toggleGroup: (groupId: string) => void;
  getGroupProgress: (groupId: string) => { assigned: number; total: number; percentage: number };
  isCapturingRfid: boolean;
  capturedUid: string | null;
  onRfidCapture: (uid: string) => void;
}

const GroupRfidContext = createContext<GroupRfidContextType | null>(null);

interface GroupRfidProviderProps {
  children: React.ReactNode;
  groupedAttendees: GroupedAttendee[] | EnhancedAttendee[];
  isGroupedView: boolean;
  onRefresh: () => void;
}

export const GroupRfidProvider: React.FC<GroupRfidProviderProps> = ({
  children,
  groupedAttendees,
  isGroupedView,
  onRefresh
}) => {
  

  // Add error handling for hook usage
  let navigationHooks;
  try {
    navigationHooks = useUnifiedRfidNavigation({
      groupedAttendees,
      isGroupedView,
      onRowFocus: (rowIndex, attendeeId) => {
        // Optional: Add visual feedback for focused row
      }
    });
  } catch (error) {
    console.error("Error in useUnifiedRfidNavigation:", error);
    // Provide fallback values
    navigationHooks = {
      navigateToRow: () => {},
      focusFirstUnassignedRow: () => {},
      focusLastUnassignedRow: () => {},
      focusNextUnassigned: () => {},
      startGroupProcessing: () => {},
      expandedGroups: new Set<string>(),
      expandAllGroups: () => {},
      collapseAllGroups: () => {},
      toggleGroup: () => {},
      getGroupProgress: () => ({ assigned: 0, total: 0, percentage: 0 })
    };
  }

  const {
    navigateToRow,
    focusFirstUnassignedRow,
    focusLastUnassignedRow,
    focusNextUnassigned,
    startGroupProcessing,
    expandedGroups,
    expandAllGroups,
    collapseAllGroups,
    toggleGroup,
    getGroupProgress
  } = navigationHooks;

  const handleRfidCapture = useCallback((uid: string) => {
    // Find the currently focused RFID input and populate it
    const focusedInput = document.activeElement as HTMLInputElement;
    if (focusedInput && focusedInput.getAttribute('data-rfid-input') === 'true') {
      // Dispatch input event to trigger React's onChange
      const inputEvent = new Event('input', { bubbles: true });
      focusedInput.value = uid;
      focusedInput.dispatchEvent(inputEvent);
      
      // Trigger change event
      const changeEvent = new Event('change', { bubbles: true });
      focusedInput.dispatchEvent(changeEvent);

      toast.info(`RFID Captured: UID ${uid} captured from reader`);

      // Auto-advance to next unassigned after a brief delay (reduced for faster workflow)
      setTimeout(() => {
        focusNextUnassigned(false); // Allow scrolling for RFID auto-advance
      }, 500);
    }
  }, [focusNextUnassigned, toast]);

  const {
    capturedUid,
    isCapturing: isCapturingRfid
  } = useRfidCapture({
    onCapture: handleRfidCapture,
    enabled: true,
    minLength: 8,
    debounceMs: 100
  });

  const contextValue: GroupRfidContextType = {
    navigateToRow,
    focusFirstUnassignedRow,
    focusLastUnassignedRow,
    focusNextUnassigned,
    startGroupProcessing,
    expandedGroups,
    expandAllGroups,
    collapseAllGroups,
    toggleGroup,
    getGroupProgress,
    isCapturingRfid,
    capturedUid,
    onRfidCapture: handleRfidCapture
  };

  return (
    <GroupRfidContext.Provider value={contextValue}>
      {children}
    </GroupRfidContext.Provider>
  );
};

export const useGroupRfid = () => {
  const context = useContext(GroupRfidContext);
  if (!context) {
    throw new Error('useGroupRfid must be used within a GroupRfidProvider');
  }
  return context;
};