import { Request, Response } from "express";
import { z } from "zod";
import { Booking, Property, HostProfile, Review, HostWallet } from "../models/index";
import { calculatePaymentBreakdown } from "../utils/paymentCalculations";
import { differenceInDays } from "date-fns";

const createBookingSchema = z.object({
  propertyId: z.string(),
  checkIn: z.string(),
  checkOut: z.string(),
  guests: z.number().positive(),
  specialRequests: z.string().optional(),
});

const createReviewSchema = z.object({
  propertyId: z.string(),
  rating: z.number().min(1).max(5),
  comment: z.string().optional(),
});

export const createBooking = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = createBookingSchema.parse(req.body);
    const { propertyId, checkIn, checkOut, guests, specialRequests } = data;

    // Get property
    const property = await Property.findById(propertyId);
    if (!property) {
      res.status(404).json({ error: "Property not found" });
      return;
    }

    if (guests > property.maxGuests) {
      res.status(400).json({ error: "Guests exceed maximum capacity" });
      return;
    }

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const nights = differenceInDays(checkOutDate, checkInDate);

    if (nights <= 0) {
      res.status(400).json({ error: "Invalid dates" });
      return;
    }

    // Calculate price with new payment breakdown (includes GST and platform charges)
    const basePrice = property.price * nights;
    const pricing = calculatePaymentBreakdown(basePrice);

    // Get host profile
    const hostProfile = await HostProfile.findById(property.hostId);
    if (!hostProfile) {
      res.status(404).json({ error: "Host not found" });
      return;
    }

    // Ensure host wallet exists
    let hostWallet = await HostWallet.findOne({ hostId: property.hostId });
    if (!hostWallet) {
      hostWallet = new HostWallet({
        hostId: property.hostId,
        balance: 0,
        totalEarnings: 0,
        totalWithdrawn: 0,
        withdrawals: [],
      });
      await hostWallet.save();
    }

    const booking = new Booking({
      propertyId,
      userId: req.userId,
      hostId: property.hostId,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      guests,
      basePrice: pricing.basePrice,
      serviceFee: pricing.platformCharge,
      tax: pricing.gstOnRoomCharge + pricing.gstOnPlatformCharge,
      totalPrice: pricing.total,
      specialRequests,
      status: "pending",
      paymentStatus: "pending",
    });

    await booking.save();

    res.status(201).json({
      message: "Booking created successfully",
      booking: {
        _id: booking._id,
        propertyId: booking.propertyId,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        guests: booking.guests,
        status: booking.status,
        pricing: {
          basePrice: pricing.basePrice,
          platformCharge: pricing.platformCharge,
          gstOnRoom: pricing.gstOnRoomCharge,
          gstOnPlatform: pricing.gstOnPlatformCharge,
          total: pricing.total,
        },
      },
      nextStep: "Proceed to payment",
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
};

export const getBookings = async (req: Request, res: Response): Promise<void> => {
  try {
    const bookings = await Booking.find({ userId: req.userId })
      .populate("propertyId")
      .sort({ createdAt: -1 });

    res.json(bookings);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getBookingById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id).populate("propertyId").populate("userId", "firstName lastName email");

    if (!booking) {
      res.status(404).json({ error: "Booking not found" });
      return;
    }

    res.json(booking);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updateBookingStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ["pending", "confirmed", "completed", "cancelled"];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ error: "Invalid status" });
      return;
    }

    const booking = await Booking.findById(id).populate("propertyId");

    if (!booking) {
      res.status(404).json({ error: "Booking not found" });
      return;
    }

    // Check authorization - only host or admin can approve
    const hostProfile = await HostProfile.findOne({ userId: req.userId });
    const isHost = booking.hostId.toString() === hostProfile?._id.toString();
    const isAdmin = req.role === "admin";

    if (!isHost && !isAdmin) {
      res.status(403).json({ error: "Only the property host or admin can update booking status" });
      return;
    }

    const updated = await Booking.findByIdAndUpdate(id, { status }, { new: true }).populate("propertyId");

    res.json({
      message: `Booking ${status} successfully`,
      booking: updated,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const cancelBooking = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { cancellationReason } = req.body;

    const booking = await Booking.findById(id);
    if (!booking) {
      res.status(404).json({ error: "Booking not found" });
      return;
    }

    if (booking.userId.toString() !== req.userId && booking.hostId.toString() !== req.userId) {
      res.status(403).json({ error: "Unauthorized" });
      return;
    }

    booking.status = "cancelled";
    booking.cancellationReason = cancellationReason;
    await booking.save();

    res.json({ message: "Booking cancelled successfully", booking });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createReview = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = createReviewSchema.parse(req.body);
    const { propertyId, rating, comment } = data;

    // Check if user has completed booking for this property
    const completedBooking = await Booking.findOne({
      userId: req.userId,
      propertyId,
      status: "completed",
    });

    if (!completedBooking) {
      res.status(400).json({ error: "Can only review completed bookings" });
      return;
    }

    // Check if already reviewed
    const existingReview = await Review.findOne({ userId: req.userId, propertyId });
    if (existingReview) {
      res.status(400).json({ error: "You have already reviewed this property" });
      return;
    }

    const review = new Review({
      propertyId,
      userId: req.userId,
      rating,
      comment,
    });

    await review.save();

    // Update property rating
    const allReviews = await Review.find({ propertyId });
    const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

    await Property.findByIdAndUpdate(propertyId, {
      rating: Math.round(avgRating * 10) / 10,
      reviewCount: allReviews.length,
    });

    res.status(201).json({ message: "Review created successfully", review });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
};

export const getReviews = async (req: Request, res: Response): Promise<void> => {
  try {
    const { propertyId } = req.query;

    let filter: any = {};
    if (propertyId) filter.propertyId = propertyId;

    const reviews = await Review.find(filter).sort({ createdAt: -1 });
    res.json(reviews);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getHostBookings = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status } = req.query;

    // Get host profile
    const hostProfile = await HostProfile.findOne({ userId: req.userId });
    if (!hostProfile) {
      res.status(404).json({ error: "Host profile not found" });
      return;
    }

    let filter: any = { hostId: hostProfile._id };
    if (status && status !== "all") {
      filter.status = status;
    }

    const bookings = await Booking.find(filter)
      .populate("propertyId")
      .populate("userId", "firstName lastName email phone")
      .sort({ createdAt: -1 });

    // Group by status for dashboard
    const grouped = {
      pending: bookings.filter((b) => b.status === "pending"),
      confirmed: bookings.filter((b) => b.status === "confirmed"),
      completed: bookings.filter((b) => b.status === "completed"),
      cancelled: bookings.filter((b) => b.status === "cancelled"),
      all: bookings,
    };

    res.json({
      data: status && status !== "all" ? filter.status === status ? bookings : [] : bookings,
      stats: {
        pending: grouped.pending.length,
        confirmed: grouped.confirmed.length,
        completed: grouped.completed.length,
        cancelled: grouped.cancelled.length,
        total: bookings.length,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

