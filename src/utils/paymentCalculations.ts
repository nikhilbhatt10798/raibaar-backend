/**
 * Payment Calculation Utilities
 * Handles GST, platform charges, and fee calculations
 */

import { PricingSettings } from "../models/index";

// Configuration
const DEFAULT_PLATFORM_CHARGE_PERCENTAGE = 5; // 5% platform charge
const DEFAULT_GST_PERCENTAGE = 18; // 18% GST (applicable in India)
const MINIMUM_BOOKING_AMOUNT = 0;

export interface PricingConfig {
  convenienceChargePercentage: number;
  gstPercentage: number;
}

interface PaymentBreakdown {
  basePrice: number;
  platformCharge: number;
  gstOnPlatformCharge: number;
  gstOnRoomCharge: number;
  total: number;
  convenienceChargePercentage: number;
  gstPercentage: number;
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
export const getPricingConfig = async (): Promise<PricingConfig> => {
  let settings = await PricingSettings.findOne().sort({ createdAt: 1 });

  if (!settings) {
    settings = await PricingSettings.create({
      convenienceChargePercentage: DEFAULT_PLATFORM_CHARGE_PERCENTAGE,
      gstPercentage: DEFAULT_GST_PERCENTAGE,
    });
  }

  return {
    convenienceChargePercentage: settings.convenienceChargePercentage,
    gstPercentage: settings.gstPercentage,
  };
};

export const calculatePaymentBreakdown = (
  roomPrice: number,
  config: PricingConfig = {
    convenienceChargePercentage: DEFAULT_PLATFORM_CHARGE_PERCENTAGE,
    gstPercentage: DEFAULT_GST_PERCENTAGE,
  }
): PaymentBreakdown => {
  const gstRate = config.gstPercentage / 100;

  // Room charge
  const roomChargeBeforeTax = roomPrice;

  // Platform charge (admin configured percentage of room price)
  const platformChargeBeforeTax =
    (roomPrice * config.convenienceChargePercentage) / 100;

  // GST calculations (admin configured percentage)
  const gstOnRoom = roomChargeBeforeTax * gstRate;
  const gstOnPlatform = platformChargeBeforeTax * gstRate;
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
    convenienceChargePercentage: config.convenienceChargePercentage,
    gstPercentage: config.gstPercentage,
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
  platformChargePercentage: number = DEFAULT_PLATFORM_CHARGE_PERCENTAGE,
  gstPercentage: number = DEFAULT_GST_PERCENTAGE
): {
  hostReceives: number;
  platformCharges: number;
  gstOnPlatformCharge: number;
} => {
  const gstRate = gstPercentage / 100;
  // Extract platform charge and GST
  // Total = roomPrice + platformCharge + gstOnRoom + gstOnPlatform
  // Reverse calculation is complex, so we use the breakdown

  // Assuming we need to work backwards from total
  // Simple approach: platformCharge + GST on platformCharge = (total * platformChargePercentage) / (100 + platformChargePercentage * GST_RATE)

  const platformCharges = (totalAmount * platformChargePercentage) / 100;
  const gstOnPlatformCharge = platformCharges * gstRate;

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
        description: `Platform Service Charge (${breakdown.convenienceChargePercentage}%)`,
        amount: breakdown.platformCharge,
      },
      {
        description: `GST on Room Charges (${breakdown.gstPercentage}%)`,
        amount: breakdown.gstOnRoomCharge,
      },
      {
        description: `GST on Service Charge (${breakdown.gstPercentage}%)`,
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
    totalEarnings -
    totalServiceFees -
    (totalServiceFees * (DEFAULT_GST_PERCENTAGE / 100)) /
      (1 + DEFAULT_GST_PERCENTAGE / 100);

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
