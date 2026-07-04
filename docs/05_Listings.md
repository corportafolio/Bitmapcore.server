# 05 - Listings

---

## 1. Propósito del documento

Este Documento describe cómo el servidor gestiona los listados de BitMaps disponibles para venta en el marketplace.

**Las reglas aquí documentadas están POR ENCIMA DEL CÓDIGO** - el código debe adaptarse a estas reglas.

---

## Responsabilidades

- Crear listados de BitMaps a la venta
- Verificar que el inscription es un Bitmap válido antes de listar
- Leer todos los listados activos
- Leer detalle de un Bitmap específico
- Actualizar precio de listado (solo vendedor)
- Eliminar/cancelar listado (solo vendedor)
- Evitar duplicación de listados

---

## 2. Estructura de un Listado

```typescript
interface BitmapListing {
  id: string;              // UUID único
  inscriptionId: string;   // ID en ordinals.com
  name: string;            // Nombre del Bitmap
  description: string;     // Descripción
  price: number;           // Precio en satoshis
  sellerAddress: string;   // Dirección del vendedor
  buyerAddress: string | null; // null si no se ha vendido
  listedAt: number;        // Timestamp
  soldAt: number | null;   // Timestamp de venta
  imageUrl: string;         // URL de imagen
  isActive: boolean;       // Si está a la venta
}
```

---

## 3. Operaciones CRUD

### Crear Listado (Vender un Bitmap)

```
1. Usuario quiere vender un Bitmap
2. App envía: { inscriptionId, price }
3. Servidor verifica:
   - ¿El inscriptionId es un Bitmap válido? (consulta ordinals.com)
   - ¿Ya está listado?
4. Servidor crea registro en BD
5. Servidor retorna: { listingId }
```

### Leer Listados (Ver marketplace)

```
GET /api/bitmaps
- Retorna todos los listados activos
- Ordenados por listedAt (más recientes primero)
- Incluyen: id, name, price, sellerAddress, imageUrl
```

### Leer Detalle

```
GET /api/bitmaps/{id}
- Retorna detalle completo
- Incluye: sellerAddress, listedAt, description
```

### Actualizar Precio

```
PUT /api/bitmaps/{id}
- Solo el vendedor puede actualizar
- Nuevo precio debe ser > 0
```

### Eliminar Listado (Cancelar venta)

```
DELETE /api/bitmaps/{id}
- Solo el vendedor puede eliminar
- Si ya vendido: no se puede eliminar
```

---

## 4. Reglas de Negocio

### Regla #1: Verificar Bitmap antes de listar

**Antes de crear un listado:**

```typescript
async function createListing(inscriptionId: string, price: number) {
  // 1. Consultar ordinals.com
  const inscription = await ordinalsApi.get(inscriptionId);
  
  // 2. Verificar que es un Bitmap
  if (!isBitmap(inscription)) {
    throw new Error("No es un Bitmap válido");
  }
  
  // 3. Verificar que no está listado
  const existing = await db.getListingByInscriptionId(inscriptionId);
  if (existing && existing.isActive) {
    throw new Error("Ya está listado");
  }
  
  // 4. Crear listing
  return await db.createListing({ inscriptionId, price });
}
```

### Regla #2: Solo el Vendedor puede Modificar

**Verificar que la dirección del request es igual a la dirección del vendedor.**

```typescript
async function updateListing(listingId: string, newPrice: number, sellerAddress: string) {
  const listing = await db.getListing(listingId);
  
  if (listing.sellerAddress !== sellerAddress) {
    throw new Error("No eres el vendedor");
  }
  
  return await db.updatePrice(listingId, newPrice);
}
```

### Regla #3: No-duplicación

**Un Bitmap solo puede estar listado una vez.**

```typescript
async function createListing(inscriptionId: string) {
  const existing = await db.getByInscriptionId(inscriptionId);
  
  if (existing && existing.isActive) {
    throw new Error("Bitmap ya está a la venta");
  }
}
```

---

## 5. Base de Datos del Servidor

### Tabla: listings

```sql
CREATE TABLE listings (
  id UUID PRIMARY KEY,
  inscription_id VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price BIGINT NOT NULL,
  seller_address VARCHAR(255) NOT NULL,
  buyer_address VARCHAR(255),
  listed_at BIGINT NOT NULL,
  sold_at BIGINT,
  image_url VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE
);
```

### Tabla: transactions

```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY,
  listing_id UUID NOT NULL,
  buyer_address VARCHAR(255) NOT NULL,
  seller_address VARCHAR(255) NOT NULL,
  price BIGINT NOT NULL,
  psbt TEXT,
  txid VARCHAR(255),
  status VARCHAR(50) NOT NULL,
  idempotency_key VARCHAR(255) UNIQUE,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
```

---

## 6. Skills Relacionadas

- Server-S2: Server-Api-Routes

---

## 7. Documentos Relacionados

- Server 01: Server-Endpoints
- Server 03: Server-Bitcoin-Integration
- Server 04: Server-Transactions
