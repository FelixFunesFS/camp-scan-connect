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
  // Add detailed logging for debugging
  console.log('GroupRfidProvider initialized with:', {
    isGroupedView,
    attendeesCount: Array.isArray(groupedAttendees) ? groupedAttendees.length : 0,
    attendeesType: isGroupedView ? 'GroupedAttendee[]' : 'EnhancedAttendee[]',
    firstAttendee: Array.isArray(groupedAttendees) && groupedAttendees.length > 0 ? groupedAttendees[0] : null
  });

  // Validate data structure before passing to hook
  if (!Array.isArray(groupedAttendees)) {
    console.error('GroupRfidProvider: groupedAttendees is not an array:', groupedAttendees);
    throw new Error('Invalid attendees data structure');
  }

  // Type checking for grouped vs individual attendees
  if (isGroupedView) {
    const firstGroup = groupedAttendees[0] as GroupedAttendee;
    if (firstGroup && !('attendees' in firstGroup)) {
      console.error('GroupRfidProvider: Expected GroupedAttendee[] but got:', firstGroup);
      throw new Error('Type mismatch: Expected grouped attendees but received individual attendees');
    }
  } else {
    const firstAttendee = groupedAttendees[0] as EnhancedAttendee;
    if (firstAttendee && 'attendees' in firstAttendee) {
      console.error('GroupRfidProvider: Expected EnhancedAttendee[] but got:', firstAttendee);
      throw new Error('Type mismatch: Expected individual attendees but received grouped attendees');
    }
  }

  // Remove try-catch to let real errors surface
  const navigationHooks = useUnifiedRfidNavigation({
    groupedAttendees,
    isGroupedView,
    onRowFocus: (rowIndex, attendeeId) => {
      console.log('Row focus changed:', { rowIndex, attendeeId });
    }
  });

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