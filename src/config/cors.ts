import cors from 'cors';
import { isProduction } from './environment';

const allowedOrigins = isProduction
  ? ['https://bitmapcorp.app', 'https://www.bitmapcorp.app']
  : ['http://localhost:8080', 'http://localhost:3000', 'http://127.0.0.1:8080'];

export const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key', 'Wallet-Address'],
  exposedHeaders: ['X-Request-Id'],
  credentials: true,
  maxAge: 86400,
};

export const corsMiddleware = cors(corsOptions);
