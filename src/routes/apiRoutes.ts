import { Router, Request, Response } from 'express';
import { BitmapService } from '../services/BitmapService';
import bitmapsRouter from './bitmapsRoutes';
import walletRouter from './walletRoutes';
import transactionRouter from './transactionRoutes';
import blockRouter from './blockRoutes';
import { sendSuccess } from '../utils/responseFormatter';

const router: Router = Router();
const bitmapService = new BitmapService();

router.get('/health', (_req: Request, res: Response) => {
  sendSuccess(res, { 
    status: 'ok', 
    timestamp: Date.now(),
    version: 'v1',
    api: 'BitmapCorp API v1'
  });
});

router.get('/version', (_req: Request, res: Response) => {
  sendSuccess(res, {
    version: 'v1',
    endpoints: '/api/v1',
    documentation: 'https://docs.bitmapcorp.app/v1'
  });
});

router.get('/verify-bitmap/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await bitmapService.verifyBitmap(id);
  sendSuccess(res, result);
});

router.use('/bitmaps', bitmapsRouter);
router.use('/wallet', walletRouter);
router.use('/transaction', transactionRouter);
router.use('/block', blockRouter);

export default router;
