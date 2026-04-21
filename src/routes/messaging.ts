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

// Get all conversations for user
router.get("/conversations", async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    // Mock response - in real app, fetch from database
    res.json({
      conversations: [
        {
          id: "conv-1",
          participantId: "user-123",
          participantName: "John Doe",
          participantAvatar: "https://via.placeholder.com/40",
          propertyId: "prop-456",
          propertyTitle: "Stone Cottage",
          lastMessage: "Great! We look forward to hosting you!",
          lastMessageTime: new Date(Date.now() - 3600000),
          unreadCount: 0,
          isHost: true,
        },
        {
          id: "conv-2",
          participantId: "host-789",
          participantName: "Sarah",
          participantAvatar: "https://via.placeholder.com/40",
          propertyId: "prop-789",
          propertyTitle: "Garden Villa",
          lastMessage: "Do you have any pets?",
          lastMessageTime: new Date(Date.now() - 7200000),
          unreadCount: 2,
          isHost: false,
        },
      ],
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get messages in a conversation
router.get("/conversations/:conversationId", async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;
    // Mock response - in real app, fetch from database
    res.json({
      conversation: {
        id: conversationId,
        participantId: "user-123",
        participantName: "John Doe",
        propertyTitle: "Stone Cottage",
        messages: [
          {
            id: "msg-1",
            senderId: (req as any).user?.id,
            senderName: "You",
            message: "Hi! I'm interested in booking this property.",
            timestamp: new Date(Date.now() - 86400000),
            isOwn: true,
          },
          {
            id: "msg-2",
            senderId: "user-123",
            senderName: "John Doe",
            message: "Hello! It's available for your dates. When would you like to check in?",
            timestamp: new Date(Date.now() - 84600000),
            isOwn: false,
          },
          {
            id: "msg-3",
            senderId: (req as any).user?.id,
            senderName: "You",
            message: "April 15-18 works for us. What's the total cost?",
            timestamp: new Date(Date.now() - 3600000),
            isOwn: true,
          },
          {
            id: "msg-4",
            senderId: "user-123",
            senderName: "John Doe",
            message: "Great! We look forward to hosting you!",
            timestamp: new Date(Date.now() - 1800000),
            isOwn: false,
          },
        ],
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Send message in conversation
router.post("/conversations/:conversationId/messages", async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;
    const { message } = req.body;

    if (!message || message.trim() === "") {
      return res.status(400).json({ error: "Message cannot be empty" });
    }

    res.status(201).json({
      message: {
        id: Math.random().toString(36).substr(2, 9),
        senderId: (req as any).user?.id,
        senderName: "You",
        message,
        timestamp: new Date(),
        isOwn: true,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Start new conversation with property host
router.post("/conversations/property/:propertyId", async (req: Request, res: Response) => {
  try {
    const { propertyId } = req.params;
    const { initialMessage } = req.body;

    res.status(201).json({
      conversation: {
        id: Math.random().toString(36).substr(2, 9),
        participantId: "host-" + Math.random().toString(36).substr(2, 9),
        participantName: "Property Host",
        propertyId,
        propertyTitle: "Beautiful Property",
        lastMessage: initialMessage || "",
        lastMessageTime: new Date(),
        unreadCount: 0,
        isHost: false,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Mark conversation as read
router.put("/conversations/:conversationId/read", async (req: Request, res: Response) => {
  try {
    res.json({ success: true, message: "Conversation marked as read" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
