export interface RfidTag {
  uid: string;
  attendee_id: string | null;
  attendee?: {
    first_name: string;
    last_name: string;
    ticket_type: string;
    is_veteran?: boolean;
  };
}

export interface AttendeeReadiness {
  isReady: boolean;
  message: string;
}

export type StationType = 'meal' | 'drinks' | 'headphones' | 'activation';
export type TransactionType = 'activate' | 'deactivate' | 'meal_breakfast' | 'meal_lunch' | 'meal_dinner' | 'meal_fri_lunch' | 'meal_fri_dinner' | 'meal_sat_breakfast' | 'meal_sat_lunch' | 'meal_sat_dinner' | 'meal_sun_breakfast' | 'drink' | 'headphone_checkout' | 'headphone_checkin';

export interface StationTransaction {
  attendee_id: string;
  station_type: StationType;
  transaction_type: TransactionType;
  rfid_uid?: string;
  daily_count?: number;
  current_status?: string;
  extra_data?: Record<string, any>;
}