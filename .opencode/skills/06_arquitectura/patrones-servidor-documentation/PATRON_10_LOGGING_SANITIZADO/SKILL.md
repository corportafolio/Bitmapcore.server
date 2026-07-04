## PATRÓN #10 - LOGGING SANITIZADO

### Propósito

Registrar logs sin exponer datos sensibles (direcciones Bitcoin, PSBTs, información personal).

### Responsabilidades

| Responsabilidad | Descripción |
|----------------|-------------|
| **Inspeccionar datos** | Analizar qué se va a loggear |
| **Identificar sensibles** | Detectar campos de la lista negra |
| **Aplicar sanitización** | Reemplazar o maskear datos sensibles |
| **Validar resultado** |确保 después de sanitizar no queda nada sensible |
| **Mantener utilidad** | Mantener información útil para debugging |

### Funciones esenciales

| Función | Descripción |
|---------|-------------|
| **Detectar datos sensibles** | Identificar campos como privateKey, seed, password, psbt |
| **Reemplazar completamente** | Cambiar valores sensibles por `[REDACTED]` |
| **Masking parcial** | Mostrar solo primeros+últimos caracteres para direcciones |
| **Detectar patrones** | Recognocer direcciones Bitcoin, PSBTs por formato |
| **No guardar nunca** | Lista negra de campos que nunca se loggean |

### Datos sensibles - NUNCA guardar

| Campo | Acción |
|-------|--------|
| privateKey | `[REDACTED]` |
| seedPhrase | `[REDACTED]` |
| password | `[REDACTED]` |
| psbt | `[REDACTED]` |
| signedPsbt | `[REDACTED]` |
| accessToken | `[REDACTED]` |

### Datos para mostrar parcialmente

| Campo | Ejemplo |
|-------|---------|
| Bitcoin address | `bc1qxy...89ab` |
| txid | `abc1...def4` |
| inscriptionId | `abc1...7890` |

### Por qué es importante

Los logs son esenciales para debugging, pero pueden exponer información sensible si no se sanitizan.

### Funciones que evita

- **Datos sensibles expuestos** - Direcciones Bitcoin en logs
- **Riesgo de seguridad** - Atacantes obtienen información útil
- **Violación de privacidad** - Información personal expuesta

### Funciones que coordina

| Patrón | Relación |
|--------|----------|
| PATRON_02_VALIDACION_ENTRADA | Loggea validaciones fallidas |
| PATRON_21_ERROR_HANDLING | Logs de errores centralizados |
| PATRON_09_ERROR_RECOVERY | Loggea reintentos |

### Documentos relacionados

- 02: Security
