// Simple attendee types for the remaining components
export interface EnhancedAttendee {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  regfox_id?: string;
  order_id?: string;
  ticket_type: string;
  meal_plan?: string;
  waiver_signed?: boolean;
  activated_at?: string | null;
  rfid_uid?: string | null;
  rfid_status?: string | null;
  site_location_assignment?: string | null;
  tshirt_orders?: Array<{
    id: string;
    style: string;
    size: string;
    quantity: number;
    isPickedUp: boolean;
    pickupTime?: string;
  }>;
  tshirt_summary?: {
    totalOrders: number;
    totalPickedUp: number;
    hasAnyTShirt: boolean;
  };
}

export interface GroupedAttendee {
  orderId: string | null;
  attendees: EnhancedAttendee[];
}

export type NotificationState = 'idle' | 'processing' | 'success' | 'warning' | 'error';

export interface FlexibleAttendeeData {
  id?: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  order_id?: string;
  ticket_type?: string;
  meal_plan?: string;
  arrival_window?: string;
  waiver_signed?: boolean;
  activated_at?: string | null;
  rfid_uid?: string | null;
  rfid_status?: string | null;
  site_location_assignment?: string | null;
  is_activated?: boolean;
  has_rfid?: boolean;
  is_veteran?: boolean;
  veteran_thanked_at?: string | null;
}