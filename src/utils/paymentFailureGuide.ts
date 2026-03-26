/**
 * COMPLETE PAYMENT FLOW WITH FAILURE HANDLING
 * 
 * This file documents all payment scenarios, failures, and recovery mechanisms
 */

// =====================================================
// PAYMENT FLOW DIAGRAM
// =====================================================

/*
┌─────────────────────────────────────────────────────────────┐
│                    BOOKING INITIATED                         │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │   Calculate Payment Breakdown │
        │  - Base Amount: ₹10,000       │
        │  - Platform Charge (10%): ₹1,000
        │  - GST (18%): ₹180             │
        │  - Total: ₹11,180              │
        │  - Host Receives: ₹8,820       │
        └──────────────┬─────────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │   Create Payment Record       │
        │    Status: PENDING            │
        │   Settlement: PENDING         │
        └──────────────┬─────────────────┘
                       │
                       ▼
    ┌──────────────────────────────────────┐
    │   Initiate Payment with Gateway      │
    │   (Razorpay/Stripe)                  │
    └──────┬───────────────────────────────┘
           │
   ┌───────┴────────┬────────────┐
   │                │            │
   ▼                ▼            ▼
SUCCESS        PENDING       FAILED
   │              │             │
   │              │             ▼
   │              │      ┌──────────────────┐
   │              │      │ FAILURE HANDLER  │
   │              │      │ - Mark as Failed │
   │              │      │ - Trigger Retry  │
   │              │      │ - Max 3 retries  │
   │              │      │ - Send SMS/Email │
   │              │      └──────────┬───────┘
   │              │                 │
   │              │         ┌───────┴───────┐
   │              │         │               │
   ▼              │         ▼               ▼
PAYMENT       30 MIN  RETRY SUCCESS   FINAL FAIL
APPROVED      TIMEOUT   (Return to    │
  │            │        Success)  ┌────┴─────────┐
  │            ▼           │      │ REFUND FLOW  │
  │     ┌─────────────────┐│  ┌───┴──────────────────┐
  │     │ STUCK PAYMENT   │└─▶│ - Initiate Refund   │
  │     │ HANDLER (CRON)  │    │ - Notify User       │
  │     │ Every 5 mins    │    │ - Create Ticket     │
  │     │ - Check gateway │    │ - Release Property  │
  │     │ - Retry or Fail │    └────────────┬────────┘
  │     └────────┬────────┘                  │
  │              │                           ▼
  │              └──────────┬────────────┬─ Wait 2-3 days
  │                         │            │
  │                    REFUNDED      REFUNDED
  │                         │            │
  │                         └────┬───────┘
  │                              │
  ▼                              ▼
PAYMENT CAPTURED         USER NOTIFIED
- Status: COMPLETED       - Refund processed
- Payment confirmed       - Amount restored
- Booking locked          - Support offered
  │
  ▼
SET HOLD PERIOD
- Date: Payment Date
- Duration: 3 days (configurable)
- Reason: Fraud prevention
  │
  ▼
HOLD PERIOD ELAPSED
- Status: READY FOR SETTLEMENT
- Settlement Cycle: Weekly (7 days)
  │
  ▼
BATCH SETTLEMENT PROCESS
- Group payments by host
- Calculate totals
- Verify bank accounts
- Initiate payouts
  │
  ┌──┴──────────────────┬──────────────────┐
 ▼                      ▼                   ▼
PAYOUT         PAYOUT PROCESSING     PAYOUT FAILED
SUCCESS        (Real-time wait)       │
 │              │                     │
 │              ▼                     ▼
 │        PAYOUT COMPLETE     ┌────────────────────┐
 │              │             │ RETRY PAYOUT       │
 │              │             │ - Verify bank      │
 ▼              ▼             │ - Update account   │
SETTLED        HOST NOTIFIED  │ - Create Ticket    │
- Status       - SMS/Email    └─────────┬──────────┘
- Amount       - In-app             │
- Confirmed    - Dashboard      RESOLVED/FAILED
 │                                  │
 ▼                                  ▼
HOST CAN WITHDRAW              MANUAL REVIEW
- Available Balance Updated
*/

// =====================================================
// FAILURE SCENARIOS & RECOVERY
// =====================================================

