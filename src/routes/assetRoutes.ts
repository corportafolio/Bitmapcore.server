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

export default router;
