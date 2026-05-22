import mongoose from "mongoose";
import { normalizeMediaUrl, normalizeMediaUrls } from "../utils/urlHelper";

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
    otpCodeHash: String,
    otpExpiresAt: Date,
    otpLastSentAt: Date,
    lastLoginAt: Date,
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
    videos: [String],
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
    bookingCode: { type: String, unique: true, sparse: true },
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
      enum: ["pending", "completed", "failed", "refunded"],
      default: "pending",
    },
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: "Payment" },
    specialRequests: String,
    cancellationReason: String,
    guestName: String,
    guestEmail: String,
    guestPhone: String,
    invoiceNumber: String,
    confirmationSentAt: Date,
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
    receiptNumber: String,
    paymentMethod: String,
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

const activityLogSchema = new mongoose.Schema(
  {
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    actorRole: String,
    actorName: String,
    action: { type: String, required: true },
    entityType: { type: String, required: true },
    entityId: String,
    entityLabel: String,
    description: { type: String, required: true },
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);

const normalizePropertyMedia = (_doc: any, ret: any) => {
  ret.images = normalizeMediaUrls(ret.images);
  ret.videos = normalizeMediaUrls(ret.videos);
  if (Array.isArray(ret.photos)) {
    ret.photos = ret.photos.map((photo: any) => ({
      ...photo,
      url: normalizeMediaUrl(photo?.url),
    }));
  }
  return ret;
};

propertySchema.set("toJSON", { transform: normalizePropertyMedia });
propertySchema.set("toObject", { transform: normalizePropertyMedia });

const normalizeUserMedia = (_doc: any, ret: any) => {
  if (ret.avatar) ret.avatar = normalizeMediaUrl(ret.avatar);
  return ret;
};

userSchema.set("toJSON", { transform: normalizeUserMedia });
userSchema.set("toObject", { transform: normalizeUserMedia });

const normalizeReviewMedia = (_doc: any, ret: any) => {
  ret.photos = normalizeMediaUrls(ret.photos);
  if (ret.userAvatar) ret.userAvatar = normalizeMediaUrl(ret.userAvatar);
  return ret;
};

reviewSchema.set("toJSON", { transform: normalizeReviewMedia });
reviewSchema.set("toObject", { transform: normalizeReviewMedia });

export const User = mongoose.model("User", userSchema);
export const HostProfile = mongoose.model("HostProfile", hostProfileSchema);
export const Property = mongoose.model("Property", propertySchema);
export const Review = mongoose.model("Review", reviewSchema);
export const Booking = mongoose.model("Booking", bookingSchema);
export const Payment = mongoose.model("Payment", paymentSchema);
export const HostWallet = mongoose.model("HostWallet", hostWalletSchema);
export const PricingSettings = mongoose.model("PricingSettings", pricingSettingsSchema);
export const ActivityLog = mongoose.model("ActivityLog", activityLogSchema);
// Re-export Testimonial from the separate file
export { Testimonial } from "./Testimonial";
