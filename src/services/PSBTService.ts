import * as bitcoin from 'bitcoinjs-lib';
import * as ecpair from 'ecpair';
import * as tinysecp from 'tiny-secp256k1';
import { config } from '../config/environment';
import { logger } from '../utils/logger';
import { ExternalApiError, ValidationError } from '../errors/AppError';

bitcoin.initEccLib(tinysecp);
const ECPair = ecpair.ECPairFactory(tinysecp);

const NETWORK = bitcoin.networks.bitcoin;
const DUST_LIMIT = 546n;
const MARKETPLACE_FEE_PERCENT = config.marketplace.feePercent || 2;

export interface InscriptionUTXO {
  txid: string;
  vout: number;
  value: number;
  satpoint: string;
  contentType: string;
  height: number;
}

export interface ListingPSBTData {
  unsignedPsbt: string;
  inscriptionUtxo: InscriptionUTXO;
  sellerPaymentAddress: string;
  price: number;
}

export interface CompletedPSBTData {
  psbt: string;
  transactionId: string;
  expiresAt: number;
  buyerInputs: Array<{ txid: string; vout: number; value: number }>;
  marketplaceFee: number;
  changeValue: number;
}

export interface UTXO {
  txid: string;
  vout: number;
  value: number;
  status: { confirmed: boolean };
}

export class PSBTService {
  async createListingPSBT(
    inscriptionId: string,
    sellerPaymentAddress: string,
    price: number,
    sellerOrdinalPublicKey: string,
    clientUtxo?: string,
    clientValue?: number
  ): Promise<ListingPSBTData> {
    logger.info('Creating listing PSBT', { inscriptionId, sellerPaymentAddress, price });

    let inscriptionUtxo: InscriptionUTXO;

    if (clientUtxo && clientValue) {
      const parts = clientUtxo.split(':');
      inscriptionUtxo = {
        txid: parts[0] || '',
        vout: parseInt(parts[1] || '0', 10),
        value: clientValue,
        satpoint: clientUtxo + ':0',
        contentType: 'text/plain',
        height: 0,
      };
    } else {
      throw new ValidationError('Datos de UTXO incompletos. Reconecta la wallet e intenta de nuevo.');
    }

    const psbt = new bitcoin.Psbt({ network: NETWORK });

    psbt.addInput({
      hash: inscriptionUtxo.txid,
      index: inscriptionUtxo.vout,
      witnessUtxo: {
        script: bitcoin.address.toOutputScript(sellerPaymentAddress, NETWORK),
        value: BigInt(inscriptionUtxo.value),
      },
      tapInternalKey: this.pubkeyToXOnly(sellerOrdinalPublicKey),
      sighashType: bitcoin.Transaction.SIGHASH_SINGLE | bitcoin.Transaction.SIGHASH_ANYONECANPAY,
    });

    psbt.addOutput({
      address: sellerPaymentAddress,
      value: BigInt(price),
    });

    const unsignedPsbtBase64 = psbt.toBase64();

    logger.info('Listing PSBT created', { 
      inscriptionId, 
      psbtLength: unsignedPsbtBase64.length,
      inputCount: psbt.data.inputs.length,
      outputCount: psbt.data.outputs.length
    });

    return {
      unsignedPsbt: unsignedPsbtBase64,
      inscriptionUtxo,
      sellerPaymentAddress,
      price,
    };
  }

  async createPriceUpdatePSBT(
    inscriptionId: string,
    sellerPaymentAddress: string,
    newPrice: number,
    sellerOrdinalPublicKey: string,
    clientUtxo: string,
    clientValue: number
  ): Promise<ListingPSBTData> {
    logger.info('Creating price update PSBT', { inscriptionId, sellerPaymentAddress, newPrice });

    const parts = clientUtxo.split(':');
    const inscriptionUtxo: InscriptionUTXO = {
      txid: parts[0] || '',
      vout: parseInt(parts[1] || '0', 10),
      value: clientValue,
      satpoint: clientUtxo + ':0',
      contentType: 'text/plain',
      height: 0,
    };

    const psbt = new bitcoin.Psbt({ network: NETWORK });

    psbt.addInput({
      hash: inscriptionUtxo.txid,
      index: inscriptionUtxo.vout,
      witnessUtxo: {
        script: bitcoin.address.toOutputScript(sellerPaymentAddress, NETWORK),
        value: BigInt(inscriptionUtxo.value),
      },
      tapInternalKey: this.pubkeyToXOnly(sellerOrdinalPublicKey),
      sighashType: bitcoin.Transaction.SIGHASH_SINGLE | bitcoin.Transaction.SIGHASH_ANYONECANPAY,
    });

    psbt.addOutput({
      address: sellerPaymentAddress,
      value: BigInt(newPrice),
    });

    const unsignedPsbtBase64 = psbt.toBase64();

    logger.info('Price update PSBT created', { 
      inscriptionId, 
      psbtLength: unsignedPsbtBase64.length,
      inputCount: psbt.data.inputs.length,
      outputCount: psbt.data.outputs.length
    });

    return {
      unsignedPsbt: unsignedPsbtBase64,
      inscriptionUtxo,
      sellerPaymentAddress,
      price: newPrice,
    };
  }

