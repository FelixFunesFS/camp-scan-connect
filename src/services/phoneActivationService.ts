import { supabase } from "@/integrations/supabase/client";

export interface GroupActivationResult {
  order_id: string;
  total_attendees: number;
  activated_count: number;
  already_active_count: number;
  attendee_details: any[];
}

export interface PhoneLookupResult {
  attendee_count: number;
  has_group_order: boolean;
  order_id: string | null;
  attendee_details: any[];
}

export class PhoneActivationService {
  static normalizePhone(phone: string): string {
    // Remove all non-digit characters and return last 10 digits
    const digits = phone.replace(/[^0-9]/g, '');
    return digits.slice(-10);
  }

  static async activateGroupByPhone(
    phone: string,
    activationMethod: 'self_activated' | 'staff_assisted' = 'self_activated'
  ): Promise<GroupActivationResult | null> {
    try {
      const { data, error } = await supabase.rpc('activate_group_by_phone', {
        p_phone: phone,
        p_activation_method: activationMethod
      });

      if (error) {
        console.error('Error activating group:', error);
        throw new Error(`Failed to activate group: ${error.message}`);
      }

      return data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error('Phone activation error:', error);
      throw error;
    }
  }

  static async lookupPhonePreview(phone: string): Promise<PhoneLookupResult | null> {
    try {
      const { data, error } = await supabase.rpc('lookup_attendees_by_phone', {
        p_phone: phone
      });

      if (error) {
        console.error('Error looking up phone preview:', error);
        throw new Error(`Failed to lookup phone: ${error.message}`);
      }

      return data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error('Phone preview lookup error:', error);
      throw error;
    }
  }

  static async lookupPhoneNumber(phone: string) {
    const normalizedPhone = this.normalizePhone(phone);
    
    try {
      const { data, error } = await supabase
        .from('attendees')
        .select(`
          id,
          first_name,
          last_name,
          order_id,
          activated_at,
          rfid_tags!inner(uid, status, activated_at)
        `)
        .ilike('phone', `%${normalizedPhone}`)
        .eq('rfid_tags.status', 'active');

      if (error) {
        console.error('Error looking up phone number:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Phone lookup error:', error);
      throw error;
    }
  }

  static async deactivateAllRfids(reason?: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('rfid_tags')
        .update({ 
          status: 'deactivated',
          deactivated_at: new Date().toISOString(),
          reason: reason || 'Sunday mass deactivation'
        })
        .eq('status', 'active')
        .select('id');

      if (error) {
        console.error('Error deactivating RFIDs:', error);
        throw error;
      }

      return data?.length || 0;
    } catch (error) {
      console.error('Mass deactivation error:', error);
      throw error;
    }
  }
}

export const phoneActivationService = new PhoneActivationService();