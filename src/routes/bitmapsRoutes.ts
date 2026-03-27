import { Router, Request, Response } from 'express';
import { BitmapService } from '../services/BitmapService';
import { validateBody, createListingSchema, updateListingSchema, validateUUID } from '../middleware/validation';
import { sendSuccess, sendNotFound } from '../utils/responseFormatter';
import { BitmapListingCreate, BitmapListingUpdate } from '../types/bitmap';

const router = Router();
const bitmapService = new BitmapService();

router.get('/', async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;

  const result = await bitmapService.getListings(page, limit);

  sendSuccess(res, result);
});

router.get('/:id', validateUUID('id'), async (req: Request, res: Response) => {
  const listing = await bitmapService.getListingById(req.params.id);
  sendSuccess(res, listing);
});

router.post('/', validateBody(createListingSchema), async (req: Request, res: Response) => {
  const data: BitmapListingCreate = req.body;
  const listing = await bitmapService.createListing(data);
  sendSuccess(res, listing, 201);
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
