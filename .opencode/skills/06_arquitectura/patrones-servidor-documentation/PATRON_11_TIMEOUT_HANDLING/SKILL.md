## PATRÓN #11 - TIMEOUT HANDLING

### Propósito

Manejar timeouts de operaciones externas (APIs, base de datos) de manera controlada.

### Responsabilidades

| Responsabilidad | Descripción |
|----------------|-------------|
| **Establecer timeout** | Definir tiempo máximo de espera |
| **Aplicar timeout** | Configurar en cliente HTTP |
| **Detectar timeout** |识别 cuando se excede el tiempo |
| **Manejar timeout** | Responder con error apropiado |
| **Liberar recursos** | Asegurar cierre de conexiones |

### Configuraciones típicas

| Operación | Timeout recomendado |
|-----------|-------------------|
| APIs externas | 10-30 segundos |
| Base de datos | 5-10 segundos |
| Operaciones locales | 1-5 segundos |

### Por qué es importante

APIs externas pueden no responder. Sin timeout, el servidor se queda esperando indefinidamente.

### Funciones que evita

- **Servidor bloqueado** - Espera indefinida por respuesta
- **Recursos agotados** - Conexiones abiertas sin cerrar
- **Usuario sin respuesta** - Interfaz colgada

### Funciones que coordina

| Patrón | Relación |
|--------|----------|
| PATRON_09_ERROR_RECOVERY | Timeout es error recuperable |
| PATRON_12_RETRY_LOGIC | Retry tras timeout |

### Documentos relacionados

- 02: Security
