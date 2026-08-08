import { v4 as uuidv4 } from 'uuid';
import { TransactionRepository } from '../repositories/TransactionRepository';
import { IdempotencyRepository } from '../repositories/IdempotencyRepository';
import { ListingRepository } from '../repositories/ListingRepository';
import { BatchTransactionRepository } from '../repositories/BatchTransactionRepository';
import { MempoolService } from './MempoolService';
import { PSBTService } from './PSBTService';
import { PSBTCreate, TransactionStatusResponse } from '../types/transaction';
import { config } from '../config/environment';
import { logger } from '../utils/logger';
import { isValidBitcoinAddress } from '../utils/bitcoinValidator';
import { ValidationError, NotFoundError, ExternalApiError } from '../errors/AppError';

export class TransactionService {
  private transactionRepo: TransactionRepository;
  private idempotencyRepo: IdempotencyRepository;
  private listingRepo: ListingRepository;
  private batchTxRepo: BatchTransactionRepository;
  private mempoolService: MempoolService;
  private psbtService: PSBTService;

  constructor() {
    this.transactionRepo = new TransactionRepository();
    this.idempotencyRepo = new IdempotencyRepository();
    this.listingRepo = new ListingRepository();
    this.batchTxRepo = new BatchTransactionRepository();
    this.mempoolService = new MempoolService();
    this.psbtService = new PSBTService();
  }

  async createPSBT(
    bitmapId: string,
    buyerAddress: string,
    idempotencyKey: string
  ): Promise<PSBTCreate> {
    logger.info('Creating purchase PSBT', { bitmapId, buyerAddress, idempotencyKey });

    if (!isValidBitcoinAddress(buyerAddress)) {
      throw new ValidationError('Invalid buyer Bitcoin address');
    }

    const existingByKey = this.idempotencyRepo.get(idempotencyKey);
    if (existingByKey) {
      logger.info('Returning cached PSBT', { idempotencyKey });
      return existingByKey as PSBTCreate;
    }

    const listing = this.listingRepo.findById(bitmapId);
    if (!listing) {
      throw new NotFoundError('Bitmap listing not found');
    }

    if (!listing.isActive) {
      throw new ValidationError('Bitmap is not for sale');
    }

    if (listing.psbtStatus !== 'signed' || !listing.signedPsbt) {
      throw new ValidationError('Listing is not ready for purchase (PSBT not signed)');
    }

    const buyerUtxos = await this.mempoolService.getUTXOs(buyerAddress);
    
    const completedResult = await this.psbtService.completePurchasePSBT(
      listing.signedPsbt,
      buyerAddress,
      listing.price,
      buyerUtxos,
      listing.sellerPaymentAddress!
    );

    const transactionId = completedResult.transactionId;
    const expiresAt = completedResult.expiresAt;

    const result: PSBTCreate = {
      psbt: completedResult.psbt,
      transactionId,
      expiresAt,
    };

    this.transactionRepo.create({
      listingId: bitmapId,
      buyerAddress,
      sellerAddress: listing.sellerAddress,
      price: listing.price,
      idempotencyKey,
    });

    this.transactionRepo.updatePsbt(transactionId, completedResult.psbt);

    this.idempotencyRepo.save(idempotencyKey, result);

    logger.info('Purchase PSBT created', { 
      transactionId, 
      expiresAt,
      buyerInputs: completedResult.buyerInputs.length,
      marketplaceFee: completedResult.marketplaceFee,
      changeValue: completedResult.changeValue
    });

    return result;
  }

  async broadcast(signedPsbt: string, transactionId: string): Promise<{ txid: string; status: string }> {
    logger.info('Broadcasting transaction', { transactionId });

    const transaction = this.transactionRepo.findById(transactionId);
    if (!transaction) {
      throw new NotFoundError('Transaction not found');
    }

    if (Date.now() > transaction.createdAt + config.transaction.psbtExpirationMs) {
      this.transactionRepo.updateStatus(transactionId, 'EXPIRED');
      throw new ValidationError('PSBT has expired');
    }

    this.transactionRepo.updateStatus(transactionId, 'AWAITING_BROADCAST');

    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= config.transaction.maxRetryAttempts; attempt++) {
      try {
        const rawTx = await this.psbtService.finalizeAndBroadcast(signedPsbt);
        
        this.transactionRepo.updateStatus(transactionId, 'BROADCASTED', rawTx);
        this.listingRepo.markAsSold(transaction.listingId, transaction.buyerAddress);

        const listing = this.listingRepo.findById(transaction.listingId);
        if (listing) {
          this.listingRepo.insertVenta(
            transaction.listingId,
            listing.inscriptionId,
            listing.bitmapNumber || null,
            listing.name,
            listing.price,
            transaction.buyerAddress,
            transaction.sellerAddress,
            rawTx
          );
        }

        logger.info('Transaction broadcasted successfully', { transactionId, txid: rawTx });

        return { txid: rawTx, status: 'broadcasted' };
      } catch (error) {
        lastError = error as Error;
        logger.warn(`Broadcast attempt ${attempt} failed`, {
          transactionId,
          error: lastError.message
        });

        if (attempt < config.transaction.maxRetryAttempts) {
          await this.delay(config.transaction.retryDelayMs);
        }
      }
    }

    const errorMessage = lastError?.message || 'Unknown error';
    this.transactionRepo.updateStatus(transactionId, 'FAILED', undefined, errorMessage);

