# 03 - Bitcoin Integration

## Prólogo

Este documento pertenece a **BitmapCorpServer**. Las reglas de negocio aquí documentadas están **POR ENCIMA DEL CÓDIGO** y **POR ENCIMA DE LAS SKILLS**.

**Skills relacionadas:**
- Skill 04: Bitcoin Integration
- Skill 05: Transactions

---

## 1. Propósito del documento

Este documento describe cómo el servidor se integra con las APIs públicas de Bitcoin para verificar BitMaps y procesar transacciones.

**Las reglas aquí documentadas están POR ENCIMA DEL CÓDIGO** - el código debe adaptarse a estas reglas.

---

## Responsabilidades

- Consultar ordinals.com para verificar BitMaps
- Consultar mempool.space para obtener balance
- Consultar mempool.space para estado de transacciones
- Transmitir PSBTs a la red Bitcoin via mempool.space
- Manejar errores de APIs externas

---

## 2. APIs Externas Utilizadas

### API 1: Ordinals.com

**URL:** https://api.ordinals.com/inscription/{id}

**Función:** Verificar si un inscription es un Bitmap

**Método:** GET

**Ejemplo:**
```
GET https://api.ordinals.com/inscription/abc123...
```

**Respuesta:**
```json
{
  "id": "abc123...",
  "number": 776883,
  "address": "bc1q...",
  "content_type": "image/png",
  "body": "bitmap 776883"
}
```

**Lógica de verificación:**
```typescript
function isBitmap(inscription: any): boolean {
  // Verificar que el body contenga "bitmap"
  return inscription.body && inscription.body.includes("bitmap");
}
```

---

### API 2: Mempool.space

**URL:** https://mempool.space/api/address/{address}

**Función:** Obtener balance y UTXOs de una dirección

**Método:** GET

**Ejemplo:**
```
GET https://mempool.space/api/address/bc1q...
```

**Respuesta:**
```json
{
  "address": "bc1q...",
  "chain_stats": {
    "funded_txo_count": 5,
    "spent_txo_count": 3,
    "tx_count": 10,
    "satoshis": 50000000
  }
}
```

---

### API 3: Mempool.space (Broadcast)

**URL:** https://mempool.space/api/tx

**Función:** Transmitir PSBT a la red Bitcoin

**Método:** POST

**Ejemplo:**
```
POST https://mempool.space/api/tx
Body: psbt=cHNidP8B...
```

**Respuesta:**
```json
{
  "txid": "abc123..."
}
```

---

### API 4: Mempool.space (Transaction Status)

**URL:** https://mempool.space/api/tx/{txid}

**Función:** Consultar estado de una transacción

**Método:** GET

**Ejemplo:**
```
GET https://mempool.space/api/tx/abc123...
```

**Respuesta:**
```json
{
  "txid": "abc123...",
  "status": {
    "confirmed": true,
    "block_height": 850000,
    "block_time": 1234567890
  }
}
```

---

## 3. Reglas de Negocio

### Regla #1: Verificar BitMaps con Ordinals.com

**Antes de listar un Bitmap, el servidor debe:**
1. Consultar ordinals.com con el inscription ID
2. Verificar que el body contiene "bitmap"
3. Extraer el número de block

### Regla #2: Calcular Balance con Mempool.space

**Para obtener balance:**
1. Consultar mempool.space/api/address/{address}
2. Sumar todos los satoshis de chain_stats
3. Retornar el total

### Regla #3: Broadcast a Mempool.space

**Para transmitir:**
1. Recibir PSBT firmado de la app
2. Enviar a mempool.space/api/tx
3. Retornar txid

### Regla #4: Monitorear con Mempool.space

**Para consultar estado:**
1. Consultar mempool.space/api/tx/{txid}
2. Retornar confirmaciones y estado

---

## 4. Manejo de Errores

| Error | Causa | Solución |
|-------|-------|----------|
| 404 Ordinals.com | Inscription no existe | Retornar isBitmap: false |
| 429 Ordinals.com | Rate limiting | Retry con backoff |
| 500 Mempool | Error del servidor | Retry automático |
| Timeout | Red lenta | Timeout de 30 segundos |

---

## 5. Skills Relacionadas

- Server-S4: Server-Bitcoin-Integration
- Server-S5: Server-Transactions

---

## 6. Documentos Relacionados

- Server 01: Server-Endpoints
- Server 04: Server-Transactions
