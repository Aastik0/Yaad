"use client";

import { useState, useEffect } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { getSignedSceneSnapshotUrl } from "@/lib/supabase/storage";

export function useSignedImageUrl(imageReference?: string | null): {
  url: string | null;
  isLoading: boolean;
  error: string | null;
} {
  const [url, setUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!imageReference || !imageReference.trim()) {
      setUrl(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    // Direct local base64 or web URLs don't need async signed URL resolution
    if (
      imageReference.startsWith("data:") ||
      imageReference.startsWith("http://") ||
      imageReference.startsWith("https://")
    ) {
      setUrl(imageReference);
      setIsLoading(false);
      setError(null);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    const client = getSupabaseBrowserClient();
    getSignedSceneSnapshotUrl(client, imageReference)
      .then((signedUrl) => {
        if (!isMounted) return;
        if (signedUrl) {
          setUrl(signedUrl);
        } else {
          setError("Image not available or access expired");
        }
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        setError((err as Error)?.message || "Failed to load snapshot");
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [imageReference]);

  return { url, isLoading, error };
}

