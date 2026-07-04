## PATRÓN #12 - RETRY LOGIC

### Propósito

Implementar reintentos automáticos cuando operaciones externas fallan temporalmente.

### Responsabilidades

| Responsabilidad | Descripción |
|----------------|-------------|
| **Ejecutar operación** | Intentar la función que puede fallar |
| **Evaluar error** | Determinar si el error permite retry |
| **Controlar intentos** | Contar cuántos intentos se han hecho |
| **Calcular espera** | Determinar cuánto esperar antes del siguiente retry |
| **Coordinar idempotency** |确保 misma idempotency key en retry |

### Funciones esenciales

| Función | Descripción |
|---------|-------------|
| **Ejecutar función** | Intentar la operación |
| **Verificar si reintentar** | Solo reintentar si error es recuperable |
| **Calcular delay** | Esperar tiempo creciente entre intentos |
| **Limitar intentos** | Máximo N intentos antes de fallar |
| **Agregar jitter** | Randomizar delay para evitar thundering herd |

### Configuración típica

| Parámetro | Valor recomendado |
|-----------|------------------|
| Máximo intentos | 3 |
| Delay inicial | 1 segundo |
| Factor backoff | 2x (1s, 2s, 4s) |
| Jitter | ±500ms |

### Por qué es importante

APIs externas pueden fallar por razones temporales. Retry mejora confiabilidad.

### Funciones que evita

- **Fallos temporales** = Error permanente
- **Experiencia pobre** - Usuario ve errores por cosas recoverables

### Por qué backoff exponencial

- **Primer intento falla** → esperar 1s
- **Segundo intento falla** → esperar 2s  
- **Tercer intento falla** → esperar 4s

Evita sobrecargar la API cuando ya está having problemas.

### Funciones que coordina

| Patrón | Relación |
|--------|----------|
| PATRON_09_ERROR_RECOVERY | Usa retry |
| PATRON_11_TIMEOUT_HANDLING | Timeout es causa de retry |
| PATRON_16_IDEMPOTENCY | Misma idempotency key en retry |

### Documentos relacionados

- 04: Transactions
