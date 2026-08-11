import { ListingRepository } from '../repositories/ListingRepository';
import { OrdinalsService } from './OrdinalsService';
import { MempoolService } from './MempoolService';
import { PSBTService } from './PSBTService';
import { BitmapListing, BitmapListingCreate, BitmapListingUpdate, BitmapVerification, ListingsResponse } from '../types/bitmap';
import { NotFoundError, ValidationError } from '../errors/AppError';
import { isValidBitcoinAddress } from '../utils/bitcoinValidator';
import { logger } from '../utils/logger';

export interface CreateListingResult {
  listing: BitmapListing;
  psbtToSign: string;
}

export class BitmapService {
  private listingRepo: ListingRepository;
  private ordinalsService: OrdinalsService;
  private mempoolService: MempoolService;
  private psbtService: PSBTService;

  constructor() {
    this.listingRepo = new ListingRepository();
    this.ordinalsService = new OrdinalsService();
    this.mempoolService = new MempoolService();
    this.psbtService = new PSBTService();
  }

  async createListing(data: BitmapListingCreate): Promise<CreateListingResult> {
    logger.info('Creating listing', { inscriptionId: data.inscriptionId, price: data.price });

    if (!isValidBitcoinAddress(data.sellerAddress)) {
      throw new ValidationError('Invalid seller Bitcoin address');
    }

    if (!isValidBitcoinAddress(data.sellerPaymentAddress)) {
      throw new ValidationError('Invalid seller payment address');
    }

    const existing = this.listingRepo.findByInscriptionId(data.inscriptionId);
    if (existing && existing.isActive) {
      throw new ValidationError('Bitmap is already listed for sale');
    }

    if (data.inscriptionContentType && !data.inscriptionContentType.startsWith('text/plain')) {
      throw new ValidationError('Esta inscripción no es un bitmap válido');
    }

    const psbtResult = await this.psbtService.createListingPSBT(
      data.inscriptionId,
      data.sellerPaymentAddress,
      data.price,
      data.sellerOrdinalPublicKey,
      data.inscriptionUtxo,
      data.inscriptionValue,
      data.sellerAddress
    );

    const listing = this.listingRepo.create(data);

    this.listingRepo.updatePsbtFields(listing.id, {
      unsignedPsbt: psbtResult.unsignedPsbt,
      psbtStatus: 'pending',
    });

    logger.info('Listing created with PSBT', { 
      listingId: listing.id, 
      inscriptionId: data.inscriptionId,
      psbtLength: psbtResult.unsignedPsbt.length
    });

    // Trigger immediate local marketplace refresh on port 5500
    await this.triggerLocalMarketplaceRefresh();

    return {
      listing,
      psbtToSign: psbtResult.unsignedPsbt,
    };
  }

  async signListing(listingId: string, signedPsbt: string, sellerOrdinalPublicKey: string): Promise<BitmapListing> {
    const listing = this.listingRepo.findById(listingId);
    if (!listing) {
      throw new NotFoundError('Listing not found');
    }

    if (listing.psbtStatus !== 'pending') {
      throw new ValidationError(`Listing is not in 'pending' state: ${listing.psbtStatus}`);
    }

    if (listing.sellerOrdinalPublicKey !== sellerOrdinalPublicKey) {
      throw new ValidationError('Public key does not match listing');
    }

    const isValid = this.psbtService.validateSignedListingPSBT(
      signedPsbt,
      listing.sellerPaymentAddress!,
      listing.price
    );

    if (!isValid) {
      throw new ValidationError('Invalid PSBT signature');
    }

    this.listingRepo.updatePsbtFields(listingId, {
      signedPsbt,
      psbtStatus: 'signed',
      isActive: true,
    });

    logger.info('Listing signed and activated', { listingId });

    // Trigger immediate local marketplace refresh on port 5500
    await this.triggerLocalMarketplaceRefresh();

    return this.listingRepo.findById(listingId)!;
  }

