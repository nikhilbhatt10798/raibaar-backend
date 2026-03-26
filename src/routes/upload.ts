import { Router } from "express";
import { upload } from "../middleware/upload";
import { uploadImages, getUploadedImages } from "../controllers/upload";
import { authMiddleware } from "../middleware/index";

const router = Router();

// Get upload info
router.get("/", getUploadedImages);

// Upload multiple images (protected - requires authentication)
router.post("/", authMiddleware, upload.array("images", 10), uploadImages);

export default router;
