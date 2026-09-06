import { Router, Request, Response } from 'express';
import multer from 'multer';
import { AssetProxyService } from '../services/AssetProxyService';
import { sendSuccess, sendError } from '../utils/responseFormatter';

const router: Router = Router();
const assetProxyService = new AssetProxyService();

// Subida de archivos en memoria (multipart). La imagen y los JSON se leen en
// memoria y se validan/guardan; la imagen se persiste como data URL base64.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB max por archivo
});

const MAX_PNG_DIM = 512;

// Valida que un buffer sea PNG y que su ancho/alto (del header IHDR) sea <= 512px.
// PNG signature: 89 50 4E 47 0D 0A 1A 0A ; IHDR width/height en bytes 16-23.
function parsePngDimensions(buf: Buffer): { width: number; height: number } | null {
  if (!buf || buf.length < 24) return null;
  const sig = buf.slice(0, 8).toString('hex');
  if (sig !== '89504e470d0a1a0a') return null; // no es PNG
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  return { width, height };
}

// Slugs seguros: minúsculas + dígitos + guiones
function toSlug(str: string): string {
  return (str || '')
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

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
router.get('/bittick-agents', async (req: Request, res: Response) => {
  try {
    const agents = await assetProxyService.getBittickAgents();
    sendSuccess(res, { agents, total: agents.length });
  } catch (error: any) {
    sendError(res, 'BITTICK_AGENTS_FAILED', error.message || 'Error fetching Bittick agents', 500);
  }
});

// GET /api/v1/assets/parcels/confirmations?address=X&parcels=a,b,c
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
router.get('/collections', async (req: Request, res: Response) => {
  try {
    const collections = await assetProxyService.getCollections();
    sendSuccess(res, { collections, total: collections.length });
  } catch (error: any) {
    sendError(res, 'COLLECTIONS_FAILED', error.message || 'Error fetching collections', 500);
  }
});

// GET /api/v1/assets/collections/:slug
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

// POST /api/v1/assets/collections/register  (multipart/form-data)
// Campos obligatorios: file "meta" (meta.json), file "inscriptions" (inscriptions.json), file "image" (PNG <= 512px)
// Campos opcionales: field "x_account", field "discord"
// El slug se deriva de meta.slug o del nombre (title). El título proviene del meta.json.
router.post('/collections/register', upload.fields([
  { name: 'meta', maxCount: 1 },
  { name: 'inscriptions', maxCount: 1 },
  { name: 'image', maxCount: 1 },
]), async (req: Request, res: Response) => {
  try {
    const files = (req as any).files || {};
    const metaFile = files.meta && files.meta[0];
    const inscriptionsFile = files.inscriptions && files.inscriptions[0];
    const imageFile = files.image && files.image[0];

    // --- Validación de archivos obligatorios ---
    if (!metaFile) return sendError(res, 'META_REQUIRED', 'El archivo meta.json es obligatorio', 400);
    if (!inscriptionsFile) return sendError(res, 'INSCRIPTIONS_REQUIRED', 'El archivo inscriptions.json es obligatorio', 400);
    if (!imageFile) return sendError(res, 'IMAGE_REQUIRED', 'La imagen de la colección (PNG) es obligatoria', 400);

    // meta.json -> objeto
    let meta: any;
    try {
      meta = JSON.parse(metaFile.buffer.toString('utf8'));
    } catch (e: any) {
      return sendError(res, 'INVALID_META_JSON', 'meta.json no es un JSON válido', 400);
    }
    if (!meta || typeof meta !== 'object') {
      return sendError(res, 'INVALID_META_JSON', 'meta.json debe ser un objeto', 400);
    }

    // inscriptions.json -> array de items
    let items: any[];
    try {
      const parsed = JSON.parse(inscriptionsFile.buffer.toString('utf8'));
      items = Array.isArray(parsed) ? parsed : (parsed && parsed.items) || [];
    } catch (e: any) {
      return sendError(res, 'INVALID_INSCRIPTIONS_JSON', 'inscriptions.json no es un JSON válido', 400);
    }
    if (!Array.isArray(items) || items.length === 0) {
      return sendError(res, 'EMPTY_INSCRIPTIONS', 'inscriptions.json debe contener al menos un item', 400);
    }

    // imagen PNG <= 512px
    const png = parsePngDimensions(imageFile.buffer);
    if (!png) {
      return sendError(res, 'INVALID_IMAGE', 'La imagen debe ser un archivo PNG válido', 400);
    }
    if (png.width > MAX_PNG_DIM || png.height > MAX_PNG_DIM) {
      return sendError(res, 'IMAGE_TOO_LARGE', `La imagen debe tener máximo ${MAX_PNG_DIM}x${MAX_PNG_DIM}px (recibida ${png.width}x${png.height})`, 400);
    }
    const imageDataUrl = `data:image/png;base64,${imageFile.buffer.toString('base64')}`;

    // slug derivado de meta.slug o meta.name (title)
    const slug = toSlug((req.body && (req.body.slug || meta.slug || meta.name)) || '');
    if (!slug) {
      return sendError(res, 'INVALID_META', 'No se pudo derivar un slug válido de meta.json (name/slug)', 400);
    }

    const xAccount = (req.body && req.body.x_account) || null;
    const discord = (req.body && req.body.discord) || null;

    const result = await assetProxyService.registerCollection({
      slug,
      meta,
      items,
      image: imageDataUrl,
      xAccount,
      discord,
    });

    sendSuccess(res, { slug, action: result.action, message: 'Colección registrada. En 10 minutos estará lista para ser listada y comerciada.' });
  } catch (error: any) {
    sendError(res, 'REGISTER_FAILED', error.message || 'Error registering collection', 500);
  }
});

export default router;
