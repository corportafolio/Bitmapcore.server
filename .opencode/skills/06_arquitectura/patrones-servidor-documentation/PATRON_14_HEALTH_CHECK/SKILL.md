## PATRÓN #14 - HEALTH CHECK

### Propósito

Endpoint para verificar si el servidor está funcionando correctamente.

### Responsabilidades

| Responsabilidad | Descripción |
|----------------|-------------|
| **Crear endpoint** | Definir ruta /health |
| **Verificar servicio** | Comprobar que el servidor responde |
| **Verificar dependencias** | Comprobar BD, APIs externas |
| **Retornar estado** | Responder con estado de salud |
| **Integrar con orquestadores** | Funcionar con K8s, Docker, load balancers |

### Tipos de health check

| Tipo | Descripción |
|------|-------------|
| **Liveness** | El proceso está vivo |
| **Readiness** | Listo para recibir traffic |
| **Dependency** | Dependencias funcionan |

### Por qué es importante

Permite a load balancers, orquestadores y monitoreo verificar el estado del servicio.

### Funciones que evita

- **Sin verificación** - No se sabe si el servidor está vivo
- **Deploys fallidos** - No se detecta problemas

### Funciones que coordina

| Patrón | Relación |
|--------|----------|
| PATRON_20_CONTROLLER_ROUTE | Define ruta /health |

### Documentos relacionados

- 01: Endpoints
