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
  runeSymbol?: string | null;
  runeBalance?: string | null;
  runeName?: string | null;
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

export interface CollectionItem {
  id: string;
  meta: {
    name: string;
    attributes?: Array<{
      trait_type: string;
      value: string;
    }>;
  };
}

export interface CollectionMeta {
  name: string;
  slug: string;
  description: string;
  supply: string;
  icon: string;
}

export interface Collection {
  id: number;
  slug: string;
  name: string;
  description: string;
  supply: number;
  icon_inscription_id: string;
  items_json: string;
  created_at: number;
  updated_at: number;
}

export interface CollectionResponse {
  slug: string;
  name: string;
  description: string;
  supply: number;
  icon_inscription_id: string;
  items: CollectionItem[];
  total: number;
}
