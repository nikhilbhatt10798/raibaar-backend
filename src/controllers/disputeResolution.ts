import { Request, Response } from "express";

/**
 * Payment Dispute & Support System
 * Handles customer complaints, chargebacks, and payment issues
 */

interface Dispute {
  id: string;
  paymentId: string;
  bookingId: string;
  userId: string;
  hostId: string;
  
  type: "chargeback" | "complaint" | "refund_request" | "double_charge";
  subject: string;
  description: string;
  
  status: "open" | "investigating" | "in_review" | "resolved" | "closed";
  priority: "low" | "medium" | "high" | "urgent";
  
  amountInDispute: number;
  evidence: string[]; // Document IDs or URLs
  
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  resolution?: string;
}

// ============== DISPUTE CREATION & MANAGEMENT ==============

/**
 * Create a payment dispute
 */
export const createDispute = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { paymentId, bookingId, type, subject, description, evidence } = req.body;

    // Validate dispute type
    const validTypes = ["chargeback", "complaint", "refund_request", "double_charge"];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: "Invalid dispute type" });
    }

    // TODO: Fetch payment and booking
    // Validate that it belongs to this user

    const dispute: Dispute = {
      id: `DISPUTE_${Date.now()}`,
      paymentId,
      bookingId,
      userId,
      hostId: "", // Fetch from payment/booking
      type,
      subject,
      description,
      status: "open",
      priority: determinePriority(type),
      amountInDispute: 0, // Fetch from payment
      evidence: evidence || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // TODO: Save to DB

    // Notify support team
    await notifySupportTeam("New dispute created", dispute);

    res.status(201).json({
      success: true,
      dispute,
      message: "Dispute created. Our team will investigate within 24-48 hours.",
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to create dispute" });
  }
};

/**
 * Determine priority based on dispute type
 */
const determinePriority = (type: string): "low" | "medium" | "high" | "urgent" => {
  switch (type) {
    case "chargeback":
      return "urgent"; // Chargebacks cost money, handle immediately
    case "double_charge":
      return "high"; // Customer charged twice
    case "complaint":
      return "medium"; // Service complaints
    case "refund_request":
      return "low"; // Standard refund requests
    default:
      return "medium";
  }
};

/**
 * Get dispute status
 */
export const getDisputeStatus = async (req: Request, res: Response) => {
  try {
    const { disputeId } = req.params;

    // TODO: Fetch from DB
    const dispute: Dispute = {
      id: disputeId,
      paymentId: "PAY_001",
      bookingId: "BOOK_001",
      userId: "USER_001",
      hostId: "HOST_001",
      type: "complaint",
      subject: "Property not as described",
      description: "The property images were misleading...",
      status: "investigating",
      priority: "high",
      amountInDispute: 11180,
      evidence: ["photos_001.jpg", "msg_transcript.pdf"],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    res.json({
      success: true,
      dispute,
      timeline: [
        {
          date: new Date("2026-03-20"),
          status: "open",
          message: "Dispute received",
        },
        {
          date: new Date("2026-03-21"),
          status: "investigating",
          message: "Support team investigating",
        },
      ],
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch dispute status" });
  }
};

/**
 * Update dispute with investigation findings
 */
export const updateDisputeInvestigation = async (req: Request, res: Response) => {
  try {
    const { disputeId } = req.params;
    const { findings, recommendation, resolution } = req.body;

    // TODO: Fetch dispute from DB

    // Save investigation findings
    const investigation = {
      id: `INV_${Date.now()}`,
      disputeId,
      findings,
      recommendation,
      investigatedBy: req.user?.id,
      investigatedAt: new Date(),
    };

    // TODO: Save to DB

    if (recommendation === "refund") {
      // Initiate refund
      // await initiateRefund(disputeId);
    } else if (recommendation === "reject") {
      // Notify user of rejection
      // await notifyDisputeRejection(disputeId);
    } else if (recommendation === "partial_refund") {
      // Process partial refund with custom amount
      // await initiatePartialRefund(disputeId, amount);
    }

    res.json({
      success: true,
      investigation,
      message: `Dispute updated. Recommendation: ${recommendation}`,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to update dispute investigation" });
  }
};

/**
 * Resolve dispute
 */
export const resolveDispute = async (req: Request, res: Response) => {
  try {
    const { disputeId } = req.params;
    const { resolution, refundAmount, notes } = req.body;

    // Validate resolution options
    const validResolutions = ["refund_full", "refund_partial", "reject", "compromise"];
    if (!validResolutions.includes(resolution)) {
      return res.status(400).json({ error: "Invalid resolution type" });
    }

    // TODO: Fetch dispute

    let action = "";
    switch (resolution) {
      case "refund_full":
        // Process full refund
        action = "Full refund initiated";
        break;
      case "refund_partial":
        // Process partial refund with specified amount
        action = `Partial refund of ₹${refundAmount} initiated`;
        break;
      case "reject":
        // Reject dispute
        action = "Dispute rejected";
        break;
      case "compromise":
        // Custom resolution
        action = `Compromise resolution: ${notes}`;
        break;
    }

    // TODO: Update dispute status to "resolved" in DB

    // Notify all parties
    // await notifyUser(userId, `Dispute resolved: ${action}`);
    // await notifyHost(hostId, `Dispute resolved: ${action}`);
    // await notifySupportTeam(`Dispute ${disputeId} resolved`, { resolution, action });

    res.json({
      success: true,
      disputeId,
      resolution,
      action,
      message: `Dispute resolved. ${action}`,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to resolve dispute" });
  }
};

// ============== CHARGEBACK HANDLING ==============

/**
 * Handle incoming chargeback from payment processor
 */
export const handleChargeback = async (chargebackData: any) => {
  try {
    const { id, amount, reason, payment_id } = chargebackData;

    // Create high-priority dispute
    const dispute: Dispute = {
      id: `DISPUTE_${Date.now()}`,
      paymentId: payment_id,
      bookingId: "", // Fetch from payment
      userId: "", // Fetch from payment
      hostId: "", // Fetch from payment
      type: "chargeback",
      subject: `Chargeback: ${reason}`,
      description: `Chargeback ID: ${id}. Amount: ₹${amount}`,
      status: "open",
      priority: "urgent",
      amountInDispute: amount,
      evidence: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // TODO: Save to DB

    // Put payment on hold
    // await holdPayment(payment_id);

    // Notify support team immediately
    await notifySupportTeam("URGENT: Chargeback received", dispute);

    // Alert host and user
    // await notifyUser(...);
    // await notifyHost(...);

    console.log(`Chargeback received: ${id} for ₹${amount}`);
  } catch (error) {
    console.error("Chargeback handling error:", error);
    throw error;
  }
};

/**
 * Respond to chargeback with evidence
 */
export const respondToChargeback = async (req: Request, res: Response) => {
  try {
    const { chargebackId } = req.params;
    const { evidence, explanation, hostStatement } = req.body;

    // Prepare chargeback response
    const response = {
      chargebackId,
      respondedAt: new Date(),
      evidence: [
        ...evidence, // Chat logs, booking confirmation, etc.
        hostStatement, // Host's statement about the transaction
      ],
      explanation,
      supportingDocuments: [
        "booking_confirmation.pdf",
        "payment_receipt.pdf",
        "refund_policy.pdf",
      ],
    };

    // TODO: Submit response to payment processor

    res.json({
      success: true,
      response,
      message: "Chargeback response submitted. Decision within 5-7 business days.",
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to respond to chargeback" });
  }
};

// ============== DOUBLE CHARGE HANDLING ==============

/**
 * Detect and handle double charges
 */
export const detectDoubleCharges = async () => {
  try {
    // Query for duplicate payments within last 1 hour
    // TODO: SELECT * FROM payments WHERE created_at > NOW() - INTERVAL 1 HOUR
    // GROUP BY userId, amount HAVING COUNT(*) > 1

    const duplicatePayments = [
      // Mock data
      {
        userId: "USER_001",
        amount: 11180,
        paymentIds: ["PAY_001", "PAY_002"],
        count: 2,
      },
    ];

    for (const duplicate of duplicatePayments) {
      // Create dispute for automatic refund
      const dispute: Dispute = {
        id: `DISPUTE_${Date.now()}`,
        paymentId: duplicate.paymentIds[1], // Refund the second charge
        bookingId: "", // Fetch
        userId: duplicate.userId,
        hostId: "", // Fetch
        type: "double_charge",
        subject: "Automatic double charge detection",
        description: "System detected duplicate payment. Refunding immediately.",
        status: "resolved",
        priority: "high",
        amountInDispute: duplicate.amount,
        evidence: [...duplicate.paymentIds],
        createdAt: new Date(),
        updatedAt: new Date(),
        resolvedAt: new Date(),
        resolution: "Full refund due to system error",
      };

      // TODO: Save to DB

      // Process automatic refund
      // await initiateRefund(duplicate.paymentIds[1], duplicate.amount, "System-detected double charge");

      // Notify user
      // await notifyUser(duplicate.userId, `Double charge detected and refunded automatically`);
    }

    console.log(`Double charge detection completed. Found: ${duplicatePayments.length}`);
  } catch (error) {
    console.error("Double charge detection error:", error);
  }
};

// ============== COMMUNICATION & NOTIFICATIONS ==============

/**
 * Notify support team of critical payment issues
 */
const notifySupportTeam = async (subject: string, data: any) => {
  try {
    // Send email to support team
    // Send Slack notification
    // Create in-app notification
    console.log(`[SUPPORT ALERT] ${subject}:`, data);
  } catch (error) {
    console.error("Failed to notify support team:", error);
  }
};

/**
 * Notify user of payment issue resolution
 */
export const notifyPaymentResolution = async (req: Request, res: Response) => {
  try {
    const { userId, paymentId, resolution, refundAmount } = req.body;

    const message = {
      subject: "Payment Issue Resolved",
      body: `
Your payment issue (ID: ${paymentId}) has been resolved.

Resolution: ${resolution}
${refundAmount ? `Refund Amount: ₹${refundAmount}` : ""}

The refund will be credited to your original payment method within 2-3 business days.

Thank you for your patience.
      `,
    };

    // TODO: Send via email, SMS, and in-app notification

    res.json({
      success: true,
      message: "Notification sent to user",
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to send notification" });
  }
};

// ============== REFUND ELIGIBILITY & POLICIES ==============

/**
 * Check refund eligibility before booking
 */
export const checkRefundEligibility = async (req: Request, res: Response) => {
  try {
    const { bookingId, cancellationDate } = req.body;

    // TODO: Fetch booking with property details
    // TODO: Get cancellation policy from property

    const refundPolicy = {
      bookingId,
      policies: [
        {
          name: "60+ days before check-in",
          refundPercentage: 100,
          applicable: true,
        },
        {
          name: "30-60 days before check-in",
          refundPercentage: 75,
          applicable: false,
        },
        {
          name: "7-30 days before check-in",
          refundPercentage: 50,
          applicable: false,
        },
        {
          name: "Less than 7 days",
          refundPercentage: 0,
          applicable: false,
        },
      ],
      eligibleRefundAmount: 11180, // 100% based on policy
      platformChargesRefundable: true,
      gstRefundable: true,
    };

    res.json({
      success: true,
      refundPolicy,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to check refund eligibility" });
  }
};

// ============== EXPORT APIs ==============

export const disputeRoutes = (router: any) => {
  router.post("/disputes/:userId", createDispute);
  router.get("/disputes/:disputeId/status", getDisputeStatus);
  router.post("/disputes/:disputeId/investigate", updateDisputeInvestigation);
  router.post("/disputes/:disputeId/resolve", resolveDispute);
  router.post("/chargebacks/:chargebackId/respond", respondToChargeback);
  router.post("/refund/eligibility", checkRefundEligibility);
  router.post("/refund/notify", notifyPaymentResolution);

  return router;
};
