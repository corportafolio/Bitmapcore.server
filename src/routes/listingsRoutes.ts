import { Router, Request, Response, NextFunction } from 'express';
import { BitmapService } from '../services/BitmapService';
import { validateBody, unifiedListSchema, unifiedSignSchema } from '../middleware/validation';
import { sendSuccess } from '../utils/responseFormatter';
import { logger } from '../utils/logger';

/*
 * ============================================================================
 *  listingsRoutes.ts  —  ENDPOINT UNIFICADO DE LISTADO DE ACTIVOS
 * ============================================================================
 *  UN solo endpoint para listar activos de TODAS las colecciones (bitmaps,
 *  bittick, parcels, ...). La colección se indica con { collection } en el body.
 *
 *    POST /api/v1/listings/batch        → crear listings + PSBT
 *    POST /api/v1/listings/batch/sign   → validar firma + activar listings
 *
 *  El backend valida que cada inscriptionId existe y cumple las condiciones de
 *  la colección indicada. La lógica de PSBT/firma es idéntica para todas.
 * ============================================================================
 */
const router: Router = Router();
const bitmapService = new BitmapService();

router.post('/batch', validateBody(unifiedListSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { collection, items } = req.body;
    logger.info('Unified batch listing', { collection, count: items.length });
    const result = await bitmapService.createBatchListing(items, collection);
    sendSuccess(res, result);
  } catch (err) { next(err); }
});

router.post('/batch/sign', validateBody(unifiedSignSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { collection, listingIds, signedPsbtHexs, sellerOrdinalPublicKey } = req.body;
    logger.info('Unified batch listing sign', { collection, count: listingIds.length });
    const result = await bitmapService.signBatchListings(listingIds, signedPsbtHexs, sellerOrdinalPublicKey);
    sendSuccess(res, result);
  } catch (err) { next(err); }
});

export default router;
