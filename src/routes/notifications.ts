import express, { Router, Request, Response } from "express";

const router: Router = express.Router();

// Middleware to check authentication
const authMiddleware = (req: Request, res: Response, next: Function) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  // In real app, verify JWT token here
  next();
};

router.use(authMiddleware);

// Get user notifications
router.get("/", async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    // Mock response - in real app, fetch from database
    res.json({
      notifications: [
        {
          id: "1",
          userId,
          type: "booking",
          title: "Booking Confirmed",
          message: "Your booking at Stone Cottage has been confirmed",
          data: {
            bookingId: "booking-123",
            propertyName: "Stone Cottage",
          },
          read: false,
          createdAt: new Date(Date.now() - 3600000),
        },
        {
          id: "2",
          userId,
          type: "payment",
          title: "Payment Received",
          message: "Payment of ₹2,500 has been received",
          data: {
            amount: 2500,
          },
          read: false,
          createdAt: new Date(Date.now() - 7200000),
        },
        {
          id: "3",
          userId,
          type: "review",
          title: "New Review",
          message: "Guest left a 5-star review for your property",
          data: {
            reviewId: "review-456",
            rating: 5,
          },
          read: true,
          createdAt: new Date(Date.now() - 86400000),
        },
      ],
      unreadCount: 2,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Mark notification as read
router.put("/:notificationId/read", async (req: Request, res: Response) => {
  try {
    res.json({ success: true, message: "Notification marked as read" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Mark all notifications as read
router.put("/mark-all-read", async (req: Request, res: Response) => {
  try {
    res.json({ success: true, message: "All notifications marked as read" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete notification
router.delete("/:notificationId", async (req: Request, res: Response) => {
  try {
    res.json({ success: true, message: "Notification deleted" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create notification (for admin/system use)
router.post("/", async (req: Request, res: Response) => {
  try {
    const { userId, type, title, message, data } = req.body;
    res.status(201).json({
      success: true,
      notification: {
        id: Math.random().toString(36).substr(2, 9),
        userId,
        type,
        title,
        message,
        data,
        read: false,
        createdAt: new Date(),
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
