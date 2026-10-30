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
  image: z.string().min(1, "Image data or URL required"),
  requestedQuery: z.string().optional().default(""),
  source: z.enum(["browser_upload", "browser_camera", "manual"]).default("browser_upload"),
  userId: z.string().optional().default("demo-user"),
  forceLive: z.boolean().optional().default(false),
});

export type CandidateItemOutput = z.infer<typeof CandidateItemSchema>;
export type SceneAnalysisResponse = z.infer<typeof SceneAnalysisResponseSchema>;
export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;
export type AnalyzeRequestInput = z.input<typeof AnalyzeRequestSchema>;
