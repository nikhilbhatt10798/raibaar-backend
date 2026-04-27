import express from "express";
import {
  registerUser,
  loginUser,
  getCurrentUser,
  registerHost,
  requestLoginOtp,
  verifyLoginOtp,
} from "../controllers/auth";
import { authMiddleware } from "../middleware/index";

const router = express.Router();

router.post("/register", registerUser);
router.post("/register-host", registerHost);
router.post("/login", loginUser);
router.post("/otp/request", requestLoginOtp);
router.post("/otp/verify", verifyLoginOtp);
router.get("/me", authMiddleware, getCurrentUser);

export default router;
