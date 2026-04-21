import { Request, Response } from "express";
import { z } from "zod";
import { User } from "../models/index";
import { hashPassword, comparePassword, generateToken } from "../utils/auth";
import { generateOtpCode, hashOtpCode, sendOtpNotification } from "../utils/notifications";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
});

const registerHostSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  village: z.string(),
  district: z.string(),
  state: z.string(),
  yearsHosting: z.number().optional(),
  bio: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const otpRequestSchema = z.object({
  email: z.string().email(),
});

const otpVerifySchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
});

export const registerUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, firstName, lastName } = registerSchema.parse(req.body);

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({ error: "User already exists" });
      return;
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const user = new User({
      email,
      password: hashedPassword,
      firstName,
      lastName,
    });

    await user.save();

    // Generate token
    const token = generateToken(user._id.toString(), user.role);

    res.status(201).json({
      message: "User registered successfully",
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
};

export const loginUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    // Compare password
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    // Generate token
    const token = generateToken(user._id.toString(), user.role);
    user.lastLoginAt = new Date();
    await user.save();

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
};

export const getCurrentUser = async (req: Request, res: Response): Promise<void> => {
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

export const registerHost = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, firstName, lastName, village, district, state, yearsHosting, bio } = registerHostSchema.parse(req.body);

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({ error: "User already exists" });
      return;
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user with host role
    const user = new User({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      role: "host",
    });

    await user.save();

    // Create host profile
    const { HostProfile } = await import("../models/index");
    const hostProfile = new HostProfile({
      userId: user._id,
      village,
      district,
      state,
      yearsHosting: yearsHosting || 0,
      bio,
    });

    await hostProfile.save();

    // Generate token
    const token = generateToken(user._id.toString(), user.role);

    res.status(201).json({
      message: "Host registered successfully",
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
};

export const requestLoginOtp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = otpRequestSchema.parse(req.body);

    const user = await User.findOne({ email });
    if (!user) {
      res.status(404).json({ error: "No account found with this email" });
      return;
    }

    const now = new Date();
    if (user.otpLastSentAt && now.getTime() - user.otpLastSentAt.getTime() < 60_000) {
      res.status(429).json({ error: "Please wait a minute before requesting another OTP" });
      return;
    }

    const otpCode = generateOtpCode();
    user.otpCodeHash = hashOtpCode(otpCode);
    user.otpExpiresAt = new Date(now.getTime() + 10 * 60_000);
    user.otpLastSentAt = now;
    await user.save();

    await sendOtpNotification(email, `${user.firstName} ${user.lastName}`.trim(), otpCode);

    res.json({
      message: "OTP sent successfully",
      delivery: process.env.MAILER_WEBHOOK_URL ? "email" : "log",
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
};

export const verifyLoginOtp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, otp } = otpVerifySchema.parse(req.body);

    const user = await User.findOne({ email });
    if (!user || !user.otpCodeHash || !user.otpExpiresAt) {
      res.status(400).json({ error: "OTP is not active for this account" });
      return;
    }

    if (user.otpExpiresAt.getTime() < Date.now()) {
      res.status(400).json({ error: "OTP has expired" });
      return;
    }

    if (user.otpCodeHash !== hashOtpCode(otp)) {
      res.status(400).json({ error: "Invalid OTP" });
      return;
    }

    user.otpCodeHash = undefined;
    user.otpExpiresAt = undefined;
    user.lastLoginAt = new Date();
    await user.save();

    const token = generateToken(user._id.toString(), user.role);

    res.json({
      message: "OTP verified successfully",
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
};
