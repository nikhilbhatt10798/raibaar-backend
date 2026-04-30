import multer from "multer";
import path from "path";
import { mkdir } from "fs/promises";
import { getFileUrl } from "../utils/urlHelper";

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "../../uploads");
mkdir(uploadsDir, { recursive: true }).catch(console.error);

// Configure storage
const storage = multer.diskStorage({
  destination: async (req: any, file: any, cb: any) => {
    try {
      await mkdir(uploadsDir, { recursive: true });
      cb(null, uploadsDir);
    } catch (error) {
      cb(error, "");
    }
  },
  filename: (req: any, file: any, cb: any) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  },
});

// Filter for image files only
const fileFilter = (req: any, file: any, cb: any) => {
  const allowedMimes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Only image files are allowed. Received: ${file.mimetype}`));
  }
};

// Create multer instance
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
  },
});

export { upload, getFileUrl };
