import { ListingRepository } from '../repositories/ListingRepository';
import { OrdinalsService } from './OrdinalsService';
import { MempoolService } from './MempoolService';
import { PSBTService } from './PSBTService';
import { BitmapListing, BitmapListingCreate, BitmapListingUpdate, BitmapVerification } from '../types/bitmap';
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

    const verification = await this.ordinalsService.verifyBitmap(data.inscriptionId);
    if (!verification.isBitmap) {
      throw new ValidationError('This inscription is not a valid Bitmap');
    }

    const isOwner = await this.ordinalsService.verifyOwnership(data.inscriptionId, data.sellerAddress);
    if (!isOwner) {
      throw new ValidationError('You are not the owner of this Bitmap. Only the owner can list it for sale.');
    }

    const bitmapDetails = await this.ordinalsService.getBitmapDetails(data.inscriptionId);
    const bitmapHash = await this.mempoolService.getInscriptionHash(data.inscriptionId);

    const listingData: BitmapListingCreate = {
      ...data,
      bitmapNumber: bitmapDetails?.bitmapNumber || data.bitmapNumber,
      inscriptionNumber: bitmapDetails?.inscriptionNumber || data.inscriptionNumber,
      ownerAddress: bitmapDetails?.ownerAddress || data.ownerAddress,
      bitmapHash: bitmapHash || data.bitmapHash,
    };

    const listing = this.listingRepo.create(listingData);

    const psbtResult = await this.psbtService.createListingPSBT(
      data.inscriptionId,
      data.sellerPaymentAddress,
      data.price,
      data.sellerOrdinalPublicKey
    );

    this.listingRepo.updatePsbtFields(listing.id, {
      unsignedPsbt: psbtResult.unsignedPsbt,
      psbtStatus: 'created',
    });

    logger.info('Listing created with PSBT', { 
      listingId: listing.id, 
      inscriptionId: data.inscriptionId,
      psbtLength: psbtResult.unsignedPsbt.length
    });

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

    if (listing.psbtStatus !== 'created') {
      throw new ValidationError(`Listing is not in 'created' state: ${listing.psbtStatus}`);
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
    });

    logger.info('Listing signed and activated', { listingId });

    return this.listingRepo.findById(listingId)!;
  }

  async getListings(page: number = 1, limit: number = 20): Promise<{ items: BitmapListing[]; total: number }> {
    logger.debug('Getting listings', { page, limit });
    return this.listingRepo.findActiveWithPagination(page, limit);
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
}
