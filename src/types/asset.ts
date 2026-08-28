export interface AssetInscription {
  id: string;
  address: string;
  name: string | null;
  metaprotocol: string | null;
  contentType: string | null;
  height: number | null;
  isBitmap: boolean;
  collectionName: string | null;
  protocol: string | null;
  tick: string | null;
  inscriptionNumber: number;
  isParcel: boolean;
  isBittickAgent: boolean;
  imageInscriptionId: string | null;
  imageContentType: string | null;
  output: string | null;
  value: number | null;
}

export interface AssetCollection {
  name: string;
  count: number;
  items: AssetInscription[];
}

export interface UserAssetsResponse {
  address: string;
  collections: AssetCollection[];
  total: number;
  lastHeight: number | null;
  fullSync: boolean;
}

export interface ParcelConfirmation {
  type: 'parcel_inscription' | 'bitmap_transfer';
  confirmed: boolean;
  txid: string | null;
  explorerUrl: string | null;
  // Confirmation 1 fields
  inscriberWallet?: string;
  genesisHeight?: number;
  // Confirmation 2 fields
  selfTransferFrom?: string;
  selfTransferTo?: string;
  selfTransferHeight?: number;
  blocksBefore?: number;
}

export interface ParcelConfirmationsResponse {
  parcelName: string;
  blockNumber: number;
  blockHash: string | null;
  confirmations: ParcelConfirmation[];
}
