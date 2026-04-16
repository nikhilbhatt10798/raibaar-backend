import { Testimonial, ITestimonial } from "../models/Testimonial";
import mongoose from "mongoose";

// Get all testimonials (for public display - only approved ones)
export const getTestimonials = async (req: any, res: any) => {
  try {
    const { limit = 10, featured } = req.query;
    
    let query: any = { approved: true };
    if (featured === 'true') {
      query.featured = true;
    }

    const testimonials = await Testimonial.find(query)
      .sort({ featured: -1, rating: -1, createdAt: -1 })
      .limit(Number(limit));

    res.json({
      success: true,
      data: testimonials
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching testimonials",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

// Get all testimonials (for admin - includes unapproved)
export const getAllTestimonials = async (req: any, res: any) => {
  try {
    const { page = 1, limit = 20, approved, featured } = req.query;
    
    let query: any = {};
    if (approved !== undefined) {
      query.approved = approved === 'true';
    }
    if (featured !== undefined) {
      query.featured = featured === 'true';
    }

    const testimonials = await Testimonial.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .populate('userId', 'name email')
      .populate('propertyId', 'title village');

    const total = await Testimonial.countDocuments(query);

    res.json({
      success: true,
      data: testimonials,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching testimonials",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

// Get single testimonial by ID
export const getTestimonialById = async (req: any, res: any) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid testimonial ID"
      });
    }

    const testimonial = await Testimonial.findById(id)
      .populate('userId', 'name email')
      .populate('propertyId', 'title village');

    if (!testimonial) {
      return res.status(404).json({
        success: false,
        message: "Testimonial not found"
      });
    }

    res.json({
      success: true,
      data: testimonial
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching testimonial",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

// Create new testimonial
export const createTestimonial = async (req: any, res: any) => {
  try {
    const { name, location, quote, rating, avatar, propertyId } = req.body;

    // Validation
    if (!name || !location || !quote || !rating) {
      return res.status(400).json({
        success: false,
        message: "Name, location, quote, and rating are required"
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5"
      });
    }

    // Create testimonial
    const testimonial = new Testimonial({
      name,
      location,
      quote,
      rating,
      avatar: avatar || null,
      propertyId: propertyId || null,
      userId: req.user?.id || null,
      approved: false, // Manual approval required
      featured: false
    });

    await testimonial.save();

    res.status(201).json({
      success: true,
      message: "Testimonial submitted successfully! It will be visible after approval.",
      data: testimonial
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating testimonial",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

// Update testimonial
export const updateTestimonial = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid testimonial ID"
      });
    }

    const testimonial = await Testimonial.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    );

    if (!testimonial) {
      return res.status(404).json({
        success: false,
        message: "Testimonial not found"
      });
    }

    res.json({
      success: true,
      message: "Testimonial updated successfully",
      data: testimonial
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating testimonial",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

// Delete testimonial
export const deleteTestimonial = async (req: any, res: any) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid testimonial ID"
      });
    }

    const testimonial = await Testimonial.findByIdAndDelete(id);

    if (!testimonial) {
      return res.status(404).json({
        success: false,
        message: "Testimonial not found"
      });
    }

    res.json({
      success: true,
      message: "Testimonial deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting testimonial",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

// Approve testimonial
export const approveTestimonial = async (req: any, res: any) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid testimonial ID"
      });
    }

    const testimonial = await Testimonial.findByIdAndUpdate(
      id,
      { approved: true },
      { new: true }
    );

    if (!testimonial) {
      return res.status(404).json({
        success: false,
        message: "Testimonial not found"
      });
    }

    res.json({
      success: true,
      message: "Testimonial approved successfully",
      data: testimonial
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error approving testimonial",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

// Toggle featured status
export const toggleFeaturedTestimonial = async (req: any, res: any) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid testimonial ID"
      });
    }

    const testimonial = await Testimonial.findById(id);

    if (!testimonial) {
      return res.status(404).json({
        success: false,
        message: "Testimonial not found"
      });
    }

    testimonial.featured = !testimonial.featured;
    await testimonial.save();

    res.json({
      success: true,
      message: `Testimonial ${testimonial.featured ? 'featured' : 'unfeatured'} successfully`,
      data: testimonial
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error toggling featured status",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
};
