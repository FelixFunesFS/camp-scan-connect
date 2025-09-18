import { supabase } from "@/integrations/supabase/client";
import { PhoneActivationService, PhoneLookupResult, GroupActivationResult } from "./phoneActivationService";

export interface UnifiedSearchResult {
  searchType: 'phone' | 'name' | 'email' | 'order_id';
  attendee_count: number;
  has_group_order: boolean;
  order_id: string | null;
  attendee_details: any[];
  order_companions: any[];
  primary_phone?: string;
}

export class EnhancedActivationService {
  /**
   * Calculate overall status based on activation and RFID assignment
   */
  private static calculateOverallStatus(isActivated: boolean, hasRfid: boolean): string {
    if (isActivated) return 'activated';
    if (hasRfid) return 'assigned';
    return 'unassigned';
  }

  /**
   * Detect the type of search query
   */
  static detectSearchType(query: string): 'phone' | 'email' | 'order_id' | 'name' {
    const trimmed = query.trim();
    
    // Phone detection: contains only digits, dashes, parentheses, spaces, or + sign
    if (/^[\d\s\-\(\)\+\.]+$/.test(trimmed) && trimmed.replace(/\D/g, '').length >= 10) {
      return 'phone';
    }
    
    // Email detection: contains @ symbol
    if (trimmed.includes('@')) {
      return 'email';
    }
    
    // Order ID detection: starts with # or matches order ID patterns (6+ chars with specific formats)
    if (trimmed.startsWith('#') || 
        (trimmed.length >= 6 && /^[A-Z0-9]{6,}(-[A-Z0-9]+)*$/i.test(trimmed)) ||
        (trimmed.length >= 8 && /^[0-9A-F]{8,}$/i.test(trimmed))) {
      return 'order_id';
    }
    
    // Default to name search
    return 'name';
  }

  /**
   * Unified search that handles all search types and provides group context
   */
  static async unifiedSearch(query: string): Promise<UnifiedSearchResult | null> {
    const searchType = this.detectSearchType(query);
    
    try {
      switch (searchType) {
        case 'phone':
          return await this.searchByPhone(query);
        case 'email':
          return await this.searchByEmail(query);
        case 'order_id':
          return await this.searchByOrderId(query);
        case 'name':
          return await this.searchByName(query);
        default:
          return null;
      }
    } catch (error) {
      console.error('Unified search error:', error);
      throw error;
    }
  }

  /**
   * Search by phone number (uses existing phone service)
   */
  static async searchByPhone(phone: string): Promise<UnifiedSearchResult | null> {
    const phoneLookup = await PhoneActivationService.lookupPhonePreview(phone);
    
    if (!phoneLookup) return null;

    return {
      searchType: 'phone',
      attendee_count: phoneLookup.attendee_count,
      has_group_order: phoneLookup.has_group_order,
      order_id: phoneLookup.order_id,
      attendee_details: phoneLookup.attendee_details,
      order_companions: phoneLookup.order_companions,
      primary_phone: phone
    };
  }

