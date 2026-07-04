## PATRÓN #17 - MIDDLEWARE PATTERN

### Propósito

Usar middleware para procesar requests de manera transversal (logging, auth, validation).

### Responsabilidades

| Responsabilidad | Descripción |
|----------------|-------------|
| **Definir función de middleware** | Crear función con (req, res, next) |
| **Ejecutar antes del handler** | Procesar request antes del endpoint |
| **Modificar request/response** | Agregar headers, parsear body |
| **Pasar control** | Llamar next() para continuar |
| **Manejar errores** | Middleware de manejo de errores |

### Tipos de middleware

| Tipo | Descripción |
|------|-------------|
| **Global** | Se aplica a todas las rutas |
| **Router** | Se aplica a grupo de rutas |
| **Endpoint** | Se aplica a ruta específica |
| **Error** | Maneja errores |

### Por qué es importante

Evita repetir código en cada endpoint. Funcionalidad común en un solo lugar.

### Funciones que evita

- **Código duplicado** - Misma lógica en cada ruta
- **Difícil mantener** - Cambios en N lugares

### Funciones que coordina

| Patrón | Relación |
|--------|----------|
| PATRON_01_RATE_LIMITING | Middleware de rate limit |
| PATRON_03_SECURITY_HEADERS | Middleware de seguridad |
| PATRON_04_CORS_CONFIGURATION | Middleware de CORS |

### Documentos relacionados

- 01: Setup
