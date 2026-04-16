import mongoose, { Document, Schema } from 'mongoose';

export interface ITestimonial extends Document {
  name: string;
  avatar?: string;
  location: string;
  quote: string;
  rating: number;
  propertyId?: string;
  userId?: string;
  approved: boolean;
  featured: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const testimonialSchema = new Schema<ITestimonial>({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  avatar: {
    type: String,
    default: null
  },
  location: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  quote: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  propertyId: {
    type: Schema.Types.ObjectId,
    ref: 'Property',
    default: null
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  approved: {
    type: Boolean,
    default: false
  },
  featured: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

testimonialSchema.index({ approved: 1, featured: -1 });
testimonialSchema.index({ rating: -1 });
testimonialSchema.index({ createdAt: -1 });

export const Testimonial = mongoose.model<ITestimonial>('Testimonial', testimonialSchema);
