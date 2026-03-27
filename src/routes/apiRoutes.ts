import { Router } from 'express';
import { BitmapService } from '../services/BitmapService';
import bitmapsRouter from './bitmapsRoutes';
import walletRouter from './walletRoutes';
import transactionRouter from './transactionRoutes';
import { sendSuccess } from '../utils/responseFormatter';
import { Request, Response } from 'express';

const router = Router();
const bitmapService = new BitmapService();

router.get('/health', (req: Request, res: Response) => {
  sendSuccess(res, { status: 'ok', timestamp: Date.now() });
});

router.get('/verify-bitmap/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await bitmapService.verifyBitmap(id);
  sendSuccess(res, result);
});

router.use('/bitmaps', bitmapsRouter);
router.use('/wallet', walletRouter);
router.use('/transaction', transactionRouter);

export default router;
