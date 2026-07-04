## PATRÓN #4 - CORS CONFIGURATION

### Propósito

Configurar CORS para controlar qué dominios pueden acceder a los endpoints del servidor.

### Responsabilidades

| Responsabilidad | Descripción |
|----------------|-------------|
| **Definir orígenes permitidos** | Lista de dominios que pueden acceder |
| **Manejar preflight** | Responder a OPTIONS antes del request real |
| **Definir métodos permitidos** | GET, POST, PUT, DELETE, etc. |
| **Definir headers permitidos** | Content-Type, Authorization, etc. |
| **Manejar credentials** | Permitir o no cookies/auth |

### Funciones esenciales

| Función | Descripción |
|---------|-------------|
| **Whitelist de orígenes** | Solo dominios permitidos pueden acceder |
| **Métodos permitidos** | Limitar qué métodos HTTP se permiten |
| **Headers permitidos** | Limitar qué headers se aceptan |
| **Preflight handling** | Responder a requests OPTIONS |

### Por qué es importante

Sin CORS, cualquier sitio puede hacer requests a nuestro servidor - riesgo de seguridad.

### Funciones que evita

- **Acceso no autorizado** - Cualquier dominio puede acceder
- **Datos expuestos** - Atacantes pueden ver información
- **CSRF attacks** - Sitios maliciosos hacen requests en nombre del usuario

### Por qué usar este patrón y no otros

Estándar de industria para control de acceso cross-origin.

- **CORS configurado:** Control granular
- **Sin CORS:** Inseguro

### Relación con otros patrones

| Patrón | Relación |
|--------|----------|
| PATRON_03_SECURITY_HEADERS | Complementa seguridad |

### Documentos relacionados

- 02: Security