  async createBatchListingPSBT(inputs: Array<{
    txid: string;
    vout: number;
    value: number;
    tapInternalKey: Buffer;
    sellerPaymentAddress: string;
    price: number;
  }>): Promise<{ unsignedPsbt: string }> {
    logger.info('Creating batch listing PSBT', { inputCount: inputs.length });

    const psbt = new bitcoin.Psbt({ network: NETWORK });

    for (const input of inputs) {
      psbt.addInput({
        hash: input.txid,
        index: input.vout,
        witnessUtxo: {
          script: bitcoin.address.toOutputScript(input.sellerPaymentAddress, NETWORK),
          value: BigInt(input.value),
        },
        tapInternalKey: input.tapInternalKey,
        sighashType: bitcoin.Transaction.SIGHASH_SINGLE | bitcoin.Transaction.SIGHASH_ANYONECANPAY,
      });

      psbt.addOutput({
        address: input.sellerPaymentAddress,
        value: BigInt(input.price),
      });
    }

    const unsignedPsbtBase64 = psbt.toBase64();

    logger.info('Batch listing PSBT created', {
      psbtLength: unsignedPsbtBase64.length,
      inputCount: psbt.data.inputs.length,
      outputCount: psbt.data.outputs.length,
    });

    return {
      unsignedPsbt: unsignedPsbtBase64,
    };
  }

  async completePurchasePSBT(
    signedListingPsbtBase64: string,
    buyerAddress: string,
    price: number,
    buyerUtxos: UTXO[],
    sellerPaymentAddress: string,
    psbtIndex: number = 0
  ): Promise<CompletedPSBTData> {
    logger.info('Completing purchase PSBT', { 
      buyerAddress, 
      price, 
      utxoCount: buyerUtxos.length,
      psbtIndex
    });

    const sellerPsbt = bitcoin.Psbt.fromBase64(signedListingPsbtBase64, { network: NETWORK });

    const sellerTxInput = sellerPsbt.txInputs[psbtIndex];
    const sellerTxOutput = sellerPsbt.txOutputs[psbtIndex];
    const sellerInputData = sellerPsbt.data.inputs[psbtIndex];

    const psbt = new bitcoin.Psbt({ network: NETWORK });

    psbt.addInput({
      hash: sellerTxInput.hash,
      index: sellerTxInput.index,
      witnessUtxo: sellerInputData.witnessUtxo,
      tapInternalKey: sellerInputData.tapInternalKey,
      sighashType: sellerInputData.sighashType !== undefined ? sellerInputData.sighashType : bitcoin.Transaction.SIGHASH_SINGLE | bitcoin.Transaction.SIGHASH_ANYONECANPAY,
    });

    psbt.addOutput({
      script: sellerTxOutput.script,
      value: sellerTxOutput.value,
    });

    const marketplaceFee = Math.floor(price * MARKETPLACE_FEE_PERCENT / 100);
    const totalNeeded = BigInt(price) + BigInt(marketplaceFee) + DUST_LIMIT;
    
    let selectedUtxos: UTXO[] = [];
    let totalInputValue = 0n;

    for (const utxo of buyerUtxos) {
      if (!utxo.status.confirmed) continue;
      selectedUtxos.push(utxo);
      totalInputValue += BigInt(utxo.value);
      if (totalInputValue >= totalNeeded) break;
    }

    if (totalInputValue < totalNeeded) {
      throw new ValidationError(`Saldo disponible insuficiente: se necesitan ${totalNeeded} sat, hay ${totalInputValue} sat. Los UTXOs con activos/inscripciones no se usan para pagar.`);
    }

    for (const utxo of selectedUtxos) {
      psbt.addInput({
        hash: utxo.txid,
        index: utxo.vout,
        witnessUtxo: {
          script: bitcoin.address.toOutputScript(buyerAddress, NETWORK),
          value: BigInt(utxo.value),
        },
      });
    }

    psbt.addOutput({
      address: config.marketplace.feeAddress || sellerPaymentAddress,
      value: BigInt(marketplaceFee),
    });

    const changeValue = totalInputValue - totalNeeded;
    if (changeValue > DUST_LIMIT) {
      psbt.addOutput({
        address: buyerAddress,
        value: changeValue,
      });
    }

    if (sellerInputData.partialSig && sellerInputData.partialSig.length > 0) {
      (psbt.data.inputs[0] as any).partialSig = sellerInputData.partialSig.map((ps: any) => ({ pubkey: ps.pubkey, signature: ps.signature }));
    }
    if (sellerInputData.tapScriptSig && sellerInputData.tapScriptSig.length > 0) {
      (psbt.data.inputs[0] as any).tapScriptSig = sellerInputData.tapScriptSig.map((ts: any) => ({ pubkey: ts.pubkey, leafHash: ts.leafHash, signature: ts.signature }));
    }
    if (sellerInputData.tapKeySig) {
      (psbt.data.inputs[0] as any).tapKeySig = sellerInputData.tapKeySig;
    }

    const transactionId = this.generateTransactionId();
    const expiresAt = Date.now() + config.transaction.psbtExpirationMs;

    const completedPsbtBase64 = psbt.toBase64();

    logger.info('Purchase PSBT completed', { 
      transactionId, 
      buyerInputs: selectedUtxos.length,
      marketplaceFee,
      changeValue: changeValue.toString(),
      psbtLength: completedPsbtBase64.length
    });

    return {
      psbt: completedPsbtBase64,
      transactionId,
      expiresAt,
      buyerInputs: selectedUtxos.map(u => ({ txid: u.txid, vout: u.vout, value: u.value })),
      marketplaceFee,
      changeValue: Number(changeValue),
    };
  }

