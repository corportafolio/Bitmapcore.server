import { Router, Request, Response, NextFunction } from 'express';
import { ParcelTransactionService } from '../services/ParcelTransactionService';
import { sendSuccess } from '../utils/responseFormatter';
import { ValidationError } from '../errors/AppError';

const router: Router = Router();
const parcelTxService = new ParcelTransactionService();

router.post('/parcel-batch-buy', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { parcelIds, buyerAddress, buyerPaymentAddress, buyerPaymentPublicKey, idempotencyKey, buyerPublicKey, feeRate } = req.body;
    if (!parcelIds || !Array.isArray(parcelIds) || parcelIds.length === 0) {
      throw new ValidationError('No hay parcelas para comprar');
    }
    if (!buyerAddress) {
      throw new ValidationError('Falta la direccion del comprador');
    }
    const result = await parcelTxService.createBatchPSBT(parcelIds, buyerAddress, idempotencyKey, buyerPublicKey, buyerPaymentAddress, feeRate, buyerPaymentPublicKey);
    sendSuccess(res, result);
  } catch (err) { next(err); }
});

router.post('/parcel-batch-broadcast', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { signedPsbt, transactionId } = req.body;
    if (!signedPsbt || !transactionId) {
      throw new ValidationError('Faltan datos para transmitir');
    }
    const result = await parcelTxService.batchBroadcast(signedPsbt, transactionId);
    sendSuccess(res, result);
  } catch (err) { next(err); }
});

export default router;
