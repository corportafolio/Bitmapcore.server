import { Router, Request, Response } from 'express';
import { AssetProxyService } from '../services/AssetProxyService';
import { sendSuccess, sendError } from '../utils/responseFormatter';

const router: Router = Router();
const assetProxyService = new AssetProxyService();

router.get('/address/:address', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const sinceRaw = req.query.since;
    const since = typeof sinceRaw === 'string' && /^\d+$/.test(sinceRaw) ? parseInt(sinceRaw, 10) : undefined;
    const result = await assetProxyService.getUserAssets(address, since);
    sendSuccess(res, result);
  } catch (error: any) {
    sendError(res, 'ASSETS_FETCH_FAILED', error.message || 'Error fetching assets', 500);
  }
});

// GET /api/v1/assets/bittick-agents
// Returns all 100 Bittick Agents
router.get('/bittick-agents', async (req: Request, res: Response) => {
  try {
    const agents = await assetProxyService.getBittickAgents();
    sendSuccess(res, { agents, total: agents.length });
  } catch (error: any) {
    sendError(res, 'BITTICK_AGENTS_FAILED', error.message || 'Error fetching Bittick agents', 500);
  }
});

// GET /api/v1/assets/parcels/confirmations?address=X&parcels=a,b,c
// Bulk confirmations for all parcels in one call (with server-side cache)
router.get('/parcels/confirmations', async (req: Request, res: Response) => {
  try {
    const { address, parcels } = req.query;

    if (!address || typeof address !== 'string') {
      return sendError(res, 'MISSING_ADDRESS', 'Wallet address required as query parameter', 400);
    }
    if (!parcels || typeof parcels !== 'string' || parcels.length === 0) {
      return sendError(res, 'MISSING_PARCELS', 'parcels query parameter required (comma-separated ids)', 400);
    }

    const ids = parcels.split(',').map(s => s.trim()).filter(Boolean);
    const result = await assetProxyService.getBulkParcelConfirmations(ids, address);
    sendSuccess(res, result);
  } catch (error: any) {
    sendError(res, 'BULK_PARCEL_CONFIRMATIONS_FAILED', error.message || 'Error fetching parcel confirmations', 500);
  }
});

// GET /api/v1/assets/parcels/:parcelId/confirmations
// Returns the two confirmations for a parcel:
// 1. Parcel inscription (genesis transaction)
// 2. Parent bitmap self-transfer in the same block
router.get('/parcels/:parcelId/confirmations', async (req: Request, res: Response) => {
  try {
    const { parcelId } = req.params;
    const { address } = req.query;
    
    if (!address || typeof address !== 'string') {
      return sendError(res, 'MISSING_ADDRESS', 'Wallet address required as query parameter', 400);
    }
    
    const result = await assetProxyService.getParcelConfirmations(parcelId, address);
    sendSuccess(res, result);
  } catch (error: any) {
    sendError(res, 'PARCEL_CONFIRMATIONS_FAILED', error.message || 'Error fetching parcel confirmations', 500);
  }
});


// GET /api/v1/assets/collections
// List all registered collections
router.get('/collections', async (req: Request, res: Response) => {
  try {
    const collections = await assetProxyService.getCollections();
    sendSuccess(res, { collections, total: collections.length });
  } catch (error: any) {
    sendError(res, 'COLLECTIONS_FAILED', error.message || 'Error fetching collections', 500);
  }
});

// GET /api/v1/assets/collections/:slug
// Get collection details + items
router.get('/collections/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const collection = await assetProxyService.getCollectionBySlug(slug);
    if (!collection) {
      return sendError(res, 'COLLECTION_NOT_FOUND', 'Collection not found', 404);
    }
    sendSuccess(res, collection);
  } catch (error: any) {
    sendError(res, 'COLLECTION_FAILED', error.message || 'Error fetching collection', 500);
  }
});

// POST /api/v1/assets/collections/register
// Register or update a collection (requires meta.json + inscriptions.json)
router.post('/collections/register', async (req: Request, res: Response) => {
  try {
    const { slug, meta, items } = req.body;
    if (!slug || !meta || !items || !Array.isArray(items)) {
      return sendError(res, 'INVALID_PAYLOAD', 'slug, meta, and items array required', 400);
    }
    if (!meta.name || !meta.slug || !meta.supply) {
      return sendError(res, 'INVALID_META', 'meta must have name, slug, supply', 400);
    }
    const result = await assetProxyService.registerCollection(slug, meta, items);
    sendSuccess(res, result);
  } catch (error: any) {
    sendError(res, 'REGISTER_FAILED', error.message || 'Error registering collection', 500);
  }
});

export default router;
