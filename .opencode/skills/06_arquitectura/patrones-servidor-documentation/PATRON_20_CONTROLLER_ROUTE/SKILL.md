## PATRÓN #20 - CONTROLLER ROUTE

### Propósito

Definir controladores que manejan requests HTTP y delegan a servicios.

### Responsabilidades

| Responsabilidad | Descripción |
|----------------|-------------|
| **Definir rutas** | Mapear URLs a handlers |
| **Parsear request** | Extraer body, params, headers |
| **Validar auth** | Verificar sesión/token |
| **Llamar servicio** | Delegar lógica a service |
| **Formatear respuesta** | Retornar formato consistente |
| **Manejar códigos HTTP** | 200, 400, 401, 404, 500 |

### Responsabilidades del controller

| Responsable | Descripción |
|-------------|-------------|
| **HTTP** | Request/response |
| **Validación básica** | Campos requeridos |
| **Delegar** | Llamar servicios |

### Por qué es importante

Separa manejo HTTP de lógica de negocio.

### Funciones que evita

- **Código mezclado** - HTTP + lógica en mismo lugar
- **Difícil mantener** - Cambios HTTP afectan lógica

### Funciones que coordina

| Patrón | Relación |
|--------|----------|
| PATRON_05_RESPONSE_FORMATTING | Formatea respuestas |
| PATRON_18_SERVICE_LAYER | Delega a servicios |
| PATRON_17_MIDDLEWARE_PATTERN | Aplica middleware |

### Documentos relacionados

- 01: Endpoints
