const { Router } = require("express");
const { registerUser, loginUser, getCurrentUser, registerHost } = require("../controllers/auth");
const { authMiddleware } = require("../middleware/index");

const router = Router();

router.post("/register", registerUser);
router.post("/register-host", registerHost);
router.post("/login", loginUser);
router.get("/me", authMiddleware, getCurrentUser);

module.exports = router;
