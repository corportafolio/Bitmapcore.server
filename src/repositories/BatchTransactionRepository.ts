import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../database/db';

interface BatchTransactionRow {
  id: string;
  buyer_address: string;
  psbt: string | null;
  status: string;
  listing_ids: string;
  total_price: number;
  marketplace_fee: number;
  txid: string | null;
  error: string | null;
  created_at: number;
  updated_at: number;
}

export interface BatchTransaction {
  id: string;
  buyerAddress: string;
  psbt: string | null;
  status: string;
  listingIds: string[];
  totalPrice: number;
  marketplaceFee: number;
  txid: string | null;
  error: string | null;
  createdAt: number;
  updatedAt: number;
}

function rowToBatchTx(row: BatchTransactionRow): BatchTransaction {
  return {
    id: row.id,
    buyerAddress: row.buyer_address,
    psbt: row.psbt,
    status: row.status,
    listingIds: JSON.parse(row.listing_ids),
    totalPrice: row.total_price,
    marketplaceFee: row.marketplace_fee,
    txid: row.txid,
    error: row.error,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class BatchTransactionRepository {
  create(data: {
    buyerAddress: string;
    psbt: string;
    listingIds: string[];
    totalPrice: number;
    marketplaceFee: number;
  }): BatchTransaction {
    const db = getDb();
    const id = 'batch_' + uuidv4();
    const now = Date.now();

    db.prepare(`
      INSERT INTO batch_transactions (id, buyer_address, psbt, status, listing_ids, total_price, marketplace_fee, created_at, updated_at)
      VALUES (?, ?, ?, 'PENDING', ?, ?, ?, ?, ?)
    `).run(
      id,
      data.buyerAddress,
      data.psbt,
      JSON.stringify(data.listingIds),
      data.totalPrice,
      data.marketplaceFee,
      now,
      now
    );

    return this.findById(id)!;
  }

  findById(id: string): BatchTransaction | null {
    const db = getDb();
    const row = db.prepare('SELECT * FROM batch_transactions WHERE id = ?').get(id) as BatchTransactionRow | undefined;
    return row ? rowToBatchTx(row) : null;
  }

  updateStatus(id: string, status: string, txid?: string, error?: string): void {
    const db = getDb();
    const now = Date.now();

    if (txid) {
      db.prepare('UPDATE batch_transactions SET status = ?, txid = ?, updated_at = ? WHERE id = ?').run(status, txid, now, id);
    } else if (error) {
      db.prepare('UPDATE batch_transactions SET status = ?, error = ?, updated_at = ? WHERE id = ?').run(status, error, now, id);
    } else {
      db.prepare('UPDATE batch_transactions SET status = ?, updated_at = ? WHERE id = ?').run(status, now, id);
    }
  }
}