const PaymentFailureScenarios = {
  // 1. PAYMENT GATEWAY TIMEOUT
  scenario_1: {
    name: "Payment Gateway Timeout",
    trigger: "Customer doesn't complete payment within 30 minutes",
    status_flow: "pending → timeout",
    recovery: {
      automatic: [
        "Change Payment Status to FAILED after 30 mins",
        "Trigger automatic refund if amount was charged",
        "Send SMS to customer: 'Your payment timed out. Please retry.'",
        "Schedule retry notification after 6 hours",
      ],
      manual: [
        "Support agent reviews after 24 hours",
        "Reach out to customer to complete booking",
        "Offer alternative payment methods",
      ],
    },
    preventionMeasures: [
      "Show countdown timer to customer (30 mins)",
      "Send reminder SMS at 5 mins remaining",
      "Save payment progress for 7 days",
      "Allow customer to resume payment",
    ],
  },

  // 2. NETWORK/GATEWAY ERROR
  scenario_2: {
    name: "Network/API Error from Payment Gateway",
    trigger: "API call to Razorpay/Stripe fails",
    status_flow: "pending → error (not failed)",
    recovery: {
      automatic: [
        "Retry immediately (Exponential backoff: 1s, 2s, 4s, 8s)",
        "Max 3 retries within 5 minutes",
        "If all retries fail, mark as pending_manual_review",
        "Alert support team",
      ],
      manual: [
        "Support manually verifies with gateway",
        "If successful in gateway, update local DB",
        "If failed, process refund",
      ],
    },
  },

  // 3. PAYMENT CAPTURED BUT NOT UPDATED (RACE CONDITION)
  scenario_3: {
    name: "Payment Captured in Gateway But Status Not Updated",
    trigger: "Webhook timeout or network error",
    status_flow: "pending → (actually completed in gateway) → reconciliation catch",
    recovery: {
      automatic: [
        "Daily reconciliation job (2 AM)",
        "Compare local payments with gateway",
        "Find discrepancies",
        "Update local DB to match gateway",
        "Process settlement for recovered payments",
      ],
      immediate: [
        "Payment verification endpoint (/verify)",
        "Customer can manually click 'Verify Payment'",
        "Also run on booking confirmation page",
      ],
    },
  },

  // 4. REFUND INITIATED BUT STUCK
  scenario_4: {
    name: "Refund Request Pending",
    trigger: "Refund initiated but not completed in gateway",
    status_flow: "refund_pending → (stuck after 7 days)",
    recovery: {
      automatic: [
        "Monitor refunds every 10 minutes",
        "After 7 days incomplete, create escalation",
        "Verify with payment gateway",
        "Force refund via alternative method if needed",
        "Notify user and support team",
      ],
      manual: [
        "Support agent manually processes bank transfer",
        "Track in separate sheet for accounting",
      ],
    },
  },

  // 5. DOUBLE CHARGE (IDEMPOTENCY KEY MISSING)
  scenario_5: {
    name: "Payment Charged Twice",
    trigger: "Customer clicks pay button twice, or webhook retried",
    status_flow: "completed → completed (duplicate)",
    recovery: {
      automatic: [
        "Detect within 1 hour using duplicate detection",
        "Automatically create dispute for second payment",
        "Initiate full refund for second charge",
        "Send SMS: 'Double charge detected and refunded automatically'",
        "Mark as resolved",
      ],
      prevention: [
        "Implement idempotency keys for all payment requests",
        "Disable pay button after first click",
        "Add loading state during payment processing",
        "Show 'Processing...' message",
      ],
    },
  },

  // 6. CHARGEBACK (CUSTOMER DISPUTES PAYMENT)
  scenario_6: {
    name: "Chargeback from Payment Processor",
    trigger: "Customer files dispute with credit card company",
    status_flow: "completed → chargeback_initiated",
    recovery: {
      immediate: [
        "Receive webhook from payment processor",
        "Create HIGH PRIORITY dispute",
        "Alert support team immediately",
        "Put payment on HOLD (prevent settlement)",
      ],
      within_24_hours: [
        "Gather evidence: booking confirmation, chat logs, refund policy",
        "Review customer's complaint",
        "Gather host's statement",
      ],
      within_5_days: [
        "Submit response to payment processor with evidence",
        "Include: booking proof, conversation transcript, refund policy",
      ],
      settlement: [
        "Processor makes decision",
        "If in favor: funds returned",
        "If against: charge deducted from platform account",
      ],
    },
  },

  // 7. INSUFFICIENT FUNDS IN CUSTOMER ACCOUNT
  scenario_7: {
    name: "Payment Declined - Insufficient Funds",
    trigger: "Customer doesn't have enough balance/credit limit",
    status_flow: "pending → failed (insufficient_funds)",
    recovery: {
      automatic: [
        "Retry after 24 hours (automatic retry flag)",
        "Send SMS: 'Payment failed. Please try again.'",
        "Keep booking in pending_payment state (hold for 48 hours)",
        "Release property if no payment after 48 hours",
      ],
      customer_action: [
        "Customer updates payment method",
        "Retry payment manually",
        "Or use different payment method",
      ],
    },
  },

  // 8. PAYMENT SETTLED BUT HOST BANK TRANSFER FAILED
  scenario_8: {
    name: "Host Payout Failed",
    trigger: "Bank transfer from platform to host fails",
    status_flow: "settled → payout_failed",
    recovery: {
      automatic: [
        "Detect payout failure from bank (NEFT return/callback)",
        "Create escalation ticket",
        "Notify host: 'Payout failed. Please update bank details.'",
        "Retry payout after host updates (or automatically in 5 days)",
      ],
      manual: [
        "Support reviews failure reason (Invalid IFSC, Account closed, etc.)",
        "Contact host to update bank details",
        "Reattempt payout",
        "If repeated failures, process check/RTGS",
      ],
    },
  },

  // 9. SETTLEMENT AMOUNT MISMATCH
  scenario_9: {
    name: "Settlement Amount Discrepancy",
    trigger: "Calculated settlement amount doesn't match actual payments",
    status_flow: "settlement_pending → discrepancy_detected",
    recovery: {
      automatic: [
        "Daily reconciliation detects mismatch",
        "Generate discrepancy report",
        "Alert finance team",
      ],
      investigation: [
        "Review all transactions for period",
        "Check for missed/duplicate payments",
        "Verify calculations (base - charges - GST)",
        "Check for refunds/chargebacks",
      ],
      resolution: [
        "Adjust settlement amount if calculation error",
        "Hold funds if issue unclear",
        "Create manual audit",
      ],
    },
  },

  // 10. FRAUD DETECTION
  scenario_10: {
    name: "Fraudulent Payment Pattern Detected",
    trigger: "Multiple failed attempts, geographic anomaly, velocity check",
    status_flow: "pending → fraud_suspected",
    recovery: {
      immediate: [
        "Block payment",
        "Send OTP verification to email/SMS",
        "Ask customer to confirm transaction",
        "Flag for manual review",
      ],
      investigation: [
        "Check: multiple failed attempts in short time",
        "Check: geographic location mismatch (IP vs billing address)",
        "Check: velocity (multiple payments in minutes)",
        "Check: amount compared to historical patterns",
      ],
      resolution: [
        "If confirmed fraud: reject payment, notify authorities",
        "If legitimate: proceed with strong customer verification",
        "Add to whitelist/allowlist if confirmed safe",
      ],
    },
  },
};

