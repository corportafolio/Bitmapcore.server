# 06 - Servidor Activo a Perpetuidad

---

## 1. Propósito del documento

Este documento define las reglas y el sistema para asegurar que el servidor de BitmapCorp permanezca activo de forma perpetua, resiliente y autogestionada.

---

## 2. Sistema de Gestión: PM2

Para garantizar la disponibilidad continua, el servidor utiliza **PM2** en lugar de procesos simples.

### ¿Por qué PM2 y no otros?
- **Resiliencia:** Reinicia automáticamente el servidor si este falla por un error inesperado (Zero-downtime).
- **Monitoreo:** Permite ver el uso de CPU y memoria en tiempo real.
- **Gestión de Logs:** Centraliza la salida de errores y eventos.
- **Persistencia:** Capacidad de reiniciarse automáticamente tras un reinicio del sistema operativo.

---

## 3. Reglas de Negocio para la Perpetuidad

### Regla #1: Reinicio Automático
El servidor DEBE estar configurado para reiniciarse inmediatamente tras una caída. Si el servidor no se usa con PM2, se corre el riesgo de que una excepción no controlada detenga el servicio por completo, rompiendo la conexión con la app.

### Regla #2: Configuración de Entorno Robusta
El servidor DEBE validar que el archivo `.env` esté presente y configurado correctamente antes de iniciar. Si faltan variables críticas (como `PORT` o `DB_PATH`), el servidor fallará intencionalmente para evitar estados inconsistentes.

### Regla #3: Monitoreo de Salud
El endpoint `/health` es la fuente de verdad para la app. PM2 debe asegurar que este endpoint responda en menos de 5 segundos.

---

## 4. Ejemplos de Consecuencias (Sin esta función)
- **Error de Conexión:** La app mostraría "Error de servidor" cada vez que un proceso Node.js muera por falta de memoria o error de red.
- **Pérdida de Configuración:** Sin la estabilización de `dotenv`, el servidor usaría puertos por defecto o rutas de bases de datos incorrectas, perdiendo acceso al marketplace local.

---

## 5. Documentos Relacionados
- Server 01: Endpoints
- Server 02: Seguridad
