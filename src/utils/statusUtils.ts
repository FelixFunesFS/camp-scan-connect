/**
 * Calculate attendee status dynamically based on activation and RFID assignment
 */
export function calculateAttendeeStatus(isActivated: boolean, hasRfid: boolean): string {
  if (isActivated) return 'activated';
  if (hasRfid) return 'assigned';
  return 'unassigned';
}

/**
 * Get badge variant for attendee status
 */
export function getStatusVariant(status: string): 'default' | 'secondary' | 'destructive' {
  switch (status) {
    case 'activated':
      return 'default';
    case 'assigned':
      return 'secondary';
    default:
      return 'destructive';
  }
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
    case 'cancelled':
      return 'destructive'; // Red
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
    case 'cancelled':
      return 'Cancelled';
    default:
      return status || 'Unknown';
  }
}

/**
 * Get status display text
 */
export function getStatusDisplayText(status: string): string {
  switch (status) {
    case 'activated':
      return 'Active';
    case 'assigned':
      return 'Pending';
    default:
      return 'No RFID';
  }
}