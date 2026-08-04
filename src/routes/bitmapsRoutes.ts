import { Router, Request, Response } from 'express';
import { BitmapService, CreateListingResult } from '../services/BitmapService';
import { validateBody, createListingSchema, updateListingSchema, validateUUID, signListingSchema, priceUpdatePsbtSchema, priceUpdateSignSchema, batchListSchema, batchSignSchema } from '../middleware/validation';
import { sendSuccess, sendNotFound } from '../utils/responseFormatter';
import { BitmapListingCreate, BitmapListingUpdate } from '../types/bitmap';

const router: Router = Router();
const bitmapService = new BitmapService();

router.get('/', async (req: Request, res: Response, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const sort = (req.query.sort as string) || 'listed_desc';
    const result = await bitmapService.getListings(page, limit, sort);
    sendSuccess(res, result);
  } catch (err) { next(err); }
});

router.get('/active', async (_req: Request, res: Response, next) => {
  try {
    const listings = await bitmapService.getActiveListings();
    sendSuccess(res, listings);
  } catch (err) { next(err); }
});

router.get('/sold', async (req: Request, res: Response, next) => {
  try {
    const since = parseInt(req.query.since as string) || 0;
    const listings = await bitmapService.getSoldListingsSince(since);
    sendSuccess(res, listings);
  } catch (err) { next(err); }
});

router.get('/owner/:address', async (req: Request, res: Response, next) => {
  try {
    const { address } = req.params;
    const inscriptions = await bitmapService.getInscriptionsByOwner(address);
    sendSuccess(res, inscriptions);
  } catch (err) { next(err); }
});

router.get('/:id', validateUUID('id'), async (req: Request, res: Response, next) => {
  try {
    const listing = await bitmapService.getListingById(req.params.id);
    sendSuccess(res, listing);
  } catch (err) { next(err); }
});

router.post('/', validateBody(createListingSchema), async (req: Request, res: Response, next) => {
  try {
    const data: BitmapListingCreate = req.body;
    const result: CreateListingResult = await bitmapService.createListing(data);
    sendSuccess(res, result, 201);
  } catch (err) { next(err); }
});

router.post('/:id/sign', validateUUID('id'), validateBody(signListingSchema), async (req: Request, res: Response, next) => {
  try {
    const { signedPsbt, sellerOrdinalPublicKey } = req.body;
    const listing = await bitmapService.signListing(req.params.id, signedPsbt, sellerOrdinalPublicKey);
    sendSuccess(res, listing);
  } catch (err) { next(err); }
});

router.get('/:id/price-psbt', validateUUID('id'), async (req: Request, res: Response, next) => {
  try {
    const newPrice = parseInt(req.query.newPrice as string);
    const clientUtxo = req.query.clientUtxo as string;
    const clientValue = parseInt(req.query.clientValue as string);
    const sellerAddress = req.headers['wallet-address'] as string;

    if (!newPrice || !clientUtxo || !clientValue || !sellerAddress) {
      return sendNotFound(res, 'Missing required params: newPrice, clientUtxo, clientValue, wallet-address header');
    }

    const result = await bitmapService.getPriceUpdatePSBT(req.params.id, newPrice, sellerAddress, clientUtxo, clientValue);
    sendSuccess(res, result);
  } catch (err) { next(err); }
});

router.post('/:id/price-sign', validateUUID('id'), validateBody(priceUpdateSignSchema), async (req: Request, res: Response, next) => {
  try {
    const { signedPsbt, sellerOrdinalPublicKey, newPrice } = req.body;
    const listing = await bitmapService.signPriceUpdate(req.params.id, signedPsbt, sellerOrdinalPublicKey, newPrice);
    sendSuccess(res, listing);
  } catch (err) { next(err); }
});

router.put('/:id', validateUUID('id'), validateBody(updateListingSchema), async (req: Request, res: Response, next) => {
  try {
    const sellerAddress = req.headers['wallet-address'] as string;
    if (!sellerAddress) {
      return sendNotFound(res, 'Wallet address required');
    }
    const data: BitmapListingUpdate = req.body;
    const listing = await bitmapService.updateListing(req.params.id, data, sellerAddress);
    sendSuccess(res, listing);
  } catch (err) { next(err); }
});

router.delete('/:id', validateUUID('id'), async (req: Request, res: Response, next) => {
  try {
    const sellerAddress = req.headers['wallet-address'] as string;
    if (!sellerAddress) {
      return sendNotFound(res, 'Wallet address required');
    }
    await bitmapService.deleteListing(req.params.id, sellerAddress);
    sendSuccess(res, { deleted: true });
  } catch (err) { next(err); }
});

router.post('/batch', validateBody(batchListSchema), async (req: Request, res: Response, next) => {
  try {
    const { items } = req.body;
    const result = await bitmapService.createBatchListing(items);
    sendSuccess(res, result);
  } catch (err) { next(err); }
});

router.post('/batch/sign', validateBody(batchSignSchema), async (req: Request, res: Response, next) => {
  try {
    const { listingIds, signedPsbt, sellerOrdinalPublicKey } = req.body;
    const result = await bitmapService.signBatchListings(listingIds, signedPsbt, sellerOrdinalPublicKey);
    sendSuccess(res, result);
  } catch (err) { next(err); }
});

export default router;