// =====================================================
// ERROR CODES & HANDLING MATRIX
// =====================================================

const PaymentErrorCodes = {
  // 1000-1999: Payment Initiation Errors
  1001: { message: "Invalid amount", retry: false, action: "Validate input" },
  1002: { message: "Payment method not supported", retry: false, action: "Offer alternatives" },
  1003: { message: "Customer blocked", retry: false, action: "Manual review" },
  1004: { message: "Amount exceeds limit", retry: false, action: "Adjust amount" },

  // 2000-2999: Payment Processing Errors
  2001: { message: "Payment declined", retry: true, action: "Retry after 24h" },
  2002: { message: "Insufficient funds", retry: true, action: "Retry after 48h" },
  2003: { message: "Card expired", retry: false, action: "Update card" },
  2004: { message: "Invalid CVV", retry: false, action: "Correct CVV" },
  2005: { message: "Network timeout", retry: true, action: "Automatic retry" },
  2006: { message: "Gateway unavailable", retry: true, action: "Queue for retry" },

  // 3000-3999: Settlement Errors
  3001: { message: "Bank account invalid", retry: false, action: "Update account" },
  3002: { message: "NEFT rejected", retry: true, action: "Retry or use RTGS" },
  3003: { message: "Amount exceeds daily limit", retry: true, action: "Retry next day" },

  // 4000-4999: Refund Errors
  4001: { message: "Refund failed", retry: true, action: "Schedule manual review" },
  4002: { message: "Refund window expired", retry: false, action: "Manual processing" },
  4003: { message: "Refund already processed", retry: false, action: "Notify customer" },

  // 5000-5999: Chargeback Errors
  5001: { message: "Chargeback filed", retry: false, action: "Initiate dispute response" },
  5002: { message: "Chargeback lost", retry: false, action: "Deduct from account" },

  // 6000-6999: System Errors
  6001: { message: "Database error", retry: true, action: "Queue for retry" },
  6002: { message: "Webhook timeout", retry: true, action: "Reconciliation job" },
  6003: { message: "Rate limit exceeded", retry: true, action: "Exponential backoff" },
};

// =====================================================
// MONITORING & ALERTING
// =====================================================

const AlertingThresholds = {
  failedPaymentsPerHour: 50,
  failedRefundsPerDay: 10,
  averageRetryCount: 1.5,
  stuckPaymentsOlderThan: "30 minutes",
  chargebackRate: "0.5%",
  doubleChargeDetection: "30 minutes",
};

export { PaymentFailureScenarios, PaymentErrorCodes, AlertingThresholds };