  async finalizeAndBroadcast(psbtInput: string): Promise<string> {
    let psbt: bitcoin.Psbt;
    const cleanInput = psbtInput.trim();
    if (/^[0-9a-fA-F]+$/.test(cleanInput) && cleanInput.length % 2 === 0) {
      const buf = Buffer.from(cleanInput, 'hex');
      psbt = bitcoin.Psbt.fromBuffer(buf, { network: NETWORK });
    } else {
      psbt = bitcoin.Psbt.fromBase64(cleanInput, { network: NETWORK });
    }
    
    for (let i = 0; i < psbt.data.inputs.length; i++) {
      try {
        psbt.validateSignaturesOfInput(i, (pubkey, msghash, signature) => 
          ECPair.fromPublicKey(pubkey).verify(msghash, signature)
        );
      } catch {
        throw new ValidationError(`Invalid signature on input ${i}`);
      }
    }

    psbt.finalizeAllInputs();
    const tx = psbt.extractTransaction();
    const rawTx = tx.toHex();

    logger.info('Transaction finalized', { txid: tx.getId(), rawTxLength: rawTx.length });

    return rawTx;
  }

  validateSignedListingPSBT(psbtInput: string, expectedSellerPaymentAddress: string, expectedPrice: number): boolean {
    try {
      let psbt: bitcoin.Psbt;

      const cleanInput = psbtInput.trim();

      if (/^[0-9a-fA-F]+$/.test(cleanInput) && cleanInput.length % 2 === 0) {
        const buf = Buffer.from(cleanInput, 'hex');
        psbt = bitcoin.Psbt.fromBuffer(buf, { network: NETWORK });
      } else {
        psbt = bitcoin.Psbt.fromBase64(cleanInput, { network: NETWORK });
      }

      logger.info('PSBT parsed successfully', {
        inputCount: psbt.data.inputs.length,
        outputCount: psbt.data.outputs.length,
      });

      if (psbt.data.inputs.length < 1) {
        logger.warn('PSBT validation failed: no inputs');
        return false;
      }

      if (psbt.data.outputs.length < 1) {
        logger.warn('PSBT validation failed: no outputs');
        return false;
      }

      const output = psbt.data.outputs[0] as any;
      if (output.value !== undefined && output.value !== null) {
        const actualValue = typeof output.value === 'bigint' ? Number(output.value) : output.value;
        if (actualValue !== expectedPrice) {
          logger.warn('PSBT validation failed: price mismatch', { expected: expectedPrice, actual: actualValue });
          return false;
        }
      }

      if (output.script) {
        try {
          const outputAddress = bitcoin.address.fromOutputScript(output.script, NETWORK);
          if (outputAddress !== expectedSellerPaymentAddress) {
            logger.warn('PSBT validation failed: address mismatch', { expected: expectedSellerPaymentAddress, actual: outputAddress });
            return false;
          }
        } catch (addrErr: any) {
          logger.warn('Could not decode output address, skipping address check', { msg: addrErr.message });
        }
      }

      return true;
    } catch (error: any) {
      logger.error('PSBT validation error', { message: error.message });
      return false;
    }
  }

