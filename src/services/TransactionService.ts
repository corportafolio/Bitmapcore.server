import { v4 as uuidv4 } from 'uuid';
import * as bitcoin from 'bitcoinjs-lib';
import { TransactionRepository } from '../repositories/TransactionRepository';
import { IdempotencyRepository } from '../repositories/IdempotencyRepository';
import { ListingRepository } from '../repositories/ListingRepository';
import { BatchTransactionRepository } from '../repositories/BatchTransactionRepository';
import { MempoolService } from './MempoolService';
import { PSBTService } from './PSBTService';
import { AssetProxyService } from './AssetProxyService';
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
  private assetService: AssetProxyService;

  constructor() {
    this.transactionRepo = new TransactionRepository();
    this.idempotencyRepo = new IdempotencyRepository();
    this.listingRepo = new ListingRepository();
    this.batchTxRepo = new BatchTransactionRepository();
    this.mempoolService = new MempoolService();
    this.psbtService = new PSBTService();
    this.assetService = new AssetProxyService();
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

    const inscribedOutputs = await this.assetService.getInscribedOutputIds(buyerAddress, buyerUtxos);
    const cleanUtxos = buyerUtxos.filter(utxo => !inscribedOutputs.has(`${utxo.txid}:${utxo.vout}`.toLowerCase()));

    logger.info('Buyer UTXOs after filtering inscribed outputs', {
      total: buyerUtxos.length,
      clean: cleanUtxos.length,
      inscribedExcluded: buyerUtxos.length - cleanUtxos.length,
    });

    if (cleanUtxos.length === 0) {
      throw new ValidationError('No hay saldo disponible para pagar: todos los UTXOs de esta wallet contienen activos. Recarga saldo en una dirección de pago sin inscripciones.');
    }

    const batchMapping = this.listingRepo.getBatchMapping(bitmapId);
    const psbtIndex = batchMapping ? batchMapping.psbtIndex : 0;

    const signedPsbtToUse = batchMapping ? batchMapping.batchPsbt : listing.signedPsbt!;

    const completedResult = await this.psbtService.completePurchasePSBT(
      signedPsbtToUse,
      buyerAddress,
      listing.price,
      cleanUtxos,
      listing.sellerPaymentAddress!,
      psbtIndex
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

        const broadcastResult = await this.mempoolService.broadcast(rawTx);
        const txid = broadcastResult.txid;

        if (!txid || typeof txid !== 'string' || txid.trim().length < 10) {
          throw new ExternalApiError('Mempool no devolvió un txid válido. La transacción no fue aceptada.');
        }

        this.transactionRepo.updateStatus(transactionId, 'BROADCASTED', txid);
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
            txid
          );
        }

        logger.info('Transaction accepted by mempool', { transactionId, txid });

        return { txid, status: 'broadcasted' };
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
    idempotencyKey: string,
    buyerPublicKey?: string,
    buyerPaymentAddress?: string,
    feeRate?: number,
    buyerPaymentPublicKey?: string
  ): Promise<{ psbt: string; transactionId: string; expiresAt: number; marketplaceFee: number; items: Array<{ bitmapId: string; name: string; price: number; sellerAddress: string; sellerPaymentAddress: string }>; buyerInputCount: number }> {
    const paymentAddr = buyerPaymentAddress || buyerAddress;
    logger.info('Creating batch purchase PSBT', { bitmapCount: bitmapIds.length, buyerAddress, buyerPaymentAddress: paymentAddr, hasBuyerPublicKey: !!buyerPublicKey, buyerPublicKeyLength: buyerPublicKey ? buyerPublicKey.length : 0 });

    if (!isValidBitcoinAddress(buyerAddress)) {
      throw new ValidationError('Dirección Bitcoin del comprador inválida');
    }
    if (buyerPaymentAddress && !isValidBitcoinAddress(buyerPaymentAddress)) {
      throw new ValidationError('Dirección de pago del comprador inválida');
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

    const buyerUtxos = await this.mempoolService.getUTXOs(paymentAddr);

    const inscribedOutputs = await this.assetService.getInscribedOutputIds(paymentAddr, buyerUtxos);
    const cleanUtxos = buyerUtxos.filter(utxo => !inscribedOutputs.has(`${utxo.txid}:${utxo.vout}`.toLowerCase()));

    logger.info('Buyer UTXOs after filtering inscribed outputs', {
      total: buyerUtxos.length,
      clean: cleanUtxos.length,
      inscribedExcluded: buyerUtxos.length - cleanUtxos.length,
    });

    if (cleanUtxos.length === 0) {
      throw new ValidationError('No hay saldo disponible para pagar: todos los UTXOs de esta wallet contienen activos. Recarga saldo en una dirección de pago sin inscripciones.');
    }

    const batchInputsWithPsbt = listings.map(l => {
      const batchMapping = this.listingRepo.getBatchMapping(l.id);
      return {
        signedPsbtBase64: batchMapping ? batchMapping.batchPsbt : l.signedPsbt!,
        price: l.price,
        sellerPaymentAddress: l.sellerPaymentAddress || '',
        psbtIndex: batchMapping ? batchMapping.psbtIndex : 0,
      };
    });

    const completedResult = await this.psbtService.completeBatchPurchasePSBT(
      batchInputsWithPsbt,
      buyerAddress,
      cleanUtxos,
      buyerPublicKey,
      paymentAddr,
      feeRate,
      buyerPaymentPublicKey
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
      marketplaceFee: completedResult.marketplaceFee,
      items: listings.map(l => ({
        bitmapId: l.id,
        name: l.name,
        price: l.price,
        sellerAddress: l.sellerAddress,
        sellerPaymentAddress: l.sellerPaymentAddress || '',
      })),
      buyerInputCount: completedResult.buyerInputs.length,
    };
  }

  async batchBroadcast(signedPsbt: string, transactionId: string): Promise<{ txid: string; status: string }> {
    const isHex = /^[0-9a-fA-F]+$/.test(signedPsbt.trim()) && signedPsbt.trim().length % 2 === 0;
    logger.info('Broadcasting batch transaction', {
      transactionId,
      signedPsbtFormat: isHex ? 'hex' : 'base64',
      signedPsbtLength: signedPsbt.length,
    });

    const batchTx = this.batchTxRepo.findById(transactionId);
    if (!batchTx) {
      throw new NotFoundError('Transacción batch no encontrada');
    }

    if (Date.now() > batchTx.createdAt + config.transaction.psbtExpirationMs) {
      this.batchTxRepo.updateStatus(transactionId, 'EXPIRED');
      throw new ValidationError('PSBT batch ha expirado');
    }

    this.batchTxRepo.updateStatus(transactionId, 'AWAITING_BROADCAST');

    const batchMappings: Array<{ batchPsbtBase64: string; psbtIndex: number; inputIndex: number }> = [];
    for (let i = 0; i < batchTx.listingIds.length; i++) {
      const mapping = this.listingRepo.getBatchMapping(batchTx.listingIds[i]);
      if (mapping) {
        batchMappings.push({
          batchPsbtBase64: mapping.batchPsbt,
          psbtIndex: mapping.psbtIndex,
          inputIndex: i,
        });
      }
    }

    let restoredPsbt = signedPsbt;
    if (batchMappings.length > 0) {
      restoredPsbt = this.psbtService.restoreSellerTapSigs(signedPsbt, batchMappings);
    }

    try {
      if (batchTx.psbt) {
        const storedPsbt = bitcoin.Psbt.fromBase64(batchTx.psbt, { network: bitcoin.networks.bitcoin });
        let parsedPsbt: bitcoin.Psbt;
        const cleanRestored = restoredPsbt.trim();
        if (/^[0-9a-fA-F]+$/.test(cleanRestored) && cleanRestored.length % 2 === 0) {
          parsedPsbt = bitcoin.Psbt.fromBuffer(Buffer.from(cleanRestored, 'hex'), { network: bitcoin.networks.bitcoin });
        } else {
          parsedPsbt = bitcoin.Psbt.fromBase64(cleanRestored, { network: bitcoin.networks.bitcoin });
        }
        let restoredCount = 0;
        for (let i = 0; i < parsedPsbt.data.inputs.length; i++) {
          if (!parsedPsbt.data.inputs[i].tapInternalKey && storedPsbt.data.inputs[i]?.tapInternalKey) {
            (parsedPsbt.data.inputs[i] as any).tapInternalKey = storedPsbt.data.inputs[i].tapInternalKey;
            restoredCount++;
          }
        }
        if (restoredCount > 0) {
          logger.info('Restored tapInternalKey from stored PSBT', { transactionId, restoredCount });
          restoredPsbt = parsedPsbt.toBase64();
        }
      }
    } catch (e: any) {
      logger.warn('Failed to restore tapInternalKey from stored PSBT', { transactionId, error: e.message });
    }

    try {
      const diagnosticPsbt = bitcoin.Psbt.fromBase64(restoredPsbt, { network: bitcoin.networks.bitcoin });
      const inputSummary = diagnosticPsbt.data.inputs.map((inp: any, idx: number) => ({
        index: idx,
        hasTapKeySig: !!inp.tapKeySig,
        hasTapInternalKey: !!inp.tapInternalKey,
        hasPartialSig: !!(inp.partialSig && inp.partialSig.length > 0),
        hasFinalScriptWitness: !!inp.finalScriptWitness,
      }));
      const signedCount = inputSummary.filter(i => i.hasTapKeySig).length;
      const unsignedCount = inputSummary.filter(i => !i.hasTapKeySig && !i.hasPartialSig).length;
      logger.info('PSBT input signature status before finalize', {
        transactionId,
        totalInputs: inputSummary.length,
        signedWithTapKeySig: signedCount,
        unsigned: unsignedCount,
        inputs: inputSummary,
      });
    } catch (e: any) {
      logger.warn('Could not parse PSBT for diagnostic', { transactionId, error: e.message });
    }

    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= config.transaction.maxRetryAttempts; attempt++) {
      try {
        const rawTx = await this.psbtService.finalizeAndBroadcast(restoredPsbt);

        const broadcastResult = await this.mempoolService.broadcast(rawTx);
        const txid = broadcastResult.txid;

        if (!txid || typeof txid !== 'string' || txid.trim().length < 10) {
          throw new ExternalApiError('Mempool no devolvió un txid válido. La transacción no fue aceptada.');
        }

        this.batchTxRepo.updateStatus(transactionId, 'BROADCASTED', txid);

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
              txid
            );
          }
        }

        logger.info('Batch transaction accepted by mempool', { transactionId, txid, listingCount: batchTx.listingIds.length });

        return { txid, status: 'broadcasted' };
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
