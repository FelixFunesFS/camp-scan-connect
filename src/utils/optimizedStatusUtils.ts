import { supabase } from '@/integrations/supabase/client';

export interface CheckInStatus {
  status: 'unassigned' | 'assigned' | 'checked_in';
  label: string;
  variant: 'destructive' | 'secondary' | 'default';
  icon: string;
}

// Cache for status calculations
const statusCache = new Map<string, { status: CheckInStatus; timestamp: number }>();
const CACHE_TTL = 30000; // 30 seconds

/**
 * Get basic check-in status (prioritizes RFID tag status)
 */
export function getCheckInStatus(rfidUid: string | null, activatedAt: string | null, rfidStatus?: string): CheckInStatus {
  // If we have RFID status, use it as primary source of truth
  if (rfidUid && rfidStatus === 'active') {
    return {
      status: 'checked_in',
      label: 'Checked In',
      variant: 'default',
      icon: '🟢'
    };
  }
  
  if (rfidUid && rfidStatus === 'assigned') {
    return {
      status: 'assigned',
      label: 'Assigned',
      variant: 'secondary', 
      icon: '🟡'
    };
  }
  
  // Fallback to old logic if no RFID status provided
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
 * Optimized bulk status retrieval with aggressive caching
 */
export async function getBulkOptimizedStatuses(attendeeIds: string[]): Promise<Record<string, CheckInStatus>> {
  const now = Date.now();
  const results: Record<string, CheckInStatus> = {};
  const uncachedIds: string[] = [];

  // Check cache first
  for (const id of attendeeIds) {
    const cached = statusCache.get(id);
    if (cached && (now - cached.timestamp) < CACHE_TTL) {
      results[id] = cached.status;
    } else {
      uncachedIds.push(id);
    }
  }

  // If all cached, return immediately
  if (uncachedIds.length === 0) {
    return results;
  }

  try {
    // Single optimized query for all uncached attendees
    const { data: transactions, error: transError } = await supabase
      .from('station_transactions')
      .select('attendee_id, transaction_type, created_at')
      .in('attendee_id', uncachedIds)
      .eq('station_type', 'activation')
      .order('created_at', { ascending: false });

    if (transError) throw transError;

    // Get RFID data in parallel
    const { data: rfidData, error: rfidError } = await supabase
      .from('rfid_tags')
      .select('attendee_id, uid, status')
      .in('attendee_id', uncachedIds)
      .in('status', ['assigned', 'active']);

    if (rfidError) throw rfidError;

    // Process results efficiently
    const rfidMap = new Map<string, { uid: string; status: string }>();
    rfidData?.forEach(rfid => {
      rfidMap.set(rfid.attendee_id, { uid: rfid.uid, status: rfid.status });
    });

    const activationMap = new Map<string, string>();
    transactions?.forEach(tx => {
      if (!activationMap.has(tx.attendee_id) && tx.transaction_type === 'activate') {
        activationMap.set(tx.attendee_id, tx.created_at);
      }
    });

    // Calculate statuses for uncached IDs
    for (const attendeeId of uncachedIds) {
      const rfid = rfidMap.get(attendeeId);
      const activatedAt = activationMap.get(attendeeId);
      
      const status = getCheckInStatus(rfid?.uid || null, activatedAt || null, rfid?.status);
      
      // Cache the result
      statusCache.set(attendeeId, { status, timestamp: now });
      results[attendeeId] = status;
    }

  } catch (error) {
    console.error('Error in getBulkOptimizedStatuses:', error);
    
    // Fallback to basic status for uncached IDs
    for (const id of uncachedIds) {
      const fallbackStatus = getCheckInStatus(null, null);
      results[id] = fallbackStatus;
      statusCache.set(id, { status: fallbackStatus, timestamp: now });
    }
  }

  return results;
}

/**
 * Invalidate status cache for specific attendees
 */
export function invalidateStatusCache(attendeeIds?: string[]) {
  if (attendeeIds) {
    attendeeIds.forEach(id => statusCache.delete(id));
  } else {
    statusCache.clear();
  }
}

/**
 * Clean up expired cache entries
 */
export function cleanStatusCache() {
  const now = Date.now();
  for (const [key, value] of statusCache.entries()) {
    if ((now - value.timestamp) > CACHE_TTL) {
      statusCache.delete(key);
    }
  }
}

/**
 * Get cache statistics
 */
export function getStatusCacheStats() {
  return {
    size: statusCache.size,
    ttl: CACHE_TTL
  };
}

// Re-export existing functions for compatibility
export {
  getRfidStatusVariant,
  getRegistrationStatusVariant,
  getRegistrationStatusDisplayText
} from './statusUtils';