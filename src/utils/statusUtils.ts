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
 * Enhanced check-in status that prioritizes activation transactions over attendee.activated_at
 */
export async function getEnhancedCheckInStatus(attendeeId: string, rfidUid: string | null): Promise<CheckInStatus> {
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    
    // Get the most recent activation transaction (activate OR deactivate)
    const { data: activationTransaction } = await supabase
      .from('station_transactions')
      .select('transaction_type')
      .eq('attendee_id', attendeeId)
      .eq('station_type', 'activation')
      .in('transaction_type', ['activate', 'deactivate'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Get RFID status to determine actual activation state
    const { supabase: supabaseClient } = await import("@/integrations/supabase/client");
    const { data: rfidTag } = await supabaseClient
      .from('rfid_tags')
      .select('status')
      .eq('uid', rfidUid)
      .in('status', ['assigned', 'active'])
      .maybeSingle();

    const isActivated = rfidTag?.status === 'active';

    if (rfidUid && isActivated) {
      return {
        status: 'checked_in',
        label: 'Checked In',
        variant: 'default',
        icon: '🟢'
      };
    }
    
    if (rfidUid && !isActivated) {
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
    console.error('Error checking enhanced activation status:', error);
    // Fallback to original logic
    return getCheckInStatus(rfidUid, null);
  }
}

/**
 * Get check-in status based on activation transactions (single source of truth)
 * This checks the station_transactions table for actual activation status
 */
export async function getActivationStatusFromTransactions(attendeeId: string): Promise<CheckInStatus> {
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    
    // Get the most recent activation transaction (activate OR deactivate)
    const { data: activationTransaction } = await supabase
      .from('station_transactions')
      .select('transaction_type, created_at')
      .eq('attendee_id', attendeeId)
      .eq('station_type', 'activation')
      .in('transaction_type', ['activate', 'deactivate'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Check if attendee has RFID assignment
    const { data: rfidTag } = await supabase
      .from('rfid_tags')
      .select('uid, status')
      .eq('attendee_id', attendeeId)
      .in('status', ['assigned', 'active'])
      .maybeSingle();

    const hasRfid = !!rfidTag;
    const isActivated = rfidTag?.status === 'active';

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

// Bulk function to get enhanced check-in statuses for multiple attendees
export async function getBulkEnhancedCheckInStatuses(attendeeIds: string[]): Promise<Record<string, CheckInStatus>> {
  if (attendeeIds.length === 0) {
    return {};
  }

  try {
    const { supabase } = await import("@/integrations/supabase/client");
    
    // Get all activation transactions for these attendees
    const { data: activationTransactions } = await supabase
      .from('station_transactions')
      .select('attendee_id, transaction_type, created_at')
      .eq('station_type', 'activation')
      .in('attendee_id', attendeeIds)
      .in('transaction_type', ['activate', 'deactivate'])
      .order('created_at', { ascending: false });

    // Get all RFID tags for these attendees
    const { data: rfidTags } = await supabase
      .from('rfid_tags')
      .select('attendee_id, uid, status')
      .in('attendee_id', attendeeIds)
      .in('status', ['assigned', 'active']);

    // Create maps for quick lookup
    const activationMap = new Map<string, { transaction_type: string; created_at: string }>();
    const rfidMap = new Map<string, { uid: string; status: string }>();

    // Process activation transactions (get most recent per attendee)
    activationTransactions?.forEach(transaction => {
      if (!activationMap.has(transaction.attendee_id)) {
        activationMap.set(transaction.attendee_id, {
          transaction_type: transaction.transaction_type,
          created_at: transaction.created_at
        });
      }
    });

    // Process RFID tags
    rfidTags?.forEach(tag => {
      rfidMap.set(tag.attendee_id, {
        uid: tag.uid, 
        status: tag.status
      });
    });

    // Generate status for each attendee
    const statusMap: Record<string, CheckInStatus> = {};
    
    attendeeIds.forEach(attendeeId => {
      const activation = activationMap.get(attendeeId);
      const rfid = rfidMap.get(attendeeId);
      
      const hasRfid = !!rfid;
      const isActivated = rfid?.status === 'active';

      if (hasRfid && isActivated) {
        statusMap[attendeeId] = {
          status: 'checked_in',
          label: 'Checked In',
          variant: 'default' as const,
          icon: '✅'
        };
      } else if (hasRfid && !isActivated) {
        statusMap[attendeeId] = {
          status: 'assigned',
          label: 'Assigned',
          variant: 'secondary' as const,
          icon: '📋'
        };
      } else {
        statusMap[attendeeId] = {
          status: 'unassigned',
          label: 'Unassigned',
          variant: 'destructive' as const,
          icon: '❌'
        };
      }
    });

    return statusMap;
  } catch (error) {
    console.error('Error in getBulkEnhancedCheckInStatuses:', error);
    
    // Return fallback statuses for all attendees
    const fallbackMap: Record<string, CheckInStatus> = {};
    attendeeIds.forEach(id => {
      fallbackMap[id] = {
        status: 'unassigned',
        label: 'Error',
        variant: 'destructive' as const,
        icon: '⚠️'
      };
    });
    
    return fallbackMap;
  }
}
