import { supabase } from "@/integrations/supabase/client";
import { StationType, TransactionType } from "@/types/station";

export interface EquipmentStatus {
  status: 'checked_out' | 'checked_in' | 'never_used';
  lastTransactionAt?: Date;
  checkoutDuration?: number; // minutes
  isLongCheckout?: boolean; // over 3 hours
  rfidUid?: string;
}

export interface EquipmentCheckout {
  attendeeName: string;
  attendeePhone: string;
  checkoutTime: Date;
  duration: number; // minutes
  rfidUid: string;
  attendeeId: string;
}

export interface EquipmentStats {
  currentlyOut: number;
  totalCheckouts: number;
  averageUsage: number; // minutes
  longestSession: number; // minutes
}

export class EquipmentStatusService {
  /**
   * Get current equipment status for a single attendee
   */
  static async getAttendeeEquipmentStatus(
    attendeeId: string, 
    stationType: StationType,
    checkoutType: TransactionType,
    checkinType: TransactionType
  ): Promise<EquipmentStatus> {
    const { data, error } = await supabase
      .from('station_transactions')
      .select('transaction_type, created_at, rfid_uid')
      .eq('attendee_id', attendeeId)
      .eq('station_type', stationType)
      .in('transaction_type', [checkoutType, checkinType])
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error(`Error fetching ${stationType} status:`, error);
      return { status: 'never_used' };
    }

    if (!data || data.length === 0) {
      return { status: 'never_used' };
    }

    const latestTransaction = data[0];
    const lastTransactionAt = new Date(latestTransaction.created_at);

    if (latestTransaction.transaction_type === checkoutType) {
      const checkoutDuration = Math.floor((Date.now() - lastTransactionAt.getTime()) / (1000 * 60));
      const isLongCheckout = checkoutDuration > 180; // 3 hours

      return {
        status: 'checked_out',
        lastTransactionAt,
        checkoutDuration,
        isLongCheckout,
        rfidUid: latestTransaction.rfid_uid || undefined
      };
    } else {
      return {
        status: 'checked_in',
        lastTransactionAt,
        rfidUid: latestTransaction.rfid_uid || undefined
      };
    }
  }

  /**
   * Get equipment checkouts and stats for a specific equipment type
   */
  static async getEquipmentData(
    stationType: StationType,
    checkoutType: TransactionType,
    checkinType: TransactionType,
    timePeriod: 'today' | 'all' = 'today'
  ): Promise<{ checkouts: EquipmentCheckout[]; stats: EquipmentStats }> {
    try {
      const startDate = timePeriod === 'today' 
        ? new Date().toISOString().split('T')[0]
        : '1900-01-01';

      // Get all transactions for this equipment type
      const { data: transactions, error } = await supabase
        .from('station_transactions')
        .select(`
          *,
          attendees (
            first_name,
            last_name,
            phone
          )
        `)
        .eq('station_type', stationType)
        .in('transaction_type', [checkoutType, checkinType])
        .gte('created_at', startDate)
        .order('created_at', { ascending: false });

      if (error) {
        console.error(`Error fetching ${stationType} data:`, error);
        return { checkouts: [], stats: { currentlyOut: 0, totalCheckouts: 0, averageUsage: 0, longestSession: 0 } };
      }

      // Process transactions to find current checkouts
      const checkoutMap = new Map<string, any>();
      const checkinMap = new Map<string, any>();
      const completedSessions: number[] = [];

      transactions?.forEach(transaction => {
        const attendeeId = transaction.attendee_id;
        
        if (transaction.transaction_type === checkoutType) {
          if (!checkoutMap.has(attendeeId) || 
              new Date(transaction.created_at) > new Date(checkoutMap.get(attendeeId).created_at)) {
            checkoutMap.set(attendeeId, transaction);
          }
        } else if (transaction.transaction_type === checkinType) {
          if (!checkinMap.has(attendeeId) || 
              new Date(transaction.created_at) > new Date(checkinMap.get(attendeeId).created_at)) {
            checkinMap.set(attendeeId, transaction);
          }
        }
      });

      // Find current checkouts (checkout more recent than checkin)
      const currentCheckouts: EquipmentCheckout[] = [];
      
      checkoutMap.forEach((checkoutTx, attendeeId) => {
        const checkinTx = checkinMap.get(attendeeId);
        const isCurrentlyOut = !checkinTx || 
          new Date(checkoutTx.created_at) > new Date(checkinTx.created_at);

        if (isCurrentlyOut && checkoutTx.attendees) {
          const checkoutTime = new Date(checkoutTx.created_at);
          const duration = Math.floor((Date.now() - checkoutTime.getTime()) / (1000 * 60));

          currentCheckouts.push({
            attendeeName: `${checkoutTx.attendees.first_name} ${checkoutTx.attendees.last_name}`,
            attendeePhone: checkoutTx.attendees.phone || '',
            checkoutTime,
            duration,
            rfidUid: checkoutTx.rfid_uid || '',
            attendeeId: checkoutTx.attendee_id
          });
        }

        // Calculate completed sessions for stats
        if (checkinTx && new Date(checkinTx.created_at) > new Date(checkoutTx.created_at)) {
          const sessionDuration = Math.floor(
            (new Date(checkinTx.created_at).getTime() - new Date(checkoutTx.created_at).getTime()) / (1000 * 60)
          );
          completedSessions.push(sessionDuration);
        }
      });

      // Calculate stats
      const totalCheckouts = checkoutMap.size;
      const averageUsage = completedSessions.length > 0 
        ? Math.round(completedSessions.reduce((sum, duration) => sum + duration, 0) / completedSessions.length)
        : 0;
      const longestSession = completedSessions.length > 0 
        ? Math.max(...completedSessions)
        : 0;

      return {
        checkouts: currentCheckouts.sort((a, b) => b.duration - a.duration),
        stats: {
          currentlyOut: currentCheckouts.length,
          totalCheckouts,
          averageUsage,
          longestSession
        }
      };
    } catch (error) {
      console.error(`Error processing ${stationType} data:`, error);
      return { checkouts: [], stats: { currentlyOut: 0, totalCheckouts: 0, averageUsage: 0, longestSession: 0 } };
    }
  }

  /**
   * Format checkout duration for display
   */
  static formatUsageTime(minutes: number): string {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }
}