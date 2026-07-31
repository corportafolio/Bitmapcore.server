# 00 - Índice de Documentación Obligatoria

## Prólogo

Este documento pertenece a **BitmapCorpServer**. Las reglas de negocio aquí documentadas están **POR ENCIMA DEL CÓDIGO** y **POR ENCIMA DE LAS SKILLS**. 

**LECTURA OBLIGATORIA:** Todos los documentos listados aquí DEBEN ser leídos en su totalidad antes de intentar realizar cualquier modificación en el código de este servidor. **No se permiten cambios** sin el conocimiento completo de estas reglas.

---

## 1. Jerarquía de Autoridad

En este proyecto, se respeta estrictamente la siguiente jerarquía:
1. **Reglas de Negocio (Documentos en `docs/`):** Tienen la máxima prioridad.
2. **Habilidades de Diseño (Skills en `.opencode/skills/`):** Documentan la aplicación técnica.
3. **Código Fuente:** Debe reflejar fielmente lo dictado por los documentos y las skills.

---

## 2. Documentos del Sistema (docs/) - 9 Documentos

| # | Documento | Propósito |
|---|-----------|-----------|
| 00 | [Índice Obligatorio](file:///home/candela/BitmapCorpServer/docs/00_Indice.md) | Punto de entrada y prólogo de autoridad. |
| 01 | [Endpoints](file:///home/candela/BitmapCorpServer/docs/01_Endpoints.md) | Definición contractual de la API. |
| 02 | [Seguridad](file:///home/candela/BitmapCorpServer/docs/02_Security.md) | Reglas de acceso y protección. |
| 03 | [Integración Bitcoin](file:///home/candela/BitmapCorpServer/docs/03_Bitcoin-Integration.md) | Sincronización con la red y Mempool. |
| 04 | [Transacciones](file:///home/candela/BitmapCorpServer/docs/04_Transactions.md) | Lógica de PSBT y broadcasts. |
| 05 | [Listados](file:///home/candela/BitmapCorpServer/docs/05_Listings.md) | Gestión del Marketplace Local. |
| 06 | [Servidor Perpetuo](file:///home/candela/BitmapCorpServer/docs/06_Servidor-Perpetuo.md) | Gestión con PM2. |
| 07 | [2 tablas, la tabla 1 el local marketplace y la tabla 2 datos de la mempoll](file:///home/candela/BitmapCorpServer/docs/07_2-tablas-local-marketplace-y-datos-mempool.md) | Estructura de datos crítica. |
| 50 | [Sistema de Comercio de Activos (Bitmap)](file:///home/candela/BitmapCorpServer/docs/50_Trading-System.md) | Verificación de inscripción, ownership, parseo JSON, flujo compra/venta. |

---

## 3. Skills de Diseño (.opencode/skills/) - 8 Skills

| Skill | Nombre |
|-------|--------|
| 01 | [Setup](file:///home/candela/BitmapCorpServer/.opencode/skills/01_setup/SKILL.md) |
| 02 | [API Routes](file:///home/candela/BitmapCorpServer/.opencode/skills/02_api-routes/SKILL.md) |
| 03 | [Security](file:///home/candela/BitmapCorpServer/.opencode/skills/03_security/SKILL.md) |
| 04 | [Bitcoin Integration](file:///home/candela/BitmapCorpServer/.opencode/skills/04_bitcoin-integration/SKILL.md) |
| 05 | [Transactions](file:///home/candela/BitmapCorpServer/.opencode/skills/05_transactions/SKILL.md) |
| 06 | [Arquitectura](file:///home/candela/BitmapCorpServer/.opencode/skills/06_arquitectura/indice-patrones-servidor.md) |
| 07 | [Estabilidad](file:///home/candela/BitmapCorpServer/.opencode/skills/07_responsabilidades-servidor-perpetuo/SKILL.md) |
| 08 | [2 tablas, la tabla 1 el local marketplace y la tabla 2 datos de la mempoll](file:///home/candela/BitmapCorpServer/.opencode/skills/08_2-tablas-local-marketplace-y-datos-mempool/SKILL.md) |

---
> [!CAUTION]
> El incumplimiento de estas normas resultará en el rechazo de los cambios.
