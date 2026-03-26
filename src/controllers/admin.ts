import { Request, Response } from "express";
import { User, Property, Booking, Review, Testimonial } from "../models";
import { z } from "zod";

// Type for admin request with user
interface AdminRequest extends Request {
  user?: any;
}

export const getDashboardStats = async (req: AdminRequest, res: Response) => {
  try {
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
    const bookings = await Booking.find({ status: "completed" }).select("totalPrice");
    const totalRevenue = bookings.reduce((sum, booking) => sum + booking.totalPrice, 0);

    res.json({
      users: usersCount,
      hosts: hostsCount,
      properties: propertiesCount,
      totalBookings: bookingsCount,
      completedBookings,
      pendingBookings,
      reviews: reviewsCount,
      revenue: totalRevenue,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch dashboard stats" });
  }
};

export const getAllUsers = async (req: AdminRequest, res: Response) => {
  try {
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
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete user" });
  }
};

export const getAllTestimonials = async (req: AdminRequest, res: Response) => {
  try {
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
    const { testimonialId } = req.params;

    const testimonial = await Testimonial.findByIdAndUpdate(
      testimonialId,
      { approved: true },
      { new: true }
    );

    res.json(testimonial);
  } catch (error) {
    res.status(500).json({ error: "Failed to approve testimonial" });
  }
};

export const rejectTestimonial = async (req: AdminRequest, res: Response) => {
  try {
    const { testimonialId } = req.params;

    await Testimonial.findByIdAndDelete(testimonialId);
    res.json({ message: "Testimonial rejected" });
  } catch (error) {
    res.status(500).json({ error: "Failed to reject testimonial" });
  }
};

export const updateTestimonial = async (req: AdminRequest, res: Response) => {
  try {
    const { testimonialId } = req.params;
    const { comment, rating } = req.body;

    const testimonial = await Testimonial.findByIdAndUpdate(
      testimonialId,
      { comment, rating },
      { new: true }
    );

    res.json(testimonial);
  } catch (error) {
    res.status(500).json({ error: "Failed to update testimonial" });
  }
};

export const getAllReviews = async (req: AdminRequest, res: Response) => {
  try {
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
    const { reviewId } = req.params;

    await Review.findByIdAndDelete(reviewId);
    res.json({ message: "Review deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete review" });
  }
};

export const getProperties = async (req: AdminRequest, res: Response) => {
  try {
    const properties = await Property.find()
      .sort({ createdAt: -1 });

    res.json(properties);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch properties" });
  }
};

export const togglePropertyFeature = async (req: AdminRequest, res: Response) => {
  try {
    const { propertyId } = req.params;

    const property = await Property.findById(propertyId);
    if (!property) {
      return res.status(404).json({ error: "Property not found" });
    }

    property.featured = !property.featured;
    await property.save();

    res.json(property);
  } catch (error) {
    res.status(500).json({ error: "Failed to toggle property feature" });
  }
};

export const togglePropertyActive = async (req: AdminRequest, res: Response) => {
  try {
    const { propertyId } = req.params;

    const property = await Property.findById(propertyId);
    if (!property) {
      return res.status(404).json({ error: "Property not found" });
    }

    property.active = !property.active;
    await property.save();

    res.json(property);
  } catch (error) {
    res.status(500).json({ error: "Failed to toggle property active status" });
  }
};

export const deleteProperty = async (req: AdminRequest, res: Response) => {
  try {
    const { propertyId } = req.params;

    await Property.findByIdAndDelete(propertyId);
    res.json({ message: "Property deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete property" });
  }
};

export const getAllBookings = async (req: AdminRequest, res: Response) => {
  try {
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
    const { bookingId } = req.params;
    const { status } = req.body;

    const booking = await Booking.findByIdAndUpdate(
      bookingId,
      { status },
      { new: true }
    );

    res.json(booking);
  } catch (error) {
    res.status(500).json({ error: "Failed to update booking status" });
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
      password,
      firstName,
      lastName,
      role: "admin",
      isVerified: true,
    });

    await user.save();

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
    res.json(property);
  } catch (error) {
    res.status(500).json({ error: "Failed to add property" });
  }
};

export const updateProperty = async (req: AdminRequest, res: Response) => {
  try {
    const { propertyId } = req.params;
    const updates = req.body;

    const property = await Property.findByIdAndUpdate(propertyId, updates, { new: true });
    res.json(property);
  } catch (error) {
    res.status(500).json({ error: "Failed to update property" });
  }
};

export const createUser = async (req: AdminRequest, res: Response) => {
  try {
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
      password,
      role: role || "guest",
      isVerified: true,
    });

    await user.save();

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

