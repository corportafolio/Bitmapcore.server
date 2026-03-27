# Server Skill 4 - Server Bitcoin Integration

## Propósito General

Documentación de la integración del servidor con las APIs públicas de Bitcoin.

## Función

La función principal de esta skill es documentar cómo el servidor consulta ordinals.com y mempool.space.

## Responsabilidades

- Consultar ordinals.com para verificar BitMaps
- Consultar mempool.space para balance
- Consultar mempool.space para transacciones
- Transmitir transacciones a mempool.space

## ¿Qué pasa si no se usa?

- No se puede verificar si es un Bitmap
- No se puede obtener balance
- No se puede transmitir transacciones

## Ordinals.com Integration

```typescript
import axios from 'axios';

const ORDINALS_API = 'https://api.ordinals.com';

interface Inscription {
  id: string;
  number: number;
  address: string;
  content_type: string;
  body: string;
}

export class BitmapVerificationService {
  async verifyBitmap(inscriptionId: string): Promise<{ isBitmap: boolean, blockNumber?: number }> {
    try {
      const response = await axios.get<Inscription>(
        `${ORDINALS_API}/inscription/${inscriptionId}`,
        { timeout: 10000 }
      );
      
      const inscription = response.data;
      const isBitmap = inscription.body && inscription.body.includes('bitmap');
      
      return {
        isBitmap,
        blockNumber: isBitmap ? inscription.number : undefined
      };
    } catch (error) {
      if (error.response?.status === 404) {
        return { isBitmap: false };
      }
      throw error;
    }
  }
}
```

## Mempool.space Integration

```typescript
const MEMPOOL_API = 'https://mempool.space/api';

interface AddressInfo {
  address: string;
  chain_stats: {
    funded_txo_count: number;
    spent_txo_count: number;
    tx_count: number;
    satoshis: number;
  };
}

export class TransactionService {
  async getBalance(address: string): Promise<{ balance: number, satoshis: number, utxos: number }> {
    const response = await axios.get<AddressInfo>(
      `${MEMPOOL_API}/address/${address}`
    );
    
    const satoshis = response.data.chain_stats.satoshis;
    const utxos = response.data.chain_stats.funded_txo_count;
    
    return {
      balance: satoshis / 100000000,
      satoshis,
      utxos
    };
  }
  
  async broadcast(psbt: string): Promise<{ txid: string }> {
    const response = await axios.post(
      `${MEMPOOL_API}/tx`,
      `psbt=${encodeURIComponent(psbt)}`,
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );
    
    return { txid: response.data };
  }
  
  async getTransactionStatus(txid: string): Promise<{ txid: string, status: string, confirmations: number, blockNumber?: number }> {
    const response = await axios.get(`${MEMPOOL_API}/tx/${txid}`);
    
    return {
      txid: response.data.txid,
      status: response.data.status.confirmed ? 'confirmed' : 'pending',
      confirmations: response.data.status.confirmed ? 1 : 0,
      blockNumber: response.data.status.block_height
    };
  }
}
```

## Documentos Relacionados

- Server 03: Server-Bitcoin-Integration

## Skills Relacionadas

- Server-S2: Server-Api-Routes
- Server-S5: Server-Transactions
