import { ValidationError } from '../errors/AppError';
import { isValidBitcoinAddress } from '../utils/bitcoinValidator';
import { logger } from '../utils/logger';

export class WalletService {
  verifySignature(address: string, message: string, signature: string): { valid: boolean; address: string } {
    logger.info('Verifying wallet signature', { address });

    if (!isValidBitcoinAddress(address)) {
      throw new ValidationError('Invalid Bitcoin address');
    }

    if (!message || !signature) {
      throw new ValidationError('Message and signature are required');
    }

    let isValid = false;

    try {
      if (address.startsWith('bc1p')) {
        isValid = this.verifyBip322(address, message, signature);
      } else if (address.startsWith('bc1q') || address.startsWith('1') || address.startsWith('3')) {
        isValid = this.verifyEcdsa(address, message, signature);
      } else {
        throw new ValidationError('Unsupported address format');
      }
    } catch (error) {
      const errMsg = (error as Error).message;
      logger.error('Signature verification failed', { address, error: errMsg });
      throw new ValidationError(`Signature verification failed: ${errMsg}`);
    }

    return { valid: isValid, address };
  }

  private verifyBip322(address: string, message: string, signature: string): boolean {
    try {
      const { Verifier } = require('bip322-js');
      const isValid = Verifier.verifySignature(address, message, signature, false);
      return isValid === true;
    } catch (error) {
      logger.error('BIP-322 verification failed', { error: (error as Error).message });
      return false;
    }
  }

  private verifyEcdsa(address: string, message: string, signature: string): boolean {
    try {
      const bitcoinMessage = require('bitcoinjs-message');
      const isValid = bitcoinMessage.verify(message, address, signature);
      return isValid === true;
    } catch (error) {
      logger.error('ECDSA verification failed', { error: (error as Error).message });
      return false;
    }
  }
}