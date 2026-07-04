export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'INVALID_REQUEST'
  | 'NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'RATE_LIMIT_EXCEEDED'
  | 'INTERNAL_ERROR'
  | 'EXTERNAL_API_ERROR'
  | 'BITMAP_NOT_FOUND'
  | 'BITMAP_NOT_FOR_SALE'
  | 'BITMAP_ALREADY_LISTED'
  | 'INVALID_BITCOIN_ADDRESS'
  | 'INSUFFICIENT_BALANCE'
  | 'PSBT_EXPIRED'
  | 'PSBT_INVALID'
  | 'TRANSACTION_FAILED'
  | 'IDEMPOTENCY_KEY_USED';

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(code: ErrorCode, message: string, statusCode?: number) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode || this.getDefaultStatusCode(code);
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }

  private getDefaultStatusCode(code: ErrorCode): number {
    const statusCodes: Record<ErrorCode, number> = {
      VALIDATION_ERROR: 400,
      INVALID_REQUEST: 400,
      NOT_FOUND: 404,
      UNAUTHORIZED: 401,
      FORBIDDEN: 403,
      RATE_LIMIT_EXCEEDED: 429,
      INTERNAL_ERROR: 500,
      EXTERNAL_API_ERROR: 502,
      BITMAP_NOT_FOUND: 404,
      BITMAP_NOT_FOR_SALE: 400,
      BITMAP_ALREADY_LISTED: 400,
      INVALID_BITCOIN_ADDRESS: 400,
      INSUFFICIENT_BALANCE: 400,
      PSBT_EXPIRED: 400,
      PSBT_INVALID: 400,
      TRANSACTION_FAILED: 500,
      IDEMPOTENCY_KEY_USED: 409,
    };
    return statusCodes[code];
  }

  toJSON() {
    return {
      success: false,
      data: null,
      error: {
        code: this.code,
        message: this.message,
      },
    };
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super('VALIDATION_ERROR', message, 400);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super('NOT_FOUND', message, 404);
  }
}

export class ExternalApiError extends AppError {
  constructor(message: string) {
    super('EXTERNAL_API_ERROR', message, 502);
  }
}

export class IdempotencyError extends AppError {
  constructor(message: string) {
    super('IDEMPOTENCY_KEY_USED', message, 409);
  }
}
