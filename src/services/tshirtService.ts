import { supabase } from "@/integrations/supabase/client";

export interface TShirtInfo {
  size: string | null;
  type: string | null;
  hasAnyTShirt: boolean;
  purchaseDetails: Array<{
    product: string;
    size: string;
    type: string;
  }>;
}

export interface TShirtPickupData {
  id: string;
  attendeeName: string;
  phone: string | null;
  tshirtSize: string | null;
  tshirtType: string | null;
  pickedUp: boolean;
  pickupTime: string | null;
  rfidUid: string;
}

export interface TShirtStats {
  totalOrdered: number;
  pickedUp: number;
  remaining: number;
  sizeBreakdown: Record<string, { ordered: number; pickedUp: number; remaining: number }>;
}

export class TShirtService {
  static extractTShirtInfo(customFields: any): TShirtInfo {
    if (!customFields || typeof customFields !== 'object') {
      return {
        size: null,
        type: null,
        hasAnyTShirt: false,
        purchaseDetails: []
      };
    }

    const purchaseDetails: Array<{ product: string; size: string; type: string }> = [];
    let primarySize: string | null = null;
    let primaryType: string | null = null;

    // Look through all fields for t-shirt purchases
    Object.entries(customFields).forEach(([key, value]) => {
      if (typeof key === 'string' && key.toLowerCase().includes('t-shirt') && value) {
        const product = key;
        const { size, type } = this.parseTShirtProduct(product);
        
        if (size) {
          purchaseDetails.push({ product, size, type });
          if (!primarySize) {
            primarySize = size;
            primaryType = type;
          }
        }
      }
    });

    return {
      size: primarySize,
      type: primaryType,
      hasAnyTShirt: purchaseDetails.length > 0,
      purchaseDetails
    };
  }

  private static parseTShirtProduct(productName: string): { size: string; type: string } {
    const normalized = productName.toLowerCase();
    
    // Determine type
    let type = 'Unisex'; // default
    if (normalized.includes("women's") || normalized.includes('fitted')) {
      type = "Women's";
    } else if (normalized.includes("men's")) {
      type = "Men's";
    }

    // Extract size - look for size patterns
    const sizePatterns = [
      /\b(small|sm|s)\b/i,
      /\b(medium|med|m)\b/i,
      /\b(large|lg|l)\b/i,
      /\b(x-large|xl|extra large)\b/i,
      /\b(2x|2xl|xx-large|xxl)\b/i,
      /\b(3x|3xl|xxx-large|xxxl)\b/i,
      /\b(4x|4xl|xxxx-large|xxxxl)\b/i,
    ];

    const sizeMap: Record<string, string> = {
      'small': 'S', 'sm': 'S', 's': 'S',
      'medium': 'M', 'med': 'M', 'm': 'M',
      'large': 'L', 'lg': 'L', 'l': 'L',
      'x-large': 'XL', 'xl': 'XL', 'extra large': 'XL',
      '2x': '2X', '2xl': '2X', 'xx-large': '2X', 'xxl': '2X',
      '3x': '3X', '3xl': '3X', 'xxx-large': '3X', 'xxxl': '3X',
      '4x': '4X', '4xl': '4X', 'xxxx-large': '4X', 'xxxxl': '4X'
    };

    for (const pattern of sizePatterns) {
      const match = normalized.match(pattern);
      if (match) {
        const matchedSize = match[1].toLowerCase();
        return { size: sizeMap[matchedSize] || matchedSize.toUpperCase(), type };
      }
    }

    return { size: '', type };
  }

  static async getTShirtPickupData(): Promise<{ pickups: TShirtPickupData[]; stats: TShirtStats }> {
    try {
      // Get all attendees with their RFID tags and pickup transactions
      const { data: attendees } = await supabase
        .from('attendees')
        .select(`
          id,
          first_name,
          last_name,
          phone,
          t_shirt_size,
          custom_fields,
          rfid_tags!inner(uid, status)
        `)
        .eq('registration_status', 'registered')
        .in('rfid_tags.status', ['assigned', 'active']);

      if (!attendees) return { pickups: [], stats: this.getEmptyStats() };

      // Get t-shirt pickup transactions
      const { data: transactions } = await supabase
        .from('station_transactions')
        .select('attendee_id, created_at, rfid_uid')
        .eq('station_type', 'tshirts')
        .eq('transaction_type', 'tshirt_pickup');

      const pickupMap = new Map<string, string>();
      transactions?.forEach(t => {
        pickupMap.set(t.attendee_id, t.created_at);
      });

      const pickups: TShirtPickupData[] = [];
      const sizeBreakdown: Record<string, { ordered: number; pickedUp: number; remaining: number }> = {};

      attendees.forEach(attendee => {
        const tshirtInfo = this.extractTShirtInfo(attendee.custom_fields);
        
        if (tshirtInfo.hasAnyTShirt) {
          const size = attendee.t_shirt_size || tshirtInfo.size || 'Unknown';
          const type = tshirtInfo.type || 'Unisex';
          const isPickedUp = pickupMap.has(attendee.id);
          const pickupTime = pickupMap.get(attendee.id) || null;

          pickups.push({
            id: attendee.id,
            attendeeName: `${attendee.first_name} ${attendee.last_name}`,
            phone: attendee.phone,
            tshirtSize: size,
            tshirtType: type,
            pickedUp: isPickedUp,
            pickupTime,
            rfidUid: attendee.rfid_tags[0]?.uid || 'Unknown'
          });

          // Update size breakdown
          if (!sizeBreakdown[size]) {
            sizeBreakdown[size] = { ordered: 0, pickedUp: 0, remaining: 0 };
          }
          sizeBreakdown[size].ordered++;
          if (isPickedUp) {
            sizeBreakdown[size].pickedUp++;
          } else {
            sizeBreakdown[size].remaining++;
          }
        }
      });

      const stats: TShirtStats = {
        totalOrdered: pickups.length,
        pickedUp: pickups.filter(p => p.pickedUp).length,
        remaining: pickups.filter(p => !p.pickedUp).length,
        sizeBreakdown
      };

      return { pickups, stats };
    } catch (error) {
      console.error('Error fetching t-shirt data:', error);
      return { pickups: [], stats: this.getEmptyStats() };
    }
  }

  private static getEmptyStats(): TShirtStats {
    return {
      totalOrdered: 0,
      pickedUp: 0,
      remaining: 0,
      sizeBreakdown: {}
    };
  }

  static async checkAttendeeHasTShirt(attendeeId: string): Promise<{ hasTShirt: boolean; size: string | null; type: string | null }> {
    try {
      const { data: attendee } = await supabase
        .from('attendees')
        .select('custom_fields, t_shirt_size')
        .eq('id', attendeeId)
        .single();

      if (!attendee) {
        return { hasTShirt: false, size: null, type: null };
      }

      const tshirtInfo = this.extractTShirtInfo(attendee.custom_fields);
      return {
        hasTShirt: tshirtInfo.hasAnyTShirt,
        size: attendee.t_shirt_size || tshirtInfo.size,
        type: tshirtInfo.type
      };
    } catch (error) {
      console.error('Error checking t-shirt info:', error);
      return { hasTShirt: false, size: null, type: null };
    }
  }
}