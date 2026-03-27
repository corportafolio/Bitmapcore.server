## PATRÓN #6 - ENVIRONMENT CONFIG

### Propósito

Gestionar la configuración del servidor mediante variables de entorno, separando configuración del código para diferentes entornos (desarrollo, producción).

### Responsabilidades

| Responsabilidad | Descripción |
|----------------|-------------|
| **Cargar variables de entorno** | Leer .env al iniciar el servidor |
| **Proveer valores por defecto** | Valores seguros si no está definido |
| **Validar configuración** | Verificar que variables requeridas existan |
| **Definir tipos** | Tipos TypeScript para autocompletado |
| **Separar por entorno** | Different config para dev/prod |

### Funciones esenciales

| Función | Descripción |
|---------|-------------|
| **dotenv.config()** | Cargar archivo .env |
| **process.env.VARIABLE** | Acceder a variables |
| **Valores por defecto** | Si no existe, usar valor seguro |
| **Validar required** |确保 variables requeridas existan |

### Por qué es importante

Permite cambiar configuración sin modificar código, facilita despliegues y mejora seguridad al no exponer credenciales en el código fuente.

### Funciones que evita

- **Configuración hardcodeada** - Difícil cambiar entre entornos
- **Credenciales expuestas** - Si se hace commit por error, quedan visibles
- **Despliegues complicados** - Requiere modificar código para cada entorno

### Funciones que coordina

| Patrón | Relación |
|--------|----------|
| PATRON_24_ENV_ENCRYPTION | Encripta variables sensibles |
| PATRON_23_SSL_CERTIFICATE_PINNING | Pins en configuración |

### Documentos relacionados

- 02: Security
