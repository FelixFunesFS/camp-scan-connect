import { useCallback, useRef, useState, useMemo } from 'react';
import { EnhancedAttendee, GroupedAttendee } from '@/types/attendee';

interface UseUnifiedRfidNavigationOptions {
  groupedAttendees: GroupedAttendee[] | EnhancedAttendee[];
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
  
  // Initialize expanded groups based on data structure
  const initialExpandedGroups = useMemo(() => {
    if (isGroupedView && Array.isArray(groupedAttendees)) {
      const groups = groupedAttendees as GroupedAttendee[];
      return new Set(groups.map(group => group.orderId || 'no-order'));
    }
    return new Set<string>();
  }, [groupedAttendees, isGroupedView]);
  
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(initialExpandedGroups);

  // Build a flat list of all attendees that can have RFID inputs (unassigned)
  const focusableRows = useMemo(() => {
    if (!isGroupedView) {
      // Individual view - flat array of attendees
      const attendees = groupedAttendees as EnhancedAttendee[];
      return attendees.filter(attendee => 
        !attendee.rfid_uid || 
        attendee.rfid_status === 'unassigned' || 
        attendee.rfid_status === 'unissued' ||
        attendee.rfid_status === null ||
        attendee.rfid_status === undefined
      );
    } else {
      // Group view - only include attendees from expanded groups
      const groups = groupedAttendees as GroupedAttendee[];
      return groups
        .filter(group => expandedGroups.has(group.orderId || 'no-order'))
        .flatMap(group => group.attendees)
        .filter(attendee => 
          !attendee.rfid_uid || 
          attendee.rfid_status === 'unassigned' || 
          attendee.rfid_status === 'unissued' ||
          attendee.rfid_status === null ||
          attendee.rfid_status === undefined
        );
    }
  }, [groupedAttendees, isGroupedView, expandedGroups]);

