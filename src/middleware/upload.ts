import multer from "multer";
import path from "path";
import { mkdir } from "fs/promises";
import {
  MEDIA_LIMITS,
  MEDIA_MIME_TYPES,
  getMediaFolder,
} from "../services/mediaService";
import { getFileUrl } from "../utils/urlHelper";

const uploadsDir = path.join(__dirname, "../../uploads");
mkdir(uploadsDir, { recursive: true }).catch(console.error);

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const destination = path.join(uploadsDir, getMediaFolder(file));
      await mkdir(destination, { recursive: true });
      cb(null, destination);
    } catch (error: any) {
      cb(error, "");
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname).toLowerCase();
    const name = path
      .basename(file.originalname, ext)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "media";

    cb(null, `${name}-${uniqueSuffix}${ext}`);
  },
});

const fileFilter: multer.Options["fileFilter"] = (req, file, cb) => {
  const allowedMimes = [...MEDIA_MIME_TYPES.images, ...MEDIA_MIME_TYPES.videos];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
    return;
  }

  cb(new Error("Unsupported file format."));
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: Math.max(MEDIA_LIMITS.imageSizeBytes, MEDIA_LIMITS.videoSizeBytes),
    files: MEDIA_LIMITS.images + MEDIA_LIMITS.videos,
  },
});

export { upload, getFileUrl };
