import { Request, Response } from "express";
import { User, HostProfile, Booking, Property } from "../models/index";
import { hashPassword } from "../utils/auth";

// Get user profile
export const getUserProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.userId).select("-password");
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Update user profile
export const updateUserProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { firstName, lastName, phone, avatar } = req.body;

    const user = await User.findByIdAndUpdate(
      req.userId,
      { firstName, lastName, phone, avatar },
      { new: true }
    ).select("-password");

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({
      message: "Profile updated successfully",
      user,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Get user bookings
export const getUserBookings = async (req: Request, res: Response): Promise<void> => {
  try {
    const bookings = await Booking.find({ userId: req.userId })
      .populate("propertyId")
      .populate("hostId")
      .sort({ createdAt: -1 });

    res.json(bookings);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Get host profile
export const getHostProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const hostProfile = await HostProfile.findOne({ userId: req.userId }).populate("userId");
    if (!hostProfile) {
      res.status(404).json({ error: "Host profile not found" });
      return;
    }
    res.json(hostProfile);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Update host profile
export const updateHostProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { bio, village, district, state, yearsHosting, bankAccount } = req.body;

    const hostProfile = await HostProfile.findOneAndUpdate(
      { userId: req.userId },
      {
        bio,
        village,
        district,
        state,
        yearsHosting,
        bankAccount,
      },
      { new: true }
    ).populate("userId");

    if (!hostProfile) {
      res.status(404).json({ error: "Host profile not found" });
      return;
    }

    res.json({
      message: "Host profile updated successfully",
      hostProfile,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Get host's properties
export const getHostProperties = async (req: Request, res: Response): Promise<void> => {
  try {
    // First find the host profile
    const hostProfile = await HostProfile.findOne({ userId: req.userId });
    if (!hostProfile) {
      res.status(404).json({ error: "Host profile not found" });
      return;
    }

    // Get properties for this host
    const properties = await Property.find({ hostId: hostProfile._id }).sort({ createdAt: -1 });

    res.json(properties);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Get host bookings
export const getHostBookings = async (req: Request, res: Response): Promise<void> => {
  try {
    // First find the host profile
    const hostProfile = await HostProfile.findOne({ userId: req.userId });
    if (!hostProfile) {
      res.status(404).json({ error: "Host profile not found" });
      return;
    }

    // Get bookings for this host's properties
    const bookings = await Booking.find({ hostId: hostProfile._id })
      .populate("propertyId")
      .populate("userId")
      .sort({ createdAt: -1 });

    res.json(bookings);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Update password for both user and host
export const updatePassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: "Current password and new password are required" });
      return;
    }

    const user = await User.findById(req.userId);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Verify current password
    const { comparePassword } = await import("../utils/auth");
    const isPasswordValid = await comparePassword(currentPassword, user.password);
    if (!isPasswordValid) {
      res.status(401).json({ error: "Current password is incorrect" });
      return;
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password
    await User.findByIdAndUpdate(req.userId, { password: hashedPassword });

    res.json({ message: "Password updated successfully" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
