# Server Skill 2 - Server API Routes

## Propósito General

Documentación de las rutas API del servidor Express.js.

## Función

La función principal de esta skill es definir los 7 endpoints REST del servidor.

## Responsabilidades

- Definir rutas GET /api/bitmaps
- Definir rutas GET /api/bitmaps/{id}
- Definir rutas GET /api/verify-bitmap/{id}
- Definir rutas POST /api/buy-bitmap
- Definir rutas POST /api/broadcast
- Definir rutas GET /api/transaction/{txid}/status
- Definir rutas GET /api/wallet/{address}/balance

## ¿Qué pasa si no se usa?

- No hay endpoints para la app
- La app no puede comunicarse con el servidor

## Código de Rutas

```typescript
import express from 'express';
import { BitmapService } from '../services/BitmapVerificationService';
import { TransactionService } from '../services/TransactionService';

const router = express.Router();
const bitmapService = new BitmapService();
const transactionService = new TransactionService();

// GET /api/bitmaps - Lista de BitMaps
router.get('/bitmaps', async (req, res) => {
  try {
    const bitmaps = await bitmapService.getListings();
    res.json({ success: true, data: bitmaps });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/bitmaps/:id - Detalle de Bitmap
router.get('/bitmaps/:id', async (req, res) => {
  try {
    const bitmap = await bitmapService.getListingById(req.params.id);
    if (!bitmap) {
      return res.status(404).json({ success: false, error: "Not found" });
    }
    res.json({ success: true, data: bitmap });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/verify-bitmap/:id - Verificar si es Bitmap
router.get('/verify-bitmap/:id', async (req, res) => {
  try {
    const result = await bitmapService.verifyBitmap(req.params.id);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/buy-bitmap - Iniciar compra
router.post('/buy-bitmap', async (req, res) => {
  try {
    const { bitmapId, buyerAddress, idempotencyKey } = req.body;
    const result = await transactionService.createPSBT(bitmapId, buyerAddress, idempotencyKey);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// POST /api/broadcast - Transmitir transacción
router.post('/broadcast', async (req, res) => {
  try {
    const { signedPsbt, transactionId } = req.body;
    const result = await transactionService.broadcast(signedPsbt, transactionId);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// GET /api/transaction/:txid/status - Estado de transacción
router.get('/transaction/:txid/status', async (req, res) => {
  try {
    const result = await transactionService.getStatus(req.params.txid);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/wallet/:address/balance - Balance de wallet
router.get('/wallet/:address/balance', async (req, res) => {
  try {
    const result = await transactionService.getBalance(req.params.address);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
```

## Documentos Relacionados

- Server 01: Server-Endpoints

## Skills Relacionadas

- Server-S1: Server-Setup
- Server-S3: Server-Security
- Server-S4: Server-Bitcoin-Integration
- Server-S5: Server-Transactions
