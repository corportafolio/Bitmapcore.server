import axios from 'axios';
import { config } from '../config/environment';
import { withTimeout } from '../utils/timeout';
import { logger } from '../utils/logger';
import { WalletBalance, TransactionStatusResponse } from '../types/transaction';
import { ExternalApiError } from '../errors/AppError';

interface MempoolAddressInfo {
  address: string;
  chain_stats: {
    funded_txo_count: number;
    spent_txo_count: number;
    tx_count: number;
    satoshis: number;
  };
}

interface MempoolTransaction {
  txid: string;
  status: {
    confirmed: boolean;
    block_height?: number;
    block_time?: number;
  };
}

interface MempoolUTXO {
  txid: string;
  vout: number;
  value: number;
  status: {
    confirmed: boolean;
    block_height?: number;
    block_time?: number;
  };
}

export class MempoolService {
  private baseUrl = config.apis.mempool.baseUrl;
  private timeout = config.apis.mempool.timeout;

  async getBalance(address: string): Promise<WalletBalance> {
    logger.info('Getting wallet balance', { address });

    try {
      const response = await withTimeout<MempoolAddressInfo>(
        axios.get<MempoolAddressInfo>(
          `${this.baseUrl}/address/${address}`,
          { timeout: this.timeout }
        ).then(res => res.data),
        this.timeout,
        'Mempool API get balance'
      );

      const satoshis = response.chain_stats.satoshis;
      const balance = satoshis / 100000000;

      logger.info('Wallet balance retrieved', {
        address,
        satoshis,
        balance
      });

      return {
        balance,
        satoshis,
        utxos: response.chain_stats.funded_txo_count,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        logger.error('Mempool API error', {
          address,
          status: error.response?.status,
          message: error.message
        });
        throw new ExternalApiError(`Failed to get balance: ${error.message}`);
      }
      throw error;
    }
  }

  async getUTXOs(address: string): Promise<MempoolUTXO[]> {
    logger.info('Getting wallet UTXOs', { address });

    try {
      const response = await withTimeout<MempoolUTXO[]>(
        axios.get<MempoolUTXO[]>(
          `${this.baseUrl}/address/${address}/utxo`,
          { timeout: this.timeout }
        ).then(res => res.data),
        this.timeout,
        'Mempool API get UTXOs'
      );

      const confirmedUtxos = response.filter(utxo => utxo.status.confirmed);

      logger.info('Wallet UTXOs retrieved', { 
        address, 
        total: response.length,
        confirmed: confirmedUtxos.length 
      });

      return confirmedUtxos;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        logger.error('Mempool UTXOs error', {
          address,
          status: error.response?.status,
          message: error.message
        });
        throw new ExternalApiError(`Failed to get UTXOs: ${error.message}`);
      }
      throw error;
    }
  }

  async broadcast(rawTxHex: string): Promise<{ txid: string }> {
    logger.info('Broadcasting raw transaction to mempool', { rawTxLength: rawTxHex.length });

    try {
      const rawResponse = await withTimeout<string>(
        axios.post(
          `${this.baseUrl}/tx`,
          rawTxHex,
          {
            timeout: this.timeout,
            headers: { 'Content-Type': 'text/plain' }
          }
        ).then(res => res.data),
        this.timeout,
        'Mempool API broadcast'
      );

      const txid = typeof rawResponse === 'string' ? rawResponse.trim() : (rawResponse as any).txid || String(rawResponse);

      logger.info('Mempool accepted transaction', { txid });

      return { txid };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        logger.error('Mempool broadcast error', {
          status: error.response?.status,
          message: error.message,
          data: error.response?.data
        });
        throw new ExternalApiError(`Failed to broadcast to mempool: ${error.response?.data || error.message}`);
      }
      throw error;
    }
  }

  async getTransactionStatus(txid: string): Promise<TransactionStatusResponse> {
    logger.info('Getting transaction status', { txid });

    try {
      const response = await withTimeout<MempoolTransaction>(
        axios.get<MempoolTransaction>(
          `${this.baseUrl}/tx/${txid}`,
          { timeout: this.timeout }
        ).then(res => res.data),
        this.timeout,
        'Mempool API get transaction'
      );

      const status: TransactionStatusResponse = {
        txid: response.txid,
        status: response.status.confirmed ? 'confirmed' : 'pending',
        confirmations: response.status.confirmed ? 1 : 0,
        blockNumber: response.status.block_height,
      };

      logger.info('Transaction status retrieved', {
        txid,
        status: status.status,
        confirmations: status.confirmations
      });

      return status;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          return {
            txid,
            status: 'pending',
            confirmations: 0,
          };
        }

        logger.error('Mempool transaction status error', {
          txid,
          status: error.response?.status,
          message: error.message
        });

        throw new ExternalApiError(`Failed to get transaction status: ${error.message}`);
      }
      throw error;
    }
  }

  async getInscriptionHash(inscriptionId: string): Promise<string | null> {
    try {
      const response = await withTimeout<{ txid: string }>(
        axios.get<{ txid: string }>(
          `${this.baseUrl}/inscription/${inscriptionId}`,
          { timeout: this.timeout }
        ).then(res => res.data),
        this.timeout,
        'Mempool API get inscription hash'
      );

      return response.txid;
    } catch (error) {
      logger.error('Error getting inscription hash', { inscriptionId, error });
      return null;
    }
  }
}
