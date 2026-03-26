import { Request, Response } from "express";
import { getFileUrl } from "../middleware/upload";

export const uploadImages = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.files || req.files.length === 0) {
      res.status(400).json({ error: "No files uploaded" });
      return;
    }

    const uploadedFiles = (req.files as Express.Multer.File[]).map((file) => ({
      filename: file.filename,
      url: getFileUrl(file.filename),
      size: file.size,
      mimetype: file.mimetype,
    }));

    res.json({
      message: "Files uploaded successfully",
      files: uploadedFiles,
      count: uploadedFiles.length,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getUploadedImages = async (req: Request, res: Response): Promise<void> => {
  try {
    res.json({
      message: "Upload endpoint is working",
      uploadEndpoint: "/api/upload",
      maxFileSize: "5MB",
      allowedFormats: ["JPEG", "PNG", "GIF", "WebP"],
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
