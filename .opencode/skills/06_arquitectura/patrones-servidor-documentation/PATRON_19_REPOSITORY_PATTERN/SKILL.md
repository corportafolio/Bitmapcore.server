## PATRÓN #19 - REPOSITORY PATTERN

### Propósito

Abstraer el acceso a datos (BD, cache) detrás de una interfaz.

### Responsabilidades

| Responsabilidad | Descripción |
|----------------|-------------|
| **Definir interfaz** | Crear contrato de métodos disponibles |
| **Implementar acceso a BD** | Queries, inserts, updates, deletes |
| **Abstraer detalles** | Ocultar cómo se persisten los datos |
| **Manejar cache** | Optionally usar cache para optimizar |
| **Mapear entidades** | Convertir entre modelo BD y dominio |

### Métodos típicos del repository

| Método | Descripción |
|--------|-------------|
| **findById** | Buscar por ID |
| **findAll** | Listar todos |
| **create** | Crear nuevo registro |
| **update** | Actualizar registro |
| **delete** | Eliminar registro |

### Por qué es importante

Cambiar de base de datos no afecta el resto del código. Facilita testing con mocks.

### Funciones que evita

- **Código coupled** - Cambiar BD afecta todo
- **Difícil testing** - No se puede mockear datos

### Funciones que coordina

| Patrón | Relación |
|--------|----------|
| PATRON_18_SERVICE_LAYER | Services usan repositories |
| PATRON_07_TYPESCRIPT_TYPES | Tipos para repositories |

### Documentos relacionados

- 05: Listings
