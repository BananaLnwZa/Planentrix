"use client";

import { useEffect, useState } from "react";
import instructorExamService from "@/services/instructor-exam.service";

interface AuthenticatedQuestionImageProps {
  questionBankId: number;
  imagePath: string | null;
  alt: string;
  className?: string;
}

export default function AuthenticatedQuestionImage({
  questionBankId,
  imagePath,
  alt,
  className,
}: AuthenticatedQuestionImageProps) {
  const [loadedImage, setLoadedImage] = useState<{
    path: string;
    source: string;
  } | null>(null);

  useEffect(() => {
    if (!imagePath) return;

    let active = true;
    let objectUrl: string | null = null;
    void instructorExamService
      .getQuestionImageBlob(questionBankId, imagePath)
      .then((blob) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setLoadedImage({ path: imagePath, source: objectUrl });
      })
      .catch(() => {
        if (active) setLoadedImage(null);
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [imagePath, questionBankId]);

  if (!imagePath || loadedImage?.path !== imagePath) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={loadedImage.source} alt={alt} className={className} />;
}
