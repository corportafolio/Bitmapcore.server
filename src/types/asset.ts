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
}
