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
      achievements: {
        Row: {
          code: string
          description: string | null
          id: string
          metadata: Json | null
          title: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          code: string
          description?: string | null
          id?: string
          metadata?: Json | null
          title: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          code?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          title?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_personality_state: {
        Row: {
          depth: string
          empathy_level: number
          notes: string | null
          pacing: string
          tone: string
          trust_level: number
          updated_at: string
          user_id: string
        }
        Insert: {
          depth?: string
          empathy_level?: number
          notes?: string | null
          pacing?: string
          tone?: string
          trust_level?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          depth?: string
          empathy_level?: number
          notes?: string | null
          pacing?: string
          tone?: string
          trust_level?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          session_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          session_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          session_id?: string
          user_id?: string
        }
        Relationships: []
      }
      emotion_analyses: {
        Row: {
          created_at: string
          distortions: string[] | null
          id: string
          intensity: number | null
          message_id: string | null
          primary_emotion: string | null
          sentiment: string | null
          session_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          distortions?: string[] | null
          id?: string
          intensity?: number | null
          message_id?: string | null
          primary_emotion?: string | null
          sentiment?: string | null
          session_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          distortions?: string[] | null
          id?: string
          intensity?: number | null
          message_id?: string | null
          primary_emotion?: string | null
          sentiment?: string | null
          session_id?: string
          user_id?: string
        }
        Relationships: []
      }
      emotional_memories: {
        Row: {
          confidence: number
          content: string | null
          created_at: string
          embedding: Json | null
          emotion: string | null
          emotional_weight: number
          id: string
          last_referenced_at: string | null
          recurrence_score: number
          source_session_ids: string[]
          tags: string[]
          title: string
          type: Database["public"]["Enums"]["memory_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          confidence?: number
          content?: string | null
          created_at?: string
          embedding?: Json | null
          emotion?: string | null
          emotional_weight?: number
          id?: string
          last_referenced_at?: string | null
          recurrence_score?: number
          source_session_ids?: string[]
          tags?: string[]
          title: string
          type: Database["public"]["Enums"]["memory_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          confidence?: number
          content?: string | null
          created_at?: string
          embedding?: Json | null
          emotion?: string | null
          emotional_weight?: number
          id?: string
          last_referenced_at?: string | null
          recurrence_score?: number
          source_session_ids?: string[]
          tags?: string[]
          title?: string
          type?: Database["public"]["Enums"]["memory_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      emotional_pulses: {
        Row: {
          avg_intensity: number | null
          created_at: string
          dominant_emotion: string | null
          id: string
          message_count: number | null
          pulse_date: string
          session_count: number | null
          summary: string | null
          user_id: string
        }
        Insert: {
          avg_intensity?: number | null
          created_at?: string
          dominant_emotion?: string | null
          id?: string
          message_count?: number | null
          pulse_date: string
          session_count?: number | null
          summary?: string | null
          user_id: string
        }
        Update: {
          avg_intensity?: number | null
          created_at?: string
          dominant_emotion?: string | null
          id?: string
          message_count?: number | null
          pulse_date?: string
          session_count?: number | null
          summary?: string | null
          user_id?: string
        }
        Relationships: []
      }
      key_moments: {
        Row: {
          created_at: string
          emotion: string | null
          id: string
          intensity: number | null
          message_id: string | null
          moment_type: string
          position: number | null
          session_id: string
          summary: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          emotion?: string | null
          id?: string
          intensity?: number | null
          message_id?: string | null
          moment_type: string
          position?: number | null
          session_id: string
          summary?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          emotion?: string | null
          id?: string
          intensity?: number | null
          message_id?: string | null
          moment_type?: string
          position?: number | null
          session_id?: string
          summary?: string | null
          user_id?: string
        }
        Relationships: []
      }
      memory_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          intensity: number | null
          memory_id: string
          session_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          intensity?: number | null
          memory_id: string
          session_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          intensity?: number | null
          memory_id?: string
          session_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      memory_relationships: {
        Row: {
          created_at: string
          from_memory_id: string
          id: string
          relation_type: string
          strength: number
          to_memory_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          from_memory_id: string
          id?: string
          relation_type?: string
          strength?: number
          to_memory_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          from_memory_id?: string
          id?: string
          relation_type?: string
          strength?: number
          to_memory_id?: string
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          created_at: string
          emotion: string | null
          id: string
          intensity: number | null
          risk_level: Database["public"]["Enums"]["risk_level"] | null
          role: Database["public"]["Enums"]["message_role"]
          session_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          emotion?: string | null
          id?: string
          intensity?: number | null
          risk_level?: Database["public"]["Enums"]["risk_level"] | null
          role: Database["public"]["Enums"]["message_role"]
          session_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          emotion?: string | null
          id?: string
          intensity?: number | null
          risk_level?: Database["public"]["Enums"]["risk_level"] | null
          role?: Database["public"]["Enums"]["message_role"]
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      mood_entries: {
        Row: {
          created_at: string
          emotion: string | null
          id: string
          mood_score: number
          note: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          emotion?: string | null
          id?: string
          mood_score: number
          note?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          emotion?: string | null
          id?: string
          mood_score?: number
          note?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          age: string | null
          ai_tone: string | null
          avatar: string | null
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string | null
          gender: string | null
          id: string
          identity_mode: string | null
          interview_answers: Json | null
          nickname: string | null
          nickname_reason: string | null
          plan: Database["public"]["Enums"]["user_plan"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          age?: string | null
          ai_tone?: string | null
          avatar?: string | null
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          gender?: string | null
          id: string
          identity_mode?: string | null
          interview_answers?: Json | null
          nickname?: string | null
          nickname_reason?: string | null
          plan?: Database["public"]["Enums"]["user_plan"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          age?: string | null
          ai_tone?: string | null
          avatar?: string | null
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          gender?: string | null
          id?: string
          identity_mode?: string | null
          interview_answers?: Json | null
          nickname?: string | null
          nickname_reason?: string | null
          plan?: Database["public"]["Enums"]["user_plan"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      session_memories: {
        Row: {
          context: string | null
          created_at: string
          emotion_pattern: string | null
          id: string
          session_id: string | null
          topic: string
          user_id: string
        }
        Insert: {
          context?: string | null
          created_at?: string
          emotion_pattern?: string | null
          id?: string
          session_id?: string | null
          topic: string
          user_id: string
        }
        Update: {
          context?: string | null
          created_at?: string
          emotion_pattern?: string | null
          id?: string
          session_id?: string | null
          topic?: string
          user_id?: string
        }
        Relationships: []
      }
      sessions: {
        Row: {
          created_at: string
          dominant_emotion: string | null
          ended_at: string | null
          id: string
          message_count: number
          risk_level: Database["public"]["Enums"]["risk_level"] | null
          stage: Database["public"]["Enums"]["session_stage"]
          started_at: string
          status: Database["public"]["Enums"]["session_status"]
          summary: string | null
          summary_emotion: string | null
          summary_intensity: number | null
          title: string | null
          type: Database["public"]["Enums"]["session_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          dominant_emotion?: string | null
          ended_at?: string | null
          id?: string
          message_count?: number
          risk_level?: Database["public"]["Enums"]["risk_level"] | null
          stage?: Database["public"]["Enums"]["session_stage"]
          started_at?: string
          status?: Database["public"]["Enums"]["session_status"]
          summary?: string | null
          summary_emotion?: string | null
          summary_intensity?: number | null
          title?: string | null
          type?: Database["public"]["Enums"]["session_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          dominant_emotion?: string | null
          ended_at?: string | null
          id?: string
          message_count?: number
          risk_level?: Database["public"]["Enums"]["risk_level"] | null
          stage?: Database["public"]["Enums"]["session_stage"]
          started_at?: string
          status?: Database["public"]["Enums"]["session_status"]
          summary?: string | null
          summary_emotion?: string | null
          summary_intensity?: number | null
          title?: string | null
          type?: Database["public"]["Enums"]["session_type"]
          user_id?: string
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
      user_settings: {
        Row: {
          byok_encrypted: string | null
          byok_provider: string | null
          motion_intensity: Database["public"]["Enums"]["motion_intensity"]
          updated_at: string
          user_id: string
        }
        Insert: {
          byok_encrypted?: string | null
          byok_provider?: string | null
          motion_intensity?: Database["public"]["Enums"]["motion_intensity"]
          updated_at?: string
          user_id: string
        }
        Update: {
          byok_encrypted?: string | null
          byok_provider?: string | null
          motion_intensity?: Database["public"]["Enums"]["motion_intensity"]
          updated_at?: string
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
      app_role: "admin" | "user"
      memory_type:
        | "person"
        | "goal"
        | "fear"
        | "trigger"
        | "recovery"
        | "achievement"
        | "preference"
        | "theme"
        | "event"
        | "habit"
      message_role: "user" | "assistant" | "system" | "crisis"
      motion_intensity: "full" | "reduced" | "minimal"
      risk_level: "low" | "medium" | "high"
      session_stage: "early" | "middle" | "end"
      session_status: "active" | "completed" | "abandoned"
      session_type: "assessment" | "exploration" | "action_plan"
      user_plan: "free" | "premium"
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
      app_role: ["admin", "user"],
      memory_type: [
        "person",
        "goal",
        "fear",
        "trigger",
        "recovery",
        "achievement",
        "preference",
        "theme",
        "event",
        "habit",
      ],
      message_role: ["user", "assistant", "system", "crisis"],
      motion_intensity: ["full", "reduced", "minimal"],
      risk_level: ["low", "medium", "high"],
      session_stage: ["early", "middle", "end"],
      session_status: ["active", "completed", "abandoned"],
      session_type: ["assessment", "exploration", "action_plan"],
      user_plan: ["free", "premium"],
    },
  },
} as const
