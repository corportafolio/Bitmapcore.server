import { Router, Request, Response, NextFunction } from 'express';
import { TransactionService } from '../services/TransactionService';
import { validateBody, buyBitmapSchema, broadcastSchema, validateUUID, batchBuySchema, batchBroadcastSchema } from '../middleware/validation';
import { sendSuccess } from '../utils/responseFormatter';

const router: Router = Router();
const transactionService = new TransactionService();

router.post('/buy-bitmap', validateBody(buyBitmapSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { bitmapId, buyerAddress, idempotencyKey } = req.body;
    const result = await transactionService.createPSBT(bitmapId, buyerAddress, idempotencyKey);
    sendSuccess(res, result);
  } catch (err) { next(err); }
});

router.post('/batch-buy', validateBody(batchBuySchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { bitmapIds, buyerAddress, buyerPaymentAddress, idempotencyKey, buyerPublicKey, feeRate } = req.body;
    const result = await transactionService.createBatchPSBT(bitmapIds, buyerAddress, idempotencyKey, buyerPublicKey, buyerPaymentAddress, feeRate);
    sendSuccess(res, result);
  } catch (err) { next(err); }
});

router.post('/broadcast', validateBody(broadcastSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { signedPsbt, transactionId } = req.body;
    const result = await transactionService.broadcast(signedPsbt, transactionId);
    sendSuccess(res, result);
  } catch (err) { next(err); }
});

router.post('/batch-broadcast', validateBody(batchBroadcastSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { signedPsbt, transactionId } = req.body;
    const result = await transactionService.batchBroadcast(signedPsbt, transactionId);
    sendSuccess(res, result);
  } catch (err) { next(err); }
});

router.get('/:txid/status', validateUUID('txid'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { txid } = req.params;
    const result = await transactionService.getTransactionStatus(txid);
    sendSuccess(res, result);
  } catch (err) { next(err); }
});

router.get('/wallet/:address/balance', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { address } = req.params;
    const result = await transactionService.getBalance(address);
    sendSuccess(res, result);
  } catch (err) { next(err); }
});

router.get('/wallet/:address/utxos', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { address } = req.params;
    const result = await transactionService.getUTXOs(address);
    sendSuccess(res, result);
  } catch (err) { next(err); }
});

export default router;
