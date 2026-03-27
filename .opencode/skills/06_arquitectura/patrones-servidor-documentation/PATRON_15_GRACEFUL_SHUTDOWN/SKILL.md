## PATRÓN #15 - GRACEFUL SHUTDOWN

### Propósito

Apagar el servidor de manera ordenada, terminando conexiones existentes antes de cerrar.

### Responsabilidades

| Responsabilidad | Descripción |
|----------------|-------------|
| **Detectar señal de shutdown** | Capturar SIGTERM, SIGINT |
| **Detener acceptar nuevos requests** | No aceptar más conexiones |
| **Terminar requests activos** | Esperar a que terminen los en progreso |
| **Cerrar conexiones de BD** | Cerrar pool de conexiones |
| **Liberar recursos** | Limpiar recursos antes de salir |

### Fases del shutdown

| Fase | Descripción |
|------|-------------|
| **Recibir señal** | Detener accept de nuevos requests |
| **Notificar** | Informar a load balancer |
| **Esperar** | Permitir que requests terminen |
| **Cerrar** | Cerrar BD, archivos, conexiones |

### Por qué es importante

Cerrar abruptamente puede dejar requests a medio procesar y causar inconsistencia de datos.

### Funciones que evita

- **Requests incompletos** - Usuarios quedan colgados
- **Datos corruptos** - Transacciones a medio hacer
- **Conexiones huérfanas** - Recursos no liberados

### Funciones que coordina

| Patrón | Relación |
|--------|----------|
| PATRON_09_ERROR_RECOVERY | Manejar errores durante shutdown |

### Documentos relacionados

- 01: Setup
