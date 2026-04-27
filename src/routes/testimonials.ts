import express from "express";
import {
  getTestimonials,
  createTestimonial,
  getAllTestimonials,
  getTestimonialById,
  updateTestimonial,
  deleteTestimonial,
  approveTestimonial,
  toggleFeaturedTestimonial,
} from "../controllers/testimonials";
import { authMiddleware } from "../middleware/index";

const router = express.Router();

// Public routes
router.get("/", getTestimonials); // Get approved testimonials for public display
router.post("/", createTestimonial); // Submit new testimonial (public)

// Protected routes (require authentication)
router.get("/admin/all", authMiddleware, getAllTestimonials); // Get all testimonials for admin
router.get("/:id", getTestimonialById); // Get single testimonial
router.put("/:id", authMiddleware, updateTestimonial); // Update testimonial
router.delete("/:id", authMiddleware, deleteTestimonial); // Delete testimonial
router.put("/:id/approve", authMiddleware, approveTestimonial); // Approve testimonial
router.put("/:id/featured", authMiddleware, toggleFeaturedTestimonial); // Toggle featured status

export default router;
