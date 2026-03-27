import { v4 as uuidv4 } from 'uuid';
import { TransactionRepository } from '../repositories/TransactionRepository';
import { IdempotencyRepository } from '../repositories/IdempotencyRepository';
import { ListingRepository } from '../repositories/ListingRepository';
import { MempoolService } from './MempoolService';
import { PSBTCreate, TransactionStatusResponse } from '../types/transaction';
import { config } from '../config/environment';
import { logger } from '../utils/logger';
import { isValidBitcoinAddress } from '../utils/bitcoinValidator';
import { ValidationError, NotFoundError, ExternalApiError } from '../errors/AppError';

export class TransactionService {
  private transactionRepo: TransactionRepository;
  private idempotencyRepo: IdempotencyRepository;
  private listingRepo: ListingRepository;
  private mempoolService: MempoolService;

  constructor() {
    this.transactionRepo = new TransactionRepository();
    this.idempotencyRepo = new IdempotencyRepository();
    this.listingRepo = new ListingRepository();
    this.mempoolService = new MempoolService();
  }

  async createPSBT(
    bitmapId: string,
    buyerAddress: string,
    idempotencyKey: string
  ): Promise<PSBTCreate> {
    logger.info('Creating PSBT', { bitmapId, buyerAddress, idempotencyKey });

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

    const psbt = this.generateMockPSBT(buyerAddress, listing.sellerAddress, listing.price);
    const transactionId = uuidv4();
    const expiresAt = Date.now() + config.transaction.psbtExpirationMs;

    const result: PSBTCreate = {
      psbt,
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

    this.transactionRepo.updatePsbt(transactionId, psbt);

    this.idempotencyRepo.save(idempotencyKey, result);

    logger.info('PSBT created', { transactionId, expiresAt });

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
        const result = await this.mempoolService.broadcast(signedPsbt);
        
        this.transactionRepo.updateStatus(transactionId, 'BROADCASTED', result.txid);
        this.listingRepo.markAsSold(transaction.listingId, transaction.buyerAddress);

        logger.info('Transaction broadcasted successfully', { transactionId, txid: result.txid });

        return { txid: result.txid, status: 'broadcasted' };
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

  private generateMockPSBT(buyerAddress: string, sellerAddress: string, price: number): string {
    const mockPsbt = `cHNidP8BAP0A${Buffer.from(JSON.stringify({ buyer: buyerAddress, seller: sellerAddress, price })).toString('base64')}`;
    return mockPsbt;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
