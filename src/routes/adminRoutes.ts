const express = require("express");
const {
  getDashboardStats,
  getAllUsers,
  deleteUser,
  getAllTestimonials,
  approveTestimonial,
  rejectTestimonial,
  updateTestimonial,
  getAllReviews,
  deleteReview,
  getProperties,
  getPropertyById,
  togglePropertyFeature,
  togglePropertyActive,
  deleteProperty,
  getAllBookings,
  updateBookingStatus,
  createAdminUser,
  addProperty,
  updateProperty,
  createUser,
  approveBooking,
  getPricingSettings,
  updatePricingSettings,
  getActivityLogs,
} = require("../controllers/admin");
const { authMiddleware } = require("../middleware");

const router = express.Router();

// Dashboard Stats
router.get("/stats", authMiddleware, getDashboardStats);
router.get("/pricing", authMiddleware, getPricingSettings);
router.put("/pricing", authMiddleware, updatePricingSettings);
router.get("/activity-logs", authMiddleware, getActivityLogs);

// User Management
router.get("/users", authMiddleware, getAllUsers);
router.delete("/users/:userId", authMiddleware, deleteUser);

// Testimonial Management
router.get("/testimonials", authMiddleware, getAllTestimonials);
router.put("/testimonials/:testimonialId", authMiddleware, updateTestimonial);
router.put("/testimonials/:testimonialId/approve", authMiddleware, approveTestimonial);
router.delete("/testimonials/:testimonialId/reject", authMiddleware, rejectTestimonial);

// Review Management
router.get("/reviews", authMiddleware, getAllReviews);
router.delete("/reviews/:reviewId", authMiddleware, deleteReview);

// Property Management
router.get("/properties", authMiddleware, getProperties);
router.get("/properties/:propertyId", authMiddleware, getPropertyById);
router.post("/properties", authMiddleware, addProperty);
router.put("/properties/:propertyId", authMiddleware, updateProperty);
router.put("/properties/:propertyId/feature", authMiddleware, togglePropertyFeature);
router.put("/properties/:propertyId/active", authMiddleware, togglePropertyActive);
router.delete("/properties/:propertyId", authMiddleware, deleteProperty);

// Booking Management
router.get("/bookings", authMiddleware, getAllBookings);
router.put("/bookings/:bookingId/status", authMiddleware, updateBookingStatus);
router.put("/bookings/:bookingId/approve", authMiddleware, approveBooking);

// User Management (Add User)
router.post("/users", authMiddleware, createUser);

// Admin Creation (public endpoint, should be restricted in production)
router.post("/create-admin", createAdminUser);

module.exports = router;
