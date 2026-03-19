export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.1';
  };
  public: {
    Tables: {
      checkpoint_completions: {
        Row: {
          attempts: number | null;
          checkpoint_id: string;
          completed_at: string | null;
          created_at: string;
          entered_at: string;
          entry_accuracy: number | null;
          entry_latitude: number | null;
          entry_longitude: number | null;
          id: string;
          session_id: string;
        };
        Insert: {
          attempts?: number | null;
          checkpoint_id: string;
          completed_at?: string | null;
          created_at?: string;
          entered_at?: string;
          entry_accuracy?: number | null;
          entry_latitude?: number | null;
          entry_longitude?: number | null;
          id?: string;
          session_id: string;
        };
        Update: {
          attempts?: number | null;
          checkpoint_id?: string;
          completed_at?: string | null;
          created_at?: string;
          entered_at?: string;
          entry_accuracy?: number | null;
          entry_latitude?: number | null;
          entry_longitude?: number | null;
          id?: string;
          session_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'checkpoint_completions_checkpoint_id_fkey';
            columns: ['checkpoint_id'];
            isOneToOne: false;
            referencedRelation: 'checkpoints';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'checkpoint_completions_session_id_fkey';
            columns: ['session_id'];
            isOneToOne: false;
            referencedRelation: 'game_sessions';
            referencedColumns: ['id'];
          },
        ];
      };
      checkpoints: {
        Row: {
          content: Json;
          created_at: string;
          game_id: string;
          id: string;
          is_fake: boolean | null;
          latitude: number;
          longitude: number;
          order_index: number;
          radius: number;
          secret_solution: Json | null;
          type: string;
          updated_at: string;
        };
        Insert: {
          content?: Json;
          created_at?: string;
          game_id: string;
          id?: string;
          is_fake?: boolean | null;
          latitude: number;
          longitude: number;
          order_index: number;
          radius?: number;
          secret_solution?: Json | null;
          type: string;
          updated_at?: string;
        };
        Update: {
          content?: Json;
          created_at?: string;
          game_id?: string;
          id?: string;
          is_fake?: boolean | null;
          latitude?: number;
          longitude?: number;
          order_index?: number;
          radius?: number;
          secret_solution?: Json | null;
          type?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'checkpoints_game_id_fkey';
            columns: ['game_id'];
            isOneToOne: false;
            referencedRelation: 'games';
            referencedColumns: ['id'];
          },
        ];
      };
      game_sessions: {
        Row: {
          created_at: string;
          current_checkpoint_index: number;
          end_time: string | null;
          game_id: string;
          id: string;
          metadata: Json | null;
          score: number | null;
          start_time: string;
          status: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          current_checkpoint_index?: number;
          end_time?: string | null;
          game_id: string;
          id?: string;
          metadata?: Json | null;
          score?: number | null;
          start_time?: string;
          status?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          current_checkpoint_index?: number;
          end_time?: string | null;
          game_id?: string;
          id?: string;
          metadata?: Json | null;
          score?: number | null;
          start_time?: string;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'game_sessions_game_id_fkey';
            columns: ['game_id'];
            isOneToOne: false;
            referencedRelation: 'games';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'game_sessions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      games: {
        Row: {
          created_at: string;
          creator_id: string;
          description: string | null;
          difficulty: number;
          id: string;
          is_public: boolean;
          settings: Json;
          status: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          creator_id: string;
          description?: string | null;
          difficulty?: number;
          id?: string;
          is_public?: boolean;
          settings?: Json;
          status?: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          creator_id?: string;
          description?: string | null;
          difficulty?: number;
          id?: string;
          is_public?: boolean;
          settings?: Json;
          status?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'games_creator_id_fkey';
            columns: ['creator_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      player_locations: {
        Row: {
          accuracy: number | null;
          created_at: string;
          current_checkpoint_index: number;
          id: string;
          last_seen_at: string;
          latitude: number;
          longitude: number;
          session_id: string;
          updated_at: string;
        };
        Insert: {
          accuracy?: number | null;
          created_at?: string;
          current_checkpoint_index: number;
          id?: string;
          last_seen_at?: string;
          latitude: number;
          longitude: number;
          session_id: string;
          updated_at?: string;
        };
        Update: {
          accuracy?: number | null;
          created_at?: string;
          current_checkpoint_index?: number;
          id?: string;
          last_seen_at?: string;
          latitude?: number;
          longitude?: number;
          session_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'player_locations_session_id_fkey';
            columns: ['session_id'];
            isOneToOne: true;
            referencedRelation: 'game_sessions';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          email: string;
          id: string;
          updated_at: string;
          username: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          email: string;
          id: string;
          updated_at?: string;
          username?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string;
          id?: string;
          updated_at?: string;
          username?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      active_players_view: {
        Row: {
          accuracy: number | null;
          avatar_url: string | null;
          created_at: string | null;
          creator_id: string | null;
          current_checkpoint_index: number | null;
          game_id: string | null;
          id: string | null;
          last_seen_at: string | null;
          latitude: number | null;
          longitude: number | null;
          session_id: string | null;
          updated_at: string | null;
          user_id: string | null;
          username: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'player_locations_session_id_fkey';
            columns: ['session_id'];
            isOneToOne: true;
            referencedRelation: 'game_sessions';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Functions: {
      can_access_game: { Args: { game_id: string }; Returns: boolean };
      get_avatar_url: {
        Args: { filename: string; user_id: string };
        Returns: string;
      };
      get_checkpoint_image_url: {
        Args: { checkpoint_id: string; filename: string; game_id: string };
        Returns: string;
      };
      is_game_creator: { Args: { game_id: string }; Returns: boolean };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