  /**
   * Search by email and provide group context
   */
  static async searchByEmail(email: string): Promise<UnifiedSearchResult | null> {
    try {
      // Find attendees with matching email (partial match)
      const { data: attendeesData, error: attendeesError } = await supabase
        .from('attendees')
        .select('*')
        .ilike('email', `%${email.trim()}%`);

      if (attendeesError) throw attendeesError;
      if (!attendeesData || attendeesData.length === 0) return null;

      // Get RFID data for these attendees
      const attendeeIds = attendeesData.map(a => a.id);
      const { data: rfidData } = await supabase
        .from('rfid_tags')
        .select('*')
        .in('attendee_id', attendeeIds);

      // Process attendees with RFID data
      const attendeeDetails = attendeesData.map(attendee => {
        const rfidTag = rfidData?.find(tag => tag.attendee_id === attendee.id);
        const isActivated = !!attendee.activated_at;
        const hasRfid = !!rfidTag?.uid;
        return {
          id: attendee.id,
          name: `${attendee.first_name} ${attendee.last_name}`,
          order_id: attendee.order_id,
          meal_plan: attendee.meal_plan,
          rfid_uid: rfidTag?.uid,
          activated_at: attendee.activated_at,
          rfid_activated_at: rfidTag?.activated_at,
          rfid_status: rfidTag?.status,
          is_activated: isActivated,
          has_rfid: hasRfid,
          overall_status: this.calculateOverallStatus(isActivated, hasRfid)
        };
      });

      // Find order companions if any attendee has an order_id
      let orderCompanions: any[] = [];
      let hasGroupOrder = false;
      let primaryOrderId: string | null = null;

      const ordersWithAttendees = attendeesData.filter(a => a.order_id).map(a => a.order_id);
      if (ordersWithAttendees.length > 0) {
        const uniqueOrderId = ordersWithAttendees[0]; // Take first order for simplicity
        primaryOrderId = uniqueOrderId;

        // Find other attendees in the same order
        const { data: companionData } = await supabase
          .from('attendees')
          .select('*')
          .eq('order_id', uniqueOrderId)
          .not('email', 'ilike', email.trim());

        if (companionData && companionData.length > 0) {
          hasGroupOrder = true;
          
          // Get RFID data for companions
          const companionIds = companionData.map(c => c.id);
          const { data: companionRfidData } = await supabase
            .from('rfid_tags')
            .select('*')
            .in('attendee_id', companionIds);

          orderCompanions = companionData.map(companion => {
            const rfidTag = companionRfidData?.find(tag => tag.attendee_id === companion.id);
            const isActivated = !!companion.activated_at;
            const hasRfid = !!rfidTag?.uid;
            return {
              id: companion.id,
              name: `${companion.first_name} ${companion.last_name}`,
              order_id: companion.order_id,
              phone: companion.phone,
              meal_plan: companion.meal_plan,
              rfid_uid: rfidTag?.uid,
              activated_at: companion.activated_at,
              rfid_activated_at: rfidTag?.activated_at,
              rfid_status: rfidTag?.status,
              is_activated: isActivated,
              has_rfid: hasRfid,
              overall_status: this.calculateOverallStatus(isActivated, hasRfid)
            };
          });
        }
      }

      return {
        searchType: 'email',
        attendee_count: attendeesData.length,
        has_group_order: hasGroupOrder,
        order_id: primaryOrderId,
        attendee_details: attendeeDetails,
        order_companions: orderCompanions
      };

    } catch (error) {
      console.error('Email search error:', error);
      throw error;
    }
  }