  validateBatchSignedPSBT(psbtInput: string, listings: Array<{ sellerPaymentAddress: string; price: number }>): boolean {
    try {
      let psbt: bitcoin.Psbt;

      const cleanInput = psbtInput.trim();

      if (/^[0-9a-fA-F]+$/.test(cleanInput) && cleanInput.length % 2 === 0) {
        const buf = Buffer.from(cleanInput, 'hex');
        psbt = bitcoin.Psbt.fromBuffer(buf, { network: NETWORK });
      } else {
        psbt = bitcoin.Psbt.fromBase64(cleanInput, { network: NETWORK });
      }

      logger.info('Batch PSBT parsed', {
        inputCount: psbt.data.inputs.length,
        outputCount: psbt.data.outputs.length,
        listingCount: listings.length,
      });

      if (psbt.data.outputs.length !== listings.length) {
        logger.warn('Batch PSBT validation failed: output/listing count mismatch', {
          outputs: psbt.data.outputs.length,
          listings: listings.length,
        });
        return false;
      }

      for (let i = 0; i < listings.length; i++) {
        const output = psbt.data.outputs[i] as any;
        const listing = listings[i];

        if (output.value !== undefined && output.value !== null) {
          const actualValue = typeof output.value === 'bigint' ? Number(output.value) : output.value;
          if (actualValue !== listing.price) {
            logger.warn('Batch PSBT validation failed: price mismatch at output', {
              index: i,
              expected: listing.price,
              actual: actualValue,
            });
            return false;
          }
        }

        if (output.script) {
          try {
            const outputAddress = bitcoin.address.fromOutputScript(output.script, NETWORK);
            if (outputAddress !== listing.sellerPaymentAddress) {
              logger.warn('Batch PSBT validation failed: address mismatch at output', {
                index: i,
                expected: listing.sellerPaymentAddress,
                actual: outputAddress,
              });
              return false;
            }
          } catch (addrErr: any) {
            logger.warn('Could not decode output address at index', { index: i, msg: addrErr.message });
          }
        }
      }

      return true;
    } catch (error: any) {
      logger.error('Batch PSBT validation error', { message: error.message });
      return false;
    }
  }

