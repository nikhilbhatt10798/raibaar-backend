import { Request } from 'express';
import { Document } from 'mongoose';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      role?: string;
      user?: {
        id: string;
        [key: string]: any;
      };
    }
  }
}

export {};
