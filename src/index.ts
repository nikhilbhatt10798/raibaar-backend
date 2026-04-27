const dotenv = require("dotenv");
dotenv.config();
/*
<<<<<<< HEAD */
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");
const { errorHandler } = require("./middleware/index");
const authRoutes = require("./routes/auth");
const propertyRoutes = require("./routes/properties");
const bookingRoutes = require("./routes/bookings");
const adminRoutes = require("./routes/adminRoutes");
const userProfileRoutes = require("./routes/userProfile");
const uploadRoutes = require("./routes/upload");
const paymentRoutes = require("./routes/payment");
const contentRoutes = require("./routes/content");
const testimonialRoutes = require("./routes/testimonials");
const { initializePaymentJobs } = require("./utils/paymentScheduler");

const __dirname = require('path').dirname(__filename);
/* ======= 
import express, { Express, Request, Response } from "express";
import cors from "cors";
import mongoose from "mongoose";
import path from "path";
import { errorHandler } from "./middleware/index";
import authRoutes from "./routes/auth";
import propertyRoutes from "./routes/properties";
import bookingRoutes from "./routes/bookings";
import adminRoutes from "./routes/adminRoutes";
import userProfileRoutes from "./routes/userProfile";
import uploadRoutes from "./routes/upload";
import paymentRoutes from "./routes/payment";
import { initializePaymentJobs } from "./utils/paymentScheduler";

//const __dirname = path.dirname(__filename);
 >>>>>>> 982ab92 (live web config) */

const app = express();src/index.ts
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/raibaar";

// Middleware
app.use(cors({ 
  origin: ["https://raibaarstay.com", "http://localhost:5173", process.env.CORS_ORIGIN || "https://raibaarstay.com"]
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads directory
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Database connection
mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("✓ MongoDB connected"))
  .catch((err: any) => console.error("✗ MongoDB connection error:", err));

// Initialize payment scheduled jobs
const paymentJobs = initializePaymentJobs();

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/user", userProfileRoutes);
app.use("/api/properties", propertyRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/content", contentRoutes);
app.use("/api/testimonials", testimonialRoutes);

// Health check
app.get("/api/health", (req: any, res: any) => {
  res.json({ status: "OK", timestamp: new Date() });
});

// Root endpoint
app.get("/api", (req: any, res: any) => {
  res.json({
    message: "Raibaar API Server",
    version: "1.0.0",
    endpoints: {
      auth: "/api/auth",
      properties: "/api/properties",
      bookings: "/api/bookings",
      payments: "/api/payments",
      admin: "/api/admin",
      content: "/api/content",
      testimonials: "/api/testimonials",
      health: "/api/health",
    },
  });
});

// Error handling
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`✓ Server running on http://localhost:${PORT}`);
  console.log("💳 Payment system initialized with background jobs");
});

// Cleanup on shutdown
process.on("SIGTERM", () => {
  console.log("Stopping payment jobs...");
  // Note: Import stopPaymentJobs if needed for graceful shutdown
  process.exit(0);
});

export default app;
