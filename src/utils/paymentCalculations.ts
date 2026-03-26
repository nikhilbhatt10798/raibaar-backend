/**
 * Payment Calculation Utilities
 * Handles GST, platform charges, and fee calculations
 */

// Configuration
const PLATFORM_CHARGE_PERCENTAGE = 5; // 5% platform charge
const GST_RATE = 0.18; // 18% GST (applicable in India)
const MINIMUM_BOOKING_AMOUNT = 0;

interface PaymentBreakdown {
  basePrice: number;
  platformCharge: number;
  gstOnPlatformCharge: number;
  gstOnRoomCharge: number;
  total: number;
  breakdown: {
    roomChargeBeforeTax: number;
    platformChargeBeforeTax: number;
    gstOnRoom: number;
    gstOnPlatform: number;
    totalGST: number;
  };
}

/**
 * Calculate complete payment breakdown
 * Input: base room price for the stay
 * Output: all fees, taxes, and total amount
 */
export const calculatePaymentBreakdown = (roomPrice: number): PaymentBreakdown => {
  // Room charge
  const roomChargeBeforeTax = roomPrice;

  // Platform charge (5% of room price)
  const platformChargeBeforeTax = (roomPrice * PLATFORM_CHARGE_PERCENTAGE) / 100;

  // GST calculations (18%)
  const gstOnRoom = roomChargeBeforeTax * GST_RATE;
  const gstOnPlatform = platformChargeBeforeTax * GST_RATE;
  const totalGST = gstOnRoom + gstOnPlatform;

  // Total
  const total =
    roomChargeBeforeTax + platformChargeBeforeTax + gstOnRoom + gstOnPlatform;

  return {
    basePrice: roomChargeBeforeTax,
    platformCharge: platformChargeBeforeTax,
    gstOnPlatformCharge: gstOnPlatform,
    gstOnRoomCharge: gstOnRoom,
    total: Math.round(total * 100) / 100, // Round to 2 decimals
    breakdown: {
      roomChargeBeforeTax,
      platformChargeBeforeTax,
      gstOnRoom,
      gstOnPlatform,
      totalGST,
    },
  };
};

/**
 * Calculate host earnings after platform charge and GST
 */
export const calculateHostEarnings = (
  totalAmount: number,
  platformChargePercentage: number = PLATFORM_CHARGE_PERCENTAGE
): {
  hostReceives: number;
  platformCharges: number;
  gstOnPlatformCharge: number;
} => {
  // Extract platform charge and GST
  // Total = roomPrice + platformCharge + gstOnRoom + gstOnPlatform
  // Reverse calculation is complex, so we use the breakdown

  // Assuming we need to work backwards from total
  // Simple approach: platformCharge + GST on platformCharge = (total * platformChargePercentage) / (100 + platformChargePercentage * GST_RATE)

  const platformCharges = (totalAmount * platformChargePercentage) / 100;
  const gstOnPlatformCharge = platformCharges * GST_RATE;

  const hostReceives = totalAmount - platformCharges - gstOnPlatformCharge;

  return {
    hostReceives: Math.round(hostReceives * 100) / 100,
    platformCharges: Math.round(platformCharges * 100) / 100,
    gstOnPlatformCharge: Math.round(gstOnPlatformCharge * 100) / 100,
  };
};

/**
 * Format amount for display (with currency)
 */
export const formatAmount = (amount: number, currency: string = "INR"): string => {
  const formatter = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return formatter.format(amount);
};

/**
 * Validate amount for payment
 */
export const validatePaymentAmount = (
  amount: number
): { valid: boolean; error?: string } => {
  if (amount < MINIMUM_BOOKING_AMOUNT) {
    return {
      valid: false,
      error: `Booking amount must be at least ₹${MINIMUM_BOOKING_AMOUNT}`,
    };
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    return {
      valid: false,
      error: "Invalid booking amount",
    };
  }

  return { valid: true };
};

/**
 * Calculate refund amount (after deductions if applicable)
 */
export const calculateRefundAmount = (
  totalPaid: number,
  cancellationPercentageDeduction: number = 0 // 0-100
): {
  refundAmount: number;
  deduction: number;
} => {
  const deduction = (totalPaid * cancellationPercentageDeduction) / 100;
  const refundAmount = totalPaid - deduction;

  return {
    refundAmount: Math.round(refundAmount * 100) / 100,
    deduction: Math.round(deduction * 100) / 100,
  };
};

/**
 * Generate payment receipt details
 */
export const generatePaymentReceipt = (
  bookingId: string,
  propertyName: string,
  checkInDate: Date,
  checkOutDate: Date,
  breakdown: PaymentBreakdown
) => {
  return {
    bookingId,
    propertyName,
    checkInDate: checkInDate.toLocaleDateString("en-IN"),
    checkOutDate: checkOutDate.toLocaleDateString("en-IN"),
    items: [
      {
        description: `Room Charges (${propertyName})`,
        amount: breakdown.basePrice,
      },
      {
        description: "Platform Service Charge",
        amount: breakdown.platformCharge,
      },
      {
        description: "GST on Room Charges (18%)",
        amount: breakdown.gstOnRoomCharge,
      },
      {
        description: "GST on Service Charge (18%)",
        amount: breakdown.gstOnPlatformCharge,
      },
    ],
    totalAmount: breakdown.total,
    currency: "INR",
    generatedAt: new Date(),
  };
};

/**
 * Calculate monthly host settlement
 */
export const calculateMonthlySettlement = (
  bookings: Array<{
    basePrice: number;
    serviceFee: number;
    tax: number;
  }>
) => {
  const totalBookings = bookings.length;
  const totalEarnings = bookings.reduce((sum, b) => sum + b.basePrice, 0);
  const totalServiceFees = bookings.reduce((sum, b) => sum + b.serviceFee, 0);
  const totalTax = bookings.reduce((sum, b) => sum + b.tax, 0);
  const netEarnings =
    totalEarnings - totalServiceFees - (totalServiceFees * GST_RATE) / (1 + GST_RATE);

  return {
    period: new Date(),
    totalBookings,
    totalEarnings: Math.round(totalEarnings * 100) / 100,
    totalServiceFees: Math.round(totalServiceFees * 100) / 100,
    totalTax: Math.round(totalTax * 100) / 100,
    netEarnings: Math.round(netEarnings * 100) / 100,
  };
};

/**
 * Check if payment amount matches booking total
 */
export const verifyPaymentAmount = (
  paymentAmount: number,
  expectedAmount: number,
  tolerance: number = 1 // Allow 1 rupee variance
): boolean => {
  return Math.abs(paymentAmount - expectedAmount) <= tolerance;
};
