import { useCallback, useRef, useState } from 'react';
import { EnhancedAttendee } from '@/components/reports/CheckInManagementTab';

interface UseGroupedRfidNavigationOptions {
  groupedAttendees: Record<string, EnhancedAttendee[]>;
  isGroupedView: boolean;
  onRowFocus?: (rowIndex: number, attendeeId: string) => void;
}

export const useGroupedRfidNavigation = ({ 
  groupedAttendees, 
  isGroupedView, 
  onRowFocus 
}: UseGroupedRfidNavigationOptions) => {
  const currentRowRef = useRef<number>(-1);
  const currentAttendeeIdRef = useRef<string>('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Build a flat list of focusable rows considering group states
  const buildFocusableRows = useCallback(() => {
    const focusableRows: { attendeeId: string; groupId: string; indexInGroup: number }[] = [];
    
    if (!isGroupedView) {
      // In individual view, all attendees are focusable
      Object.values(groupedAttendees).flat().forEach((attendee, index) => {
        if (!attendee.rfid_uid || attendee.rfid_status === 'unassigned') {
          focusableRows.push({
            attendeeId: attendee.id,
            groupId: '',
            indexInGroup: index
          });
        }
      });
    } else {
      // In group view, only attendees in expanded groups are focusable
      Object.entries(groupedAttendees).forEach(([groupId, attendees]) => {
        if (expandedGroups.has(groupId)) {
          attendees.forEach((attendee, indexInGroup) => {
            if (!attendee.rfid_uid || attendee.rfid_status === 'unassigned') {
              focusableRows.push({
                attendeeId: attendee.id,
                groupId,
                indexInGroup
              });
            }
          });
        }
      });
    }
    
    return focusableRows;
  }, [groupedAttendees, isGroupedView, expandedGroups]);

  const navigateToRow = useCallback((direction: 'up' | 'down') => {
    const focusableRows = buildFocusableRows();
    if (focusableRows.length === 0) return;

    const currentIndex = focusableRows.findIndex(row => 
      row.attendeeId === currentAttendeeIdRef.current
    );

    let targetIndex = currentIndex;
    if (direction === 'up' && currentIndex > 0) {
      targetIndex = currentIndex - 1;
    } else if (direction === 'down' && currentIndex < focusableRows.length - 1) {
      targetIndex = currentIndex + 1;
    } else if (direction === 'down' && currentIndex === -1) {
      targetIndex = 0; // Focus first row if none focused
    }

    if (targetIndex >= 0 && targetIndex < focusableRows.length) {
      const targetRow = focusableRows[targetIndex];
      const targetInput = document.querySelector(
        `[data-attendee-id="${targetRow.attendeeId}"] input[data-rfid-input="true"]`
      ) as HTMLInputElement;
      
      if (targetInput) {
        targetInput.focus();
        targetInput.select();
        currentRowRef.current = targetIndex;
        currentAttendeeIdRef.current = targetRow.attendeeId;
        onRowFocus?.(targetIndex, targetRow.attendeeId);
      }
    }
  }, [buildFocusableRows, onRowFocus]);

  const focusNextUnassigned = useCallback(() => {
    const focusableRows = buildFocusableRows();
    if (focusableRows.length === 0) return;

    // Find first unassigned in current group, then other groups
    const currentAttendeeRow = focusableRows.find(row => 
      row.attendeeId === currentAttendeeIdRef.current
    );
    
    let nextRow = focusableRows[0]; // Default to first
    
    if (currentAttendeeRow) {
      // Look for next unassigned in same group first
      const sameGroupRows = focusableRows.filter(row => 
        row.groupId === currentAttendeeRow.groupId
      );
      const currentIndexInGroup = sameGroupRows.findIndex(row => 
        row.attendeeId === currentAttendeeIdRef.current
      );
      
      if (currentIndexInGroup >= 0 && currentIndexInGroup < sameGroupRows.length - 1) {
        nextRow = sameGroupRows[currentIndexInGroup + 1];
      } else {
        // Move to next group's first unassigned
        const currentGroupIndex = Object.keys(groupedAttendees).indexOf(currentAttendeeRow.groupId);
        const groupKeys = Object.keys(groupedAttendees);
        
        for (let i = currentGroupIndex + 1; i < groupKeys.length; i++) {
          const groupRows = focusableRows.filter(row => row.groupId === groupKeys[i]);
          if (groupRows.length > 0) {
            nextRow = groupRows[0];
            break;
          }
        }
      }
    }

    const targetInput = document.querySelector(
      `[data-attendee-id="${nextRow.attendeeId}"] input[data-rfid-input="true"]`
    ) as HTMLInputElement;
    
    if (targetInput) {
      targetInput.focus();
      targetInput.select();
      currentAttendeeIdRef.current = nextRow.attendeeId;
      onRowFocus?.(0, nextRow.attendeeId);
    }
  }, [buildFocusableRows, groupedAttendees, onRowFocus]);

  const expandGroup = useCallback((groupId: string) => {
    setExpandedGroups(prev => new Set([...prev, groupId]));
  }, []);

  const collapseGroup = useCallback((groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      next.delete(groupId);
      return next;
    });
  }, []);

  const toggleGroup = useCallback((groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  }, []);

  // Get group assignment progress
  const getGroupProgress = useCallback((groupId: string) => {
    const attendees = groupedAttendees[groupId] || [];
    const assigned = attendees.filter(a => a.rfid_uid && a.rfid_status !== 'unassigned').length;
    const total = attendees.length;
    return { assigned, total, percentage: total > 0 ? (assigned / total) * 100 : 0 };
  }, [groupedAttendees]);

  return {
    navigateToRow,
    focusNextUnassigned,
    expandedGroups,
    expandGroup,
    collapseGroup,
    toggleGroup,
    getGroupProgress,
    currentAttendeeId: currentAttendeeIdRef.current,
    focusableRowCount: buildFocusableRows().length
  };
};