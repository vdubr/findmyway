// Generated Database Types for Supabase
// Based on schema defined in supabase/migrations/

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          username: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          username?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          username?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      games: {
        Row: {
          id: string;
          creator_id: string;
          title: string;
          description: string | null;
          is_public: boolean;
          difficulty: number;
          settings: Json;
          status: 'draft' | 'published' | 'archived';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          creator_id: string;
          title: string;
          description?: string | null;
          is_public?: boolean;
          difficulty?: number;
          settings?: Json;
          status?: 'draft' | 'published' | 'archived';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          creator_id?: string;
          title?: string;
          description?: string | null;
          is_public?: boolean;
          difficulty?: number;
          settings?: Json;
          status?: 'draft' | 'published' | 'archived';
          created_at?: string;
          updated_at?: string;
        };
      };
      checkpoints: {
        Row: {
          id: string;
          game_id: string;
          order_index: number;
          latitude: number;
          longitude: number;
          radius: number;
          type: 'info' | 'puzzle' | 'input';
          content: Json;
          secret_solution: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          game_id: string;
          order_index: number;
          latitude: number;
          longitude: number;
          radius?: number;
          type: 'info' | 'puzzle' | 'input';
          content?: Json;
          secret_solution?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          game_id?: string;
          order_index?: number;
          latitude?: number;
          longitude?: number;
          radius?: number;
          type?: 'info' | 'puzzle' | 'input';
          content?: Json;
          secret_solution?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      game_sessions: {
        Row: {
          id: string;
          user_id: string;
          game_id: string;
          current_checkpoint_index: number;
          status: 'active' | 'completed' | 'abandoned';
          start_time: string;
          end_time: string | null;
          score: number | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          game_id: string;
          current_checkpoint_index?: number;
          status?: 'active' | 'completed' | 'abandoned';
          start_time?: string;
          end_time?: string | null;
          score?: number | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          game_id?: string;
          current_checkpoint_index?: number;
          status?: 'active' | 'completed' | 'abandoned';
          start_time?: string;
          end_time?: string | null;
          score?: number | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      checkpoint_completions: {
        Row: {
          id: string;
          session_id: string;
          checkpoint_id: string;
          entered_at: string;
          completed_at: string | null;
          attempts: number;
          entry_latitude: number | null;
          entry_longitude: number | null;
          entry_accuracy: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          checkpoint_id: string;
          entered_at?: string;
          completed_at?: string | null;
          attempts?: number;
          entry_latitude?: number | null;
          entry_longitude?: number | null;
          entry_accuracy?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          checkpoint_id?: string;
          entered_at?: string;
          completed_at?: string | null;
          attempts?: number;
          entry_latitude?: number | null;
          entry_longitude?: number | null;
          entry_accuracy?: number | null;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_game_creator: {
        Args: {
          game_id: string;
        };
        Returns: boolean;
      };
      can_access_game: {
        Args: {
          game_id: string;
        };
        Returns: boolean;
      };
      get_checkpoint_image_url: {
        Args: {
          game_id: string;
          checkpoint_id: string;
          filename: string;
        };
        Returns: string;
      };
      get_avatar_url: {
        Args: {
          user_id: string;
          filename: string;
        };
        Returns: string;
      };
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
