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
}

export interface BitmapListingCreate {
  inscriptionId: string;
  price: number;
  sellerAddress: string;
  name: string;
  description?: string;
  imageUrl: string;
}

export interface BitmapListingUpdate {
  price?: number;
}

export interface BitmapVerification {
  isBitmap: boolean;
  blockNumber?: number;
  inscriptionId: string;
}

export interface OrdinalsInscription {
  id: string;
  number: number;
  address: string;
  content_type: string;
  body: string;
}
