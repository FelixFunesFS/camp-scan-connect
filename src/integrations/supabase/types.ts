export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      attendees: {
        Row: {
          activated_at: string | null
          arrival_day: string | null
          arrival_window: string | null
          checked_in_at: string | null
          city: string | null
          created_at: string
          deactivated_at: string | null
          email: string | null
          first_name: string
          id: string
          is_veteran: boolean | null
          last_name: string
          meal_plan: Database["public"]["Enums"]["meal_plan"] | null
          most_recent_activation_at: string | null
          most_recent_activation_method: string | null
          notes: string | null
          order_id: string | null
          phone: string | null
          regfox_id: string | null
          registration_status:
            | Database["public"]["Enums"]["registration_status"]
            | null
          site_location_assignment:
            | Database["public"]["Enums"]["site_location"]
            | null
          special_accommodations: string | null
          state: string | null
          ticket_type: Database["public"]["Enums"]["ticket_type"]
          updated_at: string
          waiver_signed: boolean | null
        }
        Insert: {
          activated_at?: string | null
          arrival_day?: string | null
          arrival_window?: string | null
          checked_in_at?: string | null
          city?: string | null
          created_at?: string
          deactivated_at?: string | null
          email?: string | null
          first_name: string
          id?: string
          is_veteran?: boolean | null
          last_name: string
          meal_plan?: Database["public"]["Enums"]["meal_plan"] | null
          most_recent_activation_at?: string | null
          most_recent_activation_method?: string | null
          notes?: string | null
          order_id?: string | null
          phone?: string | null
          regfox_id?: string | null
          registration_status?:
            | Database["public"]["Enums"]["registration_status"]
            | null
          site_location_assignment?:
            | Database["public"]["Enums"]["site_location"]
            | null
          special_accommodations?: string | null
          state?: string | null
          ticket_type?: Database["public"]["Enums"]["ticket_type"]
          updated_at?: string
          waiver_signed?: boolean | null
        }
        Update: {
          activated_at?: string | null
          arrival_day?: string | null
          arrival_window?: string | null
          checked_in_at?: string | null
          city?: string | null
          created_at?: string
          deactivated_at?: string | null
          email?: string | null
          first_name?: string
          id?: string
          is_veteran?: boolean | null
          last_name?: string
          meal_plan?: Database["public"]["Enums"]["meal_plan"] | null
          most_recent_activation_at?: string | null
          most_recent_activation_method?: string | null
          notes?: string | null
          order_id?: string | null
          phone?: string | null
          regfox_id?: string | null
          registration_status?:
            | Database["public"]["Enums"]["registration_status"]
            | null
          site_location_assignment?:
            | Database["public"]["Enums"]["site_location"]
            | null
          special_accommodations?: string | null
          state?: string | null
          ticket_type?: Database["public"]["Enums"]["ticket_type"]
          updated_at?: string
          waiver_signed?: boolean | null
        }
        Relationships: []
      }
      regfox_sync_log: {
        Row: {
          cancelled_at: string | null
          created_at: string
          error_message: string | null
          heartbeat_at: string | null
          id: string
          new_records: number | null
          progress_info: Json | null
          status: string
          sync_completed_at: string | null
          sync_started_at: string
          sync_timeout_minutes: number | null
          sync_type: string
          total_records: number | null
          updated_records: number | null
        }
        Insert: {
          cancelled_at?: string | null
          created_at?: string
          error_message?: string | null
          heartbeat_at?: string | null
          id?: string
          new_records?: number | null
          progress_info?: Json | null
          status: string
          sync_completed_at?: string | null
          sync_started_at?: string
          sync_timeout_minutes?: number | null
          sync_type: string
          total_records?: number | null
          updated_records?: number | null
        }
        Update: {
          cancelled_at?: string | null
          created_at?: string
          error_message?: string | null
          heartbeat_at?: string | null
          id?: string
          new_records?: number | null
          progress_info?: Json | null
          status?: string
          sync_completed_at?: string | null
          sync_started_at?: string
          sync_timeout_minutes?: number | null
          sync_type?: string
          total_records?: number | null
          updated_records?: number | null
        }
        Relationships: []
      }
      rfid_tags: {
        Row: {
          attendee_id: string | null
          deactivated_at: string | null
          issued_at: string | null
          reason: string | null
          status: Database["public"]["Enums"]["tag_status"]
          uid: string
        }
        Insert: {
          attendee_id?: string | null
          deactivated_at?: string | null
          issued_at?: string | null
          reason?: string | null
          status?: Database["public"]["Enums"]["tag_status"]
          uid: string
        }
        Update: {
          attendee_id?: string | null
          deactivated_at?: string | null
          issued_at?: string | null
          reason?: string | null
          status?: Database["public"]["Enums"]["tag_status"]
          uid?: string
        }
        Relationships: [
          {
            foreignKeyName: "rfid_tags_attendee_id_fkey"
            columns: ["attendee_id"]
            isOneToOne: false
            referencedRelation: "attendees"
            referencedColumns: ["id"]
          },
        ]
      }
      scans: {
        Row: {
          action: Database["public"]["Enums"]["scan_action"]
          device_id: string | null
          extra: Json | null
          id: number
          location: string
          reason: string | null
          result: Database["public"]["Enums"]["scan_result"]
          rfid_uid: string | null
          scanned_at: string
          staff_id: string | null
        }
        Insert: {
          action?: Database["public"]["Enums"]["scan_action"]
          device_id?: string | null
          extra?: Json | null
          id?: number
          location: string
          reason?: string | null
          result: Database["public"]["Enums"]["scan_result"]
          rfid_uid?: string | null
          scanned_at?: string
          staff_id?: string | null
        }
        Update: {
          action?: Database["public"]["Enums"]["scan_action"]
          device_id?: string | null
          extra?: Json | null
          id?: number
          location?: string
          reason?: string | null
          result?: Database["public"]["Enums"]["scan_result"]
          rfid_uid?: string | null
          scanned_at?: string
          staff_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scans_rfid_uid_fkey"
            columns: ["rfid_uid"]
            isOneToOne: false
            referencedRelation: "rfid_tags"
            referencedColumns: ["uid"]
          },
        ]
      }
      staff: {
        Row: {
          created_at: string
          display_name: string
          role: Database["public"]["Enums"]["staff_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name: string
          role?: Database["public"]["Enums"]["staff_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string
          role?: Database["public"]["Enums"]["staff_role"]
          user_id?: string
        }
        Relationships: []
      }
      staff_assistance_requests: {
        Row: {
          assigned_staff_id: string | null
          attendee_name: string | null
          contact_info: Json | null
          created_at: string
          email: string | null
          error_message: string | null
          id: string
          issue_type: string
          phone_number: string | null
          priority: string | null
          resolution_notes: string | null
          resolved_at: string | null
          status: string | null
        }
        Insert: {
          assigned_staff_id?: string | null
          attendee_name?: string | null
          contact_info?: Json | null
          created_at?: string
          email?: string | null
          error_message?: string | null
          id?: string
          issue_type: string
          phone_number?: string | null
          priority?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          status?: string | null
        }
        Update: {
          assigned_staff_id?: string | null
          attendee_name?: string | null
          contact_info?: Json | null
          created_at?: string
          email?: string | null
          error_message?: string | null
          id?: string
          issue_type?: string
          phone_number?: string | null
          priority?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          status?: string | null
        }
        Relationships: []
      }
      station_transactions: {
        Row: {
          activation_method: string | null
          attendee_id: string
          created_at: string
          current_status: string | null
          daily_count: number | null
          extra_data: Json | null
          id: string
          rfid_uid: string | null
          staff_id: string | null
          station_type: Database["public"]["Enums"]["station_type"]
          transaction_type: Database["public"]["Enums"]["transaction_type"]
        }
        Insert: {
          activation_method?: string | null
          attendee_id: string
          created_at?: string
          current_status?: string | null
          daily_count?: number | null
          extra_data?: Json | null
          id?: string
          rfid_uid?: string | null
          staff_id?: string | null
          station_type: Database["public"]["Enums"]["station_type"]
          transaction_type: Database["public"]["Enums"]["transaction_type"]
        }
        Update: {
          activation_method?: string | null
          attendee_id?: string
          created_at?: string
          current_status?: string | null
          daily_count?: number | null
          extra_data?: Json | null
          id?: string
          rfid_uid?: string | null
          staff_id?: string | null
          station_type?: Database["public"]["Enums"]["station_type"]
          transaction_type?: Database["public"]["Enums"]["transaction_type"]
        }
        Relationships: [
          {
            foreignKeyName: "station_transactions_attendee_id_fkey"
            columns: ["attendee_id"]
            isOneToOne: false
            referencedRelation: "attendees"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      meal_plan: "standard" | "premium" | "none"
      registration_status: "registered" | "pending" | "cancelled" | "abandoned"
      scan_action: "entry" | "exit" | "verify"
      scan_result: "allow" | "deny"
      site_location: "dry_site" | "glamping" | "cabin" | "rv_site"
      staff_role: "admin" | "checkin" | "ranger" | "vendor"
      station_type:
        | "main_gate"
        | "check_in"
        | "meal"
        | "drinks"
        | "headphones"
        | "t_shirts"
        | "fanny_packs"
        | "walkie_talkies"
        | "golf_carts"
        | "rfid_assignment"
      tag_status:
        | "unissued"
        | "assigned"
        | "active"
        | "lost"
        | "replaced"
        | "deactivated"
      ticket_type:
        | "premium_power"
        | "dry_site"
        | "day_pass"
        | "staff"
        | "vendor"
        | "glamping"
        | "cabin"
        | "rv_site"
      transaction_type:
        | "activate"
        | "deactivate"
        | "meal_breakfast"
        | "meal_lunch"
        | "meal_dinner"
        | "drink"
        | "headphone_checkout"
        | "headphone_checkin"
        | "golf_cart_checkout"
        | "golf_cart_checkin"
        | "walkie_talkie_checkout"
        | "walkie_talkie_checkin"
        | "fanny_pack_checkout"
        | "fanny_pack_checkin"
        | "meal_sat_breakfast"
        | "meal_sun_breakfast"
        | "meal_fri_lunch"
        | "meal_sat_lunch"
        | "meal_fri_dinner"
        | "meal_sat_dinner"
        | "gate_entry"
        | "gate_exit"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      meal_plan: ["standard", "premium", "none"],
      registration_status: ["registered", "pending", "cancelled", "abandoned"],
      scan_action: ["entry", "exit", "verify"],
      scan_result: ["allow", "deny"],
      site_location: ["dry_site", "glamping", "cabin", "rv_site"],
      staff_role: ["admin", "checkin", "ranger", "vendor"],
      station_type: [
        "main_gate",
        "check_in",
        "meal",
        "drinks",
        "headphones",
        "t_shirts",
        "fanny_packs",
        "walkie_talkies",
        "golf_carts",
        "rfid_assignment",
      ],
      tag_status: [
        "unissued",
        "assigned",
        "active",
        "lost",
        "replaced",
        "deactivated",
      ],
      ticket_type: [
        "premium_power",
        "dry_site",
        "day_pass",
        "staff",
        "vendor",
        "glamping",
        "cabin",
        "rv_site",
      ],
      transaction_type: [
        "activate",
        "deactivate",
        "meal_breakfast",
        "meal_lunch",
        "meal_dinner",
        "drink",
        "headphone_checkout",
        "headphone_checkin",
        "golf_cart_checkout",
        "golf_cart_checkin",
        "walkie_talkie_checkout",
        "walkie_talkie_checkin",
        "fanny_pack_checkout",
        "fanny_pack_checkin",
        "meal_sat_breakfast",
        "meal_sun_breakfast",
        "meal_fri_lunch",
        "meal_sat_lunch",
        "meal_fri_dinner",
        "meal_sat_dinner",
        "gate_entry",
        "gate_exit",
      ],
    },
  },
} as const
