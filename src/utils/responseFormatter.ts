import { Response } from 'express';
import { ApiSuccess, ApiError } from '../types/api';

export function success<T>(data: T): ApiSuccess<T> {
  return {
    success: true,
    data,
    error: null,
  };
}

export function error(code: string, message: string): ApiError {
  return {
    success: false,
    data: null,
    error: {
      code,
      message,
    },
  };
}

export function sendSuccess<T>(res: Response, data: T, statusCode: number = 200): void {
  res.status(statusCode).json(success(data));
}

export function sendError(res: Response, code: string, message: string, statusCode: number = 400): void {
  res.status(statusCode).json(error(code, message));
}

export function sendServerError(res: Response, message: string = 'Internal server error'): void {
  res.status(500).json(error('INTERNAL_ERROR', message));
}

export function sendNotFound(res: Response, message: string = 'Resource not found'): void {
  res.status(404).json(error('NOT_FOUND', message));
}

export function sendUnauthorized(res: Response, message: string = 'Unauthorized'): void {
  res.status(401).json(error('UNAUTHORIZED', message));
}

export function sendRateLimit(res: Response, message: string = 'Too many requests'): void {
  res.status(429).json(error('RATE_LIMIT_EXCEEDED', message));
}

export function sendValidationError(res: Response, message: string): void {
  res.status(400).json(error('VALIDATION_ERROR', message));
}
