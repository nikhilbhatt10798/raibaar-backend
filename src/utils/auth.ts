import jwt, { SignOptions } from "jsonwebtoken";
import bcrypt from "bcryptjs";

const JWT_SECRET = process.env.JWT_SECRET || "your_secret_key";
const JWT_EXPIRY = process.env.JWT_EXPIRY || "7d";

export const generateToken = (userId: string, role: string = "guest"): string => {
  return jwt.sign(
    { userId, role },
    JWT_SECRET as string,
    { expiresIn: JWT_EXPIRY } as SignOptions
  );
};

export const verifyToken = (token: string): { userId: string; role: string } | null => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET as string) as { userId: string; role: string };
    return decoded;
  } catch (error) {
    return null;
  }
};

export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

export const comparePassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};

export const calculateBookingPrice = (basePrice: number, nights: number): { basePrice: number; serviceFee: number; tax: number; total: number } => {
  const totalBase = basePrice * nights;
  const serviceFee = Math.round(totalBase * 0.1);
  const tax = Math.round(totalBase * 0.12);
  const total = totalBase + serviceFee + tax;

  return {
    basePrice: totalBase,
    serviceFee,
    tax,
    total,
  };
};
