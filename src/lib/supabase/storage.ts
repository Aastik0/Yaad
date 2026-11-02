/**
 * Supabase Storage Service for Scene Snapshots (Phase 12)
 * Handles authenticated uploads, validation, signed URL generation, and caching.
 */

import { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types.ts";

export const SCENE_SNAPSHOTS_BUCKET = "scene-snapshots";
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type AllowedMimeType = (typeof ALLOWED_IMAGE_MIME_TYPES)[number];

interface SignedUrlCacheEntry {
  url: string;
  expiresAt: number;
}

const signedUrlCache = new Map<string, SignedUrlCacheEntry>();

function getExtensionForMime(mimeType: string): string {
  switch (mimeType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      return "jpg";
  }
}

/**
 * Converts a base64 Data URL to a Blob with detected MIME type.
 */
export function dataUrlToBlob(dataUrl: string): { blob: Blob; mimeType: string } {
  const matches = dataUrl.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
  if (!matches || matches.length < 3) {
    throw new Error("Invalid data URL format. Expected 'data:<mime>;base64,<data>'");
  }

  const mimeType = matches[1];
  const base64Data = matches[2];

  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: mimeType });

  return { blob, mimeType };
}

/**
 * Uploads a scene snapshot to Supabase Storage in the user's private folder.
 * Returns the relative storage path (e.g. `{userId}/{observationId}/{uuid}.jpg`).
 */
export async function uploadSceneSnapshot(
  client: SupabaseClient<Database>,
  userId: string,
  observationId: string,
  fileOrDataUrl: File | Blob | string
): Promise<string> {
  if (!userId) {
    throw new Error("Security Exception: Authenticated user ID required to upload snapshot.");
  }

  let blob: Blob;
  let mimeType: string;

  if (typeof fileOrDataUrl === "string") {
    if (fileOrDataUrl.startsWith("data:")) {
      const parsed = dataUrlToBlob(fileOrDataUrl);
      blob = parsed.blob;
      mimeType = parsed.mimeType;
    } else {
      throw new Error("Invalid string passed for upload. Must be a base64 data URL.");
    }
  } else {
    blob = fileOrDataUrl;
    mimeType = fileOrDataUrl.type;
  }

  // 1. Validate MIME type
  if (!ALLOWED_IMAGE_MIME_TYPES.includes(mimeType as AllowedMimeType)) {
    throw new Error(
      `Unsupported image type "${mimeType}". Allowed types: JPEG, PNG, WebP.`
    );
  }

  // 2. Validate Size Limit (5 MB max)
  if (blob.size > MAX_IMAGE_SIZE_BYTES) {
    throw new Error(
      `Image size (${(blob.size / (1024 * 1024)).toFixed(2)} MB) exceeds maximum allowed limit of 5 MB.`
    );
  }

  // 3. Generate unique, unguessable filename
  const fileUuid =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const ext = getExtensionForMime(mimeType);

  // Folder convention: {userId}/{observationId}/{filename}
  const cleanObsId = observationId.replace(/[^a-zA-Z0-9-_]/g, "");
  const storagePath = `${userId}/${cleanObsId}/${fileUuid}.${ext}`;

  // 4. Upload to private Supabase Storage bucket
  const { error } = await client.storage
    .from(SCENE_SNAPSHOTS_BUCKET)
    .upload(storagePath, blob, {
      contentType: mimeType,
      upsert: true,
    });

  if (error) {
    console.error("Supabase Storage upload error:", error);
    throw new Error(`Failed to upload snapshot to storage: ${error.message}`);
  }

  return storagePath;
}

/**
 * Resolves a storage path or data URL into a viewable URL.
 * Generates short-lived signed URLs for Supabase Storage paths, with in-memory caching.
 */
export async function getSignedSceneSnapshotUrl(
  client: SupabaseClient<Database> | null,
  imageReference?: string | null,
  expiresInSeconds = 3600
): Promise<string | null> {
  if (!imageReference || !imageReference.trim()) {
    return null;
  }

  // Direct return for demo data URLs or external links
  if (
    imageReference.startsWith("data:") ||
    imageReference.startsWith("http://") ||
    imageReference.startsWith("https://")
  ) {
    return imageReference;
  }

  // If Supabase client is not available
  if (!client) {
    return null;
  }

  // Check cache
  const cached = signedUrlCache.get(imageReference);
  const now = Date.now();
  if (cached && cached.expiresAt > now + 60 * 1000) {
    // Return cached URL if it has at least 1 minute remaining
    return cached.url;
  }

  try {
    const { data, error } = await client.storage
      .from(SCENE_SNAPSHOTS_BUCKET)
      .createSignedUrl(imageReference, expiresInSeconds);

    if (error || !data?.signedUrl) {
      console.warn("Failed to create signed URL for snapshot:", imageReference, error?.message);
      return null;
    }

    // Cache the signed URL
    signedUrlCache.set(imageReference, {
      url: data.signedUrl,
      expiresAt: now + expiresInSeconds * 1000,
    });

    return data.signedUrl;
  } catch (err) {
    console.warn("Error obtaining signed URL:", err);
    return null;
  }
}

/**
 * Deletes a snapshot from Supabase Storage if it is a cloud path.
 */
export async function deleteSceneSnapshot(
  client: SupabaseClient<Database>,
  imageReference?: string | null
): Promise<void> {
  if (!imageReference || imageReference.startsWith("data:") || imageReference.startsWith("http")) {
    return;
  }

  try {
    const { error } = await client.storage
      .from(SCENE_SNAPSHOTS_BUCKET)
      .remove([imageReference]);

    if (error) {
      console.warn("Failed to delete snapshot from Supabase Storage:", error.message);
    }
  } catch (err) {
    console.warn("Error deleting snapshot from storage:", err);
  }
}

