# Server Skill 5 - Server Transactions

## Propósito General

Documentación de la gestión de transacciones, PSBT y broadcast.

## Función

La función principal de esta skill es documentar cómo crear PSBT, transmitir y monitorear transacciones.

## Responsabilidades

- Crear PSBT para compras
- Transmitir PSBT a Bitcoin
- Manejar retry automático
- Monitorear confirmaciones

## ¿Qué pasa si no se usa?

- No se pueden hacer compras
- Transacciones no se transmiten

## Crear PSBT

```typescript
export class TransactionService {
  async createPSBT(bitmapId: string, buyerAddress: string, idempotencyKey: string): Promise<{
    psbt: string;
    transactionId: string;
    expiresAt: number;
  }> {
    // 1. Verificar idempotencia
    const existing = await this.checkIdempotency(idempotencyKey);
    if (existing) {
      return existing;
    }
    
    // 2. Obtener listing
    const listing = await this.getListing(bitmapId);
    if (!listing || !listing.isActive) {
      throw new Error("Bitmap no disponible");
    }
    
    // 3. Crear PSBT (simplificado)
    const psbt = this.createPsbt(listing.price, buyerAddress, listing.sellerAddress);
    
    // 4. Guardar transacción
    const transaction = {
      id: uuid(),
      listingId: bitmapId,
      buyerAddress,
      sellerAddress: listing.sellerAddress,
      price: listing.price,
      psbt,
      status: 'PENDING',
      idempotencyKey,
      createdAt: Date.now(),
      expiresAt: Date.now() + 5 * 60 * 1000 // 5 minutos
    };
    
    await this.saveTransaction(transaction);
    
    return {
      psbt,
      transactionId: transaction.id,
      expiresAt: transaction.expiresAt
    };
  }
}
```

## Broadcast con Retry

```typescript
async function broadcastWithRetry(signedPsbt: string, transactionId: string): Promise<{ txid: string }> {
  const maxAttempts = 3;
  let lastError;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`Broadcast attempt ${attempt}/${maxAttempts}`);
      
      // Transmitir a mempool.space
      const txid = await mempool.broadcast(signedPsbt);
      
      // Guardar txid
      await db.updateTransaction(transactionId, { txid, status: 'BROADCASTED' });
      
      return { txid };
    } catch (error) {
      lastError = error;
      console.error(`Attempt ${attempt} failed:`, error.message);
      
      if (attempt < maxAttempts) {
        await delay(5000); // 5 segundos entre intentos
      }
    }
  }
  
  // Si falló todos los intentos
  await db.updateTransaction(transactionId, { status: 'FAILED', error: lastError.message });
  throw lastError;
}
```

## Estados de Transacción

```typescript
enum TransactionStatus {
  PENDING = 'PENDING',           // PSBT creado, esperando firma
  AWAITING_BROADCAST = 'AWAITING_BROADCAST', // PSBT firmado, transmitiendo
  BROADCASTED = 'BROADCASTED',   // Transmitido a Bitcoin
  CONFIRMED = 'CONFIRMED',        // Confirmado en blockchain
  EXPIRED = 'EXPIRED',            // PSBT expiró
  FAILED = 'FAILED'               // Error en transmisión
}
```

## Documentos Relacionados

- Server 04: Server-Transactions

## Skills Relacionadas

- Server-S2: Server-Api-Routes
- Server-S3: Server-Security
- Server-S4: Server-Bitcoin-Integration
