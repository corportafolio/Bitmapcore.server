import { Router, Request, Response } from 'express';
import { BitmapService, CreateListingResult } from '../services/BitmapService';
import { validateBody, createListingSchema, updateListingSchema, validateUUID, signListingSchema } from '../middleware/validation';
import { sendSuccess, sendNotFound } from '../utils/responseFormatter';
import { BitmapListingCreate, BitmapListingUpdate } from '../types/bitmap';

const router: Router = Router();
const bitmapService = new BitmapService();

router.get('/', async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const sort = (req.query.sort as string) || 'listed_desc';

  const result = await bitmapService.getListings(page, limit, sort);

  sendSuccess(res, result);
});

router.get('/active', async (_req: Request, res: Response) => {
  const listings = await bitmapService.getActiveListings();
  sendSuccess(res, listings);
});

router.get('/sold', async (req: Request, res: Response) => {
  const since = parseInt(req.query.since as string) || 0;
  const listings = await bitmapService.getSoldListingsSince(since);
  sendSuccess(res, listings);
});

router.get('/owner/:address', async (req: Request, res: Response) => {
  const { address } = req.params;
  const inscriptions = await bitmapService.getInscriptionsByOwner(address);
  sendSuccess(res, inscriptions);
});

router.get('/:id', validateUUID('id'), async (req: Request, res: Response) => {
  const listing = await bitmapService.getListingById(req.params.id);
  sendSuccess(res, listing);
});

router.post('/', validateBody(createListingSchema), async (req: Request, res: Response, next) => {
  try {
    const data: BitmapListingCreate = req.body;
    const result: CreateListingResult = await bitmapService.createListing(data);
    sendSuccess(res, result, 201);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/sign', validateUUID('id'), validateBody(signListingSchema), async (req: Request, res: Response) => {
  const { signedPsbt, sellerOrdinalPublicKey } = req.body;
  const listing = await bitmapService.signListing(req.params.id, signedPsbt, sellerOrdinalPublicKey);
  sendSuccess(res, listing);
});

router.put('/:id', validateUUID('id'), validateBody(updateListingSchema), async (req: Request, res: Response) => {
  const sellerAddress = req.headers['wallet-address'] as string;
  
  if (!sellerAddress) {
    return sendNotFound(res, 'Wallet address required');
  }

  const data: BitmapListingUpdate = req.body;
  const listing = await bitmapService.updateListing(req.params.id, data, sellerAddress);
  sendSuccess(res, listing);
});

router.delete('/:id', validateUUID('id'), async (req: Request, res: Response) => {
  const sellerAddress = req.headers['wallet-address'] as string;
  
  if (!sellerAddress) {
    return sendNotFound(res, 'Wallet address required');
  }

  await bitmapService.deleteListing(req.params.id, sellerAddress);
  sendSuccess(res, { deleted: true });
});

export default router;