  async getPriceUpdatePSBT(
    listingId: string,
    newPrice: number,
    sellerAddress: string,
    clientUtxo: string,
    clientValue: number
  ): Promise<{ unsignedPsbt: string; listing: BitmapListing }> {
    const listing = this.listingRepo.findById(listingId);
    if (!listing) {
      throw new NotFoundError('Listing not found');
    }

    if (listing.sellerAddress !== sellerAddress) {
      throw new ValidationError('You are not the seller of this listing');
    }

    if (!listing.isActive) {
      throw new ValidationError('Listing is not active');
    }

    if (newPrice <= 0) {
      throw new ValidationError('Price must be greater than 0');
    }

    if (!listing.sellerOrdinalPublicKey || !listing.sellerPaymentAddress) {
      throw new ValidationError('Listing missing PSBT data');
    }

    const psbtResult = await this.psbtService.createPriceUpdatePSBT(
      listing.inscriptionId,
      listing.sellerPaymentAddress,
      newPrice,
      listing.sellerOrdinalPublicKey,
      clientUtxo,
      clientValue
    );

    this.listingRepo.updatePsbtFields(listingId, {
      unsignedPsbt: psbtResult.unsignedPsbt,
      psbtStatus: 'pending',
    });

    logger.info('Price update PSBT generated', { listingId, newPrice });

    const updatedListing = this.listingRepo.findById(listingId)!;
    return {
      unsignedPsbt: psbtResult.unsignedPsbt,
      listing: updatedListing,
    };
  }

  async signPriceUpdate(
    listingId: string,
    signedPsbt: string,
    sellerOrdinalPublicKey: string,
    newPrice: number
  ): Promise<BitmapListing> {
    const listing = this.listingRepo.findById(listingId);
    if (!listing) {
      throw new NotFoundError('Listing not found');
    }

    if (listing.psbtStatus !== 'pending') {
      throw new ValidationError(`Listing is not in 'pending' state: ${listing.psbtStatus}`);
    }

    if (listing.sellerOrdinalPublicKey !== sellerOrdinalPublicKey) {
      throw new ValidationError('Public key does not match listing');
    }

    if (newPrice <= 0) {
      throw new ValidationError('Price must be greater than 0');
    }

    const isValid = this.psbtService.validateSignedListingPSBT(
      signedPsbt,
      listing.sellerPaymentAddress!,
      newPrice
    );

    if (!isValid) {
      throw new ValidationError('Invalid PSBT signature for new price');
    }

    this.listingRepo.deleteBatchMapping(listingId);

    this.listingRepo.updatePsbtFields(listingId, {
      signedPsbt,
      psbtStatus: 'signed',
      price: newPrice,
      listedAt: Date.now(),
    });

    logger.info('Price update signed and activated', { listingId, newPrice });

    await this.triggerLocalMarketplaceRefresh();

    return this.listingRepo.findById(listingId)!;
  }

  async getListings(page: number = 1, limit: number = 20, sort: string = 'listed_desc'): Promise<ListingsResponse> {
    logger.debug('Getting listings', { page, limit, sort });
    const result = this.listingRepo.findActiveWithPaginationAndSort(page, limit, sort);
    return {
      items: result.items,
      total: result.total,
      floorPrice: result.floorPrice,
      page,
      limit,
      sort,
    };
  }

  async getActiveListings(): Promise<BitmapListing[]> {
    logger.debug('Getting all active listings');
    return this.listingRepo.findAllActive();
  }

  async getInscriptionsByOwner(address: string): Promise<any[]> {
    logger.info('Getting inscriptions for owner', { address });
    return this.ordinalsService.getInscriptionsByAddress(address);
  }

  async getListingById(id: string): Promise<BitmapListing> {
    const listing = this.listingRepo.findById(id);
    if (!listing) {
      throw new NotFoundError('Listing not found');
    }
    return listing;
  }

  async getListingByInscriptionId(inscriptionId: string): Promise<BitmapListing | null> {
    return this.listingRepo.findByInscriptionId(inscriptionId);
  }

  async updateListing(id: string, data: BitmapListingUpdate, sellerAddress: string): Promise<BitmapListing> {
    const listing = this.listingRepo.findById(id);
    
    if (!listing) {
      throw new NotFoundError('Listing not found');
    }

    if (listing.sellerAddress !== sellerAddress) {
      throw new ValidationError('You are not the seller of this listing');
    }

    return this.listingRepo.update(id, data);
  }

  async deleteListing(id: string, sellerAddress: string): Promise<void> {
    const listing = this.listingRepo.findById(id);
    
    if (!listing) {
      throw new NotFoundError('Listing not found');
    }

    if (listing.sellerAddress !== sellerAddress) {
      throw new ValidationError('You are not the seller of this listing');
    }

    if (listing.soldAt) {
      throw new ValidationError('Cannot delete a sold listing');
    }

    this.listingRepo.deleteBatchMapping(id);
    this.listingRepo.delete(id);
    logger.info('Listing deleted', { listingId: id });
  }

