import { Router } from "express";
import {
  getUserProfile,
  updateUserProfile,
  getUserBookings,
  getHostProfile,
  updateHostProfile,
  getHostProperties,
  getHostPropertyById,
  getHostBookings,
  updatePassword,
} from "../controllers/userProfile";
import { authMiddleware } from "../middleware/index";

const router = Router();

// User routes
router.get("/profile", authMiddleware, getUserProfile);
router.put("/profile", authMiddleware, updateUserProfile);
router.get("/bookings", authMiddleware, getUserBookings);
router.put("/password", authMiddleware, updatePassword);

// Host routes
router.get("/host/profile", authMiddleware, getHostProfile);
router.put("/host/profile", authMiddleware, updateHostProfile);
router.get("/host/properties", authMiddleware, getHostProperties);
router.get("/host/properties/:id", authMiddleware, getHostPropertyById);
router.get("/host/bookings", authMiddleware, getHostBookings);

export default router;
