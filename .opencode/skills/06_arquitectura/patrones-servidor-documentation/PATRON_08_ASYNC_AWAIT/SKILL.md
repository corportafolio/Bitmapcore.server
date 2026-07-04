## PATRÓN #8 - ASYNC AWAIT

### Propósito

Manejar operaciones asíncronas de manera clara y estructurada usando async/await.

### Responsabilidades

| Responsabilidad | Descripción |
|----------------|-------------|
| **Declarar funciones async** | Usar async keyword para funciones asíncronas |
| **Await de Promises** | Esperar resultado sin bloquear |
| **Manejar errores** | Try-catch dentro de funciones async |
| **Ejecución paralela** | Usar Promise.all para múltiples operaciones |
| **Ejecución secuencial** | Await en loop cuando orden importa |

### Funciones esenciales

| Función | Descripción |
|---------|-------------|
| **async function** | Declarar función asíncrona |
| **await** | Esperar Promise sin bloquear event loop |
| **Promise.all** | Ejecutar múltiples operaciones en paralelo |
| **try/catch** | Manejar errores de operaciones async |

### Por qué es importante

El servidor realiza múltiples operaciones async (APIs externas, base de datos). Async/await hace el código legible y fácil de mantener.

### Funciones que evita

- **Callback hell** - Código anidado imposible de leer
- **Errores difíciles de manejar** - Try-catch dispersos por todas partes

### Funciones que coordina

| Patrón | Relación |
|--------|----------|
| PATRON_09_ERROR_RECOVERY | Usa async/await |
| PATRON_12_RETRY_LOGIC | Retry de funciones async |
| PATRON_18_SERVICE_LAYER | Servicios usan async/await |

### Documentos relacionados

- 04: Transactions
- 03: Bitcoin-Integration
