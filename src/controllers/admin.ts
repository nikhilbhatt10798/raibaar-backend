import { Request, Response } from "express";
import { User, Property, Booking, Review, Testimonial, PricingSettings, Payment, ActivityLog } from "../models";
import { z } from "zod";
import { hashPassword } from "../utils/auth";
import Razorpay from "razorpay";
import { logActivity } from "../utils/activityLog";

const pricingSchema = z.object({
  convenienceChargePercentage: z.number().min(0).max(100),
  gstPercentage: z.number().min(0).max(100),
});

// Initialize Razorpay
let razorpay: any = null;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

const assertAdmin = (req: AdminRequest, res: Response) => {
  if (req.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return false;
  }

  return true;
};

// Type for admin request with user
interface AdminRequest extends Request {
  user?: any;
  userId?: string;
  role?: string;
}

export const getDashboardStats = async (req: AdminRequest, res: Response) => {
  try {
    if (!assertAdmin(req, res)) return;

    const usersCount = await User.countDocuments();
    const hostsCount = await User.countDocuments({ role: "host" });
    const propertiesCount = await Property.countDocuments();
    const bookingsCount = await Booking.countDocuments();
    const completedBookings = await Booking.countDocuments({
      status: "completed",
    });
    const pendingBookings = await Booking.countDocuments({ status: "pending" });
    const reviewsCount = await Review.countDocuments();

    // Calculate total revenue from completed bookings
    const bookings = await Booking.find({ paymentStatus: "completed" }).select("totalPrice");
    const totalRevenue = bookings.reduce((sum, booking) => sum + booking.totalPrice, 0);
    const pricingSettings = (await PricingSettings.findOne().sort({ createdAt: -1 })) || {
      convenienceChargePercentage: 5,
      gstPercentage: 18,
    };

    res.json({
      users: usersCount,
      hosts: hostsCount,
      properties: propertiesCount,
      totalBookings: bookingsCount,
      completedBookings,
      pendingBookings,
      reviews: reviewsCount,
      revenue: totalRevenue,
      pricingSettings,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch dashboard stats" });
  }
};

export const getAllUsers = async (req: AdminRequest, res: Response) => {
  try {
    if (!assertAdmin(req, res)) return;

    const { search, role } = req.query;
    const query: any = {};

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    if (role) {
      query.role = role;
    }

    const users = await User.find(query)
      .select("-password")
      .sort({ createdAt: -1 });

    res.json(users);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
};

export const deleteUser = async (req: AdminRequest, res: Response) => {
  try {
    if (!assertAdmin(req, res)) return;

    const { userId } = req.params;

    // Don't allow deleting if it's the only admin
    const user = await User.findById(userId);
    if (user?.role === "admin") {
      const adminCount = await User.countDocuments({ role: "admin" });
      if (adminCount === 1) {
        return res.status(400).json({ error: "Cannot delete the only admin" });
      }
    }

    await User.findByIdAndDelete(userId);

    if (user) {
      await logActivity({
        actorId: req.userId,
        actorRole: req.role,
        action: "user_deleted",
        entityType: "user",
        entityId: user._id.toString(),
        entityLabel: user.email,
        description: `${user.email} was deleted by admin`,
      });
    }

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete user" });
  }
};

export const getAllTestimonials = async (req: AdminRequest, res: Response) => {
  try {
    if (!assertAdmin(req, res)) return;

    const { status } = req.query;
    const query: any = {};

    if (status === "pending") {
      query.approved = false;
    } else if (status === "approved") {
      query.approved = true;
    }

    const testimonials = await Testimonial.find(query).sort({ createdAt: -1 });
    res.json(testimonials);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch testimonials" });
  }
};

export const approveTestimonial = async (req: AdminRequest, res: Response) => {
  try {
    if (!assertAdmin(req, res)) return;

    const { testimonialId } = req.params;

    const testimonial = await Testimonial.findByIdAndUpdate(
      testimonialId,
      { approved: true },
      { new: true }
    );

    if (testimonial) {
      await logActivity({
        actorId: req.userId,
        actorRole: req.role,
        action: "testimonial_approved",
        entityType: "testimonial",
        entityId: testimonial._id.toString(),
        entityLabel: testimonial.name,
        description: `Testimonial from ${testimonial.name} was approved by admin`,
      });
    }

    res.json(testimonial);
  } catch (error) {
    res.status(500).json({ error: "Failed to approve testimonial" });
  }
};

export const rejectTestimonial = async (req: AdminRequest, res: Response) => {
  try {
    if (!assertAdmin(req, res)) return;

    const { testimonialId } = req.params;

    const testimonial = await Testimonial.findByIdAndDelete(testimonialId);

    if (testimonial) {
      await logActivity({
        actorId: req.userId,
        actorRole: req.role,
        action: "testimonial_rejected",
        entityType: "testimonial",
        entityId: testimonial._id.toString(),
        entityLabel: testimonial.name,
        description: `Testimonial from ${testimonial.name} was rejected by admin`,
      });
    }

    res.json({ message: "Testimonial rejected" });
  } catch (error) {
    res.status(500).json({ error: "Failed to reject testimonial" });
  }
};

export const updateTestimonial = async (req: AdminRequest, res: Response) => {
  try {
    if (!assertAdmin(req, res)) return;

    const { testimonialId } = req.params;
    const { comment, rating } = req.body;

    const testimonial = await Testimonial.findByIdAndUpdate(
      testimonialId,
      { comment, rating },
      { new: true }
    );

    if (testimonial) {
      await logActivity({
        actorId: req.userId,
        actorRole: req.role,
        action: "testimonial_updated",
        entityType: "testimonial",
        entityId: testimonial._id.toString(),
        entityLabel: testimonial.name,
        description: `Testimonial from ${testimonial.name} was updated by admin`,
      });
    }

    res.json(testimonial);
  } catch (error) {
    res.status(500).json({ error: "Failed to update testimonial" });
  }
};

export const getAllReviews = async (req: AdminRequest, res: Response) => {
  try {
    if (!assertAdmin(req, res)) return;

    const reviews = await Review.find()
      .populate("propertyId", "title")
      .populate("userId", "firstName lastName email")
      .sort({ createdAt: -1 });

    res.json(reviews);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch reviews" });
  }
};

export const deleteReview = async (req: AdminRequest, res: Response) => {
  try {
    if (!assertAdmin(req, res)) return;

    const { reviewId } = req.params;

    const review = await Review.findByIdAndDelete(reviewId);

    if (review) {
      await logActivity({
        actorId: req.userId,
        actorRole: req.role,
        action: "review_deleted",
        entityType: "review",
        entityId: review._id.toString(),
        entityLabel: review.propertyId?.toString(),
        description: "A review was deleted by admin",
      });
    }

    res.json({ message: "Review deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete review" });
  }
};

export const getProperties = async (req: AdminRequest, res: Response) => {
  try {
    if (!assertAdmin(req, res)) return;

    const properties = await Property.find()
      .sort({ createdAt: -1 });

    res.json(properties);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch properties" });
  }
};

export const getPropertyById = async (req: AdminRequest, res: Response) => {
  try {
    if (!assertAdmin(req, res)) return;

    const { propertyId } = req.params;

    const property = await Property.findById(propertyId).populate({
      path: "hostId",
      populate: {
        path: "userId",
        model: "User",
        select: "firstName lastName email phone",
      },
    });

    if (!property) {
      return res.status(404).json({ error: "Property not found" });
    }

    res.json(property);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch property" });
  }
};

export const getActivityLogs = async (req: AdminRequest, res: Response) => {
  try {
    if (!assertAdmin(req, res)) return;

    const { actorRole, entityType, action, limit = "100" } = req.query;
    const query: any = {};

    if (actorRole) query.actorRole = actorRole;
    if (entityType) query.entityType = entityType;
    if (action) query.action = action;

    const logs = await ActivityLog.find(query)
      .sort({ createdAt: -1 })
      .limit(Math.min(Number(limit) || 100, 500));

    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch activity logs" });
  }
};

export const togglePropertyFeature = async (req: AdminRequest, res: Response) => {
  try {
    if (!assertAdmin(req, res)) return;

    const { propertyId } = req.params;

    const property = await Property.findById(propertyId);
    if (!property) {
      return res.status(404).json({ error: "Property not found" });
    }

    property.featured = !property.featured;
    await property.save();

    await logActivity({
      actorId: req.userId,
      actorRole: req.role,
      action: property.featured ? "property_featured" : "property_unfeatured",
      entityType: "property",
      entityId: property._id.toString(),
      entityLabel: property.title,
      description: `${property.title} was ${property.featured ? "featured" : "unfeatured"} by admin`,
    });

    res.json(property);
  } catch (error) {
    res.status(500).json({ error: "Failed to toggle property feature" });
  }
};

export const togglePropertyActive = async (req: AdminRequest, res: Response) => {
  try {
    if (!assertAdmin(req, res)) return;

    const { propertyId } = req.params;

    const property = await Property.findById(propertyId);
    if (!property) {
      return res.status(404).json({ error: "Property not found" });
    }

    property.active = !property.active;
    await property.save();

    await logActivity({
      actorId: req.userId,
      actorRole: req.role,
      action: property.active ? "property_activated" : "property_deactivated",
      entityType: "property",
      entityId: property._id.toString(),
      entityLabel: property.title,
      description: `${property.title} was ${property.active ? "activated" : "deactivated"} by admin`,
    });

    res.json(property);
  } catch (error) {
    res.status(500).json({ error: "Failed to toggle property active status" });
  }
};

export const deleteProperty = async (req: AdminRequest, res: Response) => {
  try {
    if (!assertAdmin(req, res)) return;

    const { propertyId } = req.params;

    const property = await Property.findByIdAndDelete(propertyId);

    if (property) {
      await logActivity({
        actorId: req.userId,
        actorRole: req.role,
        action: "property_deleted",
        entityType: "property",
        entityId: property._id.toString(),
        entityLabel: property.title,
        description: `${property.title} was deleted by admin`,
      });
    }

    res.json({ message: "Property deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete property" });
  }
};

export const getAllBookings = async (req: AdminRequest, res: Response) => {
  try {
    if (!assertAdmin(req, res)) return;

    const { status } = req.query;
    const query: any = {};

    if (status) {
      query.status = status;
    }

    const bookings = await Booking.find(query)
      .populate("propertyId", "title")
      .populate("userId", "firstName lastName email")
      .sort({ createdAt: -1 });

    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
};

export const updateBookingStatus = async (req: AdminRequest, res: Response) => {
  try {
    if (!assertAdmin(req, res)) return;

    const { bookingId } = req.params;
    const { status, cancellationReason } = req.body;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      res.status(404).json({ error: "Booking not found" });
      return;
    }

    // Handle cancellation with refund
    if (status === "cancelled" && booking.status !== "cancelled") {
      // Check if payment was made
      if (booking.paymentStatus === "completed") {
        try {
          // Find the payment record
          const payment = await Payment.findById(booking.paymentId);
          if (payment && payment.razorpayPaymentId && razorpay) {
            // Process refund through Razorpay
            const refund = await razorpay.payments.refund(payment.razorpayPaymentId, {
              amount: Math.round(booking.totalPrice * 100), // Convert to paise
              notes: {
                bookingId: bookingId.toString(),
                reason: cancellationReason || "Admin requested cancellation",
              },
            });

            // Update payment status
            payment.status = "refunded";
            payment.refundId = refund.id;
            await payment.save();
          }
        } catch (refundError: any) {
          console.error("Refund processing error:", refundError);
          // Continue with booking cancellation even if refund fails
        }
      }

      booking.paymentStatus = "refunded";
      booking.cancellationReason = cancellationReason || "Admin requested cancellation";
    }

    booking.status = status;
    await booking.save();

    await logActivity({
      actorId: req.userId,
      actorRole: req.role,
      action: `booking_${status}`,
      entityType: "booking",
      entityId: booking._id.toString(),
      entityLabel: booking.bookingCode || booking._id.toString(),
      description: `Booking ${booking.bookingCode || booking._id} was updated to ${status} by admin`,
      metadata: {
        cancellationReason,
        paymentStatus: booking.paymentStatus,
      },
    });

    const updatedBooking = await booking.populate("propertyId userId");
    res.json(updatedBooking);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to update booking status" });
  }
};

export const createAdminUser = async (req: AdminRequest, res: Response) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    // Check if admin already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "Email already in use" });
    }

    const user = new User({
      email,
      password: await hashPassword(password),
      firstName,
      lastName,
      role: "admin",
      isVerified: true,
    });

    await user.save();

    await logActivity({
      actorRole: "system",
      action: "admin_created",
      entityType: "user",
      entityId: user._id.toString(),
      entityLabel: user.email,
      description: `Admin account ${user.email} was created`,
    });

    res.json({
      message: "Admin user created successfully",
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to create admin user" });
  }
};

export const addProperty = async (req: AdminRequest, res: Response) => {
  try {
    if (!assertAdmin(req, res)) return;

    const { title, description, city, price, amenities, image, hostId } = req.body;

    const property = new Property({
      title,
      description,
      city,
      price,
      amenities: amenities || [],
      image,
      hostId: hostId || req.user?.id,
      featured: false,
      active: true,
    });

    await property.save();

    await logActivity({
      actorId: req.userId,
      actorRole: req.role,
      action: "property_created",
      entityType: "property",
      entityId: property._id.toString(),
      entityLabel: property.title,
      description: `${property.title} was created by admin`,
    });

    res.json(property);
  } catch (error) {
    res.status(500).json({ error: "Failed to add property" });
  }
};

export const updateProperty = async (req: AdminRequest, res: Response) => {
  try {
    if (!assertAdmin(req, res)) return;

    const { propertyId } = req.params;
    const updates = req.body;

    const property = await Property.findByIdAndUpdate(propertyId, updates, { new: true });

    if (property) {
      await logActivity({
        actorId: req.userId,
        actorRole: req.role,
        action: "property_updated",
        entityType: "property",
        entityId: property._id.toString(),
        entityLabel: property.title,
        description: `${property.title} was updated by admin`,
      });
    }

    res.json(property);
  } catch (error) {
    res.status(500).json({ error: "Failed to update property" });
  }
};

export const createUser = async (req: AdminRequest, res: Response) => {
  try {
    if (!assertAdmin(req, res)) return;

    const { firstName, lastName, email, password, role } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "Email already in use" });
    }

    const user = new User({
      firstName,
      lastName,
      email,
      password: await hashPassword(password),
      role: role || "guest",
      isVerified: true,
    });

    await user.save();

    await logActivity({
      actorId: req.userId,
      actorRole: req.role,
      action: "user_created",
      entityType: "user",
      entityId: user._id.toString(),
      entityLabel: user.email,
      description: `${user.email} was created by admin`,
      metadata: {
        createdRole: user.role,
      },
    });

    res.json({
      message: "User created successfully",
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to create user" });
  }
};

export const approveBooking = async (req: AdminRequest, res: Response) => {
  try {
    if (!assertAdmin(req, res)) return;

    const { bookingId } = req.params;

    const booking = await Booking.findByIdAndUpdate(
      bookingId,
      { status: "confirmed" },
      { new: true }
    );

    res.json(booking);
  } catch (error) {
    res.status(500).json({ error: "Failed to approve booking" });
  }
};

export const getPricingSettings = async (req: AdminRequest, res: Response) => {
  try {
    if (!assertAdmin(req, res)) return;

    let settings = await PricingSettings.findOne().sort({ createdAt: -1 });
    if (!settings) {
      settings = await PricingSettings.create({
        convenienceChargePercentage: 5,
        gstPercentage: 18,
      });
    }

    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch pricing settings" });
  }
};

export const updatePricingSettings = async (req: AdminRequest, res: Response) => {
  try {
    if (!assertAdmin(req, res)) return;

    const data = pricingSchema.parse(req.body);

    const existing = await PricingSettings.findOne().sort({ createdAt: -1 });
    const settings = existing
      ? await PricingSettings.findByIdAndUpdate(existing._id, data, { new: true })
      : await PricingSettings.create(data);

    await logActivity({
      actorId: req.userId,
      actorRole: req.role,
      action: "pricing_updated",
      entityType: "settings",
      entityId: settings?._id?.toString(),
      entityLabel: "Pricing settings",
      description: "Pricing settings were updated by admin",
      metadata: data,
    });

    res.json({
      message: "Pricing settings updated successfully",
      settings,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
      return;
    }

    res.status(500).json({ error: "Failed to update pricing settings" });
  }
};

