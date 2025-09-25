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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          id: string
          name: string
          notes: string | null
          participant_count: number | null
          recorded_at: string
          staff_id: string | null
        }
        Insert: {
          id?: string
          name: string
          notes?: string | null
          participant_count?: number | null
          recorded_at?: string
          staff_id?: string | null
        }
        Update: {
          id?: string
          name?: string
          notes?: string | null
          participant_count?: number | null
          recorded_at?: string
          staff_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activities_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["user_id"]
          },
        ]
      }
      admin_tasks: {
        Row: {
          actual_hours: number | null
          assigned_to: string | null
          category: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          estimated_hours: number | null
          id: string
          metadata: Json | null
          priority: string | null
          status: string | null
          tags: Json | null
          task_type: string
          title: string
          updated_at: string
        }
        Insert: {
          actual_hours?: number | null
          assigned_to?: string | null
          category?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          metadata?: Json | null
          priority?: string | null
          status?: string | null
          tags?: Json | null
          task_type: string
          title: string
          updated_at?: string
        }
        Update: {
          actual_hours?: number | null
          assigned_to?: string | null
          category?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          metadata?: Json | null
          priority?: string | null
          status?: string | null
          tags?: Json | null
          task_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      attendees: {
        Row: {
          activated_at: string | null
          additional_guests: Json | null
          arrival_window: string | null
          city: string | null
          country: string | null
          created_at: string
          custom_fields: Json | null
          date_of_birth: string | null
          dietary_restrictions: string | null
          early_access: boolean | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          first_name: string
          gender: string | null
          how_did_you_hear: string | null
          id: string
          is_veteran: boolean | null
          last_name: string
          marital_status: string | null
          meal_plan: string | null
          military_branch: string | null
          notes: string | null
          order_id: string | null
          override_early_checkin: boolean | null
          phone: string | null
          postal_code: string | null
          regfox_id: string | null
          registration_status: Database["public"]["Enums"]["registration_status"]
          site_location_assignment: string | null
          special_accommodations: string | null
          state: string | null
          street_address: string | null
          t_shirt_size: string | null
          ticket_type: Database["public"]["Enums"]["ticket_type"]
          updated_at: string
          veteran_thanked_at: string | null
          waiver_signed: boolean | null
        }
        Insert: {
          activated_at?: string | null
          additional_guests?: Json | null
          arrival_window?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          custom_fields?: Json | null
          date_of_birth?: string | null
          dietary_restrictions?: string | null
          early_access?: boolean | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          first_name: string
          gender?: string | null
          how_did_you_hear?: string | null
          id?: string
          is_veteran?: boolean | null
          last_name: string
          marital_status?: string | null
          meal_plan?: string | null
          military_branch?: string | null
          notes?: string | null
          order_id?: string | null
          override_early_checkin?: boolean | null
          phone?: string | null
          postal_code?: string | null
          regfox_id?: string | null
          registration_status?: Database["public"]["Enums"]["registration_status"]
          site_location_assignment?: string | null
          special_accommodations?: string | null
          state?: string | null
          street_address?: string | null
          t_shirt_size?: string | null
          ticket_type?: Database["public"]["Enums"]["ticket_type"]
          updated_at?: string
          veteran_thanked_at?: string | null
          waiver_signed?: boolean | null
        }
        Update: {
          activated_at?: string | null
          additional_guests?: Json | null
          arrival_window?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          custom_fields?: Json | null
          date_of_birth?: string | null
          dietary_restrictions?: string | null
          early_access?: boolean | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          first_name?: string
          gender?: string | null
          how_did_you_hear?: string | null
          id?: string
          is_veteran?: boolean | null
          last_name?: string
          marital_status?: string | null
          meal_plan?: string | null
          military_branch?: string | null
          notes?: string | null
          order_id?: string | null
          override_early_checkin?: boolean | null
          phone?: string | null
          postal_code?: string | null
          regfox_id?: string | null
          registration_status?: Database["public"]["Enums"]["registration_status"]
          site_location_assignment?: string | null
          special_accommodations?: string | null
          state?: string | null
          street_address?: string | null
          t_shirt_size?: string | null
          ticket_type?: Database["public"]["Enums"]["ticket_type"]
          updated_at?: string
          veteran_thanked_at?: string | null
          waiver_signed?: boolean | null
        }
        Relationships: []
      }
      regfox_sync_log: {
        Row: {
          cancelled_at: string | null
          cancelled_by: string | null
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
          cancelled_by?: string | null
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
          cancelled_by?: string | null
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
          activated_at: string | null
          activation_method: string | null
          attendee_id: string | null
          deactivated_at: string | null
          issued_at: string | null
          reason: string | null
          status: Database["public"]["Enums"]["tag_status"]
          uid: string
        }
        Insert: {
          activated_at?: string | null
          activation_method?: string | null
          attendee_id?: string | null
          deactivated_at?: string | null
          issued_at?: string | null
          reason?: string | null
          status?: Database["public"]["Enums"]["tag_status"]
          uid: string
        }
        Update: {
          activated_at?: string | null
          activation_method?: string | null
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
        Relationships: []
      }
      sync_locks: {
        Row: {
          expires_at: string
          id: string
          lock_type: string
          locked_at: string
          locked_by: string | null
          metadata: Json | null
        }
        Insert: {
          expires_at: string
          id?: string
          lock_type: string
          locked_at?: string
          locked_by?: string | null
          metadata?: Json | null
        }
        Update: {
          expires_at?: string
          id?: string
          lock_type?: string
          locked_at?: string
          locked_by?: string | null
          metadata?: Json | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      acquire_sync_lock: {
        Args: { p_sync_id: string; p_timeout_minutes?: number }
        Returns: string
      }
      activate_entire_order_by_phone: {
        Args: { p_activation_method?: string; p_phone: string }
        Returns: {
          activated_count: number
          already_active_count: number
          attendee_details: Json[]
          order_id: string
          total_attendees: number
          warnings: string[]
        }[]
      }
      activate_group_by_phone: {
        Args: { p_activation_method?: string; p_phone: string }
        Returns: {
          activated_count: number
          already_active_count: number
          attendee_details: Json[]
          order_id: string
          total_attendees: number
          warnings: string[]
        }[]
      }
      activate_remaining_rfids_by_phone: {
        Args: { p_activation_method?: string; p_phone: string }
        Returns: {
          activated_count: number
          already_active_count: number
          attendee_details: Json[]
          order_id: string
          total_attendees: number
          warnings: string[]
        }[]
      }
      authenticate_staff_code: {
        Args: { p_code: string }
        Returns: {
          display_name: string
          staff_id: string
          staff_role: Database["public"]["Enums"]["staff_role"]
        }[]
      }
      bulk_generate_mock_rfids: {
        Args: { p_limit?: number }
        Returns: {
          attendee_id: string
          attendee_name: string
          generated_uid: string
        }[]
      }
      can_start_sync: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      cleanup_abandoned_records: {
        Args: Record<PropertyKey, never>
        Returns: {
          cleanup_details: Json
          cleanup_successful: boolean
          records_removed: number
          rfids_cleared: number
          transactions_updated: number
        }[]
      }
      cleanup_all_status_duplicates: {
        Args: Record<PropertyKey, never>
        Returns: {
          cleanup_details: Json
          cleanup_successful: boolean
          duplicates_removed: number
          errors_encountered: string[]
          total_records_after: number
          total_records_before: number
        }[]
      }
      cleanup_expired_locks: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_generated_rfids: {
        Args: { p_format?: string }
        Returns: {
          cleared_attendee_ids: string[]
          deleted_count: number
        }[]
      }
      cleanup_mock_rfids: {
        Args: Record<PropertyKey, never>
        Returns: {
          cleared_attendee_ids: string[]
          deleted_count: number
        }[]
      }
      cleanup_stuck_syncs: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      cleanup_test_rfid_data: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      extract_site_location_assignment: {
        Args: { custom_fields_data: Json }
        Returns: string
      }
      generate_mock_rfid_uid: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_test_rfid_batch: {
        Args: { count_requested?: number }
        Returns: {
          sequence_number: number
          test_uid: string
        }[]
      }
      get_daily_transaction_count: {
        Args: {
          p_attendee_id: string
          p_station_type: Database["public"]["Enums"]["station_type"]
          p_transaction_types: Database["public"]["Enums"]["transaction_type"][]
        }
        Returns: number
      }
      is_alphanumeric_regfox_id: {
        Args: { order_id_value: string }
        Returns: boolean
      }
      lookup_attendees_by_phone: {
        Args: { p_phone: string }
        Returns: {
          attendee_count: number
          attendee_details: Json[]
          has_group_order: boolean
          order_companions: Json[]
          order_id: string
        }[]
      }
      normalize_phone: {
        Args: { phone_input: string }
        Returns: string
      }
      release_sync_lock: {
        Args: { p_sync_id: string }
        Returns: boolean
      }
      safe_cleanup_duplicates: {
        Args: Record<PropertyKey, never>
        Returns: {
          cleanup_details: Json
          cleanup_successful: boolean
          duplicates_removed: number
          errors_encountered: string[]
          total_records_after: number
          total_records_before: number
        }[]
      }
      update_group_early_access: {
        Args: Record<PropertyKey, never>
        Returns: {
          attendees_updated: number
          orders_updated: number
          updated_orders: string[]
        }[]
      }
      update_group_meal_plans: {
        Args: Record<PropertyKey, never>
        Returns: {
          attendees_updated: number
          orders_updated: number
          updated_orders: string[]
        }[]
      }
      upsert_attendee_safe: {
        Args: { p_data: Json; p_regfox_id: string }
        Returns: string
      }
    }
    Enums: {
      registration_status:
        | "registered"
        | "cancelled"
        | "pending"
        | "refunded"
        | "waitlisted"
        | "abandoned"
        | "transferred"
        | "incomplete"
        | "draft"
      scan_action: "entry" | "exit" | "verify"
      scan_result: "allow" | "deny"
      staff_role: "admin" | "checkin" | "ranger" | "vendor"
      station_type:
        | "activation"
        | "meal"
        | "drinks"
        | "headphones"
        | "golf_carts"
        | "walkie_talkies"
        | "fanny_packs"
        | "main_gate"
        | "tshirts"
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
        | "meal_fri_lunch"
        | "meal_fri_dinner"
        | "meal_sat_breakfast"
        | "meal_sat_lunch"
        | "meal_sat_dinner"
        | "meal_sun_breakfast"
        | "golf_cart_checkout"
        | "golf_cart_checkin"
        | "walkie_talkie_checkout"
        | "walkie_talkie_checkin"
        | "fanny_pack_checkout"
        | "fanny_pack_checkin"
        | "gate_entry"
        | "gate_exit"
        | "tshirt_pickup"
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
      registration_status: [
        "registered",
        "cancelled",
        "pending",
        "refunded",
        "waitlisted",
        "abandoned",
        "transferred",
        "incomplete",
        "draft",
      ],
      scan_action: ["entry", "exit", "verify"],
      scan_result: ["allow", "deny"],
      staff_role: ["admin", "checkin", "ranger", "vendor"],
      station_type: [
        "activation",
        "meal",
        "drinks",
        "headphones",
        "golf_carts",
        "walkie_talkies",
        "fanny_packs",
        "main_gate",
        "tshirts",
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
        "meal_fri_lunch",
        "meal_fri_dinner",
        "meal_sat_breakfast",
        "meal_sat_lunch",
        "meal_sat_dinner",
        "meal_sun_breakfast",
        "golf_cart_checkout",
        "golf_cart_checkin",
        "walkie_talkie_checkout",
        "walkie_talkie_checkin",
        "fanny_pack_checkout",
        "fanny_pack_checkin",
        "gate_entry",
        "gate_exit",
        "tshirt_pickup",
      ],
    },
  },
} as const
