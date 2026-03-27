# Server Skill 3 - Server Security

## Propósito General

Documentación de los patrones de seguridad implementados en el servidor.

## Función

La función principal de esta skill es implementar protección contra ataques y validación de datos.

## Responsabilidades

- Rate limiting
- Validación de entrada
- HTTPS certificate pinning
- Logging sanitizado
- Nonce/idempotencia

## ¿Qué pasa si no se usa?

- Servidor vulnerable a ataques
- Datos expuestos
- Transacciones duplicadas

## Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';

// Rate limit para compras (5 por minuto)
export const purchaseLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 5,
  message: { 
    success: false, 
    error: { code: "RATE_LIMIT_EXCEEDED", message: "Máximo 5 compras por minuto" }
  }
});

// Rate limit general (10 por minuto)
export const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { 
    success: false, 
    error: { code: "RATE_LIMIT_EXCEEDED", message: "Máximo 10 requests por minuto" }
  }
});
```

## Validación de Entrada

```typescript
function validateBuyRequest(body: any): { valid: boolean, error?: string } {
  if (!body.bitmapId || !isValidUUID(body.bitmapId)) {
    return { valid: false, error: "bitmapId inválido" };
  }
  
  if (!body.buyerAddress || !isValidBitcoinAddress(body.buyerAddress)) {
    return { valid: false, error: "buyerAddress inválida" };
  }
  
  if (!body.price || body.price <= 0) {
    return { valid: false, error: "price debe ser positivo" };
  }
  
  if (!body.idempotencyKey || !isValidUUID(body.idempotencyKey)) {
    return { valid: false, error: "idempotencyKey inválido" };
  }
  
  return { valid: true };
}

function isValidBitcoinAddress(address: string): boolean {
  // Validar dirección Bitcoin (bc1, 1, 3)
  return /^((bc1)|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/.test(address);
}

function isValidUUID(uuid: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);
}
```

## Nonce/Idempotencia

```typescript
const usedIdempotencyKeys = new Map<string, Transaction>();

async function checkIdempotency(key: string): Promise<Transaction | null> {
  return usedIdempotencyKeys.get(key) || null;
}

async function markIdempotencyUsed(key: string, transaction: Transaction): Promise<void> {
  usedIdempotencyKeys.set(key, transaction);
}
```

## Documentos Relacionados

- Server 02: Server-Security

## Skills Relacionadas

- Server-S1: Server-Setup
- Server-S2: Server-Api-Routes
