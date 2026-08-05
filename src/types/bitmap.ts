export interface BitmapListing {
  id: string;
  inscriptionId: string;
  name: string;
  description: string;
  price: number;
  sellerAddress: string;
  buyerAddress: string | null;
  listedAt: number;
  soldAt: number | null;
  imageUrl: string;
  isActive: boolean;
  // Campos adicionales para BitmapCorp
  bitmapNumber?: number;
  inscriptionNumber?: number;
  bitmapHash?: string;
  ownerAddress?: string;
  // Datos de bloque (para imágenes Mondrian)
  etiquetas?: string;
  totalTransacciones?: string;
  hash?: string;
  totalBtc?: string;
  // PSBT fields for trustless trading
  sellerOrdinalPublicKey?: string;
  sellerPaymentAddress?: string;
  unsignedPsbt?: string;
  signedPsbt?: string;
  psbtStatus?: 'pending' | 'created' | 'signed' | 'sold' | 'expired';
}

export interface BitmapListingCreate {
  inscriptionId: string;
  price: number;
  sellerAddress: string;
  name: string;
  description?: string;
  imageUrl: string;
  bitmapNumber?: number;
  inscriptionNumber?: number;
  bitmapHash?: string;
  ownerAddress?: string;
  // PSBT fields
  sellerOrdinalPublicKey: string;
  sellerPaymentAddress: string;
  // Client-provided UTXO data (from ordinals.com, fetched during Mis Activos)
  inscriptionUtxo?: string;
  inscriptionValue?: number;
  inscriptionContentType?: string;
  inscriptionHeight?: number;
}

export interface BitmapListingUpdate {
  price?: number;
}

export interface BitmapVerification {
  isBitmap: boolean;
  blockNumber?: number;
  inscriptionId: string;
}

export interface ListingsResponse {
  items: BitmapListing[];
  total: number;
  floorPrice: number;
  page: number;
  limit: number;
  sort: string;
}

export interface OrdinalsInscription {
  id: string;
  number: number;
  address: string;
  content_type: string;
  body: string;
  output?: string;  // txid:vout
  value?: number;   // satoshis
}
