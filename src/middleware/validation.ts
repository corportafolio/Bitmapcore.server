import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema, ZodError } from 'zod';
import { sendValidationError } from '../utils/responseFormatter';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUUID(uuid: string): boolean {
  return UUID_REGEX.test(uuid);
}

export function validateUUID(paramName: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const value = req.params[paramName];
    
    if (!value || !isValidUUID(value)) {
      return sendValidationError(res, `Invalid ${paramName} format`);
    }
    
    next();
  };
}

export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const messages = err.errors.map(e => `${e.path.join('.')}: ${e.message}`);
        return sendValidationError(res, messages.join(', '));
      }
      next(err);
    }
  };
}

export const buyBitmapSchema = z.object({
  bitmapId: z.string().uuid(),
  buyerAddress: z.string().min(26).max(62),
  idempotencyKey: z.string().uuid(),
});

export const broadcastSchema = z.object({
  signedPsbt: z.string().min(20),
  transactionId: z.string().uuid(),
});

export const createListingSchema = z.object({
  inscriptionId: z.string().min(10),
  price: z.number().positive(),
  sellerAddress: z.string().min(26).max(62),
  sellerOrdinalPublicKey: z.string().min(66).max(130),
  sellerPaymentAddress: z.string().min(26).max(62),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  imageUrl: z.string().url().or(z.literal('')),
});

export const updateListingSchema = z.object({
  price: z.number().positive().optional(),
});

export const signListingSchema = z.object({
  signedPsbt: z.string().min(20),
  sellerOrdinalPublicKey: z.string().min(66).max(130),
});
