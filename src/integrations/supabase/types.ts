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
      criteria: {
        Row: {
          created_at: string
          display_order: number | null
          id: string
          max_score: number
          name: string
          options: Json | null
          track_id: string | null
          type: string
          weightage: number | null
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          id?: string
          max_score: number
          name: string
          options?: Json | null
          track_id?: string | null
          type?: string
          weightage?: number | null
        }
        Update: {
          created_at?: string
          display_order?: number | null
          id?: string
          max_score?: number
          name?: string
          options?: Json | null
          track_id?: string | null
          type?: string
          weightage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "criteria_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      judge_assignments: {
        Row: {
          created_at: string
          id: string
          judge_id: string
          room_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          judge_id: string
          room_id: string
        }
        Update: {
          created_at?: string
          id?: string
          judge_id?: string
          room_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "judge_assignments_judge_id_fkey"
            columns: ["judge_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "judge_assignments_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      judge_audit_logs: {
        Row: {
          action: string
          details: Json | null
          entity: string | null
          entity_id: string | null
          id: string
          judge_id: string
          timestamp: string | null
        }
        Insert: {
          action: string
          details?: Json | null
          entity?: string | null
          entity_id?: string | null
          id?: string
          judge_id: string
          timestamp?: string | null
        }
        Update: {
          action?: string
          details?: Json | null
          entity?: string | null
          entity_id?: string | null
          id?: string
          judge_id?: string
          timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "judge_audit_logs_judge_id_fkey"
            columns: ["judge_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          audit_logs: Json | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          audit_logs?: Json | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          audit_logs?: Json | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      quick_snippets: {
        Row: {
          created_at: string | null
          full_text: string
          id: string
          judge_id: string | null
          shortcut: string
          track_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          full_text: string
          id?: string
          judge_id?: string | null
          shortcut: string
          track_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          full_text?: string
          id?: string
          judge_id?: string | null
          shortcut?: string
          track_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quick_snippets_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          created_at: string
          id: string
          is_locked: boolean | null
          name: string
          passcode: string | null
          track_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_locked?: boolean | null
          name: string
          passcode?: string | null
          track_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_locked?: boolean | null
          name?: string
          passcode?: string | null
          track_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rooms_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      scores: {
        Row: {
          comment: string | null
          created_at: string
          criterion_id: string
          id: string
          judge_id: string | null
          judge_name: string | null
          score: number
          team_id: string
          updated_at: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          criterion_id: string
          id?: string
          judge_id?: string | null
          judge_name?: string | null
          score: number
          team_id: string
          updated_at?: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          criterion_id?: string
          id?: string
          judge_id?: string | null
          judge_name?: string | null
          score?: number
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scores_criterion_id_fkey"
            columns: ["criterion_id"]
            isOneToOne: false
            referencedRelation: "criteria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scores_judge_id_fkey"
            columns: ["judge_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scores_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          checked_in: boolean | null
          checked_in_at: string | null
          checked_in_by: string | null
          college: string | null
          created_at: string
          id: string
          members: string[] | null
          name: string
          problem_statement: string | null
          qr_token: string | null
          room_id: string
          team_number: string
          total_score: number | null
          track_id: string
        }
        Insert: {
          checked_in?: boolean | null
          checked_in_at?: string | null
          checked_in_by?: string | null
          college?: string | null
          created_at?: string
          id?: string
          members?: string[] | null
          name: string
          problem_statement?: string | null
          qr_token?: string | null
          room_id: string
          team_number: string
          total_score?: number | null
          track_id: string
        }
        Update: {
          checked_in?: boolean | null
          checked_in_at?: string | null
          checked_in_by?: string | null
          college?: string | null
          created_at?: string
          id?: string
          members?: string[] | null
          name?: string
          problem_statement?: string | null
          qr_token?: string | null
          room_id?: string
          team_number?: string
          total_score?: number | null
          track_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_checked_in_by_fkey"
            columns: ["checked_in_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      tracks: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
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
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      append_judge_audit_log: {
        Args: { judge_id: string; log_data: Json }
        Returns: undefined
      }
      calculate_team_score: { Args: { _team_id: string }; Returns: number }
      check_in_team: {
        Args: { _admin_id: string; _qr_token: string }
        Returns: {
          message: string
          success: boolean
          team_name: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      toggle_team_checkin: {
        Args: { _admin_id: string; _checked_in: boolean; _team_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "judge"
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
      app_role: ["admin", "judge"],
    },
  },
} as const
