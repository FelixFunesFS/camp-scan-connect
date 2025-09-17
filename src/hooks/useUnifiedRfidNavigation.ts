import { useCallback, useRef, useState } from 'react';
import { EnhancedAttendee } from '@/components/reports/CheckInManagementTab';

interface UseUnifiedRfidNavigationOptions {
  groupedAttendees: Record<string, EnhancedAttendee[]>;
  isGroupedView: boolean;
  onRowFocus?: (rowIndex: number, attendeeId?: string) => void;
}

export const useUnifiedRfidNavigation = ({ 
  groupedAttendees, 
  isGroupedView, 
  onRowFocus 
}: UseUnifiedRfidNavigationOptions) => {
  const currentRowRef = useRef<number>(-1);
  const currentAttendeeIdRef = useRef<string>('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    // Start with all groups expanded by default
    new Set(Object.keys(groupedAttendees))
  );

  // Build a flat list of all RFID input fields (focusable attendees)
  const buildFocusableRows = useCallback(() => {
    const focusableRows: { 
      attendeeId: string; 
      groupId: string; 
      indexInGroup: number;
      globalIndex: number;
    }[] = [];
    
    let globalIndex = 0;
    
    if (!isGroupedView) {
      // In individual view, all unassigned attendees are focusable
      Object.values(groupedAttendees).flat().forEach((attendee) => {
        if (!attendee.rfid_uid || attendee.rfid_status === 'unassigned' || attendee.rfid_status === 'unissued') {
          focusableRows.push({
            attendeeId: attendee.id,
            groupId: '',
            indexInGroup: globalIndex,
            globalIndex
          });
        }
        globalIndex++;
      });
    } else {
      // In group view, all unassigned attendees are focusable (groups auto-expand)
      Object.entries(groupedAttendees).forEach(([groupId, attendees]) => {
        attendees.forEach((attendee, indexInGroup) => {
          if (!attendee.rfid_uid || attendee.rfid_status === 'unassigned' || attendee.rfid_status === 'unissued') {
            focusableRows.push({
              attendeeId: attendee.id,
              groupId,
              indexInGroup,
              globalIndex
            });
          }
          globalIndex++;
        });
      });
    }
    
    return focusableRows;
  }, [groupedAttendees, isGroupedView]);

  // Navigate between RFID input fields with arrow keys
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
    } else if (direction === 'up' && currentIndex === 0) {
      targetIndex = focusableRows.length - 1; // Wrap to last
    } else if (direction === 'down' && currentIndex === focusableRows.length - 1) {
      targetIndex = 0; // Wrap to first
    }

    if (targetIndex >= 0 && targetIndex < focusableRows.length) {
      const targetRow = focusableRows[targetIndex];
      
      // Auto-expand group if needed
      if (isGroupedView && targetRow.groupId && !expandedGroups.has(targetRow.groupId)) {
        setExpandedGroups(prev => new Set(prev).add(targetRow.groupId));
      }
      
      currentRowRef.current = targetIndex;
      currentAttendeeIdRef.current = targetRow.attendeeId;
      onRowFocus?.(targetIndex, targetRow.attendeeId);
      
      // Focus the DOM element
      setTimeout(() => {
        const targetInput = document.querySelector(
          `[data-attendee-id="${targetRow.attendeeId}"] input[data-rfid-input="true"]`
        ) as HTMLInputElement;
        
        if (targetInput) {
          targetInput.focus();
          targetInput.select();
          targetInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 50);
    }
  }, [buildFocusableRows, isGroupedView, expandedGroups, onRowFocus]);

  // Focus first unassigned row
  const focusFirstUnassignedRow = useCallback(() => {
    const focusableRows = buildFocusableRows();
    if (focusableRows.length === 0) return;

    const firstRow = focusableRows[0];
    
    // Auto-expand group if needed
    if (isGroupedView && firstRow.groupId && !expandedGroups.has(firstRow.groupId)) {
      setExpandedGroups(prev => new Set(prev).add(firstRow.groupId));
    }
    
    currentRowRef.current = 0;
    currentAttendeeIdRef.current = firstRow.attendeeId;
    onRowFocus?.(0, firstRow.attendeeId);
    
    setTimeout(() => {
      const firstInput = document.querySelector(
        `[data-attendee-id="${firstRow.attendeeId}"] input[data-rfid-input="true"]`
      ) as HTMLInputElement;
      
      if (firstInput) {
        firstInput.focus();
        firstInput.select();
      }
    }, 50);
  }, [buildFocusableRows, isGroupedView, expandedGroups, onRowFocus]);

  // Focus last unassigned row
  const focusLastUnassignedRow = useCallback(() => {
    const focusableRows = buildFocusableRows();
    if (focusableRows.length === 0) return;

    const lastRow = focusableRows[focusableRows.length - 1];
    
    // Auto-expand group if needed
    if (isGroupedView && lastRow.groupId && !expandedGroups.has(lastRow.groupId)) {
      setExpandedGroups(prev => new Set(prev).add(lastRow.groupId));
    }
    
    currentRowRef.current = focusableRows.length - 1;
    currentAttendeeIdRef.current = lastRow.attendeeId;
    onRowFocus?.(focusableRows.length - 1, lastRow.attendeeId);
    
    setTimeout(() => {
      const lastInput = document.querySelector(
        `[data-attendee-id="${lastRow.attendeeId}"] input[data-rfid-input="true"]`
      ) as HTMLInputElement;
      
      if (lastInput) {
        lastInput.focus();
        lastInput.select();
      }
    }, 50);
  }, [buildFocusableRows, isGroupedView, expandedGroups, onRowFocus]);

  // Focus next unassigned (for RFID auto-advance)
  const focusNextUnassigned = useCallback(() => {
    const focusableRows = buildFocusableRows();
    if (focusableRows.length === 0) return;

    let nextIndex = currentRowRef.current + 1;
    
    // Wrap around to beginning if at end
    if (nextIndex >= focusableRows.length) {
      nextIndex = 0;
    }
    
    const targetRow = focusableRows[nextIndex];
    
    // Auto-expand group if needed
    if (isGroupedView && targetRow.groupId && !expandedGroups.has(targetRow.groupId)) {
      setExpandedGroups(prev => new Set(prev).add(targetRow.groupId));
    }
    
    currentRowRef.current = nextIndex;
    currentAttendeeIdRef.current = targetRow.attendeeId;
    onRowFocus?.(nextIndex, targetRow.attendeeId);
    
    setTimeout(() => {
      const targetElement = document.querySelector(
        `[data-attendee-id="${targetRow.attendeeId}"] input[data-rfid-input="true"]`
      ) as HTMLInputElement;
      
      if (targetElement) {
        targetElement.focus();
        targetElement.select();
      }
    }, 50);
  }, [buildFocusableRows, isGroupedView, expandedGroups, onRowFocus]);

  // Start processing a specific group
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

  // Group management functions
  const expandAllGroups = useCallback(() => {
    setExpandedGroups(new Set(Object.keys(groupedAttendees)));
  }, [groupedAttendees]);

  const collapseAllGroups = useCallback(() => {
    setExpandedGroups(new Set());
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
    focusFirstUnassignedRow,
    focusLastUnassignedRow,
    focusNextUnassigned,
    startGroupProcessing,
    expandedGroups,
    expandAllGroups,
    collapseAllGroups,
    toggleGroup,
    getGroupProgress,
    currentAttendeeId: currentAttendeeIdRef.current,
    focusableRowCount: buildFocusableRows().length,
    totalRows: Object.values(groupedAttendees).flat().length
  };
};