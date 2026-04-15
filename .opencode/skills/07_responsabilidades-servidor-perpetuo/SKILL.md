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

### 2. Comando de Inicio Perpetuo
```bash
npx pm2 start dist/index.js --name "bitmapcorp-server"
```

## Responsabilidades del Sistema

1. **Garantizar Uptime:** Mantener los procesos vivos 24/7.
2. **Carga de Contexto:** Asegurar que las rutas de base de datos (`listings` y `mempool`) sean accesibles.
3. **Aislamiento de Errores:** Evitar que un error en una petición de un usuario afecte a los demás (gestionado por PM2).

## Relación con otros Patrones

Esta habilidad coordina con:
- **PATRON_06 (Environment Config):** Proveyendo el mecanismo de carga.
- **PATRON_14 (Health Check):** Siendo el sistema que permite que el health check sea útil.
- **Skill 19 (Grupo 2):** Se alinea con los patrones de resiliencia del marketplace local.

## ¿Qué pasa si no se usa?
- El servidor podría fallar al iniciar (`TypeError: Cannot read properties of undefined`).
- El servidor no se reiniciaría tras un `crash`, dejando a los usuarios sin acceso al marketplace.
