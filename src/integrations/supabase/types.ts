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
          tags: string[] | null
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
          tags?: string[] | null
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
          tags?: string[] | null
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
          arrival_day: string | null
          arrival_window: string | null
          checked_in_at: string | null
          city: string | null
          country: string | null
          created_at: string
          custom_fields: Json | null
          date_of_birth: string | null
          deactivated_at: string | null
          dietary_restrictions: string | null
          early_access: boolean | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          event_id: string | null
          first_name: string
          gender: string | null
          id: string
          is_veteran: boolean | null
          last_name: string
          last_synced_at: string | null
          marital_status: string | null
          meal_plan: Database["public"]["Enums"]["meal_plan"] | null
          most_recent_activation_at: string | null
          most_recent_activation_method: string | null
          notes: string | null
          order_id: string | null
          phone: string | null
          postal_code: string | null
          priority: string | null
          regfox_id: string | null
          regfox_order_id: string | null
          regfox_registration_id: string | null
          registration_status:
            | Database["public"]["Enums"]["registration_status"]
            | null
          site_location_assignment:
            | Database["public"]["Enums"]["site_location"]
            | null
          special_accommodations: string | null
          state: string | null
          status: string | null
          street_address: string | null
          sync_hash: string | null
          t_shirt_size: string | null
          ticket_type: Database["public"]["Enums"]["ticket_type"]
          updated_at: string
          veteran_thanked_at: string | null
          waiver_signed: boolean | null
        }
        Insert: {
          activated_at?: string | null
          additional_guests?: Json | null
          arrival_day?: string | null
          arrival_window?: string | null
          checked_in_at?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          custom_fields?: Json | null
          date_of_birth?: string | null
          deactivated_at?: string | null
          dietary_restrictions?: string | null
          early_access?: boolean | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          event_id?: string | null
          first_name: string
          gender?: string | null
          id?: string
          is_veteran?: boolean | null
          last_name: string
          last_synced_at?: string | null
          marital_status?: string | null
          meal_plan?: Database["public"]["Enums"]["meal_plan"] | null
          most_recent_activation_at?: string | null
          most_recent_activation_method?: string | null
          notes?: string | null
          order_id?: string | null
          phone?: string | null
          postal_code?: string | null
          priority?: string | null
          regfox_id?: string | null
          regfox_order_id?: string | null
          regfox_registration_id?: string | null
          registration_status?:
            | Database["public"]["Enums"]["registration_status"]
            | null
          site_location_assignment?:
            | Database["public"]["Enums"]["site_location"]
            | null
          special_accommodations?: string | null
          state?: string | null
          status?: string | null
          street_address?: string | null
          sync_hash?: string | null
          t_shirt_size?: string | null
          ticket_type?: Database["public"]["Enums"]["ticket_type"]
          updated_at?: string
          veteran_thanked_at?: string | null
          waiver_signed?: boolean | null
        }
        Update: {
          activated_at?: string | null
          additional_guests?: Json | null
          arrival_day?: string | null
          arrival_window?: string | null
          checked_in_at?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          custom_fields?: Json | null
          date_of_birth?: string | null
          deactivated_at?: string | null
          dietary_restrictions?: string | null
          early_access?: boolean | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          event_id?: string | null
          first_name?: string
          gender?: string | null
          id?: string
          is_veteran?: boolean | null
          last_name?: string
          last_synced_at?: string | null
          marital_status?: string | null
          meal_plan?: Database["public"]["Enums"]["meal_plan"] | null
          most_recent_activation_at?: string | null
          most_recent_activation_method?: string | null
          notes?: string | null
          order_id?: string | null
          phone?: string | null
          postal_code?: string | null
          priority?: string | null
          regfox_id?: string | null
          regfox_order_id?: string | null
          regfox_registration_id?: string | null
          registration_status?:
            | Database["public"]["Enums"]["registration_status"]
            | null
          site_location_assignment?:
            | Database["public"]["Enums"]["site_location"]
            | null
          special_accommodations?: string | null
          state?: string | null
          status?: string | null
          street_address?: string | null
          sync_hash?: string | null
          t_shirt_size?: string | null
          ticket_type?: Database["public"]["Enums"]["ticket_type"]
          updated_at?: string
          veteran_thanked_at?: string | null
          waiver_signed?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "attendees_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          ends_at: string | null
          id: string
          is_active: boolean
          name: string
          regfox_form_id: string | null
          starts_at: string | null
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          ends_at?: string | null
          id?: string
          is_active?: boolean
          name: string
          regfox_form_id?: string | null
          starts_at?: string | null
          updated_at?: string
          year: number
        }
        Update: {
          created_at?: string
          ends_at?: string | null
          id?: string
          is_active?: boolean
          name?: string
          regfox_form_id?: string | null
          starts_at?: string | null
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      regfox_sync_log: {
        Row: {
          cancelled_at: string | null
          created_at: string
          error_message: string | null
          event_id: string | null
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
          updated_at: string
          updated_records: number | null
        }
        Insert: {
          cancelled_at?: string | null
          created_at?: string
          error_message?: string | null
          event_id?: string | null
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
          updated_at?: string
          updated_records?: number | null
        }
        Update: {
          cancelled_at?: string | null
          created_at?: string
          error_message?: string | null
          event_id?: string | null
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
          updated_at?: string
          updated_records?: number | null
        }
        Relationships: []
      }
      rfid_tags: {
        Row: {
          activated_at: string | null
          activation_method: string | null
          attendee_id: string | null
          credential_type: string
          deactivated_at: string | null
          event_id: string | null
          issued_at: string | null
          reason: string | null
          status: Database["public"]["Enums"]["tag_status"]
          uid: string
        }
        Insert: {
          activated_at?: string | null
          activation_method?: string | null
          attendee_id?: string | null
          credential_type?: string
          deactivated_at?: string | null
          event_id?: string | null
          issued_at?: string | null
          reason?: string | null
          status?: Database["public"]["Enums"]["tag_status"]
          uid: string
        }
        Update: {
          activated_at?: string | null
          activation_method?: string | null
          attendee_id?: string | null
          credential_type?: string
          deactivated_at?: string | null
          event_id?: string | null
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
          {
            foreignKeyName: "rfid_tags_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      scans: {
        Row: {
          action: Database["public"]["Enums"]["scan_action"]
          device_id: string | null
          event_id: string | null
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
          event_id?: string | null
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
          event_id?: string | null
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
            foreignKeyName: "scans_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
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
          event_id: string | null
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
          event_id?: string | null
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
          event_id?: string | null
          id?: string
          issue_type?: string
          phone_number?: string | null
          priority?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_assistance_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      station_transactions: {
        Row: {
          activation_method: string | null
          attendee_id: string
          created_at: string
          current_status: string | null
          daily_count: number | null
          event_id: string | null
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
          event_id?: string | null
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
          event_id?: string | null
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
          {
            foreignKeyName: "station_transactions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      waiver_signatures: {
        Row: {
          agreement_version: string
          attendee_id: string
          created_at: string
          event_id: string | null
          id: string
          name_match: boolean | null
          signed_at: string
          signed_by_self: boolean
          typed_name: string
          updated_at: string
          user_agent: string | null
          witnessed_by: string | null
        }
        Insert: {
          agreement_version?: string
          attendee_id: string
          created_at?: string
          event_id?: string | null
          id?: string
          name_match?: boolean | null
          signed_at?: string
          signed_by_self?: boolean
          typed_name: string
          updated_at?: string
          user_agent?: string | null
          witnessed_by?: string | null
        }
        Update: {
          agreement_version?: string
          attendee_id?: string
          created_at?: string
          event_id?: string | null
          id?: string
          name_match?: boolean | null
          signed_at?: string
          signed_by_self?: boolean
          typed_name?: string
          updated_at?: string
          user_agent?: string | null
          witnessed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "waiver_signatures_attendee_id_fkey"
            columns: ["attendee_id"]
            isOneToOne: false
            referencedRelation: "attendees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiver_signatures_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      activate_entire_order_by_phone: {
        Args: { p_activation_method: string; p_phone: string }
        Returns: {
          activated_count: number
          already_active_count: number
          attendee_details: Json
          order_id: string
          total_attendees: number
          warnings: string[]
        }[]
      }
      activate_group_by_phone: {
        Args: { p_activation_method: string; p_phone: string }
        Returns: {
          activated_count: number
          already_active_count: number
          attendee_details: Json
          order_id: string
          total_attendees: number
          warnings: string[]
        }[]
      }
      activate_remaining_rfids_by_phone: {
        Args: { p_activation_method: string; p_phone: string }
        Returns: {
          activated_count: number
          already_active_count: number
          attendee_details: Json
          order_id: string
          total_attendees: number
          warnings: string[]
        }[]
      }
      attendees_for_phone: {
        Args: { p_event_id?: string; p_phone: string }
        Returns: {
          first_name: string
          id: string
          is_direct: boolean
          last_name: string
          order_id: string
          phone: string
          waiver_signed: boolean
        }[]
      }
      authenticate_staff_code: {
        Args: { p_code: string }
        Returns: {
          display_name: string
          staff_id: string
        }[]
      }
      bulk_activate_assigned_rfids: {
        Args: never
        Returns: {
          activated_attendees: Json
          activated_count: number
          activation_successful: boolean
          details: Json
          failed_count: number
          total_activated: number
          veterans_thanked: number
        }[]
      }
      can_start_sync: { Args: never; Returns: boolean }
      check_station_access: {
        Args: { p_attendee_id: string }
        Returns: {
          access_reason: string
          activation_status: string
          has_access: boolean
          rfid_status: string
        }[]
      }
      cleanup_abandoned_records: {
        Args: never
        Returns: {
          cleanup_details: Json
          cleanup_successful: boolean
          records_removed: number
          rfids_cleared: number
        }[]
      }
      cleanup_generated_rfids: {
        Args: never
        Returns: {
          deleted_count: number
        }[]
      }
      cleanup_stuck_syncs: { Args: never; Returns: number }
      current_event_id: { Args: never; Returns: string }
      format_phone_number: {
        Args: { p_format: string }
        Returns: {
          formatted_phone: string
        }[]
      }
      lookup_attendees_by_phone: {
        Args: { p_phone: string }
        Returns: {
          attendee_count: number
          attendee_details: Json
          has_group_order: boolean
          order_companions: Json
          order_id: string
        }[]
      }
      normalize_phone_digits: { Args: { p_phone: string }; Returns: string }
      release_sync_lock: { Args: { p_sync_id?: string }; Returns: number }
    }
    Enums: {
      meal_plan: "standard" | "premium" | "none"
      registration_status:
        | "registered"
        | "pending"
        | "cancelled"
        | "abandoned"
        | "walk_up"
        | "transferred"
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
        | "activation"
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
        | "tshirt_pickup"
        | "rfid_assign"
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
      registration_status: [
        "registered",
        "pending",
        "cancelled",
        "abandoned",
        "walk_up",
        "transferred",
      ],
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
        "activation",
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
        "tshirt_pickup",
        "rfid_assign",
      ],
    },
  },
} as const
