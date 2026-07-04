# Skill 07 - Responsabilidades y Estabilidad del Servidor

## Propósito General

Asegurar la estabilidad técnica y la disponibilidad continua del servidor backend. Esta skill documenta el código indispensable para que el sistema sea resiliente.

## Función

La función principal es la gestión del ciclo de vida del proceso del servidor y la correcta carga de su configuración.

## Código Esencial

### 1. Estabilización de Configuración (environment.ts)
Es indispensable usar la importación de tipo *namespace* para asegurar que la configuración de `dotenv` se cargue antes que cualquier otro módulo de la aplicación.
```typescript
import * as dotenv from 'dotenv';
dotenv.config();
```
*Si no se usa esta forma, el compilador TypeScript podría generar un objeto indefinido, provocando que el servidor no arranque.*

### 2. Script de Inicio Perpetuo
**Ubicación:** `/home/candela/scripts/start-bitmapcorp-server.sh`

Este script gestiona el servidor de forma autónoma:
- **start**: Inicia el servidor en background con nohup
- **stop**: Detiene el servidor (pkill)
- **restart**: Reinicia el servidor
- **status**: Muestra estado y logs
- **autostart**: Configura inicio automático al encender el PC

El servidor usa internamente el script `run-server.sh` del servidor que tiene un loop infinito para auto-reinicio.

### 3. Inicio Automático del Sistema
El servidor se configura para iniciar automáticamente mediante:
- Archivo `.desktop` en `~/.config/autostart/bitmapcorp-server.desktop`
- Ejecuta `/home/candela/BitmapCorpServer/run-server.sh`

## Responsabilidades del Sistema

1. **Garantizar Uptime:** Mantener los procesos vivos 24/7 (usando run-server.sh con loop)
2. **Carga de Contexto:** Asegurar que las rutas de base de datos (`listings` y `mempool`) sean accesibles
3. **Aislamiento de Errores:** El loop de auto-reinicio permite que el servidor se recupere tras errores

## Relación con otros Patrones

Esta habilidad coordina con:
- **PATRON_06 (Environment Config):** Proveyendo el mecanismo de carga
- **PATRON_14 (Health Check):** Siendo el sistema que permite que el health check sea útil
- **docs/06_Servidor-Perpetuo:** Documentación completa del sistema

## ¿Qué pasa si no se usa?
- El servidor podría fallar al iniciar (`TypeError: Cannot read properties of undefined`)
- El servidor no se reiniciaría tras un `crash`, dejando a los usuarios sin acceso al marketplace
