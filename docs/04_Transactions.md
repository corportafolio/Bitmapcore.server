# 04 - Transactions

## Prólogo

Este documento pertenece a **BitmapCorpServer**. Las reglas de negocio aquí documentadas están **POR ENCIMA DEL CÓDIGO** y **POR ENCIMA DE LAS SKILLS**.

**Skills relacionadas:**
- Skill 05: Transactions

---

## 1. Propósito del documento

Este Documento describe cómo el servidor gestiona las transacciones de compra de BitMaps, desde la creación del PSBT hasta el broadcast.

**Las reglas aquí documentadas están POR ENCIMA DEL CÓDIGO** - el código debe adaptarse a estas reglas.

---

## Responsabilidades

- Crear PSBT para compras de BitMaps
- Gestionar idempotencia de transacciones
- Implementar retry automático en broadcast
- Monitorear confirmaciones de transacciones
- Manejar expiración de PSBTs (5 minutos)
- Guardar logs de todas las transacciones

---

## 2. Flujo de una Transacción

### Paso 1: Iniciar Compra (POST /api/buy-bitmap)

```
1. App envía: { bitmapId, buyerAddress, idempotencyKey }
2. Servidor valida:
   - bitmapId existe y está a la venta
   - buyerAddress es válida
   - idempotencyKey no se ha usado
3. Servidor crea PSBT
4. Servidor guarda transactionId + idempotencyKey
5. Servidor responde: { psbt, transactionId, expiresAt }
```

### Paso 2: Usuario Firma en Wallet

```
1. App abre wallet (Unisat/Xverse/OrdinalWallet)
2. Usuario firma PSBT
3. Wallet retorna PSBT firmado
```

### Paso 3: Broadcast (POST /api/broadcast)

```
1. App envía: { signedPsbt, transactionId }
2. Servidor valida:
   - transactionId existe
   - PSBT no ha expirado
   - idempotencyKey no se ha usado
3. Servidor transmite a Mempool.space
4. Servidor guarda txid
5. Servidor responde: { txid, status }
```

### Paso 4: Monitorear (GET /api/transaction/{txid}/status)

```
1. App consulta cada 30 segundos
2. Servidor consulta Mempool.space
3. Servidor retorna confirmaciones
```

---

## 3. Estados de Transacción

| Estado | Descripción |
|--------|-------------|
| PENDING | PSBT creado, esperando firma |
| AWAITING_BROADCAST | PSBT firmado, transmitiendo |
| BROADCASTED | Transmitido a Bitcoin |
| CONFIRMED | Confirmado en blockchain |
| EXPIRED | PSBT expiró (5 minutos) |
| FAILED | Error en transmisión |

---

## 4. Reglas de Negocio

### Regla #1: Idempotencia Obligatoria

**El servidor debe:**
- Verificar idempotencyKey antes de procesar
- Guardar idempotencyKey usado
- Si ya existe: retornar resultado anterior (no procesar de nuevo)

```typescript
async function handleBroadcast(request) {
  // 1. Verificar idempotencyKey
  const existing = await db.getTransactionByIdempotencyKey(request.idempotencyKey);
  if (existing) {
    return existing; // Retornar resultado anterior
  }
  
  // 2. Procesar normalmente
  const result = await processTransaction(request);
  
  // 3. Guardar idempotencyKey
  await db.saveTransaction({ ...result, idempotencyKey: request.idempotencyKey });
  
  return result;
}
```

### Regla #2: Expiración de PSBT

**El PSBT expira en 5 minutos.**

- Servidor guarda timestamp de creación
- Si pasan más de 5 minutos: rechazar
- App debe generar nuevo PSBT

### Regla #3: Retry Automático

**Si el broadcast falla:**
- Retry automático (máx 3 intentos)
- Esperar 5 segundos entre intentos
- Si sigue fallando: retornar error a app

```typescript
async function broadcastWithRetry(psbt: string): Promise<string> {
  let lastError;
  
  for (let i = 0; i < 3; i++) {
    try {
      const txid = await mempool.broadcast(psbt);
      return txid;
    } catch (error) {
      lastError = error;
      await delay(5000); // 5 segundos
    }
    
  throw lastError; // Si falló todos los intentos
}
```

---

## 5. Skills Relacionadas

- Server-S5: Server-Transactions

---

## 6. Documentos Relacionados

- Server 01: Server-Endpoints
- Server 02: Server-Security
- Server 03: Server-Bitcoin-Integration
