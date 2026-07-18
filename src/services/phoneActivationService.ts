import { supabase } from "@/integrations/supabase/client";

export interface GroupActivationResult {
  order_id: string;
  total_attendees: number;
  activated_count: number;
  already_active_count: number;
  attendee_details: any[];
  warnings?: string[];
}

export interface PhoneLookupResult {
  attendee_count: number;
  has_group_order: boolean;
  order_id: string | null;
  attendee_details: any[];
  order_companions: any[];
}

export class PhoneActivationService {
  static normalizePhone(phone: string): string {
    // Remove all non-digit characters and return last 10 digits
    const digits = phone.replace(/[^0-9]/g, '');
    return digits.slice(-10);
  }

  static validatePhone(phone: string): { isValid: boolean; error?: string } {
    const normalized = this.normalizePhone(phone);
    
    if (!phone.trim()) {
      return { isValid: false, error: "Phone number is required" };
    }
    
    if (normalized.length < 10) {
      return { isValid: false, error: "Phone number must be 10 digits" };
    }
    
    if (normalized.length > 10) {
      return { isValid: false, error: "Phone number cannot exceed 10 digits" };
    }
    
    // Basic US phone number validation
    if (normalized.startsWith('0') || normalized.startsWith('1')) {
      return { isValid: false, error: "Invalid phone number format" };
    }
    
    return { isValid: true };
  }

  static formatPhoneForLookup(phone: string): string[] {
    const normalized = this.normalizePhone(phone);
    // Return multiple formats to handle edge cases
    return [
      normalized,                    // 5551234567
      `1${normalized}`,             // 15551234567 (with country code)
      `+1${normalized}`,            // +15551234567
    ];
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

      return data.length > 0 ? (data[0] as any) : null;
    } catch (error) {
      console.error('Phone activation error:', error);
      throw error;
    }
  }

  static async activateEntireOrderByPhone(
    phone: string,
    activationMethod: 'self_activated' | 'staff_assisted' = 'self_activated'
  ): Promise<GroupActivationResult | null> {
    try {
      const { data, error } = await supabase.rpc('activate_entire_order_by_phone', {
        p_phone: phone,
        p_activation_method: activationMethod
      });

      if (error) {
        console.error('Error activating entire order:', error);
        throw new Error(`Failed to activate entire order: ${error.message}`);
      }

      return data.length > 0 ? (data[0] as any) : null;
    } catch (error) {
      console.error('Order activation error:', error);
      throw error;
    }
  }

  static async lookupPhonePreview(phone: string): Promise<PhoneLookupResult | null> {
    const validation = this.validatePhone(phone);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    const phoneFormats = this.formatPhoneForLookup(phone);
    
    // Try each phone format until we find a match
    for (const phoneFormat of phoneFormats) {
      try {
        const { data, error } = await supabase.rpc('lookup_attendees_by_phone', {
          p_phone: phoneFormat
        });

        if (error) {
          console.warn(`Lookup failed for format ${phoneFormat}:`, error);
          continue;
        }

        if (data && data.length > 0 && data[0].attendee_count > 0) {
          return data[0] as any;
        }
      } catch (error) {
        console.warn(`Phone lookup error for format ${phoneFormat}:`, error);
        continue;
      }
    }

    return null;
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

  static async activateRemainingRfidsByPhone(
    phone: string,
    activationMethod: 'self_activated' | 'staff_assisted' = 'self_activated'
  ): Promise<GroupActivationResult | null> {
    try {
      const { data, error } = await supabase.rpc('activate_remaining_rfids_by_phone', {
        p_phone: phone,
        p_activation_method: activationMethod
      });

      if (error) {
        console.error('Error activating remaining RFIDs:', error);
        throw new Error(`Failed to activate remaining RFIDs: ${error.message}`);
      }

      return data.length > 0 ? (data[0] as any) : null;
    } catch (error) {
      console.error('Remaining RFID activation error:', error);
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