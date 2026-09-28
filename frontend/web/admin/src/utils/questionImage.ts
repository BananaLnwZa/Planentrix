import { apiConfig } from "@/services/api.config";

export const getQuestionImageUrl = (imagePath: string | null): string | null => {
  if (!imagePath) return null;
  if (/^https?:\/\//i.test(imagePath)) return imagePath;

  const filename = imagePath.split(/[\\/]/).pop();
  return filename
    ? `${apiConfig.baseURL}/uploads/questions/${encodeURIComponent(filename)}`
    : null;
};
