import express, { Request, Response, Express } from 'express';
import { config } from './config/environment';
import { corsMiddleware } from './config/cors';
import { securityHeaders } from './middleware/securityHeaders';
import { generalLimiter, purchaseLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';
import apiRoutes from './routes/apiRoutes';
import { initDb, closeDb } from './database/db';
import { logger } from './utils/logger';
import { IdempotencyRepository } from './repositories/IdempotencyRepository';

const app: Express = express();

app.use(securityHeaders);
app.use(corsMiddleware);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(generalLimiter);

app.get('/health', (_req: Request, res: Response) => {
  res.json({ success: true, data: { status: 'ok', timestamp: Date.now() } });
});

app.use('/api', purchaseLimiter);
app.use('/api/v1', apiRoutes);

app.use(errorHandler);

const idempotencyRepo = new IdempotencyRepository();
setInterval(() => {
  try {
    idempotencyRepo.cleanup();
    logger.debug('Idempotency keys cleanup completed');
  } catch (error) {
    logger.error('Idempotency cleanup failed', { error: (error as Error).message });
  }
}, 60 * 60 * 1000);

function gracefulShutdown(signal: string) {
  logger.info(`Received ${signal}, shutting down gracefully`);
  
  closeDb();
  
  logger.info('Shutdown complete');
  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

const PORT = config.port;
const HOST = config.server.host;

app.listen(PORT, HOST, () => {
  initDb();
  
  logger.info(`Server running on http://${HOST}:${PORT}`, {
    nodeEnv: config.nodeEnv,
    port: PORT,
  });
});

export default app;
