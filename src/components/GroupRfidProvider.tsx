import React, { createContext, useContext, useCallback } from 'react';
import { useUnifiedRfidNavigation } from '@/hooks/useUnifiedRfidNavigation';
import { EnhancedAttendee, GroupedAttendee } from '@/types/attendee';
import { toast } from "sonner";

interface GroupRfidContextType {
  navigateToRow: (direction: 'up' | 'down') => void;
  focusFirstUnassignedRow: () => void;
  focusLastUnassignedRow: () => void;
  startGroupProcessing: (groupId: string) => void;
  expandedGroups: Set<string>;
  expandAllGroups: () => void;
  collapseAllGroups: () => void;
  toggleGroup: (groupId: string) => void;
  getGroupProgress: (groupId: string) => { assigned: number; total: number; percentage: number };
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
    startGroupProcessing,
    expandedGroups,
    expandAllGroups,
    collapseAllGroups,
    toggleGroup,
    getGroupProgress
  } = navigationHooks;

  const contextValue: GroupRfidContextType = {
    navigateToRow,
    focusFirstUnassignedRow,
    focusLastUnassignedRow,
    startGroupProcessing,
    expandedGroups,
    expandAllGroups,
    collapseAllGroups,
    toggleGroup,
    getGroupProgress
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