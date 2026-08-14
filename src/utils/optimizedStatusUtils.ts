import { getCurrentEventId } from "@/lib/eventRuntime";
import { supabase } from '@/integrations/supabase/client';

export interface CheckInStatus {
  status: 'unassigned' | 'assigned' | 'checked_in' | 'unknown';
  label: string;
  variant: 'destructive' | 'secondary' | 'default' | 'outline';
  icon: string;
}

const UNKNOWN_STATUS: CheckInStatus = {
  status: 'unknown',
  label: 'Unknown',
  variant: 'outline',
  icon: '⚪',
};

// Keep request URLs well under server limits when filtering by id lists
const ID_CHUNK_SIZE = 100;

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
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
    const eventId = getCurrentEventId();
    const batches = chunk(uncachedIds, ID_CHUNK_SIZE);

    // Chunked queries keep the request URL short enough for large attendee lists
    const [transactionBatches, rfidBatches] = await Promise.all([
      Promise.all(
        batches.map(async (ids) => {
          const { data, error } = await supabase
            .from('station_transactions')
            .select('attendee_id, transaction_type, created_at')
            .eq('event_id', eventId)
            .in('attendee_id', ids)
            .eq('station_type', 'activation')
            .order('created_at', { ascending: false });
          if (error) throw error;
          return data ?? [];
        })
      ),
      Promise.all(
        batches.map(async (ids) => {
          const { data, error } = await supabase
            .from('rfid_tags')
            .select('attendee_id, uid, status')
            .eq('event_id', eventId)
            .in('attendee_id', ids)
            .in('status', ['assigned', 'active']);
          if (error) throw error;
          return data ?? [];
        })
      ),
    ]);

    const transactions = transactionBatches.flat();
    const rfidData = rfidBatches.flat();

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

    // Never report a failed lookup as "Unassigned" — that is fabricated data.
    // Surface it as Unknown and do not cache it, so the next refresh retries.
    for (const id of uncachedIds) {
      if (!results[id]) results[id] = UNKNOWN_STATUS;
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