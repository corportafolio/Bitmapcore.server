## PATRÓN #3 - SECURITY HEADERS

### Propósito

Establecer headers de seguridad HTTP para proteger contra ataques comunes (XSS, clickjacking).

### Responsabilidades

| Responsabilidad | Descripción |
|----------------|-------------|
| **Configurar CSP** | Content Security Policy para prevenir XSS |
| **Configurar HSTS** | HTTP Strict Transport Security |
| **Configurar X-Frame-Options** | Prevenir clickjacking |
| **Ocultar tecnología** | hidePoweredBy para no exponer servidor |
| **Prevenir MIME sniffing** | X-Content-Type-Options |

### Funciones esenciales

| Función | Descripción |
|---------|-------------|
| **CSP** | Controlar qué recursos puede cargar la página |
| **HSTS** | Forzar HTTPS |
| **X-Frame-Options** | Evitar que cargue en iframes |
| **X-Content-Type-Options** | Prevenir MIME sniffing |

### Por qué es importante

Primera línea de defensa contra ataques del navegador. Previenen inyección de código.

### Funciones que evita

- **XSS** - Atacantes injectan JavaScript
- **Clickjacking** - Usuarios engañados para hacer click
- **MIME Sniffing** - Navegador interpreta mal tipo de archivo

### Por qué usar este patrón y no otros

Estándar de industria, se implementa con Helmet.

- **Helmet:** Estándar, mantenido
- **Headers manuales:** Propenso a errores

### Relación con otros patrones

| Patrón | Relación |
|--------|----------|
| PATRON_04_CORS_CONFIGURATION | CORS complementario |
| PATRON_23_SSL_CERTIFICATE_PINNING | Seguridad a nivel certificado |

### Documentos relacionados

- 02: Security
