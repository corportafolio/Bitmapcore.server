## PATRÓN #16 - IDEMPOTENCY

### Propósito

Garantizar que requests repetidos produzcan el mismo resultado, previniendo duplicados.

### Responsabilidades

| Responsabilidad | Descripción |
|----------------|-------------|
| **Recibir idempotency key** | Extraer del header o body |
| **Validar key** | Verificar que sea UUID válido |
| **Buscar en cache/BD** | Verificar si ya fue procesada |
| **Procesar o retornar** | Crear nuevo o retornar existente |
| **Guardar resultado** | Almacenar respuesta para futuras consultas |
| **Expirar keys** | Limpiar keys después de tiempo límite |

### Funciones esenciales

| Función | Descripción |
|---------|-------------|
| **Generar idempotency key** | Crear UUID único por cada request del cliente |
| **Verificar key existente** | Buscar si la key ya fue procesada antes |
| **Guardar resultado primero** | Guardar respuesta antes de retornar |
| **Retornar resultado guardado** | Si key ya existe, retornar resultado anterior |
| **Expirar keys antiguas** | Limpiar keys después de 24 horas |

### Por qué es importante

Usuarios pueden presionar botón múltiples veces, network puede retry. Sin idempotency, se crean duplicados.

### Funciones que evita

- **Transacciones duplicadas** - Usuario paga 2 veces
- **Datos duplicados** - Registros repetidos en BD
- **Pérdida de dinero** - Transacciones financieras duplicadas

### Por qué usar este patrón y no otros

Esencial para operaciones financieras.

- **Idempotency key:** Previene duplicados
- **Solo deshabilitar botón:** Cliente puede hacer retry manual
- **Sin protección:** Datos duplicados seguros

### Funciones que coordina

| Patrón | Relación |
|--------|----------|
| PATRON_02_VALIDACION_ENTRADA | Valida que idempotency key sea UUID válido |
| PATRON_12_RETRY_LOGIC | Retry usa la misma key |
| PATRON_09_ERROR_RECOVERY | Recovery puede reusar key |

### Documentos relacionados

- 02: Security
- 04: Transactions
