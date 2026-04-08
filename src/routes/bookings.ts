const { Router } = require("express");
const {
  createBooking,
  getBookings,
  getBookingById,
  updateBookingStatus,
  cancelBooking,
  createReview,
  getReviews,
  getHostBookings,
} = require("../controllers/bookings");
const { authMiddleware } = require("../middleware/index");

const router = Router();

// Public routes
router.get("/reviews", getReviews);

// Protected routes
router.post("/", authMiddleware, createBooking);
router.get("/", authMiddleware, getBookings);
router.get("/:id", authMiddleware, getBookingById);
router.put("/:id/status", authMiddleware, updateBookingStatus);
router.put("/:id/cancel", authMiddleware, cancelBooking);
router.post("/reviews", authMiddleware, createReview);

// Host routes
router.get("/host/bookings", authMiddleware, getHostBookings);

module.exports = router;