  private async fetchInscriptionUTXO(inscriptionId: string): Promise<InscriptionUTXO | null> {
    try {
      const response = await fetch(`${config.apis.ordinals.baseUrl}/inscription/${inscriptionId}`, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(config.apis.ordinals.timeout),
      });

      if (!response.ok) {
        if (response.status === 404) return null;
        throw new ExternalApiError(`Failed to fetch inscription: ${response.status}`);
      }

      const data: any = await response.json();

      const outputParts = data.output?.split(':');
      if (!outputParts || outputParts.length !== 2) {
        logger.error('Invalid output format in inscription data', { output: data.output });
        return null;
      }

      return {
        txid: outputParts[0],
        vout: parseInt(outputParts[1], 10),
        value: data.value || 0,
        satpoint: data.satpoint || '',
        contentType: data.content_type || '',
        height: data.height || 0,
      };
    } catch (error) {
      logger.error('Error fetching inscription UTXO', { inscriptionId, error });
      throw error;
    }
  }

  async completeBatchPurchasePSBT(
    listings: Array<{ signedPsbtBase64: string; price: number; sellerPaymentAddress: string; psbtIndex: number }>,
    buyerAddress: string,
    buyerUtxos: UTXO[]
  ): Promise<{ psbt: string; marketplaceFee: number; changeValue: number; buyerInputs: Array<{ txid: string; vout: number; value: number }> }> {
    logger.info('Completing batch purchase PSBT', {
      listingCount: listings.length,
      buyerAddress,
      utxoCount: buyerUtxos.length,
    });

    const psbt = new bitcoin.Psbt({ network: NETWORK });

    let totalPrice = 0;
    let totalFee = 0;

    const sellerSigs: Array<{ partialSig: any[]; tapScriptSig: any[]; tapKeySig: any }> = [];

    for (const listing of listings) {
      const sellerPsbt = bitcoin.Psbt.fromBase64(listing.signedPsbtBase64, { network: NETWORK });

      const txInput = sellerPsbt.txInputs[listing.psbtIndex];
      const txOutput = sellerPsbt.txOutputs[listing.psbtIndex];
      const inputData = sellerPsbt.data.inputs[listing.psbtIndex];

      psbt.addInput({
        hash: txInput.hash,
        index: txInput.index,
        witnessUtxo: inputData.witnessUtxo,
        tapInternalKey: inputData.tapInternalKey,
        sighashType: inputData.sighashType !== undefined ? inputData.sighashType : bitcoin.Transaction.SIGHASH_SINGLE | bitcoin.Transaction.SIGHASH_ANYONECANPAY,
      });

      psbt.addOutput({
        script: txOutput.script,
        value: txOutput.value,
      });

      sellerSigs.push({
        partialSig: inputData.partialSig || [],
        tapScriptSig: inputData.tapScriptSig || [],
        tapKeySig: inputData.tapKeySig || null,
      });

      totalPrice += listing.price;
      totalFee += Math.floor(listing.price * MARKETPLACE_FEE_PERCENT / 100);
    }

    psbt.addOutput({
      address: config.marketplace.feeAddress || listings[0].sellerPaymentAddress,
      value: BigInt(totalFee),
    });

    const totalNeeded = BigInt(totalPrice) + BigInt(totalFee) + DUST_LIMIT;

    let selectedUtxos: UTXO[] = [];
    let totalInputValue = 0n;

    for (const utxo of buyerUtxos) {
      if (!utxo.status.confirmed) continue;
      selectedUtxos.push(utxo);
      totalInputValue += BigInt(utxo.value);
      if (totalInputValue >= totalNeeded) break;
    }

    if (totalInputValue < totalNeeded) {
      throw new ValidationError(`Saldo disponible insuficiente: se necesitan ${totalNeeded} sat, hay ${totalInputValue} sat. Los UTXOs con activos/inscripciones no se usan para pagar.`);
    }

    for (const utxo of selectedUtxos) {
      psbt.addInput({
        hash: utxo.txid,
        index: utxo.vout,
        witnessUtxo: {
          script: bitcoin.address.toOutputScript(buyerAddress, NETWORK),
          value: BigInt(utxo.value),
        },
      });
    }

    const changeValue = totalInputValue - totalNeeded;
    if (changeValue > DUST_LIMIT) {
      psbt.addOutput({
        address: buyerAddress,
        value: changeValue,
      });
    }

    for (let i = 0; i < sellerSigs.length; i++) {
      const sigs = sellerSigs[i];
      if (sigs.partialSig.length > 0) {
        (psbt.data.inputs[i] as any).partialSig = sigs.partialSig.map((ps: any) => ({ pubkey: ps.pubkey, signature: ps.signature }));
      }
      if (sigs.tapScriptSig.length > 0) {
        (psbt.data.inputs[i] as any).tapScriptSig = sigs.tapScriptSig.map((ts: any) => ({ pubkey: ts.pubkey, leafHash: ts.leafHash, signature: ts.signature }));
      }
      if (sigs.tapKeySig) {
        (psbt.data.inputs[i] as any).tapKeySig = sigs.tapKeySig;
      }
    }

    const completedPsbtBase64 = psbt.toBase64();

    logger.info('Batch purchase PSBT completed', {
      listingCount: listings.length,
      buyerInputs: selectedUtxos.length,
      totalPrice,
      marketplaceFee: totalFee,
      changeValue: changeValue.toString(),
      psbtLength: completedPsbtBase64.length,
    });

    return {
      psbt: completedPsbtBase64,
      marketplaceFee: totalFee,
      changeValue: Number(changeValue),
      buyerInputs: selectedUtxos.map(u => ({ txid: u.txid, vout: u.vout, value: u.value })),
    };
  }

  public pubkeyToXOnly(pubkey: string): Buffer {
    const pubkeyBuffer = Buffer.from(pubkey, 'hex');
    if (pubkeyBuffer.length === 32) {
      return pubkeyBuffer;
    }
    if (pubkeyBuffer.length === 33) {
      return pubkeyBuffer.subarray(1, 33);
    }
    if (pubkeyBuffer.length === 65) {
      return pubkeyBuffer.subarray(1, 33);
    }
    throw new ValidationError('Invalid public key length');
  }

  private generateTransactionId(): string {
    return 'tx_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
  }
}