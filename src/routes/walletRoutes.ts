import { Router, Request, Response } from 'express';
import { TransactionService } from '../services/TransactionService';
import { sendSuccess, sendValidationError } from '../utils/responseFormatter';
import { isValidBitcoinAddress } from '../utils/bitcoinValidator';

const router = Router();
const transactionService = new TransactionService();

router.get('/:address/balance', async (req: Request, res: Response) => {
  const { address } = req.params;

  if (!isValidBitcoinAddress(address)) {
    return sendValidationError(res, 'Invalid Bitcoin address');
  }

  const balance = await transactionService.getBalance(address);
  sendSuccess(res, balance);
});

export default router;
