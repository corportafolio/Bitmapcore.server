---
name: patrones de arquitectura servidor
description: Patrones de arquitectura para el servidor Node.js/TypeScript de BitmapCorp - seguridad, resiliencia, Middleware, Service Layer, Repository
license: MIT
 compatibility: opencode
metadata:
  target: "BitmapCorpServer - Patrones de Arquitectura"
  scope: "patrones-arquitectura-servidor"
  version: "1.0"
---

# Skill 06 - Patrones de Arquitectura del Servidor

## Propósito General

Colección de 24 patrones de arquitectura para el servidor Node.js/TypeScript de BitmapCorp. Estos patrones resuelven problemas de seguridad, resiliencia, arquitectura y manejo de errores.

## Función

La función principal de esta skill es documentar los 24 patrones que se aplican al servidor backend que provee los endpoints API para el marketplace local.

## Responsabilidades

- Documentar patrones de seguridad (Rate Limiting, SSL Pinning, etc.)
- Documentar patrones de arquitectura (Middleware, Service Layer, Repository)
- Documentar patrones de resiliencia (Retry, Circuit Breaker, Error Recovery)
- Documentar patrones de configuración (Environment, Types)
- Mantener estándares de arquitectura del servidor

## ¿Qué pasa si no se usa?

- Servidor sin estándares de arquitectura
- Problemas de seguridad
- Código difícil de mantener
- Errores difíciles de debug
- Vulnerabilidades en producción

## Skills Relacionadas

- Skill 01: Server Setup
- Skill 02: Server API Routes
- Skill 03: Server Security
- Skill 04: Server Bitcoin Integration
- Skill 05: Server Transactions

## Documentos Relacionados (Nivel Superior)

- Server 01: Server-Endpoints
- Server 02: Server-Security
- Server 03: Server-Bitcoin-Integration
- Server 04: Server-Transactions
- Server 05: Server-Listings

> **IMPORTANTE:** Los documentos en /docs son de nivel superior y están POR ENCIMA DEL CÓDIGO y POR ENCIMA DE LAS SKILLS.

---

## Los 24 Patrones

| # | Patrón | Descripción | Categoría |
|---|--------|-------------|-----------|
| 1 | PATRON_01_RATE_LIMITING | Control de tráfico (5 req/min compras) | Seguridad |
| 2 | PATRON_02_VALIDACION_ENTRADA | Validar inputs antes de procesar | Seguridad |
| 3 | PATRON_03_SECURITY_HEADERS | Helmet para headers seguros | Seguridad |
| 4 | PATRON_04_CORS_CONFIGURATION | Control de acceso cruzado | Seguridad |
| 5 | PATRON_05_RESPONSE_FORMATTING | Formato JSON consistente | Arquitectura |
| 6 | PATRON_06_ENVIRONMENT_CONFIG | Variables de entorno | Configuración |
| 7 | PATRON_07_TYPESCRIPT_TYPES | Tipado estático | Configuración |
| 8 | PATRON_08_ASYNC_AWAIT | Manejo de operaciones asíncronas | Arquitectura |
| 9 | PATRON_09_ERROR_RECOVERY | Recuperación ante errores | Resiliencia |
| 10 | PATRON_10_LOGGING_SANITIZADO | Logs sin datos sensibles | Seguridad |
| 11 | PATRON_11_TIMEOUT_HANDLING | Timeouts en requests externos | Resiliencia |
| 12 | PATRON_12_RETRY_LOGIC | Reintentos con backoff | Resiliencia |
| 13 | PATRON_13_CIRCUIT_BREAKER | Proteger contra fallos en cascada | Resiliencia |
| 14 | PATRON_14_HEALTH_CHECK | Endpoint de verificación | Arquitectura |
| 15 | PATRON_15_GRACEFUL_SHUTDOWN | Apagado correcto | Arquitectura |
| 16 | PATRON_16_IDEMPOTENCY | Prevenir operaciones duplicadas | Seguridad |
| 17 | PATRON_17_MIDDLEWARE_PATTERN | Composición de middleware | Arquitectura |
| 18 | PATRON_18_SERVICE_LAYER | Separar lógica de negocio | Arquitectura |
| 19 | PATRON_19_REPOSITORY_PATTERN | Abstraer acceso a datos | Arquitectura |
| 20 | PATRON_20_CONTROLLER_ROUTE | Manejar requests HTTP | Arquitectura |
| 21 | PATRON_21_ERROR_HANDLING | Manejo centralizado de errores | Arquitectura |
| 22 | PATRON_22_DEPENDENCY_INJECTION | Inyectar dependencias | Arquitectura |
| 23 | PATRON_23_SSL_CERTIFICATE_PINNING | Comunicación segura | Seguridad |
| 24 | PATRON_24_ENV_ENCRYPTION | Encriptar variables sensibles | Seguridad |

---

