## PATRÓN #23 - SSL CERTIFICATE PINNING

### Propósito

Validar que el certificado del servidor es el esperado, previniendo ataques MITM.

### Responsabilidades

| Responsabilidad | Descripción |
|----------------|-------------|
| **Obtener证书** | Obtener certificado del servidor |
| **Calcular hash** | Generar hash del certificado |
| **Configurar pin** | Definir qué certificados confiar |
| **Validar conexión** | Verificar certificado en cada request |
| **Manejar rotación** | Plan para actualizar certificados |

### Tipos de pinning

| Tipo | Descripción |
|------|-------------|
| **Certificado** | Pin del certificado completo |
| **Public key** | Pin de la clave pública |
| **SPKI** | Pin de Subject Public Key Info |

### Por qué es importante

Previene que atacantes intercepten comunicaciones假扮 el servidor.

### Funciones que evita

- **MITM attacks** - Atacante intercepta tráfico
- **Datos robados** - Credenciales expuestas

### Funciones que coordina

| Patrón | Relación |
|--------|----------|
| PATRON_03_SECURITY_HEADERS | Complementa seguridad |
| PATRON_06_ENVIRONMENT_CONFIG | Pins en configuración |

### Documentos relacionados

- 02: Security
