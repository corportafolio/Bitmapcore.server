import * as dotenv from 'dotenv';

dotenv.config();

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  
  server: {
    host: process.env.HOST || 'localhost',
    url: process.env.SERVER_URL || 'http://localhost:3000',
  },

  apis: {
    ordinals: {
      baseUrl: process.env.ORDINALS_API_URL || 'https://api.ordinals.com',
      timeout: parseInt(process.env.ORDINALS_TIMEOUT || '10000', 10),
    },
    mempool: {
      baseUrl: process.env.MEMPOOL_API_URL || 'https://mempool.space/api',
      timeout: parseInt(process.env.MEMPOOL_TIMEOUT || '10000', 10),
    },
  },

  rateLimit: {
    purchaseWindowMs: 60 * 1000,
    purchaseMax: 5,
    generalWindowMs: 60 * 1000,
    generalMax: 10,
  },

  transaction: {
    psbtExpirationMs: 5 * 60 * 1000,
    maxRetryAttempts: 3,
    retryDelayMs: 5000,
  },

  database: {
    path: process.env.DB_PATH || './data/bitmapcorp.db',
    blocksPath: process.env.BLOCKS_DB_PATH || './data/btc_bloques.db',
  },
};

export const isProduction = config.nodeEnv === 'production';
export const isDevelopment = config.nodeEnv === 'development';
