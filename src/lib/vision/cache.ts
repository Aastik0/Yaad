import crypto from "node:crypto";
import type { CandidateItemOutput } from "../schemas.ts";

/**
 * Computes deterministic SHA-256 cache key scoped strictly by user_id.
 * Ensures that visual query results can never leak across different users.
 */
export function computeCacheKey(
  userId: string,
  imageStr: string,
  query: string,
  model: string
): string {
  const hash = crypto.createHash("sha256");
  hash.update(userId.trim() || "demo-user");
  hash.update(model.trim());
  hash.update(query.trim().toLowerCase());
  // Fingerprint image using representative prefix and suffix without buffering whole multi-megabyte string
  if (imageStr.length > 2048) {
    hash.update(imageStr.slice(0, 1024));
    hash.update(imageStr.slice(-1024));
  } else {
    hash.update(imageStr);
  }
  return hash.digest("hex");
}

export class VisionCache {
  private static instance: VisionCache;
  private cache = new Map<string, { candidates: CandidateItemOutput[]; timestamp: number }>();
  private defaultTtlMs = 24 * 60 * 60 * 1000; // 24 hours

  public static getInstance(): VisionCache {
    if (!VisionCache.instance) {
      VisionCache.instance = new VisionCache();
    }
    return VisionCache.instance;
  }

  public get(key: string): CandidateItemOutput[] | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.defaultTtlMs) {
      this.cache.delete(key);
      return null;
    }

    return entry.candidates;
  }

  public set(key: string, candidates: CandidateItemOutput[]): void {
    this.cache.set(key, {
      candidates,
      timestamp: Date.now(),
    });
  }

  public clear(): void {
    this.cache.clear();
  }
}

