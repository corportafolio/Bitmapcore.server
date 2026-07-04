## PATRÓN #9 - ERROR RECOVERY

### Propósito

Permitir que el servidor se recupere automáticamente de errores temporales sin caerse.

### Responsabilidades

| Responsabilidad | Descripción |
|----------------|-------------|
| **Interceptar errores** | Capturar errores de operaciones |
| **Clasificar error** | Determinar si es recuperable o no |
| **Decidir acción** | Retry, fallback, o propagar error |
| **Ejecutar recuperación** | Implementar lógica de recuperación |
| **Notificar** | Informar al sistema de monitoreo |

### Funciones esenciales

| Función | Descripción |
|---------|-------------|
| **Detectar tipo de error** | Clasificar si el error es recuperable o no |
| **Determinar si reintentar** | Solo reintentar errores temporales (network, timeout) |
| **Ejecutar retry** | Volver a intentar la operación |
| **Calcular backoff** | Esperar tiempo creciente entre intentos |
| **Registrar intento** | Loggear cada intento para debugging |

### Por qué es importante

Errores temporales (APIs externas fallidas, timeouts, red) son comunes. Sin recuperación automática, cada error requiere intervención manual.

### Errores recuperables vs no recuperables

| Recuperables | No recuperables |
|-------------|-----------------|
| Timeout de red | Error de validación |
| Conexión rechazada | Recurso no encontrado |
| Error 5xx de API | Error de autenticación |
| DNS falló | Datos corruptos |

### Funciones que evita

- **Servidor caído** - Un error tumba todo el sistema
- **Usuarios ven errores** - Experiencia terrible
- **Sin acción correctiva** - Solo logs no bastan

### Funciones que coordina

| Patrón | Relación |
|--------|----------|
| PATRON_12_RETRY_LOGIC | Implementa retry |
| PATRON_13_CIRCUIT_BREAKER | Previene fallos en cascada |
| PATRON_21_ERROR_HANDLING | Manejo centralizado de errores |

### Documentos relacionados

- 04: Transactions
- 02: Security
