## PATRÓN #22 - DEPENDENCY INJECTION

### Propósito

Inyectar dependencias en lugar de crearlas internamente.

### Responsabilidades

| Responsabilidad | Descripción |
|----------------|-------------|
| **Definir contenedor** | Crear contenedor de dependencias |
| **Registrar servicios** | Mapear abstracciones a implementaciones |
| **Resolver dependencias** | Inyectar cuando se necesita |
| **Gestionar ciclo de vida** | Singleton, transient, scoped |
| **Facilitar testing** | Permitir mocks |

### Formas de inyección

| Tipo | Descripción |
|------|-------------|
| **Constructor** | Inyectar en constructor |
| **Setter** | Inyectar mediante setter |
| **Propiedad** | Inyectar en propiedad |

### Por qué es importante

Facilita testing (mocks) y flexibilidad (cambiar implementaciones).

### Funciones que evita

- **Difícil testing** - No se puede inyectar mocks
- **Acoplamiento** - Dependencias hardcodeadas
- **Cambios difíciles** - Modificar código para cambiar implementación

### Funciones que coordina

| Patrón | Relación |
|--------|----------|
| PATRON_18_SERVICE_LAYER | Services inyectan dependencias |
| PATRON_07_TYPESCRIPT_TYPES | Tipos para inyección |
| PATRON_19_REPOSITORY_PATTERN | Repositories pueden ser inyectados |

### Documentos relacionados

- 01: Setup
