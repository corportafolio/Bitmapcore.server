import { Router, Request, Response } from 'express';
import { TransactionService } from '../services/TransactionService';
import { WalletService } from '../services/WalletService';
import { BitmapService } from '../services/BitmapService';
import { sendSuccess, sendValidationError } from '../utils/responseFormatter';
import { isValidBitcoinAddress } from '../utils/bitcoinValidator';

const router: Router = Router();
const transactionService = new TransactionService();
const walletService = new WalletService();
const bitmapService = new BitmapService();

router.post('/verify-message', async (req: Request, res: Response) => {
  const { address, message, signature } = req.body;

  if (!address || !message || !signature) {
    return sendValidationError(res, 'Address, message, and signature are required');
  }

  const result = walletService.verifySignature(address, message, signature);
  sendSuccess(res, result);
});

router.get('/:address/balance', async (req: Request, res: Response) => {
  const { address } = req.params;

  if (!isValidBitcoinAddress(address)) {
    return sendValidationError(res, 'Invalid Bitcoin address');
  }

  const balance = await transactionService.getBalance(address);
  sendSuccess(res, balance);
});

router.get('/:address/utxos', async (req: Request, res: Response) => {
  const { address } = req.params;

  if (!isValidBitcoinAddress(address)) {
    return sendValidationError(res, 'Invalid Bitcoin address');
  }

  const utxos = await transactionService.getUTXOs(address);
  sendSuccess(res, utxos);
});

router.get('/:address/inscriptions', async (req: Request, res: Response) => {
  const { address } = req.params;

  if (!isValidBitcoinAddress(address)) {
    return sendValidationError(res, 'Invalid Bitcoin address');
  }

  const inscriptions = await bitmapService.getInscriptionsByOwner(address);
  sendSuccess(res, inscriptions);
});

export default router;