## Ruta de los Patrones

```
06_arquitectura/
├── indice-patrones-servidor.md                    (ESTE ARCHIVO)
└── patrones-servidor-documentation/
    ├── PATRON_01_RATE_LIMITING/SKILL.md
    ├── PATRON_02_VALIDACION_ENTRADA/SKILL.md
    ├── PATRON_03_SECURITY_HEADERS/SKILL.md
    ├── PATRON_04_CORS_CONFIGURATION/SKILL.md
    ├── PATRON_05_RESPONSE_FORMATTING/SKILL.md
    ├── PATRON_06_ENVIRONMENT_CONFIG/SKILL.md
    ├── PATRON_07_TYPESCRIPT_TYPES/SKILL.md
    ├── PATRON_08_ASYNC_AWAIT/SKILL.md
    ├── PATRON_09_ERROR_RECOVERY/SKILL.md
    ├── PATRON_10_LOGGING_SANITIZADO/SKILL.md
    ├── PATRON_11_TIMEOUT_HANDLING/SKILL.md
    ├── PATRON_12_RETRY_LOGIC/SKILL.md
    ├── PATRON_13_CIRCUIT_BREAKER/SKILL.md
    ├── PATRON_14_HEALTH_CHECK/SKILL.md
    ├── PATRON_15_GRACEFUL_SHUTDOWN/SKILL.md
    ├── PATRON_16_IDEMPOTENCY/SKILL.md
    ├── PATRON_17_MIDDLEWARE_PATTERN/SKILL.md
    ├── PATRON_18_SERVICE_LAYER/SKILL.md
    ├── PATRON_19_REPOSITORY_PATTERN/SKILL.md
    ├── PATRON_20_CONTROLLER_ROUTE/SKILL.md
    ├── PATRON_21_ERROR_HANDLING/SKILL.md
    ├── PATRON_22_DEPENDENCY_INJECTION/SKILL.md
    ├── PATRON_23_SSL_CERTIFICATE_PINNING/SKILL.md
    └── PATRON_24_ENV_ENCRYPTION/SKILL.md
```

---

## ⚠️ IMPORTANCIA CRÍTICA DE ESTOS PATRONES

### ¿Por qué son obligatorios?

Estos 24 patrones son la **base fundamental** del servidor de BitmapCorp. Cada uno resuelve problemas específicos de seguridad, arquitectura y resiliencia.

### ¿Qué pasa si no se usan?

- **Ataques DDoS** por falta de rate limiting
- **Datos expuestos** por falta de validación
- **Errores en cascada** por falta de circuit breaker
- **Transacciones duplicadas** por falta de idempotency
- **Vulnerabilidades** por falta de SSL pinning
- **Fugas de información** por falta de logging sanitizado

### Relación con Documentos (Nivel Superior)

Los patrones de esta skill **DEBEN** alinearse con los documentos en /docs:

| Documento | Patrones Relacionados |
|-----------|----------------------|
| Server 01: Server-Endpoints | PATRON_20_CONTROLLER_ROUTE, PATRON_05_RESPONSE_FORMATTING |
| Server 02: Server-Security | PATRON_01_RATE_LIMITING, PATRON_02_VALIDACION_ENTRADA, PATRON_10_LOGGING_SANITIZADO, PATRON_16_IDEMPOTENCY |
| Server 03: Server-Bitcoin-Integration | PATRON_11_TIMEOUT_HANDLING, PATRON_12_RETRY_LOGIC, PATRON_13_CIRCUIT_BREAKER |
| Server 04: Server-Transactions | PATRON_16_IDEMPOTENCY, PATRON_09_ERROR_RECOVERY |

---

## 📖 Lectura Obligatoria

> No es posible comprender el servidor sin leer los 24 patrones de esta skill.

> Cada patrón está interrelacionado con los demás.

> Para hacer modificaciones en el servidor, DEBES leer los 24 patrones.

> Los documentos en /docs están POR ENCIMA de estos patrones.

---

## Skills Relacionadas para Implementación

| Skill | Función |
|-------|---------|
| Skill 01: Server Setup | Configuración inicial del servidor |
| Skill 02: Server API Routes | Los 7 endpoints REST |
| Skill 03: Server Security | Implementación de seguridad |
| Skill 04: Server Bitcoin Integration | Integración con ordinals.com y mempool.space |
| Skill 05: Server Transactions | PSBT y broadcast |

---

## Documentos Relacionados (Nivel Superior)

| Documento | Descripción |
|-----------|-------------|
| Server 01: Server-Endpoints | Define los 7 endpoints del servidor |
| Server 02: Server-Security | Reglas de seguridad obligatorias |
| Server 03: Server-Bitcoin-Integration | Integración con APIs de Bitcoin |
| Server 04: Server-Transactions | Gestión de transacciones |
| Server 05: Server-Listings | Gestión de listados |
