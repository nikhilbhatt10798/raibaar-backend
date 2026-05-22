import { Request, Response } from "express";
import {
  MEDIA_LIMITS,
  MEDIA_MIME_TYPES,
  buildStoredMedia,
  removeFiles,
  validateUploadedFiles,
} from "../services/mediaService";

type UploadFiles = Partial<Record<"images" | "videos", Express.Multer.File[]>>;

const sendValidationError = (
  res: Response,
  message: string,
  errors: Record<string, string[]>
) => {
  res.status(400).json({
    success: false,
    message,
    errors,
  });
};

export const uploadMedia = async (req: Request, res: Response): Promise<void> => {
  const filesByField = (req.files || {}) as UploadFiles;
  const allFiles = [...(filesByField.images || []), ...(filesByField.videos || [])];

  try {
    if (allFiles.length === 0) {
      sendValidationError(res, "Please select at least one media file.", {
        media: ["No files were uploaded."],
      });
      return;
    }

    const { errors, validFiles } = await validateUploadedFiles(filesByField);
    if (Object.keys(errors).length > 0) {
      await removeFiles(allFiles);
      const firstMessage = errors.images?.[0] || errors.videos?.[0] || "Upload validation failed.";
      sendValidationError(res, firstMessage, errors);
      return;
    }

    const images = validFiles.images.map(buildStoredMedia);
    const videos = validFiles.videos.map(buildStoredMedia);

    res.json({
      success: true,
      message: "Media uploaded successfully.",
      files: [...images, ...videos],
      images,
      videos,
      count: {
        images: images.length,
        videos: videos.length,
        total: images.length + videos.length,
      },
    });
  } catch (error: any) {
    await removeFiles(allFiles);
    res.status(500).json({
      success: false,
      message: "Media upload failed. Please try again.",
      errors: {
        media: [error.message || "Unexpected upload failure."],
      },
    });
  }
};

export const getUploadInfo = async (req: Request, res: Response): Promise<void> => {
  res.json({
    success: true,
    message: "Upload endpoint is working.",
    uploadEndpoint: "/api/upload",
    limits: {
      images: MEDIA_LIMITS.images,
      videos: MEDIA_LIMITS.videos,
      imageMaxFileSize: `${Math.round(MEDIA_LIMITS.imageSizeBytes / 1024 / 1024)}MB`,
      videoMaxFileSize: `${Math.round(MEDIA_LIMITS.videoSizeBytes / 1024 / 1024)}MB`,
    },
    allowedFormats: {
      images: MEDIA_MIME_TYPES.images,
      videos: MEDIA_MIME_TYPES.videos,
    },
  });
};
