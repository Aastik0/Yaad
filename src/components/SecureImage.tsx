"use client";

import React, { useState } from "react";
import { useSignedImageUrl } from "@/hooks/useSignedImageUrl";
import { ImageOff, Loader2 } from "lucide-react";

interface SecureImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  imageReference?: string | null;
  fallbackIcon?: React.ReactNode;
}

export const SecureImage: React.FC<SecureImageProps> = ({
  imageReference,
  alt = "Scene snapshot",
  className = "",
  fallbackIcon,
  ...rest
}) => {
  const { url, isLoading, error } = useSignedImageUrl(imageReference);
  const [hasImageLoadError, setHasImageLoadError] = useState(false);

  if (!imageReference || error || hasImageLoadError) {
    return (
      <div
        className={`bg-ivory-200 border border-ivory-300 flex flex-col items-center justify-center text-stone-400 p-2 ${className}`}
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
        className={`bg-ivory-200/80 animate-pulse flex items-center justify-center text-stone-400 ${className}`}
      >
        <Loader2 className="w-5 h-5 animate-spin text-forest-700" />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url || ""}
      alt={alt}
      onError={() => setHasImageLoadError(true)}
      className={className}
      {...rest}
    />
  );
};

