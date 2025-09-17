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

    let nextIndex = currentRowRef.current + 1;
    
    // If we're in grouped view, try to find the next unassigned in the current group first
    if (isGroupedView && currentAttendeeIdRef.current) {
      const currentGroup = Object.entries(groupedAttendees).find(([_, attendees]) => 
        attendees.some(a => a.id === currentAttendeeIdRef.current)
      );
      
      if (currentGroup) {
        const [currentGroupId, currentGroupAttendees] = currentGroup;
        
        // Auto-expand current group if collapsed
        if (!expandedGroups.has(currentGroupId)) {
          setExpandedGroups(prev => new Set(prev).add(currentGroupId));
        }
        
        if (expandedGroups.has(currentGroupId) || !expandedGroups.has(currentGroupId)) {
          // Find next unassigned in current group
          const currentAttendeeIndex = currentGroupAttendees.findIndex(a => a.id === currentAttendeeIdRef.current);
          const nextUnassignedInGroup = currentGroupAttendees
            .slice(currentAttendeeIndex + 1)
            .find(a => !a.rfid_uid || a.rfid_status === 'unissued');
            
          if (nextUnassignedInGroup) {
            const nextRowIndex = focusableRows.findIndex(row => row.attendeeId === nextUnassignedInGroup.id);
            if (nextRowIndex >= 0) {
              nextIndex = nextRowIndex;
            }
          } else {
            // No more unassigned in current group, find next incomplete group
            const nextIncompleteGroup = Object.entries(groupedAttendees).find(([groupId, attendees]) => 
              groupId !== currentGroupId && 
              attendees.some(a => !a.rfid_uid || a.rfid_status === 'unissued')
            );
            
            if (nextIncompleteGroup) {
              const [nextGroupId, nextGroupAttendees] = nextIncompleteGroup;
              // Auto-expand next group
              setExpandedGroups(prev => new Set(prev).add(nextGroupId));
              
              // Find first unassigned in next group
              const firstUnassigned = nextGroupAttendees.find(a => !a.rfid_uid || a.rfid_status === 'unissued');
              if (firstUnassigned) {
                const nextRowIndex = focusableRows.findIndex(row => row.attendeeId === firstUnassigned.id);
                if (nextRowIndex >= 0) {
                  nextIndex = nextRowIndex;
                }
              }
            }
          }
        }
      }
    }
    
    // If no next unassigned in current group, find globally
    if (nextIndex >= focusableRows.length) {
      // Find the next unassigned attendee in focusableRows
      for (let i = currentRowRef.current + 1; i < focusableRows.length; i++) {
        const row = focusableRows[i];
        const attendee = Object.values(groupedAttendees).flat().find(a => a.id === row.attendeeId);
        if (attendee && (!attendee.rfid_uid || attendee.rfid_status === 'unissued')) {
          nextIndex = i;
          break;
        }
      }
      
      if (nextIndex >= focusableRows.length) {
        // Wrap around to beginning
        for (let i = 0; i < focusableRows.length; i++) {
          const row = focusableRows[i];
          const attendee = Object.values(groupedAttendees).flat().find(a => a.id === row.attendeeId);
          if (attendee && (!attendee.rfid_uid || attendee.rfid_status === 'unissued')) {
            nextIndex = i;
            break;
          }
        }
        if (nextIndex >= focusableRows.length) return; // No unassigned attendees found
      }
    }
    
    const targetRow = focusableRows[nextIndex];
    currentRowRef.current = nextIndex;
    currentAttendeeIdRef.current = targetRow.attendeeId;
    
    onRowFocus?.(nextIndex, targetRow.attendeeId);
    
    // Focus the DOM element with shorter delay for faster workflow
    setTimeout(() => {
      const targetElement = document.querySelector(
        `[data-attendee-id="${targetRow.attendeeId}"] input[data-rfid-input="true"]`
      ) as HTMLInputElement;
      
      if (targetElement) {
        targetElement.focus();
        targetElement.select();
      }
    }, 50);
  }, [buildFocusableRows, isGroupedView, groupedAttendees, expandedGroups, onRowFocus]);

  const startGroupProcessing = useCallback((groupId: string) => {
    // Expand the target group
    setExpandedGroups(prev => new Set(prev).add(groupId));
    
    // Find first unassigned attendee in group
    const groupAttendees = groupedAttendees[groupId] || [];
    const firstUnassigned = groupAttendees.find(a => !a.rfid_uid || a.rfid_status === 'unissued');
    
    if (firstUnassigned) {
      const focusableRows = buildFocusableRows();
      const rowIndex = focusableRows.findIndex(row => row.attendeeId === firstUnassigned.id);
      
      if (rowIndex >= 0) {
        currentRowRef.current = rowIndex;
        currentAttendeeIdRef.current = firstUnassigned.id;
        
        onRowFocus?.(rowIndex, firstUnassigned.id);
        
        // Focus the input with a short delay
        setTimeout(() => {
          const targetElement = document.querySelector(
            `[data-attendee-id="${firstUnassigned.id}"] input[data-rfid-input="true"]`
          ) as HTMLInputElement;
          
          if (targetElement) {
            targetElement.focus();
            targetElement.select();
          }
        }, 100);
      }
    }
  }, [groupedAttendees, buildFocusableRows, onRowFocus]);

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
    startGroupProcessing,
    expandedGroups,
    expandGroup,
    collapseGroup,
    toggleGroup,
    getGroupProgress,
    currentAttendeeId: currentAttendeeIdRef.current,
    focusableRowCount: buildFocusableRows().length
  };
};