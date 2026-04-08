const { Router } = require("express");
const { upload } = require("../middleware/upload");
const { uploadImages, getUploadedImages } = require("../controllers/upload");
const { authMiddleware } = require("../middleware/index");

const router = Router();

// Get upload info
router.get("/", getUploadedImages);

// Upload multiple images (protected - requires authentication)
router.post("/", authMiddleware, upload.array("images", 10), uploadImages);

module.exports = router;
