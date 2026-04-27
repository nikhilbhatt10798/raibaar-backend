import express from "express";
import {
  getHeroContent,
  updateHeroContent,
  getStats,
  addStat,
  updateStat,
  deleteStat,
  getCultureHighlights,
  addCultureHighlight,
  updateCultureHighlight,
  deleteCultureHighlight,
  getMissionItems,
  addMissionItem,
  updateMissionItem,
  deleteMissionItem,
  getHomepageTestimonials,
  addHomepageTestimonial,
  updateHomepageTestimonial,
  deleteHomepageTestimonial,
  getPricingSettings,
  updatePricingSettings,
  getAllContent,
} from "../controllers/content";
import { authMiddleware } from "../middleware/index";

const router = express.Router();

// Get all content (for frontend)
router.get("/", getAllContent);

// Hero Content
router.get("/hero", getHeroContent);
router.put("/hero", authMiddleware, updateHeroContent);

// Stats Management
router.get("/stats", getStats);
router.post("/stats", authMiddleware, addStat);
router.put("/stats/:id", authMiddleware, updateStat);
router.delete("/stats/:id", authMiddleware, deleteStat);

// Culture Highlights Management
router.get("/culture", getCultureHighlights);
router.post("/culture", authMiddleware, addCultureHighlight);
router.put("/culture/:id", authMiddleware, updateCultureHighlight);
router.delete("/culture/:id", authMiddleware, deleteCultureHighlight);

// Mission Items Management
router.get("/mission", getMissionItems);
router.post("/mission", authMiddleware, addMissionItem);
router.put("/mission/:id", authMiddleware, updateMissionItem);
router.delete("/mission/:id", authMiddleware, deleteMissionItem);

// Homepage Testimonials Management
router.get("/testimonials", getHomepageTestimonials);
router.post("/testimonials", authMiddleware, addHomepageTestimonial);
router.put("/testimonials/:id", authMiddleware, updateHomepageTestimonial);
router.delete("/testimonials/:id", authMiddleware, deleteHomepageTestimonial);

// Pricing Settings
router.get("/pricing", getPricingSettings);
router.put("/pricing", authMiddleware, updatePricingSettings);

export default router;
