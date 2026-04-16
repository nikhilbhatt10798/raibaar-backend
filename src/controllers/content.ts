import { Request, Response } from "express";
import { z } from "zod";
import { PricingSettings } from "../models";

// Type for admin request with user
interface AdminRequest extends Request {
  user?: any;
}

// Content Schema Types
const heroContentSchema = z.object({
  title: z.string(),
  subtitle: z.string(),
  backgroundImage: z.string(),
  location: z.string(),
});

const statSchema = z.object({
  icon: z.string(),
  value: z.string(),
  label: z.string(),
});

const cultureHighlightSchema = z.object({
  title: z.string(),
  description: z.string(),
  image: z.string(),
});

const missionItemSchema = z.object({
  icon: z.string(),
  title: z.string(),
  description: z.string(),
});

const testimonialSchema = z.object({
  name: z.string(),
  avatar: z.string(),
  location: z.string(),
  quote: z.string(),
  rating: z.number().min(1).max(5),
});

const pricingSettingsSchema = z.object({
  convenienceChargePercentage: z.number().min(0).max(100),
  gstPercentage: z.number().min(0).max(100),
});

// In-memory storage for demonstration (in production, use MongoDB)
let heroContent = {
  title: "Stay Local, Sustain Life",
  subtitle: "Discover authentic village homestays in the Himalayas. Your stay creates livelihoods and preserves centuries of culture.",
  backgroundImage: "/src/assets/hero-village.jpg",
  location: "Uttarakhand, India"
};

let stats = [
  { id: "1", icon: "Home", value: "50+", label: "Village Homestays" },
  { id: "2", icon: "Users", value: "2,000+", label: "Happy Travelers" },
  { id: "3", icon: "TrendingUp", value: "₹15L+", label: "Income to Villages" },
  { id: "4", icon: "Leaf", value: "30+", label: "Villages Empowered" }
];

let cultureHighlights = [
  {
    id: "1",
    title: "Kumaoni Cuisine",
    description: "Taste dishes like Bhatt ki Churkani and Aloo ke Gutke prepared by village grandmothers.",
    image: "https://images.unsplash.com/photo-1567337710282-00832b415979?w=400"
  },
  {
    id: "2",
    title: "Folk Music & Dance",
    description: "Experience Jhora and Chanchari — dances performed during festivals under starlit skies.",
    image: "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400"
  },
  {
    id: "3",
    title: "Traditional Weaving",
    description: "Learn centuries-old weaving techniques from Kumaoni women artisans.",
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400"
  }
];

let missionItems = [
  {
    id: "1",
    icon: "TrendingUp",
    title: "Reverse Migration",
    description: "Thousands leave Uttarakhand's villages for cities each year. By creating tourism livelihoods, we give them a reason to stay — or return."
  },
  {
    id: "2",
    icon: "Users",
    title: "Local Employment",
    description: "Each homestay employs local cooks, guides, and caretakers. Your stay directly funds 3-5 village jobs on average."
  },
  {
    id: "3",
    icon: "Leaf",
    title: "Cultural Preservation",
    description: "Every homestay is a living museum. From traditional architecture to heirloom recipes, your visit helps preserve what modernity forgets."
  }
];

let testimonials = [
  {
    id: "t1",
    name: "Meera Krishnan",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
    location: "Bengaluru",
    quote: "Raibaar gave me an experience no luxury hotel ever could. Living with a local family, eating home-cooked meals changed my perspective on travel forever.",
    rating: 5
  },
  {
    id: "t2",
    name: "James Chen",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
    location: "Singapore",
    quote: "I came for a weekend and stayed a week. The village life is addictive in its simplicity.",
    rating: 5
  },
  {
    id: "t3",
    name: "Anjali Deshmukh",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop",
    location: "Mumbai",
    quote: "My children learned more in 3 days at a village homestay than in months of school.",
    rating: 5
  }
];

const getOrCreatePricingSettings = async () => {
  let settings = await PricingSettings.findOne().sort({ createdAt: 1 });

  if (!settings) {
    settings = await PricingSettings.create({
      convenienceChargePercentage: 5,
      gstPercentage: 18,
    });
  }

  return settings;
};

// Hero Content Management
export const getHeroContent = async (req: AdminRequest, res: Response) => {
  try {
    res.json(heroContent);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch hero content" });
  }
};

export const updateHeroContent = async (req: AdminRequest, res: Response) => {
  try {
    const validatedData = heroContentSchema.parse(req.body);
    heroContent = validatedData;
    res.json(heroContent);
  } catch (error) {
    res.status(400).json({ error: "Invalid hero content data" });
  }
};

// Stats Management
export const getStats = async (req: AdminRequest, res: Response) => {
  try {
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch stats" });
  }
};

export const addStat = async (req: AdminRequest, res: Response) => {
  try {
    const validatedData = statSchema.parse(req.body);
    const newStat = { ...validatedData, id: Date.now().toString() };
    stats.push(newStat);
    res.json(newStat);
  } catch (error) {
    res.status(400).json({ error: "Invalid stat data" });
  }
};

export const updateStat = async (req: AdminRequest, res: Response) => {
  try {
    const { id } = req.params;
    const validatedData = statSchema.parse(req.body);
    
    const index = stats.findIndex(stat => stat.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "Stat not found" });
    }
    
    stats[index] = { ...validatedData, id };
    res.json(stats[index]);
  } catch (error) {
    res.status(400).json({ error: "Invalid stat data" });
  }
};

