import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../database/db';
import { BitmapListing, BitmapListingCreate, BitmapListingUpdate } from '../types/bitmap';
import { NotFoundError } from '../errors/AppError';

interface ListingRow {
  id: string;
  inscription_id: string;
  name: string;
  description: string | null;
  price: number;
  seller_address: string;
  buyer_address: string | null;
  listed_at: number;
  sold_at: number | null;
  image_url: string;
  is_active: number;
  bitmap_number: number | null;
  inscription_number: number | null;
  bitmap_hash: string | null;
  owner_address: string | null;
  seller_ordinal_public_key: string | null;
  seller_payment_address: string | null;
  unsigned_psbt: string | null;
  signed_psbt: string | null;
  psbt_status: string | null;
}

function rowToListing(row: ListingRow): BitmapListing {
  return {
    id: row.id,
    inscriptionId: row.inscription_id,
    name: row.name,
    description: row.description || '',
    price: row.price,
    sellerAddress: row.seller_address,
    buyerAddress: row.buyer_address,
    listedAt: row.listed_at,
    soldAt: row.sold_at,
    imageUrl: row.image_url,
    isActive: row.is_active === 1,
    bitmapNumber: row.bitmap_number || undefined,
    inscriptionNumber: row.inscription_number || undefined,
    bitmapHash: row.bitmap_hash || undefined,
    ownerAddress: row.owner_address || undefined,
    sellerOrdinalPublicKey: row.seller_ordinal_public_key || undefined,
    sellerPaymentAddress: row.seller_payment_address || undefined,
    unsignedPsbt: row.unsigned_psbt || undefined,
    signedPsbt: row.signed_psbt || undefined,
    psbtStatus: (row.psbt_status as 'created' | 'signed' | 'sold' | 'expired') || undefined,
  };
}

export class ListingRepository {
  create(data: BitmapListingCreate): BitmapListing {
    const db = getDb();
    const id = uuidv4();
    const now = Date.now();

    const stmt = db.prepare(`
      INSERT INTO listings (id, inscription_id, name, description, price, seller_address, listed_at, image_url, is_active, bitmap_number, inscription_number, bitmap_hash, owner_address, seller_ordinal_public_key, seller_payment_address)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.inscriptionId,
      data.name,
      data.description || null,
      data.price,
      data.sellerAddress,
      now,
      data.imageUrl,
      data.bitmapNumber || null,
      data.inscriptionNumber || null,
      data.bitmapHash || null,
      data.ownerAddress || null,
      data.sellerOrdinalPublicKey || null,
      data.sellerPaymentAddress || null
    );

    return this.findById(id)!;
  }

  findById(id: string): BitmapListing | null {
    const db = getDb();
    const row = db.prepare('SELECT * FROM listings WHERE id = ?').get(id) as ListingRow | undefined;
    return row ? rowToListing(row) : null;
  }

  findByInscriptionId(inscriptionId: string): BitmapListing | null {
    const db = getDb();
    const row = db.prepare('SELECT * FROM listings WHERE inscription_id = ?').get(inscriptionId) as ListingRow | undefined;
    return row ? rowToListing(row) : null;
  }

  findAllActive(): BitmapListing[] {
    const db = getDb();
    const rows = db.prepare(`
      SELECT * FROM listings 
      WHERE is_active = 1 
      ORDER BY listed_at DESC
    `).all() as ListingRow[];
    return rows.map(rowToListing);
  }

  findActiveWithPagination(page: number, limit: number): { items: BitmapListing[]; total: number } {
    const db = getDb();
    const offset = (page - 1) * limit;

    const countResult = db.prepare('SELECT COUNT(*) as total FROM listings WHERE is_active = 1').get() as { total: number };
    const rows = db.prepare(`
      SELECT * FROM listings 
      WHERE is_active = 1 
      ORDER BY listed_at DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset) as ListingRow[];

    return {
      items: rows.map(rowToListing),
      total: countResult.total,
    };
  }

  update(id: string, data: BitmapListingUpdate): BitmapListing {
    const db = getDb();
    const existing = this.findById(id);
    
    if (!existing) {
      throw new NotFoundError('Listing not found');
    }

    const updates: string[] = [];
    const values: (string | number)[] = [];

    if (data.price !== undefined) {
      updates.push('price = ?');
      values.push(data.price);
    }

    if (updates.length === 0) {
      return existing;
    }

    values.push(id);
    db.prepare(`UPDATE listings SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    return this.findById(id)!;
  }

  updatePsbtFields(id: string, fields: { unsignedPsbt?: string; signedPsbt?: string; psbtStatus?: string }): void {
    const db = getDb();
    const updates: string[] = [];
    const values: (string | number)[] = [];

    if (fields.unsignedPsbt !== undefined) {
      updates.push('unsigned_psbt = ?');
      values.push(fields.unsignedPsbt);
    }
    if (fields.signedPsbt !== undefined) {
      updates.push('signed_psbt = ?');
      values.push(fields.signedPsbt);
    }
    if (fields.psbtStatus !== undefined) {
      updates.push('psbt_status = ?');
      values.push(fields.psbtStatus);
    }

    if (updates.length === 0) return;

    values.push(id);
    db.prepare(`UPDATE listings SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  }

  markAsSold(id: string, buyerAddress: string): void {
    const db = getDb();
    const now = Date.now();

    db.prepare(`
      UPDATE listings 
      SET is_active = 0, buyer_address = ?, sold_at = ?, psbt_status = 'sold'
      WHERE id = ?
    `).run(buyerAddress, now, id);
  }

  delete(id: string): void {
    const db = getDb();
    db.prepare('DELETE FROM listings WHERE id = ?').run(id);
  }

  findSoldSince(sinceTimestamp: number): BitmapListing[] {
    const db = getDb();
    const rows = db.prepare(`
      SELECT * FROM listings 
      WHERE sold_at IS NOT NULL AND sold_at > ?
      ORDER BY sold_at DESC
    `).all(sinceTimestamp) as ListingRow[];
    return rows.map(rowToListing);
  }
}
