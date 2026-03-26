import { Request, Response } from "express";
import { z } from "zod";
import { Property, Review, HostProfile } from "../models/index";

const createPropertySchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  village: z.string().min(1),
  district: z.string().min(1),
  state: z.string().min(1),
  price: z.number().positive(),
  maxGuests: z.number().positive(),
  images: z.array(z.string()),
  amenities: z.array(z.string()),
  houseRules: z.array(z.string()),
  villageExperience: z.string(),
});

export const createProperty = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = createPropertySchema.parse(req.body);

    // Get host profile
    const hostProfile = await HostProfile.findOne({ userId: req.userId });
    if (!hostProfile) {
      res.status(404).json({ error: "Host profile not found" });
      return;
    }

    const property = new Property({
      ...data,
      hostId: hostProfile._id,
    });

    await property.save();
    res.status(201).json(property);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
};

export const getProperties = async (req: Request, res: Response): Promise<void> => {
  try {
    const { location, minPrice, maxPrice, amenities, sortBy, page = 1, limit = 20 } = req.query;

    let filter: any = { available: true };

    if (location) {
      filter.village = new RegExp(location as string, "i");
    }

    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    if (amenities && Array.isArray(amenities)) {
      filter.amenities = { $in: amenities };
    }

    let query = Property.find(filter).populate("hostId", "bio village verified yearsHosting averageRating");

    if (sortBy === "price") query = query.sort({ price: 1 });
    else if (sortBy === "rating") query = query.sort({ rating: -1 });
    else query = query.sort({ reviewCount: -1 });

    const skip = (Number(page) - 1) * Number(limit);
    const properties = await query.skip(skip).limit(Number(limit));
    const total = await Property.countDocuments(filter);

    res.json({
      data: properties,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getPropertyById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const property = await Property.findById(id).populate("hostId");

    if (!property) {
      res.status(404).json({ error: "Property not found" });
      return;
    }

    res.json(property);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getPropertyReviews = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const reviews = await Review.find({ propertyId: id }).sort({ createdAt: -1 });

    res.json(reviews);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updateProperty = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const data = createPropertySchema.partial().parse(req.body);

    const property = await Property.findById(id);
    if (!property) {
      res.status(404).json({ error: "Property not found" });
      return;
    }

    // Check ownership
    const hostProfile = await HostProfile.findOne({ userId: req.userId });
    if (property.hostId.toString() !== hostProfile?._id.toString()) {
      res.status(403).json({ error: "Unauthorized" });
      return;
    }

    const updated = await Property.findByIdAndUpdate(id, data, { new: true });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getFeaturedProperties = async (req: Request, res: Response): Promise<void> => {
  try {
    const properties = await Property.find({ featured: true, available: true })
      .limit(10)
      .populate("hostId", "bio village verified yearsHosting");

    res.json(properties);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
