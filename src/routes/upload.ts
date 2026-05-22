import { Router } from "express";
import multer from "multer";
import { upload } from "../middleware/upload";
import { getUploadInfo, uploadMedia } from "../controllers/upload";
import { authMiddleware } from "../middleware/index";
import { MEDIA_LIMITS, removeFiles } from "../services/mediaService";

const router = Router();

const mediaUpload = upload.fields([
  { name: "images", maxCount: MEDIA_LIMITS.images },
  { name: "videos", maxCount: MEDIA_LIMITS.videos },
]);

const handleUpload = (req: any, res: any, next: any) => {
  mediaUpload(req, res, async (error: any) => {
    if (!error) {
      next();
      return;
    }

    const filesByField = (req.files || {}) as Record<string, Express.Multer.File[]>;
    const uploadedFiles = Object.values(filesByField).flat();
    if (uploadedFiles.length > 0) {
      await removeFiles(uploadedFiles);
    }

    if (error instanceof multer.MulterError) {
      const message =
        error.code === "LIMIT_FILE_SIZE"
          ? "File size exceeds allowed limit."
          : error.code === "LIMIT_UNEXPECTED_FILE" && error.field === "images"
            ? "Maximum 10 images allowed."
            : error.code === "LIMIT_UNEXPECTED_FILE" && error.field === "videos"
              ? "Maximum 2 videos allowed."
              : error.code === "LIMIT_FILE_COUNT"
                ? "Maximum 10 images and 2 videos allowed."
            : "Media upload failed. Please try again.";
      const field = error.field === "images" || error.field === "videos" ? error.field : "media";

      res.status(400).json({
        success: false,
        message,
        errors: {
          [field]: [message],
        },
      });
      return;
    }

    res.status(400).json({
      success: false,
      message: error.message || "Unsupported file format.",
      errors: {
        media: [error.message || "Unsupported file format."],
      },
    });
  });
};

router.get("/", getUploadInfo);
router.post("/", authMiddleware, handleUpload, uploadMedia);

export default router;
