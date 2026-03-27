import winston from 'winston';
import { isProduction } from '../config/environment';

const sensitiveFields = [
  'privateKey',
  'seedPhrase',
  'password',
  'psbt',
  'signedPsbt',
  'accessToken',
  'refreshToken',
  'secret',
  'apiKey',
];

function sanitizeObject(obj: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

function maskAddress(address: string): string {
  if (address.length <= 12) {
    return address;
  }
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function maskTxid(txid: string): string {
  if (txid.length <= 12) {
    return txid;
  }
  return `${txid.slice(0, 6)}...${txid.slice(-4)}`;
}

export const logger = winston.createLogger({
  level: isProduction ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'bitmapcorp-server' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const sanitizedMeta = sanitizeObject(meta as Record<string, unknown>);
          const metaString = Object.keys(sanitizedMeta).length > 0 
            ? ` ${JSON.stringify(sanitizedMeta)}` 
            : '';
          return `${timestamp} [${level}]: ${message}${metaString}`;
        })
      ),
    }),
  ],
});

export const sanitizeForLogging = {
  address: maskAddress,
  txid: maskTxid,
  object: sanitizeObject,
};
