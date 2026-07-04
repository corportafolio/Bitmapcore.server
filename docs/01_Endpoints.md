# 01 - Endpoints

---

---

## 1. Propósito del documento

Este documento describe los 7 endpoints del servidor backend de BitmapCorpApp para el marketplace local.

**Las reglas aquí documentadas están POR ENCIMA DEL CÓDIGO** - el código debe adaptarse a estas reglas.

---

## Responsabilidades

- Definir los 7 endpoints REST del servidor
- Responder con formato JSON estructurado
- Validar requests entrantes
- Retornar errores apropiados (404, 400, 500)
- Manejar timeouts de requests

---

## 2. Los 7 Endpoints

### Endpoint 1: GET /api/bitmaps

**Función:** Lista de BitMaps disponibles para venta

**Respuesta:**
```json
{
  "bitmaps": [
    {
      "id": "uuid",
      "inscriptionId": "abc123...",
      "name": "Bitmap #776883",
      "price": 100000,
      "sellerAddress": "bc1q...",
      "listedAt": 1234567890,
      "imageUrl": "https://..."
    }
  ]
}
```

---

### Endpoint 2: GET /api/bitmaps/{id}

**Función:** Detalle de un Bitmap específico

**Respuesta:**
```json
{
  "id": "uuid",
  "inscriptionId": "abc123...",
  "name": "Bitmap #776883",
  "description": "...",
  "price": 100000,
  "sellerAddress": "bc1q...",
  "buyerAddress": null,
  "listedAt": 1234567890,
  "soldAt": null,
  "imageUrl": "https://..."
}
```

---

### Endpoint 3: GET /api/verify-bitmap/{id}

**Función:** Verificar si un inscriptionId es un Bitmap válido

**Respuesta:**
```json
{
  "isBitmap": true,
  "blockNumber": 776883,
  "inscriptionId": "abc123..."
}
```

---

### Endpoint 4: POST /api/buy-bitmap

**Función:** Iniciar proceso de compra - crear PSBT

**Request:**
```json
{
  "bitmapId": "uuid",
  "buyerAddress": "bc1q...",
  "idempotencyKey": "uuid"
}
```

**Respuesta:**
```json
{
  "psbt": "cHNidP8B...",
  "transactionId": "uuid",
  "expiresAt": 1234567890
}
```

---

### Endpoint 5: POST /api/broadcast

**Función:** Transmitir PSBT firmado a la red Bitcoin

**Request:**
```json
{
  "signedPsbt": "cHNidP8B...",
  "transactionId": "uuid"
}
```

**Respuesta:**
```json
{
  "txid": "abc123...",
  "status": "broadcasted"
}
```

---

### Endpoint 6: GET /api/transaction/{txid}/status

**Función:** Consultar estado de una transacción

**Respuesta:**
```json
{
  "txid": "abc123...",
  "status": "confirmed",
  "confirmations": 3,
  "blockNumber": 850000
}
```

---

### Endpoint 7: GET /api/wallet/{address}/balance

**Función:** Obtener balance de una dirección Bitcoin

**Respuesta:**
```json
{
  "balance": 0.5,
  "satoshis": 50000000,
  "utxos": 5
}
```

---

## 3. Reglas de Negocio

### Regla #1: Formato de respuesta

**Todas las respuestas deben seguir el mismo formato:**

```json
{
  "success": true,
  "data": { ... },
  "error": null
}
```

O si hay error:

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Descripción del error"
  }
}
```

### Regla #2: Timeouts

- Máximo 30 segundos por request
- PSBT expira en 5 minutos

### Regla #3: Autenticación

- No requiere autenticación para leer bitmaps
- Requiere wallet conectada para comprar

---

## 4. Skills Relacionadas

- Server-S1: Server-Setup
- Server-S2: Server-Api-Routes

---

## 5. Documentos Relacionados

- Server 02: Server-Security
- Server 04: Server-Transactions
- Server 05: Server-Listings
