import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/auth";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      role?: string;
      user?: any;
    }
  }
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
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

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction): void => {
  console.error("Error:", err);
  res.status(err.status || 500).json({
    error: err.message || "Internal Server Error",
  });
};
