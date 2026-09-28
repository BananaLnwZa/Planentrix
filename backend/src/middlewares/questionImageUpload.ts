import multer from "multer";
import type { NextFunction, Request, Response } from "express";

const allowedImageMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const questionImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (_req, file, callback) => {
    if (allowedImageMimeTypes.has(file.mimetype)) {
      callback(null, true);
      return;
    }
    callback(new Error("รองรับเฉพาะรูป JPG, PNG, WEBP และ GIF เท่านั้น"));
  },
});

export const uploadQuestionImage = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  questionImageUpload.single("image")(req, res, (error: unknown) => {
    if (!error) {
      next();
      return;
    }
    const message =
      error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE"
        ? "รูปภาพต้องมีขนาดไม่เกิน 5 MB"
        : error instanceof Error
          ? error.message
          : "ไม่สามารถอัปโหลดรูปภาพได้";
    res.status(400).json({ message });
  });
};
