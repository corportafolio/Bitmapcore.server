# Skill 08 - Marketplace Local y Datos Mempool

## Propósito General

Documentar la lógica técnica y las reglas de integración para el acceso a las tablas de datos del marketplace y la red Bitcoin.

## Función

Proveer una interfaz de datos consistente para la aplicación `BitmapCorpApp`, asegurando que el marketplace local y la caché de bloques estén sincronizados.

## Detalles Técnicos de las Tablas

### 1. Gestión de Marketplace (bitmapcorp.db)
El servidor utiliza `better-sqlite3` para gestionar las tablas. Es crítico que las consultas respeten los índices creados:
- `idx_listings_is_active` para rapidez en la lista general.
- `idx_transactions_idempotency_key` para seguridad en transacciones.

### 2. Gestión de Bloques (btc_bloques.db)
Esta base de datos es solo de lectura para la mayoría de endpoints y sirve como fuente de verdad para el `bitmapHash`.

## Relaciones y Coordinación

### Relación con Skill 19 (App)
Esta skill del servidor es el espejo de la **Skill 19 (Patrones de Arquitectura Local Marketplace)** de la app. Mientras la app gestiona el estado de la UI, esta skill en el servidor garantiza la persistencia y validación de esas reglas.

### Relación con Skill 3 (App)
Se coordina con el **Grupo 1 de Patrones (Skill 3)**, específicamente con el manejo de flujos de datos y caché, asegurando que el formato JSON de las tablas sea compatible con los `StateFlows` de la aplicación Android.

## Responsabilidades
- **Integridad:** Validar que cada listing tenga un `inscription_id` válido.
- **Disponibilidad:** Servir datos de mempool incluso si la API de `mempool.space` está caída.

## ¿Qué pasa si no se usa?
- Inconsistencia de datos entre lo que ve el usuario en la app y lo que realmente está listado en el servidor.
- Lentitud crítica en la carga de detalles de bloques y hashes de bitmaps.
