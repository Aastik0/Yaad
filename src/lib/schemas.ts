import { z } from "zod";

/**
 * Zod Schemas for Yaad AI Scene Analysis
 * Strictly enforces schema-validated structured output as required by BRD FR-04.
 */

export const ConfidenceLevelSchema = z.enum(["high", "medium", "low", "unknown"]);

export const CandidateItemSchema = z.object({
  id: z.string(),
  item_name: z.string().min(1, "Item name must not be empty"),
  category: z.string().optional(),
  location_description: z.string().min(1, "Location description must be grounded"),
  landmarks: z.array(z.string()).default([]),
  description: z.string().min(1, "Grounded summary must be provided"),
  confidence: ConfidenceLevelSchema.default("medium"),
  is_selected: z.boolean().default(true),
});

export const SceneAnalysisResponseSchema = z.object({
  candidates: z.array(CandidateItemSchema),
  scene_context: z.string().optional(),
  uncertainty_notes: z.string().optional(),
});

export const AnalyzeRequestSchema = z.object({
  image: z.string().min(1, "Image data or URL required").max(7 * 1024 * 1024, "Image payload exceeds maximum limit of 7MB"),
  requestedQuery: z.string().max(256, "Query cannot exceed 256 characters").optional().default(""),
  source: z.enum(["browser_upload", "browser_camera", "glasses_sdk", "manual"]).default("browser_upload"),
  userId: z.string().optional().default("demo-user"),
  forceLive: z.boolean().optional().default(false),
  requestedProvider: z.enum(["mock", "meta_muse"]).optional().default("mock"),
  liveConfirmed: z.boolean().optional().default(false),
});

export type CandidateItemOutput = z.infer<typeof CandidateItemSchema>;
export type SceneAnalysisResponse = z.infer<typeof SceneAnalysisResponseSchema>;
export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;
export type AnalyzeRequestInput = z.input<typeof AnalyzeRequestSchema>;

/**
 * Phase 11: Authentication & Storage Schemas
 */

export const AuthCredentialsSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export type AuthCredentials = z.infer<typeof AuthCredentialsSchema>;

export const GeoCoordinatesSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().optional(),
  place_name: z.string().optional(),
});

export const TrackedItemStatusSchema = z.enum([
  "suggested",
  "tracked_unconfirmed",
  "collected",
  "possibly_left_behind",
  "resolved",
]);

export const TrackedItemInputSchema = z.object({
  id: z.string().optional(),
  item_name: z.string().trim().min(1, "Item name is required"),
  category: z.string().optional(),
  status: TrackedItemStatusSchema.default("suggested"),
  last_observation_id: z.string().optional(),
  last_location_description: z.string().trim().min(1, "Location description is required"),
  last_landmarks: z.array(z.string()).default([]),
  last_observed_at: z.string().optional(),
  image_reference: z.string().optional(),
  coordinates: GeoCoordinatesSchema.optional(),
  geofence_radius_meters: z.number().positive().default(50),
});

export type TrackedItemInput = z.infer<typeof TrackedItemInputSchema>;

export const ItemObservationInputSchema = z.object({
  id: z.string().optional(),
  item_name: z.string().trim().min(1, "Item name is required"),
  item_category: z.string().optional(),
  location_description: z.string().trim().min(1, "Location description is required"),
  landmarks: z.array(z.string()).default([]),
  description: z.string().trim().min(1, "Description is required"),
  confidence: ConfidenceLevelSchema.default("unknown"),
  observed_at: z.string().optional(),
  source: z.enum(["browser_upload", "browser_camera", "glasses_sdk", "manual"]).default("manual"),
  image_reference: z.string().optional(),
  coordinates: GeoCoordinatesSchema.optional(),
  user_confirmed: z.boolean().default(true),
});

export type ItemObservationInput = z.infer<typeof ItemObservationInputSchema>;

export const PersonMemoryInputSchema = z.object({
  id: z.string().optional(),
  display_name: z.string().trim().min(1, "Name is required"),
  context_or_relationship: z.string().optional(),
  notes: z.string().trim().min(1, "Notes are required"),
  met_at: z.string().optional(),
  met_on: z.string().optional(),
  user_confirmed: z.boolean().default(true),
});

export type PersonMemoryInput = z.infer<typeof PersonMemoryInputSchema>;
