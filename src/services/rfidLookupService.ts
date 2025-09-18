import { supabase } from "@/integrations/supabase/client";

export interface AttendeeSearchResult {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  ticket_type: string;
  order_id?: string;
  rfid_uid?: string;
  rfid_status?: string;
  activated_at?: string;
  is_veteran?: boolean;
}

export interface RfidOperationResult {
  success: boolean;
  message: string;
  processed_count?: number;
  failed_count?: number;
  details?: any[];
}

export interface BulkRfidOperation {
  rfid_uid: string;
  attendee_id?: string;
  operation: 'activate' | 'deactivate';
  reason?: string;
}

class RfidLookupService {
  // Search attendees by multiple criteria
  async searchAttendees(query: string): Promise<AttendeeSearchResult[]> {
    if (!query || query.length < 2) return [];

    try {
      const { data, error } = await supabase
        .from('attendees')
        .select(`
          id,
          first_name,
          last_name,
          email,
          phone,
          ticket_type,
          order_id,
          activated_at,
          is_veteran,
          rfid_tags!inner(
            uid,
            status
          )
        `)
        .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%,order_id.ilike.%${query}%`)
        .order('last_name');

      if (error) throw error;

      return data?.map(attendee => ({
        id: attendee.id,
        first_name: attendee.first_name,
        last_name: attendee.last_name,
        email: attendee.email,
        phone: attendee.phone,
        ticket_type: attendee.ticket_type,
        order_id: attendee.order_id,
        activated_at: attendee.activated_at,
        is_veteran: attendee.is_veteran,
        rfid_uid: (attendee.rfid_tags as any)?.[0]?.uid,
        rfid_status: (attendee.rfid_tags as any)?.[0]?.status,
      })) || [];
    } catch (error) {
      console.error('Error searching attendees:', error);
      return [];
    }
  }

  // Get RFID tag with attendee details
  async getRfidWithAttendee(uid: string): Promise<AttendeeSearchResult | null> {
    try {
      const { data, error } = await supabase
        .from('rfid_tags')
        .select(`
          uid,
          status,
          activated_at,
          attendee:attendees(
            id,
            first_name,
            last_name,
            email,
            phone,
            ticket_type,
            order_id,
            activated_at,
            is_veteran
          )
        `)
        .eq('uid', uid.trim())
        .single();

      if (error || !data?.attendee) return null;

      const attendee = data.attendee as any;
      return {
        id: attendee.id,
        first_name: attendee.first_name,
        last_name: attendee.last_name,
        email: attendee.email,
        phone: attendee.phone,
        ticket_type: attendee.ticket_type,
        order_id: attendee.order_id,
        activated_at: attendee.activated_at,
        is_veteran: attendee.is_veteran,
        rfid_uid: data.uid,
        rfid_status: data.status,
      };
    } catch (error) {
      console.error('Error getting RFID with attendee:', error);
      return null;
    }
  }

  // Activate single RFID
  async activateRfid(uid: string, staffId?: string): Promise<RfidOperationResult> {
    try {
      const { data: rfidTag, error: rfidError } = await supabase
        .from('rfid_tags')
        .select('attendee_id, status')
        .eq('uid', uid.trim())
        .single();

      if (rfidError || !rfidTag) {
        return { success: false, message: 'RFID tag not found' };
      }

      if (rfidTag.status === 'active') {
        return { success: false, message: 'RFID is already activated' };
      }

      if (!rfidTag.attendee_id) {
        return { success: false, message: 'RFID is not assigned to any attendee' };
      }

      // Update RFID status
      const { error: updateError } = await supabase
        .from('rfid_tags')
        .update({
          status: 'active',
          activated_at: new Date().toISOString(),
          activation_method: 'staff_assisted'
        })
        .eq('uid', uid.trim());

      if (updateError) throw updateError;

      // Update attendee activation
      await supabase
        .from('attendees')
        .update({ activated_at: new Date().toISOString() })
        .eq('id', rfidTag.attendee_id);

      // Record transaction
      await supabase
        .from('station_transactions')
        .insert({
          attendee_id: rfidTag.attendee_id,
          rfid_uid: uid.trim(),
          station_type: 'activation',
          transaction_type: 'activate',
          activation_method: 'staff_assisted',
          staff_id: staffId,
          current_status: 'active',
          extra_data: { activation_type: 'individual' }
        });

      return { success: true, message: 'RFID activated successfully' };
    } catch (error) {
      console.error('Error activating RFID:', error);
      return { success: false, message: 'Failed to activate RFID' };
    }
  }

  // Deactivate single RFID
  async deactivateRfid(uid: string, reason: string, staffId?: string): Promise<RfidOperationResult> {
    try {
      const { data: rfidTag, error: rfidError } = await supabase
        .from('rfid_tags')
        .select('attendee_id, status')
        .eq('uid', uid.trim())
        .single();

      if (rfidError || !rfidTag) {
        return { success: false, message: 'RFID tag not found' };
      }

      if (rfidTag.status === 'deactivated') {
        return { success: false, message: 'RFID is already deactivated' };
      }

      // Update RFID status
      const { error: updateError } = await supabase
        .from('rfid_tags')
        .update({
          status: 'deactivated',
          deactivated_at: new Date().toISOString(),
          reason: reason
        })
        .eq('uid', uid.trim());

      if (updateError) throw updateError;

      // Record transaction
      if (rfidTag.attendee_id) {
        await supabase
          .from('station_transactions')
          .insert({
            attendee_id: rfidTag.attendee_id,
            rfid_uid: uid.trim(),
            station_type: 'activation',
            transaction_type: 'deactivate',
            staff_id: staffId,
            current_status: 'inactive',
            extra_data: { 
              deactivation_type: 'individual',
              reason: reason 
            }
          });
      }

      return { success: true, message: 'RFID deactivated successfully' };
    } catch (error) {
      console.error('Error deactivating RFID:', error);
      return { success: false, message: 'Failed to deactivate RFID' };
    }
  }

  // Bulk operations
  async processBulkOperations(operations: BulkRfidOperation[], staffId?: string): Promise<RfidOperationResult> {
    let processedCount = 0;
    let failedCount = 0;
    const details: any[] = [];

    for (const operation of operations) {
      try {
        let result: RfidOperationResult;
        
        if (operation.operation === 'activate') {
          result = await this.activateRfid(operation.rfid_uid, staffId);
        } else {
          result = await this.deactivateRfid(operation.rfid_uid, operation.reason || 'Bulk operation', staffId);
        }

        if (result.success) {
          processedCount++;
        } else {
          failedCount++;
        }

        details.push({
          rfid_uid: operation.rfid_uid,
          operation: operation.operation,
          success: result.success,
          message: result.message
        });
      } catch (error) {
        failedCount++;
        details.push({
          rfid_uid: operation.rfid_uid,
          operation: operation.operation,
          success: false,
          message: 'Unexpected error during operation'
        });
      }
    }

    return {
      success: processedCount > 0,
      message: `Processed ${processedCount} operations, ${failedCount} failed`,
      processed_count: processedCount,
      failed_count: failedCount,
      details
    };
  }

  // Get all active RFIDs for mass operations
  async getActiveRfids(): Promise<AttendeeSearchResult[]> {
    try {
      const { data, error } = await supabase
        .from('rfid_tags')
        .select(`
          uid,
          status,
          attendee:attendees(
            id,
            first_name,
            last_name,
            ticket_type,
            is_veteran
          )
        `)
        .eq('status', 'active')
        .order('uid');

      if (error) throw error;

      return data?.map(rfid => ({
        id: (rfid.attendee as any)?.id || '',
        first_name: (rfid.attendee as any)?.first_name || '',
        last_name: (rfid.attendee as any)?.last_name || '',
        ticket_type: (rfid.attendee as any)?.ticket_type || '',
        is_veteran: (rfid.attendee as any)?.is_veteran || false,
        rfid_uid: rfid.uid,
        rfid_status: rfid.status,
      })) || [];
    } catch (error) {
      console.error('Error getting active RFIDs:', error);
      return [];
    }
  }

  // Mass deactivate all active RFIDs
  async massDeactivateAll(reason: string, staffId?: string): Promise<RfidOperationResult> {
    try {
      const activeRfids = await this.getActiveRfids();
      
      if (activeRfids.length === 0) {
        return { success: false, message: 'No active RFIDs found' };
      }

      // Update all active RFIDs
      const { error: updateError } = await supabase
        .from('rfid_tags')
        .update({
          status: 'deactivated',
          deactivated_at: new Date().toISOString(),
          reason: reason
        })
        .eq('status', 'active');

      if (updateError) throw updateError;

      // Record mass deactivation transactions
      const transactions = activeRfids.map(rfid => ({
        attendee_id: rfid.id,
        rfid_uid: rfid.rfid_uid,
        station_type: 'activation' as const,
        transaction_type: 'deactivate' as const,
        staff_id: staffId,
        current_status: 'inactive',
        extra_data: { 
          deactivation_type: 'mass',
          reason: reason 
        }
      }));

      await supabase
        .from('station_transactions')
        .insert(transactions);

      return {
        success: true,
        message: `Successfully deactivated ${activeRfids.length} RFID tags`,
        processed_count: activeRfids.length,
        failed_count: 0
      };
    } catch (error) {
      console.error('Error in mass deactivation:', error);
      return { success: false, message: 'Failed to perform mass deactivation' };
    }
  }

  // Get recent staff activity
  async getRecentStaffActivity(limit: number = 50): Promise<any[]> {
    try {
      // Get transactions first
      const { data: transactions, error: txError } = await supabase
        .from('station_transactions')
        .select('id, created_at, transaction_type, rfid_uid, extra_data, attendee_id')
        .eq('station_type', 'activation')
        .not('staff_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (txError) throw txError;
      if (!transactions?.length) return [];

      // Get attendee info for the transactions
      const attendeeIds = transactions.map(tx => tx.attendee_id).filter(Boolean);
      const { data: attendees, error: attendeeError } = await supabase
        .from('attendees')
        .select('id, first_name, last_name')
        .in('id', attendeeIds);

      if (attendeeError) throw attendeeError;

      // Create a map for quick lookup
      const attendeeMap = new Map(attendees?.map(a => [a.id, a]) || []);

      // Merge the data
      const mergedData = transactions.map(tx => ({
        ...tx,
        attendee: attendeeMap.get(tx.attendee_id) || null
      }));

      return mergedData;
    } catch (error) {
      console.error('Error getting recent staff activity:', error);
      return [];
    }
  }
}

export const rfidLookupService = new RfidLookupService();