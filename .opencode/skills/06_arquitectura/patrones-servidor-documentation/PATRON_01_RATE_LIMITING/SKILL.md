## PATRÓN #1 - RATE LIMITING

### Propósito

Limitar el número de requests que un cliente puede hacer en un período de tiempo para prevenir ataques y abuso.

### Responsabilidades

| Responsabilidad | Descripción |
|----------------|-------------|
| **Detectar origen del request** | Extraer IP o identificador de usuario |
| **Contar requests** | Llevar contador de requests por período |
| **Comparar con límite** | Verificar si excede el límite permitido |
| **Bloquear o permitir** | Permitir o rechazar request |
| **Retornar error 429** | Responder con código apropiado cuando se excede |

### Funciones esenciales

| Función | Descripción |
|---------|-------------|
| **Limitar requests por IP** | Evitar que una IP haga demasiadas requests |
| **Limitar requests por usuario** | Evitar que un usuario abuse del sistema |
| **Diferenciar por tipo de operación** | Compras más restringidas que lecturas |
| **Retornar error 429** | Cuando se excede el límite |

### Por qué es importante

Sin rate limiting, un atacante puede hacer miles de requests por segundo abrumando el servidor.

### Funciones que evita

- **Ataques DDoS** - Servidor caído por exceso de requests
- **Recursos agotados** - Costos elevados de infraestructura
- **Usuarios bloqueados** - Otros no pueden acceder

### Por qué usar este patrón y no otros

Primera línea de defensa contra ataques.

- **Rate Limiting:** Limita cantidad de requests
- **CDN:** Limita ancho de banda (complementario)
- **Firewall:** Bloquea IPs (complementario)

### Relación con otros patrones

| Patrón | Relación |
|--------|----------|
| PATRON_02_VALIDACION_ENTRADA | Se aplica después de rate limit |
| PATRON_21_ERROR_HANDLING | Maneja error 429 |

### Funciones que coordina

- Antes de validar inputs (PATRON_02)
- Antes de procesar requests (PATRON_20)

### Documentos relacionados

- 02: Security
