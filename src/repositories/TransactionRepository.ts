import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../database/db';
import { Transaction, TransactionCreate, TransactionStatus } from '../types/transaction';

interface TransactionRow {
  id: string;
  listing_id: string;
  buyer_address: string;
  seller_address: string;
  price: number;
  psbt: string | null;
  txid: string | null;
  status: string;
  idempotency_key: string | null;
  error: string | null;
  created_at: number;
  updated_at: number;
}

function rowToTransaction(row: TransactionRow): Transaction {
  return {
    id: row.id,
    listingId: row.listing_id,
    buyerAddress: row.buyer_address,
    sellerAddress: row.seller_address,
    price: row.price,
    psbt: row.psbt,
    txid: row.txid,
    status: row.status as TransactionStatus,
    idempotencyKey: row.idempotency_key || '',
    error: row.error,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class TransactionRepository {
  create(data: TransactionCreate): Transaction {
    const db = getDb();
    const id = uuidv4();
    const now = Date.now();

    db.prepare(`
      INSERT INTO transactions (id, listing_id, buyer_address, seller_address, price, status, idempotency_key, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'PENDING', ?, ?, ?)
    `).run(
      id,
      data.listingId,
      data.buyerAddress,
      data.sellerAddress,
      data.price,
      data.idempotencyKey,
      now,
      now
    );

    return this.findById(id)!;
  }

  findById(id: string): Transaction | null {
    const db = getDb();
    const row = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id) as TransactionRow | undefined;
    return row ? rowToTransaction(row) : null;
  }

  findByIdempotencyKey(key: string): Transaction | null {
    const db = getDb();
    const row = db.prepare('SELECT * FROM transactions WHERE idempotency_key = ?').get(key) as TransactionRow | undefined;
    return row ? rowToTransaction(row) : null;
  }

  findByListingId(listingId: string): Transaction[] {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM transactions WHERE listing_id = ? ORDER BY created_at DESC').all(listingId) as TransactionRow[];
    return rows.map(rowToTransaction);
  }

  updatePsbt(id: string, psbt: string): void {
    const db = getDb();
    const now = Date.now();
    db.prepare('UPDATE transactions SET psbt = ?, updated_at = ? WHERE id = ?').run(psbt, now, id);
  }

  updateStatus(id: string, status: TransactionStatus, txid?: string, error?: string): void {
    const db = getDb();
    const now = Date.now();

    if (txid) {
      db.prepare('UPDATE transactions SET status = ?, txid = ?, updated_at = ? WHERE id = ?').run(status, txid, now, id);
    } else if (error) {
      db.prepare('UPDATE transactions SET status = ?, error = ?, updated_at = ? WHERE id = ?').run(status, error, now, id);
    } else {
      db.prepare('UPDATE transactions SET status = ?, updated_at = ? WHERE id = ?').run(status, now, id);
    }
  }

  findPending(): Transaction[] {
    const db = getDb();
    const rows = db.prepare(`
      SELECT * FROM transactions 
      WHERE status IN ('PENDING', 'AWAITING_BROADCAST', 'BROADCASTED')
      ORDER BY created_at ASC
    `).all() as TransactionRow[];
    return rows.map(rowToTransaction);
  }
}
