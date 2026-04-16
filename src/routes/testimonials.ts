const express = require("express");
const testimonialController = require("../controllers/testimonials");
const { authMiddleware } = require("../middleware/index");

const router = express.Router();

// Public routes
router.get("/", testimonialController.getTestimonials); // Get approved testimonials for public display
router.post("/", testimonialController.createTestimonial); // Submit new testimonial (public)

// Protected routes (require authentication)
router.get("/admin/all", authMiddleware, testimonialController.getAllTestimonials); // Get all testimonials for admin
router.get("/:id", testimonialController.getTestimonialById); // Get single testimonial
router.put("/:id", authMiddleware, testimonialController.updateTestimonial); // Update testimonial
router.delete("/:id", authMiddleware, testimonialController.deleteTestimonial); // Delete testimonial
router.put("/:id/approve", authMiddleware, testimonialController.approveTestimonial); // Approve testimonial
router.put("/:id/featured", authMiddleware, testimonialController.toggleFeaturedTestimonial); // Toggle featured status

module.exports = router;
