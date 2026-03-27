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
  };
}

export class ListingRepository {
  create(data: BitmapListingCreate): BitmapListing {
    const db = getDb();
    const id = uuidv4();
    const now = Date.now();

    const stmt = db.prepare(`
      INSERT INTO listings (id, inscription_id, name, description, price, seller_address, listed_at, image_url, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);

    stmt.run(
      id,
      data.inscriptionId,
      data.name,
      data.description || null,
      data.price,
      data.sellerAddress,
      now,
      data.imageUrl
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

  markAsSold(id: string, buyerAddress: string): void {
    const db = getDb();
    const now = Date.now();

    db.prepare(`
      UPDATE listings 
      SET is_active = 0, buyer_address = ?, sold_at = ?
      WHERE id = ?
    `).run(buyerAddress, now, id);
  }

  delete(id: string): void {
    const db = getDb();
    db.prepare('DELETE FROM listings WHERE id = ?').run(id);
  }
}
