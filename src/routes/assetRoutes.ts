import { Router, Request, Response } from 'express';
import { AssetProxyService } from '../services/AssetProxyService';
import { sendSuccess, sendError } from '../utils/responseFormatter';

const router: Router = Router();
const assetProxyService = new AssetProxyService();

router.get('/address/:address', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const result = await assetProxyService.getUserAssets(address);
    sendSuccess(res, result);
  } catch (error: any) {
    sendError(res, 'ASSETS_FETCH_FAILED', error.message || 'Error fetching assets', 500);
  }
});

export default router;
