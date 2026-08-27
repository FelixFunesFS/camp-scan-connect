import { getCurrentEventId } from "@/lib/eventRuntime";
import { supabase } from "@/integrations/supabase/client";
import { inferCredentialType, normalizeCredential } from "@/lib/credentialFormat";
import { resolveCredential } from "@/lib/credentialLookup";

export interface RfidTag {
  uid: string;
  attendee_id: string | null;
  status: string;
  issued_at?: string;
  deactivated_at?: string;
  reason?: string;
  attendee?: {
    id: string;
    first_name: string;
    last_name: string;
    ticket_type: string;
    email?: string;
    phone?: string;
  };
}

export interface RfidAssignmentResult {
  success: boolean;
  message: string;
  rfidTag?: RfidTag;
}

class RfidService {
  // Find attendee by Code
  async findAttendeeByRfid(uid: string): Promise<RfidTag | null> {
    try {
      // One resolver for every scan: case/whitespace-insensitive and scoped to
      // the event the server considers active.
      const resolved = await resolveCredential(uid);
      if (!resolved || !resolved.attendee_id) return null;
      if (resolved.wrong_event) return null;
      if (!['assigned', 'active'].includes(resolved.status)) return null;

      const { data: tag } = await supabase
        .from('rfid_tags')
        .select(`
          uid,
          attendee_id,
          status,
          issued_at,
          deactivated_at,
          reason,
          attendee:attendees(
            id,
            first_name,
            last_name,
            ticket_type,
            email,
            phone
          )
        `)
        .eq('uid', resolved.uid)
        .maybeSingle();

      return (tag as RfidTag) ?? null;
    } catch (error) {
      console.error('Error in findAttendeeByRfid:', error);
      return null;
    }
  }

  // Validate Code availability
  async validateRfidUid(uid: string, excludeAttendeeId?: string): Promise<{ isValid: boolean; message: string }> {
    try {
      const { data: existingTag } = await supabase
        .from('rfid_tags')
        .select(`
          attendee_id,
          status,
          attendee:attendees(first_name, last_name)
        `)
        .eq('event_id', getCurrentEventId())
        .eq('uid', normalizeCredential(uid))
        .single();

      if (existingTag && existingTag.attendee_id && existingTag.attendee_id !== excludeAttendeeId) {
        const attendee = existingTag.attendee as any;
        return {
          isValid: false,
          message: `Already assigned to ${attendee?.first_name} ${attendee?.last_name}`
        };
      }

      return { isValid: true, message: '' };
    } catch (error) {
      return { isValid: true, message: '' }; // If no existing record, it's available
    }
  }

  // Assign RFID to attendee
  async assignRfidToAttendee(attendeeId: string, uid: string): Promise<RfidAssignmentResult> {
    try {
      // Validate UID first
      const validation = await this.validateRfidUid(uid, attendeeId);
      if (!validation.isValid) {
        return { success: false, message: validation.message };
      }

      // Deactivate any existing active RFID for this attendee
      const { data: existingRfid } = await supabase
        .from('rfid_tags')
        .select('uid')
        .eq('event_id', getCurrentEventId())
        .eq('attendee_id', attendeeId)
        .in('status', ['assigned', 'active'])
        .single();

      if (existingRfid) {
        await supabase
          .from('rfid_tags')
          .update({
            status: 'replaced',
            deactivated_at: new Date().toISOString(),
            reason: 'Replaced with new credential'
          })
          .eq('uid', existingRfid.uid);
      }

      // Check if the UID already exists in the system
      const { data: tagExists } = await supabase
        .from('rfid_tags')
        .select('uid')
        .eq('event_id', getCurrentEventId())
        .eq('uid', normalizeCredential(uid))
        .single();

      if (!tagExists) {
        // Create new credential
        const { data, error } = await supabase
          .from('rfid_tags')
          .insert({
            uid: normalizeCredential(uid),
            attendee_id: attendeeId,
        status: 'assigned',
            issued_at: new Date().toISOString(),
            credential_type: inferCredentialType(uid)
          })
          .select()
          .single();

        if (error) throw error;
      } else {
        // Update existing tag
        const { data, error } = await supabase
          .from('rfid_tags')
          .update({
            attendee_id: attendeeId,
            status: 'assigned',
            issued_at: new Date().toISOString(),
            deactivated_at: null,
            reason: null
          })
          .eq('uid', normalizeCredential(uid))
          .select()
          .single();

        if (error) throw error;
      }

      // Log the assignment transaction
      const { error: transactionError } = await supabase
        .from('station_transactions')
        .insert({
          attendee_id: attendeeId,
          rfid_uid: normalizeCredential(uid),
          station_type: 'activation',
          transaction_type: 'activate',
          current_status: 'active',
          extra_data: {
            assignment_method: 'manual',
            previous_rfid: existingRfid?.uid || null
          }
        });

      if (transactionError) {
        console.error('Transaction logging error:', transactionError);
      }

      return {
        success: true,
        message: 'Credential assigned successfully'
      };
    } catch (error) {
      console.error('Error assigning RFID:', error);
      return {
        success: false,
        message: 'Failed to assign credential. Please try again.'
      };
    }
  }

