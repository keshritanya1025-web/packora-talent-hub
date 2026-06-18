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
      audit_log: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity: string
          entity_id: string | null
          id: string
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity: string
          entity_id?: string | null
          id?: string
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity?: string
          entity_id?: string | null
          id?: string
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      business_units: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      candidates: {
        Row: {
          bu: string | null
          candidate_id: string
          candidate_status: string
          client_name: string | null
          country: string | null
          created_at: string
          created_by: string | null
          current_ctc: number | null
          current_location: string | null
          current_organisation: string | null
          education: string | null
          email_address: string | null
          expected_ctc: number | null
          experience: number | null
          expertise: string | null
          first_name: string | null
          full_name: string
          fy: string | null
          gender: string | null
          id: string
          industry_background: string | null
          job_level: string | null
          job_name: string | null
          last_name: string | null
          linkedin_url: string | null
          location: string | null
          mobile_number: string | null
          notice_period: string | null
          passout_year: number | null
          portal_name: string | null
          recruiter: string | null
          recruiter_remarks: string | null
          rejection_reason: string | null
          req_id: string | null
          source: string | null
          source_name: string | null
          updated_at: string
        }
        Insert: {
          bu?: string | null
          candidate_id: string
          candidate_status?: string
          client_name?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          current_ctc?: number | null
          current_location?: string | null
          current_organisation?: string | null
          education?: string | null
          email_address?: string | null
          expected_ctc?: number | null
          experience?: number | null
          expertise?: string | null
          first_name?: string | null
          full_name: string
          fy?: string | null
          gender?: string | null
          id?: string
          industry_background?: string | null
          job_level?: string | null
          job_name?: string | null
          last_name?: string | null
          linkedin_url?: string | null
          location?: string | null
          mobile_number?: string | null
          notice_period?: string | null
          passout_year?: number | null
          portal_name?: string | null
          recruiter?: string | null
          recruiter_remarks?: string | null
          rejection_reason?: string | null
          req_id?: string | null
          source?: string | null
          source_name?: string | null
          updated_at?: string
        }
        Update: {
          bu?: string | null
          candidate_id?: string
          candidate_status?: string
          client_name?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          current_ctc?: number | null
          current_location?: string | null
          current_organisation?: string | null
          education?: string | null
          email_address?: string | null
          expected_ctc?: number | null
          experience?: number | null
          expertise?: string | null
          first_name?: string | null
          full_name?: string
          fy?: string | null
          gender?: string | null
          id?: string
          industry_background?: string | null
          job_level?: string | null
          job_name?: string | null
          last_name?: string | null
          linkedin_url?: string | null
          location?: string | null
          mobile_number?: string | null
          notice_period?: string | null
          passout_year?: number | null
          portal_name?: string | null
          recruiter?: string | null
          recruiter_remarks?: string | null
          rejection_reason?: string | null
          req_id?: string | null
          source?: string | null
          source_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidates_req_id_fkey"
            columns: ["req_id"]
            isOneToOne: false
            referencedRelation: "requisitions"
            referencedColumns: ["req_id"]
          },
        ]
      }
      departments: {
        Row: {
          created_at: string
          department_name: string
          id: string
        }
        Insert: {
          created_at?: string
          department_name: string
          id?: string
        }
        Update: {
          created_at?: string
          department_name?: string
          id?: string
        }
        Relationships: []
      }
      expertise: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      import_history: {
        Row: {
          created_at: string
          entity: string
          error_summary: Json | null
          failed_rows: number
          file_name: string
          file_size: number
          id: string
          imported_rows: number
          sheet_name: string
          status: string
          total_rows: number
          user_id: string
        }
        Insert: {
          created_at?: string
          entity: string
          error_summary?: Json | null
          failed_rows?: number
          file_name: string
          file_size?: number
          id?: string
          imported_rows?: number
          sheet_name: string
          status?: string
          total_rows?: number
          user_id: string
        }
        Update: {
          created_at?: string
          entity?: string
          error_summary?: Json | null
          failed_rows?: number
          file_name?: string
          file_size?: number
          id?: string
          imported_rows?: number
          sheet_name?: string
          status?: string
          total_rows?: number
          user_id?: string
        }
        Relationships: []
      }
      interviews: {
        Row: {
          bu: string | null
          candidate_id: string
          candidate_name: string | null
          created_at: string
          created_by: string | null
          id: string
          interview_id: string
          interview_status: string
          job_level: string | null
          job_name: string | null
          r1_date: string | null
          r1_feedback: string | null
          r1_panel: string | null
          r2_date: string | null
          r2_feedback: string | null
          r2_panel: string | null
          r3_date: string | null
          r3_feedback: string | null
          r3_panel: string | null
          recruiter: string | null
          remarks: string | null
          req_id: string | null
          updated_at: string
        }
        Insert: {
          bu?: string | null
          candidate_id: string
          candidate_name?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          interview_id: string
          interview_status?: string
          job_level?: string | null
          job_name?: string | null
          r1_date?: string | null
          r1_feedback?: string | null
          r1_panel?: string | null
          r2_date?: string | null
          r2_feedback?: string | null
          r2_panel?: string | null
          r3_date?: string | null
          r3_feedback?: string | null
          r3_panel?: string | null
          recruiter?: string | null
          remarks?: string | null
          req_id?: string | null
          updated_at?: string
        }
        Update: {
          bu?: string | null
          candidate_id?: string
          candidate_name?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          interview_id?: string
          interview_status?: string
          job_level?: string | null
          job_name?: string | null
          r1_date?: string | null
          r1_feedback?: string | null
          r1_panel?: string | null
          r2_date?: string | null
          r2_feedback?: string | null
          r2_panel?: string | null
          r3_date?: string | null
          r3_feedback?: string | null
          r3_panel?: string | null
          recruiter?: string | null
          remarks?: string | null
          req_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interviews_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["candidate_id"]
          },
          {
            foreignKeyName: "interviews_req_id_fkey"
            columns: ["req_id"]
            isOneToOne: false
            referencedRelation: "requisitions"
            referencedColumns: ["req_id"]
          },
        ]
      }
      levels: {
        Row: {
          created_at: string
          id: string
          level_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          level_name: string
        }
        Update: {
          created_at?: string
          id?: string
          level_name?: string
        }
        Relationships: []
      }
      locations: {
        Row: {
          city: string
          country: string
          created_at: string
          id: string
          region: string | null
        }
        Insert: {
          city: string
          country: string
          created_at?: string
          id?: string
          region?: string | null
        }
        Update: {
          city?: string
          country?: string
          created_at?: string
          id?: string
          region?: string | null
        }
        Relationships: []
      }
      offers: {
        Row: {
          candidate_id: string | null
          candidate_name: string | null
          created_at: string
          created_by: string | null
          ctc_offered: number | null
          id: string
          joining_date: string | null
          offer_accepted_date: string | null
          offer_id: string
          offer_released_date: string | null
          offer_status: string
          position_name: string | null
          recruiter: string | null
          req_id: string | null
          updated_at: string
        }
        Insert: {
          candidate_id?: string | null
          candidate_name?: string | null
          created_at?: string
          created_by?: string | null
          ctc_offered?: number | null
          id?: string
          joining_date?: string | null
          offer_accepted_date?: string | null
          offer_id: string
          offer_released_date?: string | null
          offer_status?: string
          position_name?: string | null
          recruiter?: string | null
          req_id?: string | null
          updated_at?: string
        }
        Update: {
          candidate_id?: string | null
          candidate_name?: string | null
          created_at?: string
          created_by?: string | null
          ctc_offered?: number | null
          id?: string
          joining_date?: string | null
          offer_accepted_date?: string | null
          offer_id?: string
          offer_released_date?: string | null
          offer_status?: string
          position_name?: string | null
          recruiter?: string | null
          req_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          name?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      recruiters: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      requisitions: {
        Row: {
          bu: string | null
          bu_lead: string | null
          budget_max: number | null
          client_manager: string | null
          client_name: string | null
          cost_of_hire: number | null
          country: string | null
          created_at: string
          created_by: string | null
          ctc_offered: number | null
          current_status: string
          date_of_request: string | null
          days_since_open: number | null
          dead_days: number | null
          effective_days_since_open: number | null
          final_candidate: string | null
          fy: string | null
          hiring_manager: string | null
          id: string
          joining_date: string | null
          location: string | null
          month_of_joining: string | null
          new_or_replacement: string | null
          niche_or_bau: string | null
          offer_accepted_date: string | null
          offer_released_date: string | null
          passout_year: number | null
          position_level: string | null
          position_name: string
          position_type: string | null
          priority: string | null
          probable_candidate: string | null
          reason: string | null
          recruiter: string | null
          remarks: string | null
          replacement_name: string | null
          req_id: string
          root_cause_category: string | null
          source: string | null
          updated_at: string
        }
        Insert: {
          bu?: string | null
          bu_lead?: string | null
          budget_max?: number | null
          client_manager?: string | null
          client_name?: string | null
          cost_of_hire?: number | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          ctc_offered?: number | null
          current_status?: string
          date_of_request?: string | null
          days_since_open?: number | null
          dead_days?: number | null
          effective_days_since_open?: number | null
          final_candidate?: string | null
          fy?: string | null
          hiring_manager?: string | null
          id?: string
          joining_date?: string | null
          location?: string | null
          month_of_joining?: string | null
          new_or_replacement?: string | null
          niche_or_bau?: string | null
          offer_accepted_date?: string | null
          offer_released_date?: string | null
          passout_year?: number | null
          position_level?: string | null
          position_name: string
          position_type?: string | null
          priority?: string | null
          probable_candidate?: string | null
          reason?: string | null
          recruiter?: string | null
          remarks?: string | null
          replacement_name?: string | null
          req_id?: string
          root_cause_category?: string | null
          source?: string | null
          updated_at?: string
        }
        Update: {
          bu?: string | null
          bu_lead?: string | null
          budget_max?: number | null
          client_manager?: string | null
          client_name?: string | null
          cost_of_hire?: number | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          ctc_offered?: number | null
          current_status?: string
          date_of_request?: string | null
          days_since_open?: number | null
          dead_days?: number | null
          effective_days_since_open?: number | null
          final_candidate?: string | null
          fy?: string | null
          hiring_manager?: string | null
          id?: string
          joining_date?: string | null
          location?: string | null
          month_of_joining?: string | null
          new_or_replacement?: string | null
          niche_or_bau?: string | null
          offer_accepted_date?: string | null
          offer_released_date?: string | null
          passout_year?: number | null
          position_level?: string | null
          position_name?: string
          position_type?: string | null
          priority?: string | null
          probable_candidate?: string | null
          reason?: string | null
          recruiter?: string | null
          remarks?: string | null
          replacement_name?: string | null
          req_id?: string
          root_cause_category?: string | null
          source?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      sources: {
        Row: {
          created_at: string
          id: string
          source_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          source_name: string
        }
        Update: {
          created_at?: string
          id?: string
          source_name?: string
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
      generate_candidate_id: { Args: { _full_name: string }; Returns: string }
      generate_interview_id: { Args: never; Returns: string }
      generate_offer_id: { Args: never; Returns: string }
      generate_req_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      log_audit: {
        Args: {
          _action: string
          _details: Json
          _entity: string
          _entity_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "system_admin" | "recruiter" | "business_lead"
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
      app_role: ["system_admin", "recruiter", "business_lead"],
    },
  },
} as const
