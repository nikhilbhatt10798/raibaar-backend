import { verifyToken } from "../utils/auth";

const authMiddleware = (req: any, res: any, next: any): void => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    res.status(401).json({ error: "Unauthorized - No token provided" });
    return;
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    res.status(401).json({ error: "Unauthorized - Invalid token" });
    return;
  }

  req.userId = decoded.userId;
  req.role = decoded.role;
  next();
};

const errorHandler = (err: any, req: any, res: any, next: any): void => {
  console.error("Error:", err);
  res.status(err.status || 500).json({
    error: err.message || "Internal Server Error",
  });
};

export {
  authMiddleware,
  errorHandler
};
