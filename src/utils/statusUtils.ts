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