    logger.error('Transaction broadcast failed after all retries', { transactionId, error: errorMessage });
    throw new ExternalApiError(`Failed to broadcast transaction: ${errorMessage}`);
  }

  async getTransactionStatus(txid: string): Promise<TransactionStatusResponse> {
    return this.mempoolService.getTransactionStatus(txid);
  }

  async getBalance(address: string): Promise<{ balance: number; satoshis: number; utxos: number }> {
    if (!isValidBitcoinAddress(address)) {
      throw new ValidationError('Invalid Bitcoin address');
    }
    return this.mempoolService.getBalance(address);
  }

  async getUTXOs(address: string): Promise<any[]> {
    if (!isValidBitcoinAddress(address)) {
      throw new ValidationError('Invalid Bitcoin address');
    }
    return this.mempoolService.getUTXOs(address);
  }

  async createBatchPSBT(
    bitmapIds: string[],
    buyerAddress: string,
    idempotencyKey: string
  ): Promise<{ psbt: string; transactionId: string; expiresAt: number; items: Array<{ bitmapId: string; name: string; price: number; sellerAddress: string }> }> {
    logger.info('Creating batch purchase PSBT', { bitmapCount: bitmapIds.length, buyerAddress });

    if (!isValidBitcoinAddress(buyerAddress)) {
      throw new ValidationError('Dirección Bitcoin del comprador inválida');
    }

    const listings = [];
    for (const bitmapId of bitmapIds) {
      const listing = this.listingRepo.findById(bitmapId);
      if (!listing) {
        throw new NotFoundError(`Bitmap listing no encontrado: ${bitmapId}`);
      }
      if (!listing.isActive) {
        throw new ValidationError(`Bitmap ${listing.bitmapNumber || bitmapId} no está en venta`);
      }
      if (listing.psbtStatus !== 'signed' || !listing.signedPsbt) {
        throw new ValidationError(`Bitmap ${listing.bitmapNumber || bitmapId} no tiene PSBT firmado`);
      }
      listings.push(listing);
    }

    const buyerUtxos = await this.mempoolService.getUTXOs(buyerAddress);

    const batchInputsWithPsbt = listings.map(l => ({
      signedPsbtBase64: l.signedPsbt!,
      price: l.price,
      sellerPaymentAddress: l.sellerPaymentAddress || '',
    }));

    const completedResult = await this.psbtService.completeBatchPurchasePSBT(
      batchInputsWithPsbt,
      buyerAddress,
      buyerUtxos
    );

    const expiresAt = Date.now() + config.transaction.psbtExpirationMs;

    const batchTx = this.batchTxRepo.create({
      buyerAddress,
      psbt: completedResult.psbt,
      listingIds: bitmapIds,
      totalPrice: listings.reduce((sum, l) => sum + l.price, 0),
      marketplaceFee: completedResult.marketplaceFee,
    });

    logger.info('Batch purchase PSBT created', {
      transactionId: batchTx.id,
      expiresAt,
      listingCount: listings.length,
      marketplaceFee: completedResult.marketplaceFee,
      changeValue: completedResult.changeValue,
    });

    return {
      psbt: completedResult.psbt,
      transactionId: batchTx.id,
      expiresAt,
      items: listings.map(l => ({
        bitmapId: l.id,
        name: l.name,
        price: l.price,
        sellerAddress: l.sellerAddress,
      })),
    };
  }

  async batchBroadcast(signedPsbt: string, transactionId: string): Promise<{ txid: string; status: string }> {
    logger.info('Broadcasting batch transaction', { transactionId });

    const batchTx = this.batchTxRepo.findById(transactionId);
    if (!batchTx) {
      throw new NotFoundError('Transacción batch no encontrada');
    }

    if (Date.now() > batchTx.createdAt + config.transaction.psbtExpirationMs) {
      this.batchTxRepo.updateStatus(transactionId, 'EXPIRED');
      throw new ValidationError('PSBT batch ha expirado');
    }

    this.batchTxRepo.updateStatus(transactionId, 'AWAITING_BROADCAST');

    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= config.transaction.maxRetryAttempts; attempt++) {
      try {
        const rawTx = await this.psbtService.finalizeAndBroadcast(signedPsbt);

        this.batchTxRepo.updateStatus(transactionId, 'BROADCASTED', rawTx);

        for (const listingId of batchTx.listingIds) {
          const listing = this.listingRepo.findById(listingId);
          if (listing) {
            this.listingRepo.markAsSold(listingId, batchTx.buyerAddress);
            this.listingRepo.insertVenta(
              listingId,
              listing.inscriptionId,
              listing.bitmapNumber || null,
              listing.name,
              listing.price,
              batchTx.buyerAddress,
              listing.sellerAddress,
              rawTx
            );
          }
        }

        logger.info('Batch transaction broadcasted', { transactionId, txid: rawTx, listingCount: batchTx.listingIds.length });

        return { txid: rawTx, status: 'broadcasted' };
      } catch (error) {
        lastError = error as Error;
        logger.warn(`Batch broadcast attempt ${attempt} failed`, { transactionId, error: lastError.message });

        if (attempt < config.transaction.maxRetryAttempts) {
          await this.delay(config.transaction.retryDelayMs);
        }
      }
    }

    const errorMessage = lastError?.message || 'Unknown error';
    this.batchTxRepo.updateStatus(transactionId, 'FAILED', undefined, errorMessage);

    logger.error('Batch broadcast failed after all retries', { transactionId, error: errorMessage });
    throw new ExternalApiError(`Error al transmitir transacción batch: ${errorMessage}`);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