export const deleteStat = async (req: AdminRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    const index = stats.findIndex(stat => stat.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "Stat not found" });
    }
    
    stats.splice(index, 1);
    res.json({ message: "Stat deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete stat" });
  }
};

// Culture Highlights Management
export const getCultureHighlights = async (req: AdminRequest, res: Response) => {
  try {
    res.json(cultureHighlights);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch culture highlights" });
  }
};

export const addCultureHighlight = async (req: AdminRequest, res: Response) => {
  try {
    const validatedData = cultureHighlightSchema.parse(req.body);
    const newHighlight = { ...validatedData, id: Date.now().toString() };
    cultureHighlights.push(newHighlight);
    res.json(newHighlight);
  } catch (error) {
    res.status(400).json({ error: "Invalid culture highlight data" });
  }
};

export const updateCultureHighlight = async (req: AdminRequest, res: Response) => {
  try {
    const { id } = req.params;
    const validatedData = cultureHighlightSchema.parse(req.body);
    
    const index = cultureHighlights.findIndex(item => item.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "Culture highlight not found" });
    }
    
    cultureHighlights[index] = { ...validatedData, id };
    res.json(cultureHighlights[index]);
  } catch (error) {
    res.status(400).json({ error: "Invalid culture highlight data" });
  }
};

export const deleteCultureHighlight = async (req: AdminRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    const index = cultureHighlights.findIndex(item => item.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "Culture highlight not found" });
    }
    
    cultureHighlights.splice(index, 1);
    res.json({ message: "Culture highlight deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete culture highlight" });
  }
};

// Mission Items Management
export const getMissionItems = async (req: AdminRequest, res: Response) => {
  try {
    res.json(missionItems);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch mission items" });
  }
};

export const addMissionItem = async (req: AdminRequest, res: Response) => {
  try {
    const validatedData = missionItemSchema.parse(req.body);
    const newItem = { ...validatedData, id: Date.now().toString() };
    missionItems.push(newItem);
    res.json(newItem);
  } catch (error) {
    res.status(400).json({ error: "Invalid mission item data" });
  }
};

export const updateMissionItem = async (req: AdminRequest, res: Response) => {
  try {
    const { id } = req.params;
    const validatedData = missionItemSchema.parse(req.body);
    
    const index = missionItems.findIndex(item => item.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "Mission item not found" });
    }
    
    missionItems[index] = { ...validatedData, id };
    res.json(missionItems[index]);
  } catch (error) {
    res.status(400).json({ error: "Invalid mission item data" });
  }
};

export const deleteMissionItem = async (req: AdminRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    const index = missionItems.findIndex(item => item.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "Mission item not found" });
    }
    
    missionItems.splice(index, 1);
    res.json({ message: "Mission item deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete mission item" });
  }
};

// Testimonials Management (for homepage, separate from user testimonials)
export const getHomepageTestimonials = async (req: AdminRequest, res: Response) => {
  try {
    res.json(testimonials);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch testimonials" });
  }
};

export const addHomepageTestimonial = async (req: AdminRequest, res: Response) => {
  try {
    const validatedData = testimonialSchema.parse(req.body);
    const newTestimonial = { ...validatedData, id: Date.now().toString() };
    testimonials.push(newTestimonial);
    res.json(newTestimonial);
  } catch (error) {
    res.status(400).json({ error: "Invalid testimonial data" });
  }
};

export const updateHomepageTestimonial = async (req: AdminRequest, res: Response) => {
  try {
    const { id } = req.params;
    const validatedData = testimonialSchema.parse(req.body);
    
    const index = testimonials.findIndex(item => item.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "Testimonial not found" });
    }
    
    testimonials[index] = { ...validatedData, id };
    res.json(testimonials[index]);
  } catch (error) {
    res.status(400).json({ error: "Invalid testimonial data" });
  }
};

export const deleteHomepageTestimonial = async (req: AdminRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    const index = testimonials.findIndex(item => item.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "Testimonial not found" });
    }
    
    testimonials.splice(index, 1);
    res.json({ message: "Testimonial deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete testimonial" });
  }
};

export const getPricingSettings = async (req: AdminRequest, res: Response) => {
  try {
    const settings = await getOrCreatePricingSettings();
    res.json({
      convenienceChargePercentage: settings.convenienceChargePercentage,
      gstPercentage: settings.gstPercentage,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch pricing settings" });
  }
};

export const updatePricingSettings = async (req: AdminRequest, res: Response) => {
  try {
    const validatedData = pricingSettingsSchema.parse(req.body);
    const settings = await getOrCreatePricingSettings();

    settings.convenienceChargePercentage = validatedData.convenienceChargePercentage;
    settings.gstPercentage = validatedData.gstPercentage;
    await settings.save();

    res.json({
      convenienceChargePercentage: settings.convenienceChargePercentage,
      gstPercentage: settings.gstPercentage,
    });
  } catch (error) {
    res.status(400).json({ error: "Invalid pricing settings data" });
  }
};

// Get all content for frontend
export const getAllContent = async (req: AdminRequest, res: Response) => {
  try {
    const pricingSettings = await getOrCreatePricingSettings();
    res.json({
      hero: heroContent,
      stats,
      cultureHighlights,
      missionItems,
      testimonials,
      pricingSettings: {
        convenienceChargePercentage: pricingSettings.convenienceChargePercentage,
        gstPercentage: pricingSettings.gstPercentage,
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch content" });
  }
};
