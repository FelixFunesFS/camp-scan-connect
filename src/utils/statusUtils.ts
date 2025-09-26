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

/**
 * Get check-in status based on activation transactions (single source of truth)
 * This checks the station_transactions table for actual activation status
 */
export async function getActivationStatusFromTransactions(attendeeId: string): Promise<CheckInStatus> {
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    
    // Check if attendee has activation transaction
    const { data: activationTransaction } = await supabase
      .from('station_transactions')
      .select('transaction_type, created_at')
      .eq('attendee_id', attendeeId)
      .eq('station_type', 'activation')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Check if attendee has RFID assignment
    const { data: rfidTag } = await supabase
      .from('rfid_tags')
      .select('uid, status')
      .eq('attendee_id', attendeeId)
      .in('status', ['assigned', 'active'])
      .single();

    const hasRfid = !!rfidTag;
    const isActivated = activationTransaction?.transaction_type === 'activate';

    if (hasRfid && isActivated) {
      return {
        status: 'checked_in',
        label: 'Checked In',
        variant: 'default',
        icon: '🟢'
      };
    }
    
    if (hasRfid && !isActivated) {
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
  } catch (error) {
    console.error('Error checking activation status:', error);
    return {
      status: 'unassigned',
      label: 'Error',
      variant: 'destructive',
      icon: '🔴'
    };
  }
}
