/**
 * Get badge variant for RFID status
 */
export function getRfidStatusVariant(rfidStatus: string | null, rfidUid: string | null): 'default' | 'secondary' | 'destructive' {
  if (rfidUid && rfidStatus === 'active') return 'default';
  if (rfidUid && rfidStatus === 'assigned') return 'secondary';
  return 'destructive';
}

/**
 * Get badge variant for registration status
 */
export function getRegistrationStatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'registered':
      return 'default'; // Green
    case 'pending':
      return 'secondary'; // Yellow/Orange  
    case 'waitlisted':
      return 'outline'; // Gray
    case 'transferred':
      return 'outline'; // Gray
    case 'cancelled':
      return 'destructive'; // Red
    case 'abandoned':
      return 'destructive'; // Red
    case 'incomplete':
      return 'destructive'; // Red
    case 'draft':
      return 'outline'; // Gray
    default:
      return 'outline';
  }
}

/**
 * Get registration status display text
 */
export function getRegistrationStatusDisplayText(status: string): string {
  switch (status) {
    case 'registered':
      return 'Registered';
    case 'pending':
      return 'Pending Payment';
    case 'waitlisted':
      return 'Waitlisted';
    case 'transferred':
      return 'Transferred';
    case 'cancelled':
      return 'Cancelled';
    case 'abandoned':
      return 'Abandoned';
    case 'incomplete':
      return 'Incomplete';
    case 'draft':
      return 'Draft';
    default:
      return status || 'Unknown';
  }
}

/**
 * Get check-in status based on RFID assignment and activation
 */
export interface CheckInStatus {
  status: 'unassigned' | 'assigned' | 'checked_in';
  label: string;
  variant: 'destructive' | 'secondary' | 'default';
  icon: string;
}

export function getCheckInStatus(rfidUid: string | null, activatedAt: string | null): CheckInStatus {
  if (rfidUid && activatedAt) {
    return {
      status: 'checked_in',
      label: 'Checked In',
      variant: 'default',
      icon: '🟢'
    };
  }
  
  if (rfidUid && !activatedAt) {
    return {
      status: 'assigned',
      label: 'Assigned',
      variant: 'secondary', 
      icon: '🟡'
    };
  }
  
  return {
    status: 'unassigned',
    label: 'Unassigned',
    variant: 'destructive',
    icon: '🔴'
  };
}
