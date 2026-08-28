import { Router, Request, Response, NextFunction } from 'express';
import { ParcelService } from '../services/ParcelService';
import { ParcelListingRepository } from '../repositories/ParcelListingRepository';
import { sendSuccess, sendNotFound } from '../utils/responseFormatter';
import { ValidationError } from '../errors/AppError';

const router: Router = Router();
const parcelService = new ParcelService();
const parcelRepo = new ParcelListingRepository();

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 100;
    const sort = (req.query.sort as string) || 'listed_desc';
    const result = parcelRepo.findActiveWithPaginationAndSort(Math.max(page, 1), Math.min(Math.max(limit, 1), 1000), sort);
    sendSuccess(res, result);
  } catch (err) { next(err); }
});

router.get('/active', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const listings = parcelRepo.findAllActive();
    sendSuccess(res, { items: listings, total: listings.length });
  } catch (err) { next(err); }
});

router.get('/stats', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, parcelRepo.stats());
  } catch (err) { next(err); }
});

router.post('/batch', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { items } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new ValidationError('No hay items para listar');
    }
    const result = await parcelService.createBatchListing(items);
    sendSuccess(res, result);
  } catch (err) { next(err); }
});

router.post('/batch/sign', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { listingIds, signedPsbtHexs, sellerOrdinalPublicKey } = req.body;
    if (!listingIds || !signedPsbtHexs) {
      throw new ValidationError('Faltan datos para firmar');
    }
    const result = await parcelService.signBatchListings(listingIds, signedPsbtHexs, sellerOrdinalPublicKey);
    sendSuccess(res, result);
  } catch (err) { next(err); }
});

router.get('/:id/price-psbt', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const newPrice = parseInt(req.query.newPrice as string);
    const clientUtxo = req.query.clientUtxo as string;
    const clientValue = parseInt(req.query.clientValue as string);
    const sellerAddress = req.headers['wallet-address'] as string;

    if (!newPrice || !clientUtxo || !clientValue || !sellerAddress) {
      return sendNotFound(res, 'Missing required params: newPrice, clientUtxo, clientValue, wallet-address header');
    }

    const result = await parcelService.updateListingPrice(req.params.id, newPrice, sellerAddress, clientUtxo, clientValue);
    sendSuccess(res, result);
  } catch (err) { next(err); }
});

router.post('/:id/price-sign', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { signedPsbt, sellerOrdinalPublicKey, newPrice } = req.body;
    if (!signedPsbt || !sellerOrdinalPublicKey || !newPrice) {
      throw new ValidationError('Faltan datos para firmar el precio');
    }
    const listing = await parcelService.signPriceUpdate(req.params.id, signedPsbt, sellerOrdinalPublicKey, parseInt(newPrice));
    sendSuccess(res, listing);
  } catch (err) { next(err); }
});

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sellerAddress = req.headers['wallet-address'] as string;
    if (!sellerAddress) {
      throw new ValidationError('Wallet address required');
    }
    await parcelService.delist(req.params.id, sellerAddress);
    sendSuccess(res, { deleted: true });
  } catch (err) { next(err); }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const listing = parcelRepo.getByIdOrInscriptionId(req.params.id);
    if (!listing) {
      return sendNotFound(res, 'Listing de parcela no encontrado');
    }
    sendSuccess(res, listing);
  } catch (err) { next(err); }
});

export default router;
