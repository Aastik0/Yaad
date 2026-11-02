/**
 * Supabase Database Type Definitions
 * Auto-aligned with Phase 10 SQL Schema for Yaad
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      items: {
        Row: {
          id: string;
          user_id: string;
          item_name: string;
          category: string | null;
          status: 'suggested' | 'tracked_unconfirmed' | 'collected' | 'possibly_left_behind' | 'resolved';
          last_observation_id: string | null;
          last_location_description: string;
          last_landmarks: string[];
          last_observed_at: string;
          image_reference: string | null;
          coordinates: Json | null;
          geofence_radius_meters: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          item_name: string;
          category?: string | null;
          status?: 'suggested' | 'tracked_unconfirmed' | 'collected' | 'possibly_left_behind' | 'resolved';
          last_observation_id?: string | null;
          last_location_description: string;
          last_landmarks?: string[];
          last_observed_at?: string;
          image_reference?: string | null;
          coordinates?: Json | null;
          geofence_radius_meters?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          item_name?: string;
          category?: string | null;
          status?: 'suggested' | 'tracked_unconfirmed' | 'collected' | 'possibly_left_behind' | 'resolved';
          last_observation_id?: string | null;
          last_location_description?: string;
          last_landmarks?: string[];
          last_observed_at?: string;
          image_reference?: string | null;
          coordinates?: Json | null;
          geofence_radius_meters?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'items_last_observation_id_fkey';
            columns: ['last_observation_id'];
            isOneToOne: false;
            referencedRelation: 'observations';
            referencedColumns: ['id'];
          }
        ];
      };
      observations: {
        Row: {
          id: string;
          user_id: string;
          item_name: string;
          item_category: string | null;
          location_description: string;
          landmarks: string[];
          description: string;
          confidence: 'high' | 'medium' | 'low' | 'unknown';
          observed_at: string;
          source: 'browser_upload' | 'browser_camera' | 'glasses_sdk' | 'manual';
          image_reference: string | null;
          coordinates: Json | null;
          user_confirmed: boolean;
          created_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          item_name: string;
          item_category?: string | null;
          location_description: string;
          landmarks?: string[];
          description: string;
          confidence?: 'high' | 'medium' | 'low' | 'unknown';
          observed_at?: string;
          source?: 'browser_upload' | 'browser_camera' | 'glasses_sdk' | 'manual';
          image_reference?: string | null;
          coordinates?: Json | null;
          user_confirmed?: boolean;
          created_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          item_name?: string;
          item_category?: string | null;
          location_description?: string;
          landmarks?: string[];
          description?: string;
          confidence?: 'high' | 'medium' | 'low' | 'unknown';
          observed_at?: string;
          source?: 'browser_upload' | 'browser_camera' | 'glasses_sdk' | 'manual';
          image_reference?: string | null;
          coordinates?: Json | null;
          user_confirmed?: boolean;
          created_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      people_memories: {
        Row: {
          id: string;
          user_id: string;
          display_name: string;
          context_or_relationship: string | null;
          notes: string;
          met_at: string | null;
          met_on: string | null;
          user_confirmed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          display_name: string;
          context_or_relationship?: string | null;
          notes: string;
          met_at?: string | null;
          met_on?: string | null;
          user_confirmed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          display_name?: string;
          context_or_relationship?: string | null;
          notes?: string;
          met_at?: string | null;
          met_on?: string | null;
          user_confirmed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      usage_ledger: {
        Row: {
          id: string;
          user_id: string;
          timestamp: string;
          model: string;
          input_tokens: number;
          output_tokens: number;
          cached: boolean;
          estimated_cost_usd: number;
          status: 'success' | 'rate_limited' | 'error' | 'kill_switch_blocked';
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          timestamp?: string;
          model: string;
          input_tokens?: number;
          output_tokens?: number;
          cached?: boolean;
          estimated_cost_usd?: number;
          status: 'success' | 'rate_limited' | 'error' | 'kill_switch_blocked';
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          timestamp?: string;
          model?: string;
          input_tokens?: number;
          output_tokens?: number;
          cached?: boolean;
          estimated_cost_usd?: number;
          status?: 'success' | 'rate_limited' | 'error' | 'kill_switch_blocked';
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

