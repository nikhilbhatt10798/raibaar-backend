import { Request, Response } from "express";
import { z } from "zod";
import Razorpay from "razorpay";
import { Booking, Payment, HostProfile, User, HostWallet } from "../models/index";
import crypto from "crypto";
import { sendBookingConfirmationNotification } from "../utils/notifications";

// Initialize Razorpay
let razorpay: any = null;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

const createPaymentSchema = z.object({
  bookingId: z.string(),
});

const bankAccountSchema = z.object({
  accountHolderName: z.string(),
  accountNumber: z.string(),
  bankName: z.string(),
  ifscCode: z.string(),
});

/**
 * Create payment for a booking
 * This initiates the Razorpay payment order
 */
export const createPaymentForBooking = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!razorpay) {
      res.status(500).json({
        error: "Payment gateway not configured. Missing Razorpay credentials.",
      });
      return;
    }

    const { bookingId } = createPaymentSchema.parse(req.body);
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    // Get booking details
    const booking = await Booking.findById(bookingId).populate("propertyId");
    if (!booking) {
      res.status(404).json({ error: "Booking not found" });
      return;
    }

    if ((booking.userId as any).toString() !== userId.toString()) {
      res.status(403).json({ error: "Unauthorized to pay for this booking" });
      return;
    }

    if (booking.status !== "pending") {
      res.status(400).json({
        error: `Cannot pay for booking with status: ${booking.status}`,
      });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const propertyName = (booking.propertyId as any)?.title || "Property";

    // Create Razorpay order
    const orderData = {
      amount: Math.round(booking.totalPrice * 100), // Convert to paise (smallest unit)
      currency: "INR",
      receipt: `${bookingId}-${Date.now()}`,
      notes: {
        bookingId: bookingId.toString(),
        userId: userId.toString(),
        propertyId: (booking.propertyId as any)?._id?.toString(),
      },
    };

    const razorpayOrder = await razorpay.orders.create(orderData);

    // Create payment record
    const payment = new Payment({
      bookingId,
      userId,
      amount: booking.totalPrice,
      currency: "INR",
      status: "pending",
      razorpayOrderId: razorpayOrder.id,
      basePrice: booking.basePrice,
      serviceFee: booking.serviceFee,
      tax: booking.tax,
      receiptNumber: `PAY-${Date.now().toString().slice(-10)}`,
    });

    await payment.save();

    // Update booking with payment ID
    booking.paymentId = (payment._id as any);
    await booking.save();

    res.json({
      success: true,
      payment: {
        keyId: process.env.RAZORPAY_KEY_ID,
        orderId: payment._id,
        razorpayOrderId: razorpayOrder.id,
        amount: booking.totalPrice,
        currency: "INR",
        customerEmail: user.email,
        customerName: `${user.firstName} ${user.lastName}`,
        description: `Booking for ${propertyName}`,
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
};

/**
 * Handle payment callback from Razorpay
 * This verifies the payment and updates booking status
 */
export const handlePaymentCallback = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    // Verify signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "")
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      res.status(400).json({ error: "Invalid payment signature" });
      return;
    }

    // Get payment record
    const payment = await Payment.findOne({ razorpayOrderId: razorpay_order_id });
    if (!payment) {
      res.status(404).json({ error: "Payment record not found" });
      return;
    }

    // Fetch payment details from Razorpay
    const razorpayPayment = await razorpay.payments.fetch(razorpay_payment_id);

    if (razorpayPayment.status === "captured") {
      // Payment successful
      payment.status = "completed";
      payment.razorpayPaymentId = razorpay_payment_id;
      await payment.save();

      // Update booking status
      const booking = await Booking.findById(payment.bookingId).populate("propertyId");
      if (booking) {
        booking.status = "confirmed";
        booking.paymentStatus = "completed";
        booking.confirmationSentAt = new Date();
        await booking.save();

        // Add earnings to host wallet
        const hostWallet = await HostWallet.findOne({
          hostId: booking.hostId,
        });
        if (hostWallet && payment.basePrice) {
          hostWallet.balance += payment.basePrice; // Host gets base price
          hostWallet.totalEarnings += payment.basePrice;
          hostWallet.save();
        }

        const guestUser = await User.findById(booking.userId);
        const propertyTitle = (booking.propertyId as any)?.title || "Property";

        if (guestUser?.email) {
          await sendBookingConfirmationNotification({
            email: guestUser.email,
            guestName: `${guestUser.firstName} ${guestUser.lastName}`.trim(),
            bookingCode: booking.bookingCode || booking._id.toString(),
            propertyTitle,
            totalAmount: booking.totalPrice,
            checkIn: booking.checkIn.toLocaleDateString("en-IN"),
            checkOut: booking.checkOut.toLocaleDateString("en-IN"),
          });
        }
      }

      res.json({
        success: true,
        message: "Payment verified and booking confirmed",
        bookingId: payment.bookingId,
      });
    } else if (razorpayPayment.status === "failed") {
      payment.status = "failed";
      await payment.save();

      const booking = await Booking.findById(payment.bookingId);
      if (booking) {
        booking.status = "pending";
        booking.paymentStatus = "failed";
        await booking.save();
      }

      res.json({
        success: false,
        message: "Payment failed",
      });
    } else {
      res.json({
        success: false,
        message: "Payment is still processing",
      });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get payment details
 */
export const getPaymentDetails = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { bookingId } = req.params;
    const userId = req.userId;

    const payment = await Payment.findOne({
      bookingId,
      userId,
    }).populate("bookingId");

    if (!payment) {
      res.status(404).json({ error: "Payment not found" });
      return;
    }

    res.json({
      _id: payment._id,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      bookingId: payment.bookingId,
      razorpayOrderId: payment.razorpayOrderId,
      razorpayPaymentId: payment.razorpayPaymentId,
      receiptNumber: payment.receiptNumber,
      createdAt: payment.createdAt,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Verify payment with Razorpay
 */
export const verifyPaymentWithGateway = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { paymentId } = req.body;

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      res.status(404).json({ error: "Payment not found" });
      return;
    }

    if (!payment.razorpayPaymentId) {
      res.status(400).json({ error: "No Razorpay payment ID" });
      return;
    }

    const razorpayPayment = await razorpay.payments.fetch(
      payment.razorpayPaymentId
    );

    res.json({
      paymentId: payment._id,
      status: razorpayPayment.status,
      razorpayStatus: razorpayPayment.status,
      amount: payment.amount,
      currency: payment.currency,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get host earnings
 */
export const getHostEarnings = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { hostId } = req.params;

    const hostWallet = await HostWallet.findOne({ hostId });
    if (!hostWallet) {
      res.status(404).json({ error: "Host wallet not found" });
      return;
    }

    // Get recent bookings with completed payments
    const completedBookings = await Booking.find({
      hostId,
      paymentStatus: "completed",
      status: { $in: ["confirmed", "completed"] },
    })
      .populate("propertyId", "title")
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      balance: hostWallet.balance,
      totalEarnings: hostWallet.totalEarnings,
      totalWithdrawn: hostWallet.totalWithdrawn,
      recentBookings: completedBookings,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Request withdrawal from host earnings
 */
export const requestWithdrawal = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { hostId } = req.params;
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      res.status(400).json({ error: "Invalid withdrawal amount" });
      return;
    }

    const hostWallet = await HostWallet.findOne({ hostId });
    if (!hostWallet) {
      res.status(404).json({ error: "Host wallet not found" });
      return;
    }

    if (hostWallet.balance < amount) {
      res.status(400).json({
        error: "Insufficient balance",
        availableBalance: hostWallet.balance,
      });
      return;
    }

    // Check if bank account is added
    const hostProfile = await HostProfile.findById(hostId);
    if (
      !hostProfile?.bankAccount?.accountNumber ||
      !hostProfile?.bankAccount?.ifscCode
    ) {
      res.status(400).json({ error: "Bank account details not found" });
      return;
    }

    // Create withdrawal record
    const withdrawal: any = {
      amount,
      bankAccount: hostProfile.bankAccount,
      status: "pending" as const,
      requestedAt: new Date(),
    };

    hostWallet.withdrawals.push(withdrawal);
    hostWallet.balance -= amount;
    await hostWallet.save();

    res.json({
      success: true,
      message: "Withdrawal request created",
      withdrawal: {
        amount,
        status: "pending",
        estimatedTime: "2-3 business days",
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get withdrawal history
 */
export const getWithdrawalHistory = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { hostId } = req.params;

    const hostWallet = await HostWallet.findOne({ hostId });
    if (!hostWallet) {
      res.status(404).json({ error: "Host wallet not found" });
      return;
    }

    res.json({
      totalWithdrawn: hostWallet.totalWithdrawn,
      withdrawals: hostWallet.withdrawals,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Add or update bank account details
 */
export const addBankAccount = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { hostId } = req.params;
    const bankData = bankAccountSchema.parse(req.body);

    const hostProfile = await HostProfile.findById(hostId);
    if (!hostProfile) {
      res.status(404).json({ error: "Host profile not found" });
      return;
    }

    hostProfile.bankAccount = bankData;
    await hostProfile.save();

    res.json({
      success: true,
      message: "Bank account updated successfully",
      bankAccount: hostProfile.bankAccount,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
};

/**
 * Get refund status
 */
export const getRefundStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { paymentId } = req.params;

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      res.status(404).json({ error: "Payment not found" });
      return;
    }

    if (payment.refundId) {
      const refund = await razorpay.refunds.fetch(payment.refundId);
      res.json({
        refundId: payment.refundId,
        status: refund.status,
        amount: refund.amount,
        createdAt: payment.refundedAt,
      });
    } else {
      res.json({
        refundId: null,
        status: "not_refunded",
      });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Generate income statement for host
 */
export const generateIncomeStatement = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { hostId } = req.params;
    const { month, year } = req.query;

    const startDate = new Date(
      Number(year) || new Date().getFullYear(),
      Number(month) || new Date().getMonth(),
      1
    );
    const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);

    const bookings = await Booking.find({
      hostId,
      paymentStatus: "completed",
      createdAt: { $gte: startDate, $lte: endDate },
    }).populate("propertyId");

    const totalBookings = bookings.length;
    const totalEarnings = bookings.reduce((sum, b) => sum + b.basePrice, 0);
    const platformCharges = bookings.reduce((sum, b) => sum + b.serviceFee, 0);
    const totalTax = bookings.reduce((sum, b) => sum + b.tax, 0);

    res.json({
      period: `${startDate.toLocaleDateString()}`,
      totalBookings,
      totalEarnings,
      platformCharges,
      totalTax,
      netEarnings: totalEarnings - platformCharges - totalTax,
      bookings: bookings.map((b) => ({
        bookingId: b._id,
        property: (b.propertyId as any)?.title || "Property",
        checkIn: b.checkIn,
        checkOut: b.checkOut,
        earnings: b.basePrice,
        platformCharge: b.serviceFee,
        tax: b.tax,
      })),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
