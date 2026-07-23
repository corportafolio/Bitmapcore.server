import * as bitcoin from 'bitcoinjs-lib';
import * as ecpair from 'ecpair';
import * as tinysecp from 'tiny-secp256k1';
import { config } from '../config/environment';
import { logger } from '../utils/logger';
import { ExternalApiError, ValidationError } from '../errors/AppError';

const ECPair = ecpair.ECPairFactory(tinysecp);

const NETWORK = bitcoin.networks.bitcoin;
const DUST_LIMIT = 546n;
const MARKETPLACE_FEE_PERCENT = 1;

export interface InscriptionUTXO {
  txid: string;
  vout: number;
  value: number;
  satpoint: string;
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
    sellerOrdinalPublicKey: string
  ): Promise<ListingPSBTData> {
    logger.info('Creating listing PSBT', { inscriptionId, sellerPaymentAddress, price });

    const inscriptionUtxo = await this.fetchInscriptionUTXO(inscriptionId);

    if (!inscriptionUtxo) {
      throw new ValidationError('Could not fetch inscription UTXO');
    }

    if (price > inscriptionUtxo.value) {
      throw new ValidationError(`Price (${price} sat) exceeds inscription value (${inscriptionUtxo.value} sat)`);
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

  async completePurchasePSBT(
    signedListingPsbtBase64: string,
    buyerAddress: string,
    price: number,
    buyerUtxos: UTXO[],
    sellerPaymentAddress: string
  ): Promise<CompletedPSBTData> {
    logger.info('Completing purchase PSBT', { 
      buyerAddress, 
      price, 
      utxoCount: buyerUtxos.length 
    });

    const psbt = bitcoin.Psbt.fromBase64(signedListingPsbtBase64, { network: NETWORK });

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
      throw new ValidationError(`Insufficient funds: need ${totalNeeded} sat, have ${totalInputValue} sat`);
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
      address: sellerPaymentAddress,
      value: BigInt(price),
    });

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

  async finalizeAndBroadcast(psbtBase64: string): Promise<string> {
    const psbt = bitcoin.Psbt.fromBase64(psbtBase64, { network: NETWORK });
    
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

  validateSignedListingPSBT(psbtBase64: string, expectedSellerPaymentAddress: string, expectedPrice: number): boolean {
    try {
      const psbt = bitcoin.Psbt.fromBase64(psbtBase64, { network: NETWORK });

      if (psbt.data.inputs.length !== 1) {
        logger.warn('PSBT validation failed: expected 1 input', { inputCount: psbt.data.inputs.length });
        return false;
      }

      if (psbt.data.outputs.length !== 1) {
        logger.warn('PSBT validation failed: expected 1 output', { outputCount: psbt.data.outputs.length });
        return false;
      }

      const output = psbt.data.outputs[0] as any;
      if (output.value !== BigInt(expectedPrice)) {
        logger.warn('PSBT validation failed: price mismatch', { expected: expectedPrice, actual: output.value?.toString() });
        return false;
      }

      const outputAddress = bitcoin.address.fromOutputScript(output.script, NETWORK);
      if (outputAddress !== expectedSellerPaymentAddress) {
        logger.warn('PSBT validation failed: address mismatch', { expected: expectedSellerPaymentAddress, actual: outputAddress });
        return false;
      }

      try {
        psbt.validateSignaturesOfInput(0, (pubkey, msghash, signature) => 
          ECPair.fromPublicKey(pubkey).verify(msghash, signature)
        );
      } catch {
        logger.warn('PSBT validation failed: seller signature invalid');
        return false;
      }

      return true;
    } catch (error) {
      logger.error('PSBT validation error', { error });
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
      };
    } catch (error) {
      logger.error('Error fetching inscription UTXO', { inscriptionId, error });
      throw error;
    }
  }

  private pubkeyToXOnly(pubkey: string): Buffer {
    const pubkeyBuffer = Buffer.from(pubkey, 'hex');
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