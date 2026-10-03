"use client";

import { useEffect, useState } from "react";
import { authenticatedApiClient } from "@/services/api.client";

export default function AuthenticatedExamImage({
  imageUrl,
  alt,
  className,
}: {
  imageUrl: string | null;
  alt: string;
  className?: string;
}) {
  const [loadedImage, setLoadedImage] = useState<{
    url: string;
    source: string;
  } | null>(null);

  useEffect(() => {
    if (!imageUrl) return;
    let active = true;
    let objectUrl: string | null = null;
    void authenticatedApiClient
      .get<Blob>(imageUrl, { responseType: "blob" })
      .then((response) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(response.data);
        setLoadedImage({ url: imageUrl, source: objectUrl });
      })
      .catch(() => {
        if (active) setLoadedImage(null);
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [imageUrl]);

  if (!imageUrl || loadedImage?.url !== imageUrl) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={loadedImage.source} alt={alt} className={className} />;
}
