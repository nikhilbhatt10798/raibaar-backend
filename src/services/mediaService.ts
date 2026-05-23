import fs from "fs/promises";
import path from "path";
import { getFileUrl } from "../utils/urlHelper";

export const MEDIA_LIMITS = {
  images: 10,
  videos: 2,
  imageSizeBytes: Number(process.env.MAX_IMAGE_FILE_SIZE || 250 * 1024 * 1024), // 250MB for photos
  videoSizeBytes: Number(process.env.MAX_VIDEO_FILE_SIZE || 50 * 1024 * 1024), // 50MB for videos
};

export const MEDIA_MIME_TYPES = {
  images: ["image/jpeg", "image/png", "image/gif", "image/webp"],
  videos: ["video/mp4", "video/webm", "video/quicktime"],
};

export type MediaKind = "images" | "videos";

export type UploadedMedia = {
  filename: string;
  path: string;
  url: string;
  size: number;
  mimetype: string;
  type: "image" | "video";
};

export type StructuredErrors = Record<string, string[]>;

const imageSignatures: Record<string, number[][]> = {
  "image/jpeg": [[0xff, 0xd8, 0xff]],
  "image/png": [[0x89, 0x50, 0x4e, 0x47]],
  "image/gif": [
    [0x47, 0x49, 0x46, 0x38, 0x37, 0x61],
    [0x47, 0x49, 0x46, 0x38, 0x39, 0x61],
  ],
  "image/webp": [[0x52, 0x49, 0x46, 0x46]],
};

const hasSignature = (buffer: Buffer, signatures: number[][]): boolean =>
  signatures.some((signature) =>
    signature.every((byte, index) => buffer[index] === byte)
  );

const fileLooksValid = async (file: Express.Multer.File): Promise<boolean> => {
  const handle = await fs.open(file.path, "r");
  try {
    const buffer = Buffer.alloc(16);
    const { bytesRead } = await handle.read(buffer, 0, 16, 0);
    if (bytesRead === 0) return false;

    if (file.mimetype.startsWith("image/")) {
      const signatures = imageSignatures[file.mimetype];
      return Boolean(signatures && hasSignature(buffer, signatures));
    }

    if (file.mimetype.startsWith("video/")) {
      return file.size > 0;
    }

    return false;
  } finally {
    await handle.close();
  }
};

export const getMediaKind = (file: Express.Multer.File): MediaKind | null => {
  if (file.fieldname === "images" || file.mimetype.startsWith("image/")) return "images";
  if (file.fieldname === "videos" || file.mimetype.startsWith("video/")) return "videos";
  return null;
};

export const getMediaFolder = (file: Express.Multer.File): string => {
  const kind = getMediaKind(file);
  if (kind === "videos") return path.join("products", "videos");
  return path.join("products", "images");
};

export const buildStoredMedia = (file: Express.Multer.File): UploadedMedia => {
  const relativePath = path.relative(path.join(__dirname, "../../uploads"), file.path);
  const normalizedPath = relativePath.replace(/\\/g, "/");
  const type = getMediaKind(file) === "videos" ? "video" : "image";

  return {
    filename: file.filename,
    path: normalizedPath,
    url: getFileUrl(normalizedPath),
    size: file.size,
    mimetype: file.mimetype,
    type,
  };
};

export const removeFiles = async (files: Express.Multer.File[]): Promise<void> => {
  await Promise.all(
    files.map((file) =>
      fs.unlink(file.path).catch(() => {
        // Ignore cleanup failures; validation response is more important.
      })
    )
  );
};

export const validateUploadedFiles = async (
  filesByField: Partial<Record<MediaKind, Express.Multer.File[]>>
): Promise<{ errors: StructuredErrors; validFiles: Record<MediaKind, Express.Multer.File[]> }> => {
  const errors: StructuredErrors = {};
  const validFiles: Record<MediaKind, Express.Multer.File[]> = {
    images: [],
    videos: [],
  };

  for (const kind of ["images", "videos"] as MediaKind[]) {
    const files = filesByField[kind] || [];
    const maxCount = MEDIA_LIMITS[kind];
    if (files.length > maxCount) {
      errors[kind] = [`Only ${maxCount} ${kind} can be uploaded.`];
      continue;
    }

    for (const file of files) {
      const allowedTypes = MEDIA_MIME_TYPES[kind];
      const maxSize = kind === "images" ? MEDIA_LIMITS.imageSizeBytes : MEDIA_LIMITS.videoSizeBytes;

      if (!allowedTypes.includes(file.mimetype)) {
        errors[kind] = [...(errors[kind] || []), "Unsupported file format."];
        continue;
      }

      if (file.size > maxSize) {
        errors[kind] = [...(errors[kind] || []), "File size exceeds allowed limit."];
        continue;
      }

      if (!(await fileLooksValid(file))) {
        errors[kind] = [...(errors[kind] || []), "File appears to be invalid or corrupted."];
        continue;
      }

      validFiles[kind].push(file);
    }
  }

  return { errors, validFiles };
};