  // Navigate between RFID input fields with arrow keys
  const navigateToRow = useCallback((direction: 'up' | 'down', preventScroll = false) => {
    if (!focusableRows.length) return;
    
    const currentFocusedElement = document.activeElement as HTMLInputElement;
    const currentAttendeeId = currentFocusedElement?.getAttribute('data-attendee-id');
    
    let currentIndex = focusableRows.findIndex(attendee => attendee.id === currentAttendeeId);
    if (currentIndex === -1) currentIndex = 0;

    let targetIndex = currentIndex;
    // Fixed: 'up' should go to previous row (higher in the table), 'down' to next row (lower in the table)
    if (direction === 'up' && currentIndex > 0) {
      targetIndex = currentIndex - 1;
    } else if (direction === 'down' && currentIndex < focusableRows.length - 1) {
      targetIndex = currentIndex + 1;
    } else if (direction === 'up' && currentIndex === 0) {
      // Wrap to last
      targetIndex = focusableRows.length - 1;
    } else if (direction === 'down' && currentIndex === focusableRows.length - 1) {
      // Wrap to first
      targetIndex = 0;
    }

    const targetAttendee = focusableRows[targetIndex];
    if (!targetAttendee) return;

    // Auto-expand group if needed when in grouped view
    if (isGroupedView && targetAttendee.order_id) {
      const groupKey = targetAttendee.order_id;
      if (!expandedGroups.has(groupKey)) {
        setExpandedGroups(prev => new Set(prev).add(groupKey));
      }
    }

    // Focus the target input after potential DOM updates
    setTimeout(() => {
      const targetInput = document.querySelector(`input[data-attendee-id="${targetAttendee.id}"][data-rfid-input="true"]`) as HTMLInputElement;
      if (targetInput) {
        targetInput.focus({ preventScroll });
        targetInput.select();
        currentAttendeeIdRef.current = targetAttendee.id;
        onRowFocus?.(targetIndex);
        
        // Only scroll for user-initiated navigation
        if (!preventScroll) {
          targetInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }, isGroupedView ? 100 : 50);
  }, [focusableRows, isGroupedView, expandedGroups, onRowFocus]);

  // Focus first unassigned row
  const focusFirstUnassignedRow = useCallback((preventScroll = false) => {
    if (!focusableRows.length) return;
    
    const firstAttendee = focusableRows[0];
    if (!firstAttendee) return;

    // Auto-expand group if needed
    if (isGroupedView && firstAttendee.order_id) {
      const groupKey = firstAttendee.order_id;
      if (!expandedGroups.has(groupKey)) {
        setExpandedGroups(prev => new Set(prev).add(groupKey));
      }
    }

    setTimeout(() => {
      const firstInput = document.querySelector(`input[data-attendee-id="${firstAttendee.id}"][data-rfid-input="true"]`) as HTMLInputElement;
      if (firstInput) {
        firstInput.focus({ preventScroll });
        firstInput.select();
        currentAttendeeIdRef.current = firstAttendee.id;
        onRowFocus?.(0);
      }
    }, 50);
  }, [focusableRows, isGroupedView, expandedGroups, onRowFocus]);

  // Focus last unassigned row
  const focusLastUnassignedRow = useCallback(() => {
    if (!focusableRows.length) return;
    
    const lastAttendee = focusableRows[focusableRows.length - 1];
    if (!lastAttendee) return;

    // Auto-expand group if needed
    if (isGroupedView && lastAttendee.order_id) {
      const groupKey = lastAttendee.order_id;
      if (!expandedGroups.has(groupKey)) {
        setExpandedGroups(prev => new Set(prev).add(groupKey));
      }
    }

    setTimeout(() => {
      const lastInput = document.querySelector(`input[data-attendee-id="${lastAttendee.id}"][data-rfid-input="true"]`) as HTMLInputElement;
      if (lastInput) {
        lastInput.focus();
        lastInput.select();
        currentAttendeeIdRef.current = lastAttendee.id;
        onRowFocus?.(focusableRows.length - 1);
      }
    }, 50);
  }, [focusableRows, isGroupedView, expandedGroups, onRowFocus]);

  // Focus next unassigned (for RFID auto-advance)
  const focusNextUnassigned = useCallback((preventScroll = false) => {
    if (!focusableRows.length) return;
    
    const currentFocusedElement = document.activeElement as HTMLInputElement;
    const currentAttendeeId = currentFocusedElement?.getAttribute('data-attendee-id');
    
    let currentIndex = focusableRows.findIndex(attendee => attendee.id === currentAttendeeId);
    const nextIndex = (currentIndex + 1) % focusableRows.length; // Wrap around
    
    const nextAttendee = focusableRows[nextIndex];
    if (!nextAttendee) return;

    // Auto-expand group if needed  
    if (isGroupedView && nextAttendee.order_id) {
      const groupKey = nextAttendee.order_id;
      if (!expandedGroups.has(groupKey)) {
        setExpandedGroups(prev => new Set(prev).add(groupKey));
      }
    }

    setTimeout(() => {
      const nextInput = document.querySelector(`input[data-attendee-id="${nextAttendee.id}"][data-rfid-input="true"]`) as HTMLInputElement;
      if (nextInput) {
        nextInput.focus({ preventScroll });
        nextInput.select();
        currentAttendeeIdRef.current = nextAttendee.id;
        onRowFocus?.(nextIndex);
        
        // Only scroll for user-initiated navigation
        if (!preventScroll) {
          nextInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }, 50);
  }, [focusableRows, isGroupedView, expandedGroups, onRowFocus]);

  // Start processing a specific group
  const startGroupProcessing = useCallback((groupId: string) => {
    if (!isGroupedView) return;
    
    // Expand the target group
    setExpandedGroups(prev => new Set(prev).add(groupId));
    
    // Find first unassigned attendee in group
    const groups = groupedAttendees as GroupedAttendee[];
    const group = groups.find(g => (g.orderId || 'no-order') === groupId);
    const groupAttendees = group?.attendees || [];
    const firstUnassigned = groupAttendees.find(a => 
      !a.rfid_uid || 
      a.rfid_status === 'unissued' ||
      a.rfid_status === 'unassigned' ||
      a.rfid_status === null ||
      a.rfid_status === undefined
    );
    
    if (firstUnassigned) {
      const rowIndex = focusableRows.findIndex(attendee => attendee.id === firstUnassigned.id);
      
      if (rowIndex >= 0) {
        currentRowRef.current = rowIndex;
        currentAttendeeIdRef.current = firstUnassigned.id;
        onRowFocus?.(rowIndex, firstUnassigned.id);
        
        setTimeout(() => {
          const targetElement = document.querySelector(
            `input[data-attendee-id="${firstUnassigned.id}"][data-rfid-input="true"]`
          ) as HTMLInputElement;
          
          if (targetElement) {
            targetElement.focus();
            targetElement.select();
          }
        }, 100);
      }
    }
  }, [groupedAttendees, focusableRows, onRowFocus, isGroupedView]);

  // Group management functions
  const expandAllGroups = useCallback(() => {
    if (isGroupedView) {
      const groups = groupedAttendees as GroupedAttendee[];
      setExpandedGroups(new Set(groups.map(group => group.orderId || 'no-order')));
    }
  }, [groupedAttendees, isGroupedView]);

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
    if (!isGroupedView) return { assigned: 0, total: 0, percentage: 0 };
    
    const groups = groupedAttendees as GroupedAttendee[];
    const group = groups.find(g => (g.orderId || 'no-order') === groupId);
    const attendees = group?.attendees || [];
    
    const assigned = attendees.filter(a => 
      a.rfid_uid && 
      a.rfid_status !== 'unassigned' && 
      a.rfid_status !== 'unissued' &&
      a.rfid_status !== null &&
      a.rfid_status !== undefined
    ).length;
    const total = attendees.length;
    return { assigned, total, percentage: total > 0 ? (assigned / total) * 100 : 0 };
  }, [groupedAttendees, isGroupedView]);

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
    focusableRowCount: focusableRows.length,
    totalRows: isGroupedView 
      ? (groupedAttendees as GroupedAttendee[]).reduce((sum, group) => sum + group.attendees.length, 0)
      : (groupedAttendees as EnhancedAttendee[]).length
  };
};