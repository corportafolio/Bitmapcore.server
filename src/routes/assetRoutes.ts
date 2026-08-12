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

export default router;
