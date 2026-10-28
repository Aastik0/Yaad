/**
 * Core domain types for Yaad
 * Defined strictly according to the Yaad Business Requirements Document (BRD Section 9)
 * Extended with Geolocation & Dementia Care Assistive Radius tracking.
 */

export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'unknown';

export type ObservationSource = 'browser_upload' | 'browser_camera' | 'glasses_sdk' | 'manual';

export type TrackedItemStatus =
  | 'suggested'             // model proposed the item; not yet tracked
  | 'tracked_unconfirmed'  // user wants reminder, not yet confirmed collected
  | 'collected'            // user explicitly confirmed taking the item
  | 'possibly_left_behind' // departure check occurred while item was unconfirmed
  | 'resolved';            // user resolved the reminder or corrected the record

export interface GeoLocationCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
  place_name?: string;
}

export interface ItemObservation {
  id: string;
  user_id: string;
  item_name: string;
  item_category?: string;
  location_description: string;
  landmarks: string[];
  description: string; // short grounded sentence
  confidence: ConfidenceLevel;
  observed_at: string; // capture timestamp (ISO)
  source: ObservationSource;
  image_reference?: string;
  coordinates?: GeoLocationCoordinates;
  user_confirmed: boolean;
  created_at: string;
  deleted_at?: string;
}

export interface TrackedItem {
  id: string;
  user_id: string;
  item_name: string;
  category?: string;
  status: TrackedItemStatus;
  last_observation_id?: string;
  last_location_description: string;
  last_landmarks: string[];
  last_observed_at: string;
  image_reference?: string;
  coordinates?: GeoLocationCoordinates;
  geofence_radius_meters?: number; // default e.g. 50m
  updated_at: string;
}

export interface PersonMemory {
  id: string;
  user_id: string;
  display_name: string;
  context_or_relationship?: string;
  notes: string;
  met_at?: string;
  met_on?: string;
  created_at: string;
  updated_at: string;
  user_confirmed: boolean;
}

export interface CandidateItem {
  id: string;
  item_name: string;
  category?: string;
  location_description: string;
  landmarks: string[];
  description: string;
  confidence: ConfidenceLevel;
  coordinates?: GeoLocationCoordinates;
  is_selected: boolean;
}

export interface UsageLedgerEntry {
  id: string;
  timestamp: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cached: boolean;
  estimated_cost_usd: number;
  status: 'success' | 'rate_limited' | 'error' | 'kill_switch_blocked';
  notes?: string;
}
