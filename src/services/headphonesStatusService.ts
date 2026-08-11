import { getCurrentEventId } from "@/lib/eventRuntime";
import { supabase } from "@/integrations/supabase/client";

export interface HeadphonesStatus {
  status: 'checked_out' | 'checked_in' | 'never_used';
  lastTransactionAt?: Date;
  checkoutDuration?: number; // minutes
  isLongCheckout?: boolean; // over 3 hours
}

export class HeadphonesStatusService {
  /**
   * Get current headphones status for a single attendee
   */
  static async getAttendeeHeadphonesStatus(attendeeId: string): Promise<HeadphonesStatus> {
    const { data, error } = await supabase
      .from('station_transactions')
      .select('transaction_type, created_at')
        .eq('event_id', getCurrentEventId())
      .eq('attendee_id', attendeeId)
      .eq('station_type', 'headphones')
      .in('transaction_type', ['headphone_checkout', 'headphone_checkin'])
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error fetching headphones status:', error);
      return { status: 'never_used' };
    }

    if (!data || data.length === 0) {
      return { status: 'never_used' };
    }

    const latestTransaction = data[0];
    const lastTransactionAt = new Date(latestTransaction.created_at);

    if (latestTransaction.transaction_type === 'headphone_checkout') {
      const checkoutDuration = Math.floor((Date.now() - lastTransactionAt.getTime()) / (1000 * 60));
      const isLongCheckout = checkoutDuration > 180; // 3 hours

      return {
        status: 'checked_out',
        lastTransactionAt,
        checkoutDuration,
        isLongCheckout
      };
    } else {
      return {
        status: 'checked_in',
        lastTransactionAt
      };
    }
  }

  /**
   * Get headphones status for multiple attendees
   */
  static async getBulkHeadphonesStatus(attendeeIds: string[]): Promise<Map<string, HeadphonesStatus>> {
    if (attendeeIds.length === 0) {
      return new Map();
    }

    // Get latest headphones transaction for each attendee
    const { data, error } = await supabase
      .from('station_transactions')
      .select('attendee_id, transaction_type, created_at')
        .eq('event_id', getCurrentEventId())
      .in('attendee_id', attendeeIds)
      .eq('station_type', 'headphones')
      .in('transaction_type', ['headphone_checkout', 'headphone_checkin'])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching bulk headphones status:', error);
      return new Map();
    }

    // Group by attendee and get latest transaction
    const latestTransactions = new Map<string, any>();
    data?.forEach(transaction => {
      if (!latestTransactions.has(transaction.attendee_id)) {
        latestTransactions.set(transaction.attendee_id, transaction);
      }
    });

    const statusMap = new Map<string, HeadphonesStatus>();

    attendeeIds.forEach(attendeeId => {
      const transaction = latestTransactions.get(attendeeId);

      if (!transaction) {
        statusMap.set(attendeeId, { status: 'never_used' });
        return;
      }

      const lastTransactionAt = new Date(transaction.created_at);

      if (transaction.transaction_type === 'headphone_checkout') {
        const checkoutDuration = Math.floor((Date.now() - lastTransactionAt.getTime()) / (1000 * 60));
        const isLongCheckout = checkoutDuration > 180; // 3 hours

        statusMap.set(attendeeId, {
          status: 'checked_out',
          lastTransactionAt,
          checkoutDuration,
          isLongCheckout
        });
      } else {
        statusMap.set(attendeeId, {
          status: 'checked_in',
          lastTransactionAt
        });
      }
    });

    return statusMap;
  }

  /**
   * Format checkout duration for display
   */
  static formatCheckoutDuration(minutes: number): string {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }
}