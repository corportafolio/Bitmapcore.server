## PATRÓN #7 - TYPESCRIPT TYPES

### Propósito

Definir tipos TypeScript para todas las estructuras de datos del servidor, garantizando type-safety y reduciendo errores en tiempo de ejecución.

### Responsabilidades

| Responsabilidad | Descripción |
|----------------|-------------|
| **Definir tipos de request** | Tipos para datos que vienen del cliente |
| **Definir tipos de response** | Tipos para datos que se retornan |
| **Definir tipos de dominio** | Tipos para entidades del negocio |
| **Definir tipos de errores** | Tipos para errores de la API |
| **Exportar tipos centralizados** | Un lugar para importar tipos |

### Tipos principales a definir

| Tipo | Descripción |
|------|-------------|
| **Request types** | BuyBitmapRequest, BroadcastRequest |
| **Response types** | ApiResponse<T>, BitmapListing |
| **Domain types** | Transaction, Bitmap, Wallet |
| **Error types** | ApiError, ValidationError |

### Por qué es importante

TypeScript proporciona verificación de tipos en tiempo de desarrollo, detectando errores antes de que ocurran en producción.

### Funciones que evita

- **Errores en runtime** - Variables con tipos incorrectos fallan silenciosamente
- **Código difícil de mantener** - Sin autocomplete, refactoring arriesgado
- **Errores difíciles de debug** - Tipos incorrectos causar errores confusos

### Funciones que coordina

| Patrón | Relación |
|--------|----------|
| PATRON_22_DEPENDENCY_INJECTION | Usa tipos para inyección |
| PATRON_18_SERVICE_LAYER | Servicios tipados |
| PATRON_19_REPOSITORY_PATTERN | Repositories tipados |

### Documentos relacionados

- 01: Endpoints
- 04: Transactions
