import axios from 'axios';
import { config } from '../config/environment';
import { withTimeout } from '../utils/timeout';
import { logger } from '../utils/logger';
import { OrdinalsInscription, BitmapVerification } from '../types/bitmap';
import { ExternalApiError } from '../errors/AppError';

export interface BitmapDetails {
  bitmapNumber?: number;
  inscriptionNumber: number;
  ownerAddress: string;
  contentType: string;
  body: string;
}

export class OrdinalsService {
  private baseUrl = config.apis.ordinals.baseUrl;
  private timeout = config.apis.ordinals.timeout;

  async verifyBitmap(inscriptionId: string): Promise<BitmapVerification> {
    logger.info('Verifying bitmap', { inscriptionId });

    try {
      const response = await withTimeout<OrdinalsInscription>(
        axios.get<OrdinalsInscription>(
          `${this.baseUrl}/inscription/${inscriptionId}`,
          {
            timeout: this.timeout,
            headers: { 'Accept': 'application/json' }
          }
        ).then(res => res.data),
        this.timeout,
        'Ordinals API verify'
      );

      const isBitmap = Boolean(response.body && response.body.includes('bitmap'));

      logger.info('Bitmap verification result', {
        inscriptionId,
        isBitmap,
        blockNumber: response.number,
        ownerAddress: response.address
      });

      return {
        isBitmap,
        blockNumber: isBitmap ? response.number : undefined,
        inscriptionId,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          return {
            isBitmap: false,
            inscriptionId,
          };
        }

        logger.error('Ordinals API error', {
          inscriptionId,
          status: error.response?.status,
          message: error.message
        });

        throw new ExternalApiError(`Failed to verify bitmap: ${error.message}`);
      }

      throw error;
    }
  }

  async getInscription(inscriptionId: string): Promise<OrdinalsInscription | null> {
    try {
      const response = await withTimeout<OrdinalsInscription>(
        axios.get<OrdinalsInscription>(
          `${this.baseUrl}/inscription/${inscriptionId}`,
          { timeout: this.timeout }
        ).then(res => res.data),
        this.timeout,
        'Ordinals API get inscription'
      );
      return response;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async getInscriptionsByAddress(address: string): Promise<any[]> {
    logger.info('Fetching inscriptions by address from Ordinals API', { address });
    
    try {
      const response = await withTimeout<any>(
        axios.get(
          `${this.baseUrl}/address/${address}/inscriptions`,
          {
            timeout: this.timeout,
            headers: { 'Accept': 'application/json' }
          }
        ).then(res => res.data),
        this.timeout,
        'Ordinals API get inscriptions by address'
      );
      
      return response.inscriptions || [];
    } catch (error) {
      logger.error('Error fetching inscriptions by address', { address, error });
      return [];
    }
  }

  async getBitmapDetails(inscriptionId: string): Promise<BitmapDetails | null> {
    try {
      const inscription = await this.getInscription(inscriptionId);
      if (!inscription) return null;

      return {
        bitmapNumber: inscription.number,
        inscriptionNumber: inscription.number,
        ownerAddress: inscription.address,
        contentType: inscription.content_type,
        body: inscription.body
      };
    } catch (error) {
      logger.error('Error getting bitmap details', { inscriptionId, error });
      return null;
    }
  }

  async verifyOwnership(inscriptionId: string, expectedAddress: string): Promise<boolean> {
    logger.info('Verifying ownership', { inscriptionId, expectedAddress });
    
    try {
      const inscription = await this.getInscription(inscriptionId);
      if (!inscription) {
        logger.warn('Inscription not found for ownership verification', { inscriptionId });
        return false;
      }

      const isOwner = inscription.address.toLowerCase() === expectedAddress.toLowerCase();
      
      logger.info('Ownership verification result', {
        inscriptionId,
        expectedAddress,
        actualOwner: inscription.address,
        isOwner
      });

      return isOwner;
    } catch (error) {
      logger.error('Error verifying ownership', { inscriptionId, expectedAddress, error });
      return false;
    }
  }
}
