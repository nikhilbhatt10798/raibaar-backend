import express from "express";
import {
  handlePaymentCallback,
  getHostEarnings,
  requestWithdrawal,
  getWithdrawalHistory,
  addBankAccount,
  getPaymentDetails,
  generateIncomeStatement,
  createPaymentForBooking,
} from "../controllers/payment";
import {
  handleStuckPayments,
  verifyPaymentWithGateway,
  getRefundStatus,
  handlePaymentWebhook,
  getPaymentIssueHistory,
  reconcilePayments,
  processPendingRefunds,
} from "../controllers/paymentFailure";
import { authMiddleware } from "../middleware/index";

const router = express.Router();

// ============== PAYMENT CREATION & PROCESSING ==============
router.post("/create", authMiddleware, createPaymentForBooking);
router.post("/callback", authMiddleware, handlePaymentCallback);

// ============== PAYMENT VERIFICATION & STATUS ==============
router.post("/verify", authMiddleware, verifyPaymentWithGateway);
router.get("/details/:bookingId", authMiddleware, getPaymentDetails);

// ============== HOST EARNINGS & WITHDRAWALS ==============
router.get("/earnings/:hostId", authMiddleware, getHostEarnings);
router.post("/withdrawal/request/:hostId", authMiddleware, requestWithdrawal);
router.get("/withdrawal/history/:hostId", authMiddleware, getWithdrawalHistory);

// ============== BANK ACCOUNT MANAGEMENT ==============
router.post("/bank-account/:hostId", authMiddleware, addBankAccount);

// ============== REFUNDS ==============
router.get("/refund/status/:paymentId", authMiddleware, getRefundStatus);

// ============== REPORTS & STATEMENTS ==============
router.get("/income-statement/:hostId", authMiddleware, generateIncomeStatement);
router.get("/issue-history/:bookingId", authMiddleware, getPaymentIssueHistory);

// ============== ADMIN OPERATIONS ==============
// These should have admin middleware
router.post("/admin/handle-stuck", handleStuckPayments); // Run periodically
router.post("/admin/process-pending-refunds", processPendingRefunds); // Run periodically
router.post("/admin/reconcile", reconcilePayments); // Run daily
router.post("/webhook", handlePaymentWebhook); // Payment gateway webhook

export default router;