  // Deactivate RFID
  async deactivateRfid(uid: string, reason: string = 'Manual deactivation'): Promise<RfidAssignmentResult> {
    try {
      const { data: rfidTag } = await supabase
        .from('rfid_tags')
        .select('attendee_id')
        .eq('event_id', getCurrentEventId())
        .eq('uid', normalizeCredential(uid))
        .single();

      if (!rfidTag) {
        return { success: false, message: 'credential not found' };
      }

      // Update RFID status
      await supabase
        .from('rfid_tags')
        .update({
          status: 'deactivated',
          deactivated_at: new Date().toISOString(),
          reason: reason
        })
        .eq('uid', normalizeCredential(uid));

      // Log deactivation transaction
      if (rfidTag.attendee_id) {
        const { error: transactionError } = await supabase
          .from('station_transactions')
          .insert({
            attendee_id: rfidTag.attendee_id,
            rfid_uid: normalizeCredential(uid),
            station_type: 'activation',
            transaction_type: 'deactivate',
            current_status: 'inactive',
            extra_data: {
              deactivation_method: 'manual',
              reason: reason
            }
          });
        
        if (transactionError) {
          console.error('Transaction logging error:', transactionError);
        }
      }

      return {
        success: true,
        message: 'Credential deactivated successfully'
      };
    } catch (error) {
      console.error('Error deactivating RFID:', error);
      return {
        success: false,
        message: 'Failed to deactivate credential. Please try again.'
      };
    }
  }

  // Get attendee's current RFID
  async getAttendeeRfid(attendeeId: string): Promise<RfidTag | null> {
    try {
      const { data, error } = await supabase
        .from('rfid_tags')
        .select('*')
        .eq('event_id', getCurrentEventId())
        .eq('attendee_id', attendeeId)
        .in('status', ['assigned', 'active'])
        .single();

      if (error) return null;
      return data;
    } catch (error) {
      console.error('Error getting attendee RFID:', error);
      return null;
    }
  }

  // Record station transaction
  async recordTransaction(
    attendeeId: string,
    rfidUid: string,
    stationType: 'activation' | 'meal' | 'drinks' | 'headphones',
    transactionType: 'activate' | 'deactivate' | 'meal_breakfast' | 'meal_lunch' | 'meal_dinner' | 'drink' | 'headphone_checkout' | 'headphone_checkin',
    extraData?: any
  ) {
    try {
      const { error } = await supabase
        .from('station_transactions')
        .insert({
          attendee_id: attendeeId,
          rfid_uid: rfidUid,
          station_type: stationType,
          transaction_type: transactionType,
          current_status: 'active',
          extra_data: extraData || {}
        });
      
      if (error) {
        console.error('Error recording transaction:', error);
      }
    } catch (error) {
      console.error('Error recording transaction:', error);
    }
  }
  // Enhanced method to check if attendee is both assigned and activated
  async checkAttendeeReadiness(attendeeId: string): Promise<{ isReady: boolean; message: string; hasAssignment: boolean; hasActivation: boolean }> {
    try {
      // Use the database function for consistent validation
      const { data, error } = await supabase
        .rpc('check_station_access', { p_attendee_id: attendeeId });

      if (error) {
        console.error('Error checking station access:', error);
        return {
          isReady: false,
          message: "Error validating station access",
          hasAssignment: false,
          hasActivation: false
        };
      }

      const accessRecord = data?.[0];
      if (!accessRecord) {
        return {
          isReady: false,
          message: "No access information available",
          hasAssignment: false,
          hasActivation: false
        };
      }

      // DB returns rfid_status: 'none' | 'unissued' | 'assigned' | 'active' ...
      // and activation_status: 'active' | 'inactive' | 'unknown'
      const hasAssignment = !!accessRecord.rfid_status &&
        !['none', 'unissued'].includes(accessRecord.rfid_status);
      const hasActivation = accessRecord.activation_status === 'active';

      return {
        isReady: accessRecord.has_access,
        message: accessRecord.access_reason,
        hasAssignment,
        hasActivation
      };
    } catch (error) {
      console.error('Error checking attendee readiness:', error);
      return {
        isReady: false,
        message: "Error checking attendee status",
        hasAssignment: false,
        hasActivation: false
      };
    }
  }

  // Legacy method for backwards compatibility - now uses standardized validation
  async checkAttendeeReadinessLegacy(attendeeId: string): Promise<{ isReady: boolean; message: string; hasAssignment: boolean; hasActivation: boolean }> {
    try {
      // Check if attendee has an assigned RFID
      const { data: rfidTag } = await supabase
        .from('rfid_tags')
        .select('uid, status')
        .eq('event_id', getCurrentEventId())
        .eq('attendee_id', attendeeId)
        .in('status', ['assigned', 'active'])
        .single();

      const hasAssignment = !!rfidTag;

      if (!hasAssignment) {
        return {
          isReady: false,
          message: "No wristband assigned to this attendee",
          hasAssignment: false,
          hasActivation: false
        };
      }

      // Check if attendee has been activated
      const { data: activationTransaction } = await supabase
        .from('station_transactions')
        .select('transaction_type, created_at')
        .eq('event_id', getCurrentEventId())
        .eq('attendee_id', attendeeId)
        .eq('station_type', 'activation')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      const hasActivation = activationTransaction?.transaction_type === 'activate';

      if (!hasActivation) {
        return {
          isReady: false,
          message: "Wristband assigned but not activated - activation required for station services",
          hasAssignment: true,
          hasActivation: false
        };
      }

      return {
        isReady: true,
        message: "Attendee is ready for station services",
        hasAssignment: true,
        hasActivation: true
      };
    } catch (error) {
      console.error('Error checking attendee readiness:', error);
      return {
        isReady: false,
        message: "Error checking attendee status",
        hasAssignment: false,
        hasActivation: false
      };
    }
  }
}

export const rfidService = new RfidService();