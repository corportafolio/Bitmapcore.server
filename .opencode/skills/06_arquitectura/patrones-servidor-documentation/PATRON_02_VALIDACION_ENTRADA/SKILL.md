## PATRÓN #2 - VALIDACIÓN DE ENTRADA

### Propósito

Validar toda entrada del usuario antes de procesarla para prevenir datos maliciosos o inválidos.

### Responsabilidades

| Responsabilidad | Descripción |
|----------------|-------------|
| **Extraer inputs del request** | Obtener datos del body, query params, headers |
| **Definir reglas de validación** | Especificar qué es válido para cada campo |
| **Ejecutar validaciones** | Aplicar reglas a cada input |
| **Recolectar errores** | Acumular todos los errores encontrados |
| **Retornar errores claros** | Responder con mensajes específicos |

### Funciones esenciales

| Función | Descripción |
|---------|-------------|
| **Validar tipos de datos** | Verificar que cada campo es del tipo esperado |
| **Validar formatos** | Verificar regex de UUID, direcciones Bitcoin, emails |
| **Validar rangos** | Verificar que números estén en rangos válidos |
| **Validar obligatoriedad** | Verificar campos requeridos no estén vacíos |
| **Sanitizar inputs** | Eliminar caracteres peligrosos antes de procesar |

### Por qué es importante

Base de seguridad. Si los datos entran mal, todo lo demás falla.

### Funciones que evita

- **Inyección SQL** - Datos maliciosos ejecutados en BD
- **Inyección de código** - Scripts ejecutados
- **Errores de procesamiento** - Servidor puede crashear
- **Datos corruptos** - Información incorrecta en BD

### Por qué usar este patrón y no otros

Validación en servidor es obligatoria. Cliente puede ser burlado.

- **Validación en servidor:** Obligatoria, segura
- **Solo cliente:** Insegura, puede ser burlada

### Funciones que coordina

| Patrón | Relación |
|--------|----------|
| PATRON_01_RATE_LIMITING | Se aplica antes (rate limit primero) |
| PATRON_05_RESPONSE_FORMATTING | Formatea errores de validación |
| PATRON_10_LOGGING_SANITIZADO | Loggea intentos inválidos |

### Documentos relacionados

- 02: Security