  async verifyBitmap(inscriptionId: string): Promise<BitmapVerification> {
    return this.ordinalsService.verifyBitmap(inscriptionId);
  }

  async getSoldListingsSince(sinceTimestamp: number): Promise<BitmapListing[]> {
    logger.debug('Getting sold listings since', { sinceTimestamp });
    return this.listingRepo.findSoldSince(sinceTimestamp);
  }

  async createBatchListing(items: Array<{
    inscriptionId: string;
    price: number;
    sellerAddress: string;
    sellerOrdinalPublicKey: string;
    sellerPaymentAddress: string;
    name: string;
    imageUrl: string;
    bitmapNumber: number;
    inscriptionNumber: number;
    inscriptionUtxo: string;
    inscriptionValue: number;
    inscriptionContentType: string;
    inscriptionHeight: number;
    isPriceUpdate: boolean;
  }>): Promise<{ listingIds: string[]; psbtToSign: string; psbtToSigns: Array<{ listingId: string; unsignedPsbtHex: string }> }> {
    logger.info('Creating batch listing', { count: items.length });

    const listingIds: string[] = [];
    const psbtInputs: Array<{
      txid: string;
      vout: number;
      value: number;
      tapInternalKey: Buffer;
      sellerOrdinalAddress: string;
      sellerPaymentAddress: string;
      price: number;
    }> = [];

    for (const item of items) {
      if (!isValidBitcoinAddress(item.sellerAddress)) {
        throw new ValidationError('Invalid seller Bitcoin address');
      }
      if (!isValidBitcoinAddress(item.sellerPaymentAddress)) {
        throw new ValidationError('Invalid seller payment address');
      }
      if (item.inscriptionContentType && !item.inscriptionContentType.startsWith('text/plain')) {
        throw new ValidationError('Esta inscripción no es un bitmap válido');
      }

      const parts = item.inscriptionUtxo.split(':');
      const inscriptionUtxo = {
        txid: parts[0] || '',
        vout: parseInt(parts[1] || '0', 10),
        value: item.inscriptionValue,
        satpoint: item.inscriptionUtxo + ':0',
        contentType: item.inscriptionContentType || 'text/plain',
        height: item.inscriptionHeight,
      };

      const existing = this.listingRepo.findByInscriptionId(item.inscriptionId);
      
      if (item.isPriceUpdate && existing) {
        if (!existing.isActive) {
          throw new ValidationError('Listing is not active');
        }
        if (existing.sellerAddress !== item.sellerAddress) {
          throw new ValidationError('You are not the seller of this listing');
        }
        if (!existing.sellerOrdinalPublicKey || !existing.sellerPaymentAddress) {
          throw new ValidationError('Listing missing PSBT data');
        }

        this.listingRepo.deleteBatchMapping(existing.id);

        this.listingRepo.updatePsbtFields(existing.id, {
          price: item.price,
          listedAt: Date.now(),
          psbtStatus: 'pending',
        });

        listingIds.push(existing.id);
        psbtInputs.push({
          txid: inscriptionUtxo.txid,
          vout: inscriptionUtxo.vout,
          value: inscriptionUtxo.value,
          tapInternalKey: this.psbtService.pubkeyToXOnly(existing.sellerOrdinalPublicKey),
          sellerOrdinalAddress: existing.sellerAddress,
          sellerPaymentAddress: existing.sellerPaymentAddress,
          price: item.price,
        });
      } else {
        if (existing && existing.isActive) {
          throw new ValidationError('Bitmap is already listed for sale');
        }

        if (existing && !existing.isActive) {
          this.listingRepo.deleteBatchMapping(existing.id);
          this.listingRepo.delete(existing.id);
        }

        const listing = this.listingRepo.create({
          inscriptionId: item.inscriptionId,
          name: item.name,
          description: '',
          price: item.price,
          sellerAddress: item.sellerAddress,
          imageUrl: item.imageUrl,
          bitmapNumber: item.bitmapNumber,
          inscriptionNumber: item.inscriptionNumber,
          bitmapHash: item.inscriptionId.split('i')[1]?.split('i')[0] || '',
          ownerAddress: item.sellerAddress,
          sellerOrdinalPublicKey: item.sellerOrdinalPublicKey,
          sellerPaymentAddress: item.sellerPaymentAddress,
        });

        listingIds.push(listing.id);
        psbtInputs.push({
          txid: inscriptionUtxo.txid,
          vout: inscriptionUtxo.vout,
          value: inscriptionUtxo.value,
          tapInternalKey: this.psbtService.pubkeyToXOnly(item.sellerOrdinalPublicKey),
          sellerOrdinalAddress: item.sellerAddress,
          sellerPaymentAddress: item.sellerPaymentAddress,
          price: item.price,
        });
      }
    }

    const combinedPsbt = await this.psbtService.createBatchListingPSBT(psbtInputs);
    const separatePsbtHexs = this.psbtService.createSeparateListingPSBTs(psbtInputs);

    const psbtToSigns: Array<{ listingId: string; unsignedPsbtHex: string }> = [];
    for (let i = 0; i < listingIds.length; i++) {
      const id = listingIds[i];
      this.listingRepo.updatePsbtFields(id, {
        unsignedPsbt: separatePsbtHexs[i],
        psbtStatus: 'pending',
      });
      psbtToSigns.push({ listingId: id, unsignedPsbtHex: separatePsbtHexs[i] });
    }

    await this.triggerLocalMarketplaceRefresh();

    return {
      listingIds,
      psbtToSign: combinedPsbt.unsignedPsbt,
      psbtToSigns,
    };
  }

