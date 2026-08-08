import { Router, Request, Response } from 'express';
import { TransactionService } from '../services/TransactionService';
import { validateBody, buyBitmapSchema, broadcastSchema, validateUUID, batchBuySchema, batchBroadcastSchema } from '../middleware/validation';
import { sendSuccess } from '../utils/responseFormatter';

const router: Router = Router();
const transactionService = new TransactionService();

router.post('/buy-bitmap', validateBody(buyBitmapSchema), async (req: Request, res: Response) => {
  const { bitmapId, buyerAddress, idempotencyKey } = req.body;

  const result = await transactionService.createPSBT(bitmapId, buyerAddress, idempotencyKey);
  sendSuccess(res, result);
});

router.post('/batch-buy', validateBody(batchBuySchema), async (req: Request, res: Response) => {
  const { bitmapIds, buyerAddress, idempotencyKey } = req.body;

  const result = await transactionService.createBatchPSBT(bitmapIds, buyerAddress, idempotencyKey);
  sendSuccess(res, result);
});

router.post('/broadcast', validateBody(broadcastSchema), async (req: Request, res: Response) => {
  const { signedPsbt, transactionId } = req.body;

  const result = await transactionService.broadcast(signedPsbt, transactionId);
  sendSuccess(res, result);
});

router.post('/batch-broadcast', validateBody(batchBroadcastSchema), async (req: Request, res: Response) => {
  const { signedPsbt, transactionId } = req.body;

  const result = await transactionService.batchBroadcast(signedPsbt, transactionId);
  sendSuccess(res, result);
});

router.get('/:txid/status', validateUUID('txid'), async (req: Request, res: Response) => {
  const { txid } = req.params;

  const result = await transactionService.getTransactionStatus(txid);
  sendSuccess(res, result);
});

router.get('/wallet/:address/balance', async (req: Request, res: Response) => {
  const { address } = req.params;
  const result = await transactionService.getBalance(address);
  sendSuccess(res, result);
});

router.get('/wallet/:address/utxos', async (req: Request, res: Response) => {
  const { address } = req.params;
  const result = await transactionService.getUTXOs(address);
  sendSuccess(res, result);
});

export default router;
