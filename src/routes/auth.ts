import { Router } from "express";
import { registerUser, loginUser, getCurrentUser, registerHost } from "../controllers/auth";
import { authMiddleware } from "../middleware/index";

const router = Router();

router.post("/register", registerUser);
router.post("/register-host", registerHost);
router.post("/login", loginUser);
router.get("/me", authMiddleware, getCurrentUser);

export default router;