  async signBatchListings(listingIds: string[], signedPsbtHexs: string[], sellerOrdinalPublicKey: string): Promise<BitmapListing[]> {
    logger.info('Signing batch listings', { count: listingIds.length, signedCount: signedPsbtHexs.length });

    const isCombined = signedPsbtHexs.length === 1 && listingIds.length > 1;

    if (!isCombined && listingIds.length !== signedPsbtHexs.length) {
      throw new ValidationError(`Mismatch: ${listingIds.length} listings but ${signedPsbtHexs.length} signed PSBTs`);
    }

    if (isCombined) {
      const sigCheck = this.psbtService.validateSignaturePresence(signedPsbtHexs[0], listingIds.length);
      if (!sigCheck.valid) {
        logger.error('Combined PSBT signature validation failed', { details: sigCheck.details });
        throw new ValidationError(`PSBT combinado: ${sigCheck.details}`);
      }
    }

    const results: BitmapListing[] = [];

    for (let i = 0; i < listingIds.length; i++) {
      const listingId = listingIds[i];
      const signedPsbtHex = isCombined ? signedPsbtHexs[0] : signedPsbtHexs[i];

      const listing = this.listingRepo.findById(listingId);
      if (!listing) {
        throw new ValidationError(`Listing not found: ${listingId}`);
      }

      if (listing.psbtStatus !== 'pending') {
        throw new ValidationError(`Listing is not in 'pending' state: ${listing.psbtStatus}`);
      }

      if (listing.sellerOrdinalPublicKey !== sellerOrdinalPublicKey) {
        throw new ValidationError('Public key does not match listing');
      }

      if (!isCombined) {
        const sigCheck = this.psbtService.validateSignaturePresence(signedPsbtHex, 1);
        if (!sigCheck.valid) {
          logger.warn('PSBT rejected for listing', { listingId, index: i, details: sigCheck.details });
          throw new ValidationError(`Listing #${i + 1} (${listing.bitmapNumber || listing.name}): ${sigCheck.details}`);
        }
      }

      const isPriceUpdate = listing.listedAt && listing.listedAt < Date.now() - 1000;

      this.listingRepo.updatePsbtFields(listingId, {
        signedPsbt: signedPsbtHex,
        psbtStatus: 'signed',
        isActive: true,
        ...(isPriceUpdate ? { listedAt: Date.now() } : {}),
      });

      this.listingRepo.saveBatchMapping(listingId, signedPsbtHex, isCombined ? i : 0);

      results.push(this.listingRepo.findById(listingId)!);
    }

    logger.info('All batch listings signed successfully', { count: results.length, isCombined });
    await this.triggerLocalMarketplaceRefresh();

    return results;
  }

  private async triggerLocalMarketplaceRefresh(): Promise<void> {
    try {
      const response = await fetch('http://127.0.0.1:5500/api/v1/internal/refresh-local', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Fire and forget with short timeout
        signal: AbortSignal.timeout(5000),
      });
      if (response.ok) {
        const result = await response.json() as { inserted?: number };
        logger.info('Local marketplace refresh triggered', { inserted: result.inserted });
      } else {
        logger.warn('Local marketplace refresh failed', { status: response.status });
      }
    } catch (err: any) {
      // Don't throw - this is fire-and-forget
      logger.warn('Local marketplace refresh error (non-blocking)', { message: err.message });
    }
  }
}
