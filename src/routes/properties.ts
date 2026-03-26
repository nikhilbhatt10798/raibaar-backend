import { Router } from "express";
import {
  createProperty,
  getProperties,
  getPropertyById,
  getPropertyReviews,
  updateProperty,
  getFeaturedProperties,
} from "../controllers/properties";
import { authMiddleware } from "../middleware/index";

const router = Router();

router.get("/featured", getFeaturedProperties);
router.get("/", getProperties);
router.get("/:id", getPropertyById);
router.get("/:id/reviews", getPropertyReviews);

// Protected routes
router.post("/", authMiddleware, createProperty);
router.put("/:id", authMiddleware, updateProperty);

export default router;