  /**
   * Search by order ID and provide full order context
   */
  static async searchByOrderId(orderId: string): Promise<UnifiedSearchResult | null> {
    try {
      const cleanOrderId = orderId.replace(/^#/, '').trim();
      
      // Find all attendees in this order
      const { data: attendeesData, error: attendeesError } = await supabase
        .from('attendees')
        .select('*')
        .eq('order_id', cleanOrderId);

      if (attendeesError) throw attendeesError;
      if (!attendeesData || attendeesData.length === 0) return null;

      // Get RFID data for all attendees in the order
      const attendeeIds = attendeesData.map(a => a.id);
      const { data: rfidData } = await supabase
        .from('rfid_tags')
        .select('*')
        .in('attendee_id', attendeeIds);

      // Process all attendees as "details" since they're all in the same order
      const attendeeDetails = attendeesData.map(attendee => {
        const rfidTag = rfidData?.find(tag => tag.attendee_id === attendee.id);
        const isActivated = !!attendee.activated_at;
        const hasRfid = !!rfidTag?.uid;
        return {
          id: attendee.id,
          name: `${attendee.first_name} ${attendee.last_name}`,
          order_id: attendee.order_id,
          phone: attendee.phone,
          meal_plan: attendee.meal_plan,
          rfid_uid: rfidTag?.uid,
          activated_at: attendee.activated_at,
          rfid_activated_at: rfidTag?.activated_at,
          rfid_status: rfidTag?.status,
          is_activated: isActivated,
          has_rfid: hasRfid,
          overall_status: this.calculateOverallStatus(isActivated, hasRfid)
        };
      });

      return {
        searchType: 'order_id',
        attendee_count: attendeesData.length,
        has_group_order: attendeesData.length > 1,
        order_id: cleanOrderId,
        attendee_details: attendeeDetails,
        order_companions: [] // All are in attendee_details for order search
      };

    } catch (error) {
      console.error('Order ID search error:', error);
      throw error;
    }
  }

  /**
   * Search by name and provide group context
   */
  static async searchByName(name: string): Promise<UnifiedSearchResult | null> {
    try {
      const searchTerm = name.trim();
      
      // Find attendees matching first or last name
      const { data: attendeesData, error: attendeesError } = await supabase
        .from('attendees')
        .select('*')
        .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%`);

      if (attendeesError) throw attendeesError;
      if (!attendeesData || attendeesData.length === 0) return null;

      // Get RFID data for these attendees
      const attendeeIds = attendeesData.map(a => a.id);
      const { data: rfidData } = await supabase
        .from('rfid_tags')
        .select('*')
        .in('attendee_id', attendeeIds);

      // Process attendees with RFID data
      const attendeeDetails = attendeesData.map(attendee => {
        const rfidTag = rfidData?.find(tag => tag.attendee_id === attendee.id);
        const isActivated = !!attendee.activated_at;
        const hasRfid = !!rfidTag?.uid;
        return {
          id: attendee.id,
          name: `${attendee.first_name} ${attendee.last_name}`,
          order_id: attendee.order_id,
          phone: attendee.phone,
          meal_plan: attendee.meal_plan,
          rfid_uid: rfidTag?.uid,
          activated_at: attendee.activated_at,
          rfid_activated_at: rfidTag?.activated_at,
          rfid_status: rfidTag?.status,
          is_activated: isActivated,
          has_rfid: hasRfid,
          overall_status: this.calculateOverallStatus(isActivated, hasRfid)
        };
      });

      // Find order companions if any attendee has an order_id
      let orderCompanions: any[] = [];
      let hasGroupOrder = false;
      let primaryOrderId: string | null = null;

      const ordersWithAttendees = attendeesData.filter(a => a.order_id).map(a => a.order_id);
      if (ordersWithAttendees.length > 0) {
        const uniqueOrderIds = [...new Set(ordersWithAttendees)];
        
        // For simplicity, take the first order ID
        primaryOrderId = uniqueOrderIds[0];

        // Find other attendees in the same orders who don't match the name search
        const companionQuery = supabase
          .from('attendees')
          .select('*')
          .in('order_id', uniqueOrderIds);

        // Apply NOT condition for name search  
        const { data: companionData } = await companionQuery
          .not('first_name', 'ilike', `%${searchTerm}%`)
          .not('last_name', 'ilike', `%${searchTerm}%`);

        if (companionData && companionData.length > 0) {
          hasGroupOrder = true;
          
          // Get RFID data for companions
          const companionIds = companionData.map(c => c.id);
          const { data: companionRfidData } = await supabase
            .from('rfid_tags')
            .select('*')
            .in('attendee_id', companionIds);

          orderCompanions = companionData.map(companion => {
            const rfidTag = companionRfidData?.find(tag => tag.attendee_id === companion.id);
            const isActivated = !!companion.activated_at;
            const hasRfid = !!rfidTag?.uid;
            return {
              id: companion.id,
              name: `${companion.first_name} ${companion.last_name}`,
              order_id: companion.order_id,
              phone: companion.phone,
              meal_plan: companion.meal_plan,
              rfid_uid: rfidTag?.uid,
              activated_at: companion.activated_at,
              rfid_activated_at: rfidTag?.activated_at,
              rfid_status: rfidTag?.status,
              is_activated: isActivated,
              has_rfid: hasRfid,
              overall_status: this.calculateOverallStatus(isActivated, hasRfid)
            };
          });
        }
      }

      return {
        searchType: 'name',
        attendee_count: attendeesData.length,
        has_group_order: hasGroupOrder,
        order_id: primaryOrderId,
        attendee_details: attendeeDetails,
        order_companions: orderCompanions
      };

    } catch (error) {
      console.error('Name search error:', error);
      throw error;
    }
  }

  /**
   * Activate individual attendee by ID (staff-assisted)
   */
  static async activateIndividual(
    attendeeId: string,
    staffId?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Get attendee and RFID data
      const { data: attendee } = await supabase
        .from('attendees')
        .select('*')
        .eq('id', attendeeId)
        .single();

      if (!attendee) {
        return { success: false, message: 'Attendee not found' };
      }

      const { data: rfidTag } = await supabase
        .from('rfid_tags')
        .select('*')
        .eq('attendee_id', attendeeId)
        .single();

      if (!rfidTag) {
        return { success: false, message: 'RFID tag not assigned to this attendee' };
      }

      // Activate RFID tag
      const { error: rfidError } = await supabase
        .from('rfid_tags')
        .update({
          status: 'active',
          activated_at: new Date().toISOString(),
          activation_method: 'staff_assisted'
        })
        .eq('attendee_id', attendeeId);

      if (rfidError) throw rfidError;

      // Update attendee activation
      const { error: attendeeError } = await supabase
        .from('attendees')
        .update({
          activated_at: new Date().toISOString()
        })
        .eq('id', attendeeId);

      if (attendeeError) throw attendeeError;

      // Create audit trail
      await supabase
        .from('station_transactions')
        .insert({
          attendee_id: attendeeId,
          station_type: 'activation',
          transaction_type: 'activate',
          rfid_uid: rfidTag.uid,
          activation_method: 'staff_assisted',
          staff_id: staffId,
          extra_data: {
            activation_source: 'staff_individual',
            staff_id: staffId
          }
        });

      return { 
        success: true, 
        message: `${attendee.first_name} ${attendee.last_name} activated successfully` 
      };

    } catch (error) {
      console.error('Individual activation error:', error);
      return { success: false, message: 'Activation failed' };
    }
  }

  /**
   * Activate search results group (staff-assisted)
   */
  static async activateSearchGroup(
    searchResult: UnifiedSearchResult,
    staffId?: string
  ): Promise<GroupActivationResult> {
    try {
      if (searchResult.searchType === 'phone' && searchResult.primary_phone) {
        // Use phone activation service for phone searches
        return await PhoneActivationService.activateGroupByPhone(
          searchResult.primary_phone,
          'staff_assisted'
        ) || this.createEmptyResult();
      }

      // For non-phone searches, activate all attendees in the search results
      const attendeesToActivate = searchResult.attendee_details.filter(a => 
        a.has_rfid && !a.is_activated
      );

      let activatedCount = 0;
      const attendeeResults = [];

      for (const attendee of attendeesToActivate) {
        const result = await this.activateIndividual(attendee.id, staffId);
        if (result.success) {
          activatedCount++;
        }
        attendeeResults.push({
          ...attendee,
          activation_result: result
        });
      }

      return {
        order_id: searchResult.order_id || 'MULTIPLE',
        total_attendees: searchResult.attendee_count,
        activated_count: activatedCount,
        already_active_count: searchResult.attendee_details.filter(a => a.is_activated).length,
        attendee_details: attendeeResults,
        warnings: searchResult.attendee_details
          .filter(a => !a.has_rfid)
          .map(a => `ℹ️ ${a.name} needs RFID assignment to use services`)
      };

    } catch (error) {
      console.error('Group activation error:', error);
      throw error;
    }
  }

  /**
   * Activate entire order (staff-assisted)
   */
  static async activateEntireOrder(
    searchResult: UnifiedSearchResult,
    staffId?: string
  ): Promise<GroupActivationResult> {
    try {
      if (searchResult.searchType === 'phone' && searchResult.primary_phone) {
        // Use phone activation service for phone searches
        return await PhoneActivationService.activateEntireOrderByPhone(
          searchResult.primary_phone,
          'staff_assisted'
        ) || this.createEmptyResult();
      }

      // For non-phone searches, activate all attendees including companions
      const allAttendees = [...searchResult.attendee_details, ...searchResult.order_companions];
      const attendeesToActivate = allAttendees.filter(a => a.has_rfid && !a.is_activated);

      let activatedCount = 0;
      const attendeeResults = [];

      for (const attendee of attendeesToActivate) {
        const result = await this.activateIndividual(attendee.id, staffId);
        if (result.success) {
          activatedCount++;
        }
        attendeeResults.push({
          ...attendee,
          activation_result: result
        });
      }

      return {
        order_id: searchResult.order_id || 'MULTIPLE',
        total_attendees: allAttendees.length,
        activated_count: activatedCount,
        already_active_count: allAttendees.filter(a => a.is_activated).length,
        attendee_details: attendeeResults,
        warnings: allAttendees
          .filter(a => !a.has_rfid)
          .map(a => `ℹ️ ${a.name} needs RFID assignment to use services`)
      };

    } catch (error) {
      console.error('Order activation error:', error);
      throw error;
    }
  }

  private static createEmptyResult(): GroupActivationResult {
    return {
      order_id: '',
      total_attendees: 0,
      activated_count: 0,
      already_active_count: 0,
      attendee_details: [],
      warnings: []
    };
  }
}

export const enhancedActivationService = new EnhancedActivationService();