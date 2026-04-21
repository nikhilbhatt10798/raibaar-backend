const express = require("express");
const {
  registerUser,
  loginUser,
  getCurrentUser,
  registerHost,
  requestLoginOtp,
  verifyLoginOtp,
} = require("../controllers/auth");
const { authMiddleware } = require("../middleware/index");

const router = express.Router();

router.post("/register", registerUser);
router.post("/register-host", registerHost);
router.post("/login", loginUser);
router.post("/otp/request", requestLoginOtp);
router.post("/otp/verify", verifyLoginOtp);
router.get("/me", authMiddleware, getCurrentUser);

module.exports = router;
