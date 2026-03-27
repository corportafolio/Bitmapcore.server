# Server Skill 1 - Server Setup

## Propósito General

Configuración inicial del servidor Node.js/TypeScript para el backend de BitmapCorpApp.

## Función

La función principal de esta skill es documentar cómo configurar y ejecutar el servidor que provee los endpoints API.

## Responsabilidades

- Instalar Node.js y dependencias
- Configurar TypeScript
- Configurar Express.js
- Configurar variables de entorno
- Ejecutar el servidor

## ¿Qué pasa si no se usa?

- Servidor no puede ejecutarse
- No hay backend para la app

## Dependencias Necesarias

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.0.0",
    "dotenv": "^16.0.3",
    "uuid": "^9.0.0",
    "axios": "^1.6.0",
    "express-rate-limit": "^6.10.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "ts-node": "^10.9.0",
    "@types/node": "^20.0.0",
    "@types/express": "^4.17.0"
  }
}
```

## Estructura de Archivos

```
BitmapCorpServer/
├── src/
│   ├── index.ts           # Entry point
│   ├── routes/
│   │   └── apiRoutes.ts   # Endpoints
│   ├── services/
│   │   ├── BitmapVerificationService.ts
│   │   └── TransactionService.ts
│   └── database/
│       └── db.ts          # Base de datos
├── package.json
├── tsconfig.json
└── .env
```

## Comandos

```bash
# Instalar dependencias
npm install

# Compilar TypeScript
npm run build

# Ejecutar en desarrollo
npm run dev

# Ejecutar en producción
npm start
```

## Documentos Relacionados

- Server 01: Server-Endpoints
- Server 02: Server-Security

## Skills Relacionadas

- Server-S2: Server-Api-Routes
- Server-S3: Server-Security
