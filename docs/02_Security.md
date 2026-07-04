# 02 - Security

---

## 1. Propósito del documento

Este documento establece las reglas de seguridad obligatorias para el servidor de BitmapCorpApp.

**Las reglas aquí documentadas están POR ENCIMA DEL CÓDIGO** - el código debe adaptarse a estas reglas.

---

## Responsabilidades

- Implementar rate limiting por usuario y IP
- Validar todos los inputs del servidor
- Proteger contra ataques de replay con nonce
- Sanitizar logs para no exponer datos sensibles
- Validar certificados HTTPS de APIs externas

---

## 2. Patrones de Seguridad

### Patrón 1: Rate Limiting

**PROBLEMA:** Un atacante hace 1000 requests/segundo al servidor.

**SOLUCIÓN:**

```typescript
// Limitar requests
- 5 requests por usuario por minuto (compras)
- 10 requests por IP por minuto (lectura)
- Si excede: responder 429 Too Many Requests
```

**IMPLEMENTACIÓN:**

```typescript
const rateLimit = require('express-rate-limit');

const purchaseLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 5, // 5 requests
  message: { error: "Too many requests" }
});

const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: "Too many requests" }
});
```

---

### Patrón 2: Validación de Entrada

**PROBLEMA:** Usuario envía datos malformados.

**SOLUCIÓN:**

```typescript
// Validar EN SERVIDOR SIEMPRE
- ¿bitmapId es UUID válido?
- ¿buyerAddress es dirección Bitcoin válida?
- ¿price es número positivo?
- ¿idempotencyKey es UUID único?
```

**IMPLEMENTACIÓN:**

```typescript
function validateBuyRequest(body: any): boolean {
  if (!isValidUUID(body.bitmapId)) return false;
  if (!isValidBitcoinAddress(body.buyerAddress)) return false;
  if (!isPositiveNumber(body.price)) return false;
  if (!isValidUUID(body.idempotencyKey)) return false;
  return true;
}
```

---

### Patrón 3: HTTPS Certificate Pinning

**PROBLEMA:** Ataques man-in-the-middle.

**SOLUCIÓN:**

```typescript
// Validar certificados de APIs externas
- Ordinals.com API
- Mempool.space API
```

---

### Patrón 4: Logging Sanitizado

**PROBLEMA:** Logs exponen datos sensibles.

**SOLUCIÓN:**

```typescript
// NO guardar en logs:
- Private keys
- Seeds
- PSBTs firmados
- Datos personales

// SI guardar:
- Errores genéricos
- Timestamps
-IDs de transacción
```

---

### Patrón 5: Nonce Obligatorio

**PROBLEMA:** Ataques de replay - usuario envía la misma transacción varias veces.

**SOLUCIÓN:**

```typescript
// Cada request de compra debe tener idempotencyKey
// El servidor debe:
// 1. Verificar que el idempotencyKey no se ha usado
// 2. Guardar el idempotencyKey usado
// 3. Si ya existe: responder con resultado anterior (no procesar de nuevo)
```

---

## 3. Reglas de Negocio

### Regla #1: Rate Limiting Obligatorio

**Todo request de compra debe estar limitado.**

- Máximo 5 compras por usuario por minuto
- Máximo 10 requests generales por IP por minuto
- Si excede: responder 429

### Regla #2: Validación Obligatoria

**Todo input debe validarse en el servidor.**

- No confiar en validación del cliente
- Validar tipos, formatos y rangos
- Sanitizar inputs

### Regla #3: Nonce Obligatorio

**Toda compra debe tener idempotencyKey.**

- Generado por la app
- Único por transacción
-有效期 de 5 minutos

### Regla #4: Logs Sanitizados

**No exponer datos sensibles en logs.**

---

## 4. Skills Relacionadas

- Server-S1: Server-Setup
- Server-S3: Server-Security

---

## 5. Documentos Relacionados

- Server 01: Server-Endpoints
- Server 04: Server-Transactions
