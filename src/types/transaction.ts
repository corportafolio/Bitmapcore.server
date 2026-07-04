export type TransactionStatus =
  | 'PENDING'
  | 'AWAITING_BROADCAST'
  | 'BROADCASTED'
  | 'CONFIRMED'
  | 'EXPIRED'
  | 'FAILED';

export interface Transaction {
  id: string;
  listingId: string;
  buyerAddress: string;
  sellerAddress: string;
  price: number;
  psbt: string | null;
  txid: string | null;
  status: TransactionStatus;
  idempotencyKey: string;
  error: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface TransactionCreate {
  listingId: string;
  buyerAddress: string;
  sellerAddress: string;
  price: number;
  idempotencyKey: string;
}

export interface TransactionBroadcast {
  signedPsbt: string;
  transactionId: string;
}

export interface TransactionBroadcastResult {
  txid: string;
  status: 'broadcasted';
}

export interface PSBTCreate {
  psbt: string;
  transactionId: string;
  expiresAt: number;
}

export interface WalletBalance {
  balance: number;
  satoshis: number;
  utxos: number;
}

export interface TransactionStatusResponse {
  txid: string;
  status: 'confirmed' | 'pending';
  confirmations: number;
  blockNumber?: number;
}
