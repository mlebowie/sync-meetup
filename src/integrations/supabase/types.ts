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
      event_scrape_runs: {
        Row: {
          created_at: string
          error_details: string | null
          events_upserted: number
          finished_at: string | null
          id: string
          lease_until: string | null
          paused_reason: string | null
          source_counts: Json
          started_at: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          error_details?: string | null
          events_upserted?: number
          finished_at?: string | null
          id?: string
          lease_until?: string | null
          paused_reason?: string | null
          source_counts?: Json
          started_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          error_details?: string | null
          events_upserted?: number
          finished_at?: string | null
          id?: string
          lease_until?: string | null
          paused_reason?: string | null
          source_counts?: Json
          started_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          activity_level: string | null
          attendee_count: number | null
          capacity: number | null
          category: string | null
          classified: boolean
          created_at: string
          description: string | null
          ends_at: string | null
          group_size: string | null
          id: string
          image_url: string | null
          intensity: string | null
          last_seen_at: string
          lat: number | null
          lgbtq_friendly: boolean
          lng: number | null
          location: string | null
          organizer_name: string | null
          organizer_url: string | null
          pet_friendly: boolean
          price_label: string | null
          recurrence: string
          review_status: string
          reviewed_at: string | null
          reviewed_by: string | null
          series_key: string | null
          source: string
          source_event_id: string
          source_url: string
          starts_at: string
          tags: string[]
          time_label: string | null
          title: string
          updated_at: string
          venue_name: string | null
          women_only: boolean
        }
        Insert: {
          activity_level?: string | null
          attendee_count?: number | null
          capacity?: number | null
          category?: string | null
          classified?: boolean
          created_at?: string
          description?: string | null
          ends_at?: string | null
          group_size?: string | null
          id?: string
          image_url?: string | null
          intensity?: string | null
          last_seen_at?: string
          lat?: number | null
          lgbtq_friendly?: boolean
          lng?: number | null
          location?: string | null
          organizer_name?: string | null
          organizer_url?: string | null
          pet_friendly?: boolean
          price_label?: string | null
          recurrence?: string
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          series_key?: string | null
          source: string
          source_event_id: string
          source_url: string
          starts_at: string
          tags?: string[]
          time_label?: string | null
          title: string
          updated_at?: string
          venue_name?: string | null
          women_only?: boolean
        }
        Update: {
          activity_level?: string | null
          attendee_count?: number | null
          capacity?: number | null
          category?: string | null
          classified?: boolean
          created_at?: string
          description?: string | null
          ends_at?: string | null
          group_size?: string | null
          id?: string
          image_url?: string | null
          intensity?: string | null
          last_seen_at?: string
          lat?: number | null
          lgbtq_friendly?: boolean
          lng?: number | null
          location?: string | null
          organizer_name?: string | null
          organizer_url?: string | null
          pet_friendly?: boolean
          price_label?: string | null
          recurrence?: string
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          series_key?: string | null
          source?: string
          source_event_id?: string
          source_url?: string
          starts_at?: string
          tags?: string[]
          time_label?: string | null
          title?: string
          updated_at?: string
          venue_name?: string | null
          women_only?: boolean
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
