import * as bitcoin from 'bitcoinjs-lib';
import { BatchTransactionRepository } from '../repositories/BatchTransactionRepository';
import { ParcelListingRepository, ParcelListing } from '../repositories/ParcelListingRepository';
import { MempoolService } from './MempoolService';
import { PSBTService } from './PSBTService';
import { AssetProxyService } from './AssetProxyService';
import { config } from '../config/environment';
import { ValidationError, NotFoundError, ExternalApiError } from '../errors/AppError';
import { isValidBitcoinAddress } from '../utils/bitcoinValidator';
import { logger } from '../utils/logger';

export class ParcelTransactionService {
  private batchTxRepo: BatchTransactionRepository;
  private listingRepo: ParcelListingRepository;
  private mempoolService: MempoolService;
  private psbtService: PSBTService;
  private assetService: AssetProxyService;

  constructor() {
    this.batchTxRepo = new BatchTransactionRepository();
    this.listingRepo = new ParcelListingRepository();
    this.mempoolService = new MempoolService();
    this.psbtService = new PSBTService();
    this.assetService = new AssetProxyService();
  }

  async createBatchPSBT(
    parcelIds: string[],
    buyerAddress: string,
    idempotencyKey: string,
    buyerPublicKey?: string,
    buyerPaymentAddress?: string,
    feeRate?: number,
    buyerPaymentPublicKey?: string
  ): Promise<{ psbt: string; transactionId: string; expiresAt: number; marketplaceFee: number; items: Array<{ inscriptionId: string; name: string; price: number; sellerAddress: string; sellerPaymentAddress: string }>; buyerInputCount: number }> {
    const paymentAddr = buyerPaymentAddress || buyerAddress;
    logger.info('Creating parcel batch purchase PSBT', { parcelCount: parcelIds.length, buyerAddress, hasBuyerPublicKey: !!buyerPublicKey });

    if (!isValidBitcoinAddress(buyerAddress)) {
      throw new ValidationError('Dirección Bitcoin del comprador inválida');
    }
    if (buyerPaymentAddress && !isValidBitcoinAddress(buyerPaymentAddress)) {
      throw new ValidationError('Dirección de pago del comprador inválida');
    }

    const listings: ParcelListing[] = [];
    for (const parcelId of parcelIds) {
      const listing = this.listingRepo.getByIdOrInscriptionId(parcelId);
      if (!listing) {
        throw new NotFoundError(`Parcela no encontrada: ${parcelId}`);
      }
      if (!listing.isActive) {
        throw new ValidationError(`La parcela ${listing.name} no está en venta`);
      }
      if (listing.psbtStatus !== 'signed' || !listing.signedPsbt) {
        throw new ValidationError(`La parcela ${listing.name} no tiene PSBT firmado`);
      }
      if (listing.sellerAddress === buyerAddress) {
        throw new ValidationError(`No puedes comprar tu propia parcela ${listing.name}`);
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

    const batchInputsWithPsbt = listings.map(l => ({
      signedPsbtBase64: l.signedPsbt!,
      price: l.price,
      sellerPaymentAddress: l.sellerPaymentAddress || '',
      psbtIndex: 0,
    }));

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
      listingIds: listings.map(l => l.id),
      totalPrice: listings.reduce((sum, l) => sum + l.price, 0),
      marketplaceFee: completedResult.marketplaceFee,
    });

    logger.info('Parcel batch purchase PSBT created', {
      transactionId: batchTx.id,
      expiresAt,
      listingCount: listings.length,
      marketplaceFee: completedResult.marketplaceFee,
    });

    return {
      psbt: completedResult.psbt,
      transactionId: batchTx.id,
      expiresAt,
      marketplaceFee: completedResult.marketplaceFee,
      items: listings.map(l => ({
        inscriptionId: l.inscriptionId,
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
    logger.info('Broadcasting parcel batch transaction', {
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

    let restoredPsbt = signedPsbt;

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
            this.listingRepo.markAsSoldWithTxid(listingId, txid);
            this.listingRepo.insertVenta(
              listing.inscriptionId,
              listing.name,
              listing.price,
              batchTx.buyerAddress,
              listing.sellerAddress,
              txid
            );
          }
        }

        logger.info('Parcel batch transaction accepted by mempool', { transactionId, txid, listingCount: batchTx.listingIds.length });

        return { txid, status: 'broadcasted' };
      } catch (error) {
        lastError = error as Error;
        logger.warn(`Parcel batch broadcast attempt ${attempt} failed`, { transactionId, error: lastError.message });

        if (attempt < config.transaction.maxRetryAttempts) {
          await this.delay(config.transaction.retryDelayMs);
        }
      }
    }

    const errorMessage = lastError?.message || 'Unknown error';
    this.batchTxRepo.updateStatus(transactionId, 'FAILED', undefined, errorMessage);

    logger.error('Parcel batch broadcast failed after all retries', { transactionId, error: errorMessage });
    throw new ExternalApiError(`Error al transmitir transacción batch: ${errorMessage}`);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
