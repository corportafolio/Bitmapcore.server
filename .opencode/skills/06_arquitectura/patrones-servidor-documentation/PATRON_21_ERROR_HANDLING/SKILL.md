## PATRÓN #21 - ERROR HANDLING

### Propósito

Manejar errores de manera centralizada, retornando formato consistente.

### Responsabilidades

| Responsabilidad | Descripción |
|----------------|-------------|
| **Capturar errores** | Middleware de errores al final del pipeline |
| **Clasificar errores** | Diferenciar errores de negocio vs técnicos |
| **Formatear respuesta** | Usar formato consistente (PATRON_05) |
| **Loggear errores** | Registrar con sanitización (PATRON_10) |
| **Responder al cliente** | Código HTTP apropiado |

### Tipos de errores

| Tipo | Descripción | Ejemplo |
|------|-------------|---------|
| **Negocio** | Error de lógica | "Bitmap no encontrado" |
| **Validación** | Input inválido | "Email requerido" |
| **Técnico** | Error de sistema | "BD no disponible" |
| **Autenticación** | No autenticado | "Token inválido" |

### Por qué es importante

Errores handled inconsistentemente causan confusión. Centralizado facilita debugging.

### Funciones que evita

- **Errores inconsistentes** - Cada endpoint maneja diferente
- **Información expuesta** - Stack traces en producción

### Funciones que coordina

| Patrón | Relación |
|--------|----------|
| PATRON_05_RESPONSE_FORMATTING | Usa formato de respuesta |
| PATRON_10_LOGGING_SANITIZADO | Logs de errores |
| PATRON_17_MIDDLEWARE_PATTERN | Middleware de errores |

### Documentos relacionados

- 01: Endpoints
