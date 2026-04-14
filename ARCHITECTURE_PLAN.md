# PLAN DE IMPLEMENTACIÓN: AMPLIAR SERVIDOR BITMAPCORP PARA SOPORTAR CAMPOS ADICIONALES

## OBJETIVO
Modificar el servidor BitmapCorp para almacenar y servir los campos adicionales requeridos:
- bitmapNumber (del ordinal)
- inscriptionNumber (del ordinal)
- bitmapHash (de mempool)
- ownerAddress (del ordinal)

Manteniendo compatibilidad hacia atrás y siguiendo la arquitectura actual.

## PASOS DE IMPLEMENTACIÓN

### FASE 1: MODIFICAR BASE DE DATOS

1. **Actualizar tabla listings** para agregar las nuevas columnas:
   ```sql
   ALTER TABLE listings ADD COLUMN bitmap_number INTEGER;
   ALTER TABLE listings ADD COLUMN inscription_number INTEGER;
   ALTER TABLE listings ADD COLUMN bitmap_hash TEXT;
   ALTER TABLE listings ADD COLUMN owner_address TEXT;
   ```

### FASE 2: MODIFICAR ORDINALSERVICE.TS

2. **Mejorar método getInscription()** para obtener todos los campos necesarios:
   - Extraer: number (inscription_number), address (ownerAddress), etc.
   - El hash del bitmap se obtiene de mempool

3. **Crear método getBitmapHash()** que consulta mempool.space para obtener el hash del bitmap.

### FASE 3: ACTUALIZAR TIPOS

4. **Actualizar BitmapListing** en `/src/types/bitmap.ts`:
   - Añadir: bitmapNumber, inscriptionNumber, bitmapHash, ownerAddress como campos opcionales

### FASE 4: MODIFICAR SERVICIOS

5. **Actualizar BitmapService.verifyBitmap()** y métodos relacionados para usar los nuevos campos.

### FASE 5: ACTUALIZAR ENDPOINTS

6. **Verificar que los endpoints existan y retornen los nuevos campos:**
   - GET /api/bitmaps
   - GET /api/bitmaps/:id
   - POST /api/bitmaps (para crear listings)
   - PUT /api/bitmaps/:id (para actualizar)

### FASE 6: ACTUALIZAR APP ANDROID

7. **En BitmapCorpApp:**
   - Actualizar BitMapCorpBackendApi para mapear nuevos campos
   - Actualizar entidades de dominio (BitMapCorpBitmapEntity)
   - Actualizar repositorios y use cases
   - Actualizar UI para mostrar los nuevos campos

## NOTAS IMPORTANTES

- El servidor YA filtra solo activos (`is_active = 1`)
- El servidor YA maneja vendidos/deslistados correctamente
- Solo necesitamos ampliar la estructura de datos, no cambiar la lógica de negocio
- Mantener compatibilidad: hacer los nuevos campos opcionales inicialmente