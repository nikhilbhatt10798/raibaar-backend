import { Request, Response } from "express";
import Razorpay from "razorpay";
import { Payment, Booking, HostWallet } from "../models/index";
import crypto from "crypto";

const razorpay: any =
  process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
    ? new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
      })
    : null;

/**
 * Handle stuck/pending payments
 * Run this as a scheduled job every 5 minutes
 */
export const handleStuckPayments = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const stuckPayments = await Payment.find({
      status: "pending",
      createdAt: { $lt: thirtyMinutesAgo },
    });

    let processedCount = 0;
    const results = [];

    for (const payment of stuckPayments) {
      try {
        if (payment.razorpayOrderId) {
          const order = await razorpay.orders.fetch(payment.razorpayOrderId);

          if (order.status === "paid") {
            payment.status = "completed";
            await payment.save();

            const booking = await Booking.findById(payment.bookingId);
            if (booking) {
              booking.status = "confirmed";
              booking.paymentStatus = "completed";
              await booking.save();

              const hostWallet = await HostWallet.findOne({ hostId: booking.hostId });
              if (hostWallet && payment.basePrice) {
                hostWallet.balance += payment.basePrice;
                hostWallet.totalEarnings += payment.basePrice;
                await hostWallet.save();
              }
            }

            results.push({
              paymentId: payment._id,
              action: "marked_as_completed",
            });
            processedCount++;
          } else if (order.status === "attempted") {
            payment.status = "failed";
            await payment.save();

            const booking = await Booking.findById(payment.bookingId);
            if (booking) {
              booking.paymentStatus = "failed";
              await booking.save();
            }

            results.push({ paymentId: payment._id, action: "marked_as_failed" });
            processedCount++;
          } else if (order.status === "created") {
            const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            if (payment.createdAt < oneDayAgo) {
              payment.status = "expired";
              await payment.save();

              const booking = await Booking.findById(payment.bookingId);
              if (booking) {
                booking.status = "cancelled";
                booking.cancellationReason = "Payment expired";
                await booking.save();
              }

              results.push({ paymentId: payment._id, action: "expired_and_cancelled" });
              processedCount++;
            }
          }
        }
      } catch (error: any) {
        results.push({ paymentId: payment._id, error: error.message });
      }
    }

    res.json({
      success: true,
      totalStuckPayments: stuckPayments.length,
      processedCount,
      results,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Verify payment status with Razorpay gateway
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
      res.status(400).json({ error: "No gateway payment ID" });
      return;
    }

    const razorpayPayment = await razorpay.payments.fetch(payment.razorpayPaymentId);

    if (razorpayPayment.status === "captured" && payment.status !== "completed") {
      payment.status = "completed";
      await payment.save();
    }

    res.json({
      localStatus: payment.status,
      gatewayStatus: razorpayPayment.status,
      synced: payment.status === razorpayPayment.status,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
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

    if (!payment.refundId) {
      res.json({ refundId: null, status: "not_refunded" });
      return;
    }

    const refund = await razorpay.refunds.fetch(payment.refundId);
    res.json({
      refundId: payment.refundId,
      status: refund.status,
      amount: (refund.amount || 0) / 100,
      createdAt: payment.refundedAt,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Handle payment webhook from Razorpay
 */
export const handlePaymentWebhook = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { event, payload } = req.body;

    const payment = await Payment.findOne({
      razorpayOrderId: payload.order?.entity?.id,
    });

    if (!payment) {
      res.json({ received: true });
      return;
    }

    switch (event) {
      case "payment.authorized":
        payment.status = "authorized";
        break;

      case "payment.failed":
        payment.status = "failed";
        payment.failureReason = payload.payment?.entity?.error_description;
        break;

      case "payment.captured":
        payment.status = "completed";
        payment.razorpayPaymentId = payload.payment?.entity?.id;
        break;

      case "refund.created":
        payment.status = "refunded";
        payment.refundId = payload.refund?.entity?.id;
        payment.refundedAt = new Date();
        break;
    }

    await payment.save();
    res.json({ received: true });
  } catch (error: any) {
    res.json({ received: true });
  }
};

/**
 * Get payment issue history
 */
export const getPaymentIssueHistory = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { bookingId } = req.params;

    const payments = await Payment.find({ bookingId }).sort({ createdAt: -1 });

    const issues = payments
      .filter((p) => p.status === "failed" || p.failureReason)
      .map((p) => ({
        paymentId: p._id,
        status: p.status,
        failureReason: p.failureReason,
        createdAt: p.createdAt,
      }));

    res.json({
      bookingId,
      totalAttempts: payments.length,
      failedAttempts: issues.length,
      issues,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Reconcile payments with Razorpay daily
 */
export const reconcilePayments = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const payments = await Payment.find({ status: { $in: ["pending", "authorized"] } });

    let reconciled = 0;
    const discrepancies = [];

    for (const payment of payments) {
      try {
        if (payment.razorpayPaymentId) {
          const razorpayPayment = await razorpay.payments.fetch(payment.razorpayPaymentId);

          if (
            razorpayPayment.status === "captured" &&
            payment.status !== "completed"
          ) {
            payment.status = "completed";
            await payment.save();
            reconciled++;

            discrepancies.push({
              paymentId: payment._id,
              previousStatus: "pending",
              newStatus: "completed",
            });
          }
        }
      } catch (error: any) {
        discrepancies.push({ paymentId: payment._id, error: error.message });
      }
    }

    res.json({
      totalPaymentsChecked: payments.length,
      reconciled,
      discrepancies,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Process pending refunds
 */
export const processPendingRefunds = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const pendingRefunds = await Payment.find({ status: "refund_pending" });

    let processed = 0;
    const results = [];

    for (const payment of pendingRefunds) {
      try {
        if (payment.razorpayPaymentId && !payment.refundId) {
          const refund = await razorpay.payments.refund(
            payment.razorpayPaymentId,
            {
              amount: Math.round(payment.amount * 100),
              notes: { bookingId: payment.bookingId.toString() },
            }
          );

          payment.status = "refunded";
          payment.refundId = refund.id;
          payment.refundedAt = new Date();
          await payment.save();

          processed++;
          results.push({
            paymentId: payment._id,
            refundId: refund.id,
          });
        }
      } catch (error: any) {
        results.push({ paymentId: payment._id, error: error.message });
      }
    }

    res.json({
      totalPendingRefunds: pendingRefunds.length,
      processed,
      results,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
