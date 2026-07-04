## PATRÓN #5 - RESPONSE FORMATTING

### Propósito

Establecer formato de respuesta consistente para todos los endpoints API.

### Responsabilidades

| Responsabilidad | Descripción |
|----------------|-------------|
| **Definir estructura de éxito** | Especificar formato cuando todo sale bien |
| **Definir estructura de error** | Especificar formato cuando hay errores |
| **Crear helper functions** | Funciones reutilizables para formatear |
| **Aplicar a todos los endpoints** | Mismo formato en toda la API |
| **Documentar códigos de error** | Lista de códigos posibles y su significado |

### Funciones esenciales

| Función | Descripción |
|---------|-------------|
| **Estructura éxito** | Siempre retornar `{ success: true, data, error: null }` |
| **Estructura error** | Siempre retornar `{ success: false, data: null, error }` |
| **Códigos de error** | Usar códigos consistentes (INVALID_REQUEST, NOT_FOUND) |
| **Mensajes claros** | Descripción legible para desarrolladores |
| **Tipos consistentes** | Mismos tipos de datos en data para cada endpoint |

### Por qué es importante

Formato consistente permite al cliente procesar respuestas de manera uniforme.

### Funciones que evita

- **Inconsistencia** - Cada endpoint devuelve formato diferente
- **Código cliente complejo** - Manejar muchos casos
- **Confusión** - Desarrolladores no saben qué esperar

### Estructura obligatoria

```typescript
// Éxito:
{ success: true, data: {...}, error: null }

// Error:
{ success: false, data: null, error: { code: "CÓDIGO", message: "Descripción" } }
```

### Funciones que coordina

| Patrón | Relación |
|--------|----------|
| PATRON_21_ERROR_HANDLING | Usa mismo formato para errores |
| PATRON_02_VALIDACION_ENTRADA | Valida formato de entrada |
| PATRON_20_CONTROLLER_ROUTE | Aplica formato en controladores |

### Documentos relacionados

- 01: Endpoints
