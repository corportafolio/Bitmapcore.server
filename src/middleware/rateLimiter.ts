import rateLimit from 'express-rate-limit';
import { config } from '../config/environment';

export const purchaseLimiter = rateLimit({
  windowMs: config.rateLimit.purchaseWindowMs,
  max: config.rateLimit.purchaseMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { 
    success: false, 
    error: { 
      code: 'RATE_LIMIT_EXCEEDED', 
      message: 'Máximo 5 compras por minuto' 
    } 
  },
  keyGenerator: (req) => {
    return req.headers['wallet-address'] as string || req.ip || 'unknown';
  },
  skip: (req) => {
    return req.method === 'GET';
  },
});

export const generalLimiter = rateLimit({
  windowMs: config.rateLimit.generalWindowMs,
  max: config.rateLimit.generalMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { 
    success: false, 
    error: { 
      code: 'RATE_LIMIT_EXCEEDED', 
      message: 'Máximo 10 requests por minuto' 
    } 
  },
  keyGenerator: (req) => {
    return req.ip || 'unknown';
  },
  skip: (req) => {
    return req.path === '/health';
  },
});
