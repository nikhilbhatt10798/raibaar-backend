import mongoose from "mongoose";

// User Schema
const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    phone: String,
    avatar: String,
    role: { type: String, enum: ["guest", "host", "admin"], default: "guest" },
    isVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Host Profile Schema
const hostProfileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    bio: String,
    village: String,
    district: String,
    state: String,
    yearsHosting: { type: Number, default: 0 },
    verified: { type: Boolean, default: false },
    averageRating: { type: Number, default: 0 },
    totalReviews: { type: Number, default: 0 },
    bankAccount: {
      accountHolderName: String,
      accountNumber: String,
      bankName: String,
      ifscCode: String,
    },
  },
  { timestamps: true }
);

// Property Schema
const propertySchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    village: { type: String, required: true },
    district: { type: String, required: true },
    state: { type: String, required: true },
    latitude: Number,
    longitude: Number,
    price: { type: Number, required: true },
    maxGuests: { type: Number, required: true },
    rating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
    images: [String],
    photos: [
      {
        url: String,
        title: String,
        description: String,
      },
    ],
    amenities: [String],
    houseRules: [String],
    villageExperience: String,
    hostId: { type: mongoose.Schema.Types.ObjectId, ref: "HostProfile", required: true },
    featured: { type: Boolean, default: false },
    available: { type: Boolean, default: true },
    active: { type: Boolean, default: true },
    blockedDates: [{ from: Date, to: Date }],
  },
  { timestamps: true }
);

// Review Schema
const reviewSchema = new mongoose.Schema(
  {
    propertyId: { type: mongoose.Schema.Types.ObjectId, ref: "Property", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    userName: String,
    userAvatar: String,
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: String,
    photos: [String],
  },
  { timestamps: true }
);

// Booking Schema
const bookingSchema = new mongoose.Schema(
  {
    propertyId: { type: mongoose.Schema.Types.ObjectId, ref: "Property", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    hostId: { type: mongoose.Schema.Types.ObjectId, ref: "HostProfile", required: true },
    checkIn: { type: Date, required: true },
    checkOut: { type: Date, required: true },
    guests: { type: Number, required: true },
    basePrice: { type: Number, required: true },
    serviceFee: { type: Number, required: true },
    tax: { type: Number, required: true },
    totalPrice: { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending", "confirmed", "completed", "cancelled"],
      default: "pending",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
    },
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: "Payment" },
    specialRequests: String,
    cancellationReason: String,
  },
  { timestamps: true }
);

// Payment Schema
const paymentSchema = new mongoose.Schema(
  {
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true },
    basePrice: { type: Number },
    serviceFee: { type: Number },
    tax: { type: Number },
    currency: { type: String, default: "INR" },
    status: {
      type: String,
      enum: [
        "pending",
        "authorized",
        "completed",
        "failed",
        "expired",
        "refunded",
        "refund_pending",
      ],
      default: "pending",
    },
    razorpayOrderId: String,
    razorpayPaymentId: String,
    refundId: String,
    failureReason: String,
    refundedAt: Date,
  },
  { timestamps: true }
);

// Host Wallet Schema
const hostWalletSchema = new mongoose.Schema(
  {
    hostId: { type: mongoose.Schema.Types.ObjectId, ref: "HostProfile", required: true, unique: true },
    balance: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 },
    totalWithdrawn: { type: Number, default: 0 },
    withdrawals: [
      {
        amount: Number,
        status: { type: String, enum: ["pending", "completed", "failed"], default: "pending" },
        bankAccount: {
          accountHolderName: String,
          accountNumber: String,
          bankName: String,
          ifscCode: String,
        },
        requestedAt: Date,
        completedAt: Date,
        transactionId: String,
        failureReason: String,
      },
    ],
  },
  { timestamps: true }
);

const pricingSettingsSchema = new mongoose.Schema(
  {
    convenienceChargePercentage: { type: Number, required: true, default: 5, min: 0, max: 100 },
    gstPercentage: { type: Number, required: true, default: 18, min: 0, max: 100 },
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
export const HostProfile = mongoose.model("HostProfile", hostProfileSchema);
export const Property = mongoose.model("Property", propertySchema);
export const Review = mongoose.model("Review", reviewSchema);
export const Booking = mongoose.model("Booking", bookingSchema);
export const Payment = mongoose.model("Payment", paymentSchema);
export const HostWallet = mongoose.model("HostWallet", hostWalletSchema);
export const PricingSettings = mongoose.model("PricingSettings", pricingSettingsSchema);
// Testimonial model is imported from models/Testimonial.ts to avoid duplicate compilation
