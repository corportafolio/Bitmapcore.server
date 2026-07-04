## PATRÓN #13 - CIRCUIT BREAKER

### Propósito

Prevenir fallos en cascada abriendo el "circuito" cuando un servicio externo falla repetidamente.

### Responsabilidades

| Responsabilidad | Descripción |
|----------------|-------------|
| **Monitorear fallos** | Contar fallos consecutivos |
| **Detectar umbral** | Saber cuándo abrir el circuito |
| **Abrir circuito** | Bloquear requests al servicio caído |
| **Permitir recuperación** | Después de tiempo, permitir requests de prueba |
| **Cerrar circuito** | Si pruebas succeed, reanudar normalmente |

### Estados del circuito

| Estado | Descripción |
|--------|-------------|
| **CLOSED** | Normal, permitiendo requests |
| **OPEN** | Bloqueando todos los requests |
| **HALF-OPEN** | Permitiendo requests de prueba |

### Por qué es importante

Si una API externa está caída, hacer requests continuos agrava el problema y puede afectar otros servicios.

### Funciones que evita

- **Fallos en cascada** - Un servicio caído afecta otros
- **Recursos desperdiciados** - Requests innecesarios a servicio caído

### Funciones que coordina

| Patrón | Relación |
|--------|----------|
| PATRON_12_RETRY_LOGIC | Coordina retry |
| PATRON_09_ERROR_RECOVERY | Recupera de errores |

### Documentos relacionados

- 04: Transactions
