import axios from 'axios';
import { config } from '../config/environment';
import { withTimeout } from '../utils/timeout';
import { logger } from '../utils/logger';
import { OrdinalsInscription, BitmapVerification } from '../types/bitmap';
import { ExternalApiError } from '../errors/AppError';

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

      const isBitmap = response.body && response.body.includes('bitmap');

      logger.info('Bitmap verification result', {
        inscriptionId,
        isBitmap,
        blockNumber: response.number
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
}
