## PATRÓN #18 - SERVICE LAYER

### Propósito

Aislar la lógica de negocio en servicios separados de los controladores.

### Responsabilidades

| Responsabilidad | Descripción |
|----------------|-------------|
| **Implementar lógica de negocio** | Toda la lógica va en servicios |
| **Coordinar dependencias** | Llamar repositories y otros servicios |
| **Transformar datos** | Convertir entre formatos |
| **Manejar errores de dominio** | Errores específicos del negocio |
| **Definir transacciones** | Coordinar operaciones que deben ser atómicas |

### Funciones esenciales

| Función | Descripción |
|---------|-------------|
| **Contener lógica de negocio** | Toda la lógica va en servicios, no en controladores |
| **Delegar a repositories** | Servicios usan repositories para datos |
| **Manejar errores de negocio** | Errores específicos del dominio |
| **Validar reglas de negocio** | Reglas como " bitmap debe estar a la venta" |
| **Coordinar operaciones** | Llamar múltiples repositories/services |

### Estructura típica

```
Controlador → (recibe request HTTP)
    ↓
Service → (lógica de negocio)
    ↓
Repository → (acceso a datos)
    ↓
Base de datos
```

### Ejemplo de responsabilidades

| En Controller | En Service |
|--------------|------------|
| Leer request HTTP | Validar reglas de negocio |
| Validar sesión | Coordinar múltiples operaciones |
| Retornar respuesta | Llamar APIs externas |
| Manejar códigos HTTP | Transformations |

### Por qué es importante

Separación de responsabilidades. Controladores solo reciben requests, servicios tienen la lógica.

### Funciones que evita

- **Controladores enormes** - Lógica mezclada con HTTP
- **Difícil testing** - No se puede probar lógica sin HTTP
- **Código duplicado** - Misma lógica en múltiples rutas

### Funciones que coordina

| Patrón | Relación |
|--------|----------|
| PATRON_07_TYPESCRIPT_TYPES | Servicios tipados |
| PATRON_19_REPOSITORY_PATTERN | Services usan repositories |
| PATRON_20_CONTROLLER_ROUTE | Controller delega a services |

### Documentos relacionados

- 03: Bitcoin-Integration
