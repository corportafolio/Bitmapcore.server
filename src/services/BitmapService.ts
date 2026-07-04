import { ListingRepository } from '../repositories/ListingRepository';
import { OrdinalsService } from './OrdinalsService';
import { MempoolService } from './MempoolService';
import { BitmapListing, BitmapListingCreate, BitmapListingUpdate, BitmapVerification } from '../types/bitmap';
import { NotFoundError, ValidationError } from '../errors/AppError';
import { isValidBitcoinAddress } from '../utils/bitcoinValidator';
import { logger } from '../utils/logger';

export class BitmapService {
  private listingRepo: ListingRepository;
  private ordinalsService: OrdinalsService;
  private mempoolService: MempoolService;

  constructor() {
    this.listingRepo = new ListingRepository();
    this.ordinalsService = new OrdinalsService();
    this.mempoolService = new MempoolService();
  }

  async createListing(data: BitmapListingCreate): Promise<BitmapListing> {
    logger.info('Creating listing', { inscriptionId: data.inscriptionId, price: data.price });

    if (!isValidBitcoinAddress(data.sellerAddress)) {
      throw new ValidationError('Invalid seller Bitcoin address');
    }

    const existing = this.listingRepo.findByInscriptionId(data.inscriptionId);
    if (existing && existing.isActive) {
      throw new ValidationError('Bitmap is already listed for sale');
    }

    const verification = await this.ordinalsService.verifyBitmap(data.inscriptionId);
    if (!verification.isBitmap) {
      throw new ValidationError('This inscription is not a valid Bitmap');
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

    logger.info('Listing created', { listingId: listing.id, inscriptionId: data.inscriptionId });

    return listing;
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
