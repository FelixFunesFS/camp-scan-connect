import { getCurrentEventId } from "@/lib/eventRuntime";
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
        .eq('event_id', getCurrentEventId())
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
      // Always get ALL transactions to determine current checkout status
      const { data: allTransactions, error: allError } = await supabase
        .from('station_transactions')
        .select(`
          id,
          attendee_id,
          station_type,
          transaction_type,
          created_at,
          rfid_uid
        `)
        .eq('event_id', getCurrentEventId())
        .eq('station_type', stationType)
        .in('transaction_type', [checkoutType, checkinType])
        .order('created_at', { ascending: false });

      if (allError) {
        console.error(`Error fetching all ${stationType} transactions:`, allError);
        return { checkouts: [], stats: { currentlyOut: 0, totalCheckouts: 0, averageUsage: 0, longestSession: 0 } };
      }

      // Get today's transactions for daily stats
      const todayStart = new Date().toISOString().split('T')[0];
      const { data: todayTransactions, error: todayError } = await supabase
        .from('station_transactions')
        .select(`
          id,
          attendee_id,
          station_type,
          transaction_type,
          created_at,
          rfid_uid
        `)
        .eq('event_id', getCurrentEventId())
        .eq('station_type', stationType)
        .in('transaction_type', [checkoutType, checkinType])
        .gte('created_at', todayStart)
        .order('created_at', { ascending: false });

      if (todayError) {
        console.error(`Error fetching today's ${stationType} transactions:`, todayError);
      }

      // Get unique attendee IDs from all transactions
      const allAttendeeIds = [...new Set(allTransactions?.map(t => t.attendee_id).filter(Boolean) || [])];
      
      // Fetch attendee data separately
      const { data: attendees, error: attendeeError } = await supabase
        .from('attendees')
        .select('id, first_name, last_name, phone')
        .eq('event_id', getCurrentEventId())
        .in('id', allAttendeeIds);

      if (attendeeError) {
        console.error(`Error fetching attendee data:`, attendeeError);
      }

      // Create attendee lookup map
      const attendeeMap = new Map(attendees?.map(a => [a.id, a]) || []);

      // Process ALL transactions to find current checkouts (use all transactions for status)
      const checkoutMap = new Map<string, any>();
      const checkinMap = new Map<string, any>();
      const completedSessions: number[] = [];

      // Use all transactions to determine current status
      allTransactions?.forEach(transaction => {
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

        const attendee = attendeeMap.get(attendeeId);
        if (isCurrentlyOut && attendee) {
          const checkoutTime = new Date(checkoutTx.created_at);
          const duration = Math.floor((Date.now() - checkoutTime.getTime()) / (1000 * 60));

          currentCheckouts.push({
            attendeeName: `${attendee.first_name} ${attendee.last_name}`,
            attendeePhone: attendee.phone || '',
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

      // Calculate daily checkout count from today's transactions
      const todayCheckouts = todayTransactions?.filter(t => t.transaction_type === checkoutType).length || 0;

      // Calculate stats
      const totalCheckouts = todayCheckouts; // This should be today's checkouts for the "Total Today" metric
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