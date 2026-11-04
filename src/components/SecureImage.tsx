"use client";

import React, { useState } from "react";
import { useSignedImageUrl } from "@/hooks/useSignedImageUrl";
import { getItemDummySceneImage } from "@/lib/dummyImages";
import { ImageOff, Loader2 } from "lucide-react";

interface SecureImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  imageReference?: string | null;
  fallbackIcon?: React.ReactNode;
  itemCategory?: string;
  itemName?: string;
  useCategoryFallback?: boolean;
}

export const SecureImage: React.FC<SecureImageProps> = ({
  imageReference,
  alt = "Scene snapshot",
  className = "",
  fallbackIcon,
  itemCategory,
  itemName,
  useCategoryFallback = true,
  ...rest
}) => {
  const { url, isLoading, error } = useSignedImageUrl(imageReference);
  const [hasImageLoadError, setHasImageLoadError] = useState(false);

  // If image is missing, has an error, or failed to render:
  if (!imageReference || error || hasImageLoadError) {
    if (useCategoryFallback) {
      const dummyUrl = getItemDummySceneImage(itemCategory, itemName);
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={dummyUrl}
          alt={alt}
          className={className}
          {...rest}
        />
      );
    }

    return (
      <div
        className={`bg-ivory-100 border border-ivory-300 flex flex-col items-center justify-center text-stone-400 p-2 ${className}`}
        title={error || "Snapshot unavailable"}
      >
        {fallbackIcon || <ImageOff className="w-5 h-5 text-stone-400" />}
        <span className="text-[10px] mt-1 text-stone-500 font-medium">No snapshot</span>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div
        className={`bg-ivory-100 animate-pulse flex items-center justify-center text-stone-400 ${className}`}
      >
        <Loader2 className="w-5 h-5 animate-spin text-forest-700" />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url || getItemDummySceneImage(itemCategory, itemName)}
      alt={alt}
      onError={() => setHasImageLoadError(true)}
      className={className}
      {...rest}
    />
  );
};
