# 07 - 2 tablas, la tabla 1: local marketplace y la tabla 2: datos de la mempool

---

## 1. Propósito del documento

Este documento describe la estructura de datos que reside en el servidor para soportar el marketplace local y la visualización de datos de la red Bitcoin (Mempool).

---

## 2. Tabla 1: Local Marketplace

Esta tabla reside en la base de datos principal (`bitmapcorp.db`) y gestiona los listados activos y las transacciones en curso.

---

## 3. Tabla 2: Datos de la Mempool

Esta tabla reside en la base de datos de bloques (`btc_bloques.db`) y es una base de datos pesada diseñada para acceso rápido a la información de la red.

---

## 4. Importancia de estas funciones

- **Desacoplamiento:** El marketplace local no depende de APIs externas.
- **Eficiencia:** Evita el rate limiting de APIs externas.

---

## 5. Documentos Relacionados
- Server 05: Listings
- Server 04: Transactions
