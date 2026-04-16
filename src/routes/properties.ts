const express = require("express");
const {
  createProperty,
  getProperties,
  getPropertyById,
  getPropertyReviews,
  updateProperty,
  getFeaturedProperties,
} = require("../controllers/properties");
const { authMiddleware } = require("../middleware/index");

const router = express.Router();

router.get("/featured", getFeaturedProperties);
router.get("/", getProperties);
router.get("/:id", getPropertyById);
router.get("/:id/reviews", getPropertyReviews);

// Protected routes
router.post("/", authMiddleware, createProperty);
router.put("/:id", authMiddleware, updateProperty);

module.exports = router;
