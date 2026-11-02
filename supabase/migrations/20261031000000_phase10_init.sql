-- ==============================================================================
-- Migration: Phase 10 Initial Schema for Yaad
-- Description: Creates items, observations, people_memories, and usage_ledger tables
--              with UUID primary keys, foreign keys, timestamps, triggers,
--              Row-Level Security (RLS), and user isolation policies.
-- ==============================================================================

-- Enable UUID extension if not already present
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- Function: update_updated_at_column
-- Automatically sets updated_at = now() on row updates
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------------------------
-- Table 1: observations
-- Stores individual visual/manual observations captured via camera, SDK, or upload
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  item_category TEXT,
  location_description TEXT NOT NULL,
  landmarks TEXT[] NOT NULL DEFAULT '{}',
  description TEXT NOT NULL,
  confidence TEXT NOT NULL DEFAULT 'unknown' CHECK (confidence IN ('high', 'medium', 'low', 'unknown')),
  observed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('browser_upload', 'browser_camera', 'glasses_sdk', 'manual')),
  image_reference TEXT,
  coordinates JSONB,
  user_confirmed BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- ------------------------------------------------------------------------------
-- Table 2: items
-- Stores canonical tracked belongings, active reminder states, and geofence anchors
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  category TEXT,
  status TEXT NOT NULL DEFAULT 'suggested' CHECK (status IN ('suggested', 'tracked_unconfirmed', 'collected', 'possibly_left_behind', 'resolved')),
  last_observation_id UUID REFERENCES observations(id) ON DELETE SET NULL,
  last_location_description TEXT NOT NULL,
  last_landmarks TEXT[] NOT NULL DEFAULT '{}',
  last_observed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  image_reference TEXT,
  coordinates JSONB,
  geofence_radius_meters INTEGER NOT NULL DEFAULT 50 CHECK (geofence_radius_meters > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger for items.updated_at
CREATE TRIGGER trigger_update_items_updated_at
  BEFORE UPDATE ON items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------------------------
-- Table 3: people_memories
-- Stores context, relationship notes, and meeting history for familiar people
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS people_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  context_or_relationship TEXT,
  notes TEXT NOT NULL,
  met_at TEXT,
  met_on DATE,
  user_confirmed BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger for people_memories.updated_at
CREATE TRIGGER trigger_update_people_memories_updated_at
  BEFORE UPDATE ON people_memories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------------------------
-- Table 4: usage_ledger
-- Tracks AI model API calls, token counts, and estimated cost per user
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usage_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  model TEXT NOT NULL,
  input_tokens INTEGER NOT NULL DEFAULT 0 CHECK (input_tokens >= 0),
  output_tokens INTEGER NOT NULL DEFAULT 0 CHECK (output_tokens >= 0),
  cached BOOLEAN NOT NULL DEFAULT false,
  estimated_cost_usd NUMERIC(10, 5) NOT NULL DEFAULT 0.00000 CHECK (estimated_cost_usd >= 0),
  status TEXT NOT NULL CHECK (status IN ('success', 'rate_limited', 'error', 'kill_switch_blocked')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- Performance & Query Indexes
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_items_user_id ON items(user_id);
CREATE INDEX IF NOT EXISTS idx_items_user_status ON items(user_id, status);

CREATE INDEX IF NOT EXISTS idx_observations_user_id ON observations(user_id);
CREATE INDEX IF NOT EXISTS idx_observations_user_observed_at ON observations(user_id, observed_at DESC);

CREATE INDEX IF NOT EXISTS idx_people_memories_user_id ON people_memories(user_id);
CREATE INDEX IF NOT EXISTS idx_people_memories_user_name ON people_memories(user_id, display_name);

CREATE INDEX IF NOT EXISTS idx_usage_ledger_user_id ON usage_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_ledger_user_timestamp ON usage_ledger(user_id, timestamp DESC);

-- ------------------------------------------------------------------------------
-- Row-Level Security (RLS) Enablement
-- Enforces zero data leakage across distinct user tenants
-- ------------------------------------------------------------------------------
ALTER TABLE observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE people_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_ledger ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- RLS Policies: observations
-- ------------------------------------------------------------------------------
CREATE POLICY "Users can view their own observations"
  ON observations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own observations"
  ON observations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own observations"
  ON observations FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own observations"
  ON observations FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- RLS Policies: items
-- ------------------------------------------------------------------------------
CREATE POLICY "Users can view their own items"
  ON items FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own items"
  ON items FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own items"
  ON items FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own items"
  ON items FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- RLS Policies: people_memories
-- ------------------------------------------------------------------------------
CREATE POLICY "Users can view their own people memories"
  ON people_memories FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own people memories"
  ON people_memories FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own people memories"
  ON people_memories FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own people memories"
  ON people_memories FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- RLS Policies: usage_ledger
-- ------------------------------------------------------------------------------
CREATE POLICY "Users can view their own usage ledger"
  ON usage_ledger FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own usage ledger entries"
  ON usage_ledger FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

