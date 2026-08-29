import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../database/db';
import { NotFoundError } from '../errors/AppError';

export interface ParcelConfirmation {
  type: string;
  confirmed: boolean;
  txid: string | null;
  explorerUrl?: string | null;
  inscriberWallet?: string;
  genesisHeight?: number;
  selfTransferFrom?: string;
  selfTransferTo?: string;
  selfTransferHeight?: number;
}

export interface ParcelListing {
  id: string;
  inscriptionId: string;
  parcelId: string;
  name: string;
  price: number;
  listedPrice: number;
  sellerAddress: string;
  sellerPaymentAddress: string;
  sellerOrdinalPublicKey: string;
  inscriptionUtxo: string;
  inscriptionValue: number;
  inscriptionNumber?: number;
  unsignedPsbt?: string;
  signedPsbt?: string;
  psbtStatus?: string;
  isActive: boolean;
  listedAt: number;
  soldAt: number | null;
  soldTxid: string | null;
  confirmations?: ParcelConfirmation[];
}

export interface ParcelListingCreate {
  inscriptionId: string;
  parcelId: string;
  name: string;
  price: number;
  sellerAddress: string;
  sellerPaymentAddress: string;
  sellerOrdinalPublicKey: string;
  inscriptionUtxo: string;
  inscriptionValue: number;
  inscriptionNumber?: number;
}

export interface ParcelConfirmationInfo {
  inscriberWallet?: string;
  genesisHeight?: number;
  tx1Txid?: string;
  selfTransferFrom?: string;
  selfTransferTo?: string;
  selfTransferHeight?: number;
  tx2Txid?: string;
}

interface ParcelListingRow {
  id: string;
  inscription_id: string;
  parcel_id: string;
  name: string;
  price: number;
  seller_address: string;
  seller_payment_address: string | null;
  seller_ordinal_public_key: string | null;
  inscription_utxo: string | null;
  inscription_value: number | null;
  inscription_number: number | null;
  unsigned_psbt: string | null;
  signed_psbt: string | null;
  psbt_status: string | null;
  is_active: number;
  listed_at: number;
  sold_at: number | null;
  sold_txid: string | null;
  conf_inscriber_wallet: string | null;
  conf_genesis_height: number | null;
  conf_tx1_txid: string | null;
  conf_self_transfer_from: string | null;
  conf_self_transfer_to: string | null;
  conf_self_transfer_height: number | null;
  conf_tx2_txid: string | null;
}

function rowToListing(row: ParcelListingRow): ParcelListing {
  const listing: ParcelListing = {
    id: row.id,
    inscriptionId: row.inscription_id,
    parcelId: row.parcel_id || row.inscription_id,
    name: row.name,
    price: row.price,
    listedPrice: row.price,
    sellerAddress: row.seller_address,
    sellerPaymentAddress: row.seller_payment_address || row.seller_address,
    sellerOrdinalPublicKey: row.seller_ordinal_public_key || '',
    inscriptionUtxo: row.inscription_utxo || '',
    inscriptionValue: row.inscription_value || 0,
    inscriptionNumber: row.inscription_number || undefined,
    unsignedPsbt: row.unsigned_psbt || undefined,
    signedPsbt: row.signed_psbt || undefined,
    psbtStatus: row.psbt_status || undefined,
    isActive: row.is_active === 1,
    listedAt: row.listed_at,
    soldAt: row.sold_at,
    soldTxid: row.sold_txid,
  };

  if (row.conf_inscriber_wallet || row.conf_tx1_txid || row.conf_self_transfer_from || row.conf_tx2_txid) {
    listing.confirmations = [
      {
        type: 'parcel_inscription',
        confirmed: true,
        txid: row.conf_tx1_txid || null,
        inscriberWallet: row.conf_inscriber_wallet || undefined,
        genesisHeight: row.conf_genesis_height !== null && row.conf_genesis_height !== undefined ? row.conf_genesis_height : undefined,
      },
      {
        type: 'bitmap_transfer',
        confirmed: true,
        txid: row.conf_tx2_txid || null,
        selfTransferFrom: row.conf_self_transfer_from || undefined,
        selfTransferTo: row.conf_self_transfer_to || undefined,
        selfTransferHeight: row.conf_self_transfer_height !== null && row.conf_self_transfer_height !== undefined ? row.conf_self_transfer_height : undefined,
      },
    ];
  }

  return listing;
}

export class ParcelListingRepository {
  private static tablesEnsured = false;

  private ensureTables(): void {
    if (ParcelListingRepository.tablesEnsured) return;
    const db = getDb();
    db.exec(`
      CREATE TABLE IF NOT EXISTS parcel_listings (
        id TEXT PRIMARY KEY,
        inscription_id TEXT UNIQUE NOT NULL,
        parcel_id TEXT,
        name TEXT NOT NULL,
        price INTEGER NOT NULL DEFAULT 0,
        seller_address TEXT NOT NULL,
        seller_payment_address TEXT,
        seller_ordinal_public_key TEXT,
        inscription_utxo TEXT,
        inscription_value INTEGER DEFAULT 0,
        inscription_number INTEGER,
        unsigned_psbt TEXT,
        signed_psbt TEXT,
        psbt_status TEXT DEFAULT 'created',
        is_active INTEGER DEFAULT 0,
        listed_at INTEGER,
        sold_at INTEGER,
        sold_txid TEXT,
        conf_inscriber_wallet TEXT,
        conf_genesis_height INTEGER,
        conf_tx1_txid TEXT,
        conf_self_transfer_from TEXT,
        conf_self_transfer_to TEXT,
        conf_self_transfer_height INTEGER,
        conf_tx2_txid TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_parcel_listings_active ON parcel_listings (is_active);
      CREATE INDEX IF NOT EXISTS idx_parcel_listings_seller ON parcel_listings (seller_address);
      CREATE TABLE IF NOT EXISTS parcel_ventas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        inscription_id TEXT,
        parcel_id TEXT,
        name TEXT,
        price INTEGER,
        buyer_address TEXT,
        seller_address TEXT,
        txid TEXT,
        sold_at INTEGER
      );
    `);

    const cols = db.prepare('PRAGMA table_info(parcel_listings)').all() as Array<{ name: string }>;
    const colNames = new Set(cols.map(c => c.name));
    const addCol = (name: string, ddl: string) => {
      if (!colNames.has(name)) {
        db.exec(`ALTER TABLE parcel_listings ADD COLUMN ${name} ${ddl}`);
      }
    };
    addCol('conf_inscriber_wallet', 'TEXT');
    addCol('conf_genesis_height', 'INTEGER');
    addCol('conf_tx1_txid', 'TEXT');
    addCol('conf_self_transfer_from', 'TEXT');
    addCol('conf_self_transfer_to', 'TEXT');
    addCol('conf_self_transfer_height', 'INTEGER');
    addCol('conf_tx2_txid', 'TEXT');

    ParcelListingRepository.tablesEnsured = true;
  }

  create(data: ParcelListingCreate): ParcelListing {
    this.ensureTables();
    const db = getDb();
    const id = uuidv4();
    const now = Date.now();

    db.prepare(`
      INSERT INTO parcel_listings (id, inscription_id, parcel_id, name, price, seller_address, seller_payment_address, seller_ordinal_public_key, inscription_utxo, inscription_value, inscription_number, psbt_status, is_active, listed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'created', 0, ?)
    `).run(
      id,
      data.inscriptionId,
      data.parcelId || data.inscriptionId,
      data.name,
      data.price,
      data.sellerAddress,
      data.sellerPaymentAddress || data.sellerAddress,
      data.sellerOrdinalPublicKey,
      data.inscriptionUtxo || '',
      data.inscriptionValue || 0,
      data.inscriptionNumber || null,
      now
    );

    return this.findById(id)!;
  }

  updateConfirmations(id: string, conf: ParcelConfirmationInfo): void {
    this.ensureTables();
    const db = getDb();
    db.prepare(`
      UPDATE parcel_listings SET conf_inscriber_wallet = ?, conf_genesis_height = ?, conf_tx1_txid = ?, conf_self_transfer_from = ?, conf_self_transfer_to = ?, conf_self_transfer_height = ?, conf_tx2_txid = ?
      WHERE id = ?
    `).run(
      conf.inscriberWallet || null,
      conf.genesisHeight || null,
      conf.tx1Txid || null,
      conf.selfTransferFrom || null,
      conf.selfTransferTo || null,
      conf.selfTransferHeight || null,
      conf.tx2Txid || null,
      id
    );
  }

  findById(id: string): ParcelListing | null {
    this.ensureTables();
    const db = getDb();
    const row = db.prepare('SELECT * FROM parcel_listings WHERE id = ?').get(id) as ParcelListingRow | undefined;
    return row ? rowToListing(row) : null;
  }

  findByInscriptionId(inscriptionId: string): ParcelListing | null {
    this.ensureTables();
    const db = getDb();
    const row = db.prepare('SELECT * FROM parcel_listings WHERE inscription_id = ?').get(inscriptionId) as ParcelListingRow | undefined;
    return row ? rowToListing(row) : null;
  }

  findAllActive(): ParcelListing[] {
    this.ensureTables();
    const db = getDb();
    const rows = db.prepare(`
      SELECT * FROM parcel_listings
      WHERE is_active = 1 AND price > 0
      ORDER BY listed_at DESC
    `).all() as ParcelListingRow[];
    return rows.map(rowToListing);
  }

  findActiveWithPaginationAndSort(page: number, limit: number, sort: string): { items: ParcelListing[]; total: number; floorPrice: number } {
    this.ensureTables();
    const db = getDb();
    const offset = (page - 1) * limit;

    let orderClause = 'ORDER BY listed_at DESC';
    if (sort === 'price_asc') orderClause = 'ORDER BY price ASC';
    else if (sort === 'price_desc') orderClause = 'ORDER BY price DESC';
    else if (sort === 'listed_desc') orderClause = 'ORDER BY listed_at DESC';

    const countResult = db.prepare('SELECT COUNT(*) as total FROM parcel_listings WHERE is_active = 1 AND price > 0').get() as { total: number };
    const floorResult = db.prepare('SELECT COALESCE(MIN(price), 0) as floorPrice FROM parcel_listings WHERE is_active = 1 AND price > 0').get() as { floorPrice: number };
    const rows = db.prepare(`
      SELECT * FROM parcel_listings
      WHERE is_active = 1 AND price > 0
      ${orderClause}
      LIMIT ? OFFSET ?
    `).all(limit, offset) as ParcelListingRow[];

    return {
      items: rows.map(rowToListing),
      total: countResult.total,
      floorPrice: floorResult.floorPrice,
    };
  }

  updatePsbtFields(id: string, fields: { unsignedPsbt?: string; signedPsbt?: string; psbtStatus?: string; price?: number; listedAt?: number; isActive?: boolean }): void {
    this.ensureTables();
    const db = getDb();
    const updates: string[] = [];
    const values: (string | number)[] = [];

    if (fields.unsignedPsbt !== undefined) { updates.push('unsigned_psbt = ?'); values.push(fields.unsignedPsbt); }
    if (fields.signedPsbt !== undefined) { updates.push('signed_psbt = ?'); values.push(fields.signedPsbt); }
    if (fields.psbtStatus !== undefined) { updates.push('psbt_status = ?'); values.push(fields.psbtStatus); }
    if (fields.price !== undefined) { updates.push('price = ?'); values.push(fields.price); }
    if (fields.listedAt !== undefined) { updates.push('listed_at = ?'); values.push(fields.listedAt); }
    if (fields.isActive !== undefined) { updates.push('is_active = ?'); values.push(fields.isActive ? 1 : 0); }

    if (updates.length === 0) return;
    values.push(id);
    db.prepare(`UPDATE parcel_listings SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  }

  setSigned(id: string, signedPsbt: string): void {
    this.ensureTables();
    const db = getDb();
    db.prepare(`
      UPDATE parcel_listings SET signed_psbt = ?, psbt_status = 'signed', is_active = 1, listed_at = ?
      WHERE id = ?
    `).run(signedPsbt, Date.now(), id);
  }

  deactivate(id: string): void {
    this.ensureTables();
    const db = getDb();
    db.prepare('UPDATE parcel_listings SET is_active = 0 WHERE id = ?').run(id);
  }

  delist(id: string): void {
    this.ensureTables();
    const db = getDb();
    db.prepare("UPDATE parcel_listings SET is_active = 0, psbt_status = 'deleted' WHERE id = ?").run(id);
  }

  markAsSold(id: string, buyerAddress: string): void {
    this.ensureTables();
    const db = getDb();
    db.prepare("UPDATE parcel_listings SET is_active = 0, psbt_status = 'sold', sold_at = ? WHERE id = ?").run(Date.now(), id);
  }

  markAsSoldWithTxid(id: string, txid: string): void {
    this.ensureTables();
    const db = getDb();
    db.prepare("UPDATE parcel_listings SET is_active = 0, psbt_status = 'sold', sold_at = ?, sold_txid = ? WHERE id = ?").run(Date.now(), txid, id);
  }

  stats(): { listados: number; piso: number; ventas: number; volumen: number; volumen24h: number } {
    this.ensureTables();
    const db = getDb();
    const listingsStats = db.prepare("SELECT COUNT(*) as c, COALESCE(MIN(price), 0) as floor FROM parcel_listings WHERE is_active = 1 AND price > 0").get() as { c: number; floor: number };
    const ventasTotal = db.prepare("SELECT COUNT(*) as c, COALESCE(SUM(price), 0) as v FROM parcel_ventas").get() as { c: number; v: number };
    const ventas24h = db.prepare("SELECT COALESCE(SUM(price), 0) as v FROM parcel_ventas WHERE sold_at > ?").get(Date.now() - 86400000) as { v: number };
    return {
      listados: listingsStats.c || 0,
      piso: listingsStats.floor || 0,
      ventas: ventasTotal.c || 0,
      volumen: ventasTotal.v || 0,
      volumen24h: ventas24h.v || 0,
    };
  }

  insertVenta(inscriptionId: string, name: string, price: number, buyerAddress: string, sellerAddress: string, txid: string): void {
    this.ensureTables();
    const db = getDb();
    db.prepare(`
      INSERT INTO parcel_ventas (inscription_id, parcel_id, name, price, buyer_address, seller_address, txid, sold_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(inscriptionId, inscriptionId, name, price, buyerAddress, sellerAddress, txid, Date.now());
  }

  getByIdOrInscriptionId(idOrInscriptionId: string): ParcelListing | null {
    const byInscription = this.findByInscriptionId(idOrInscriptionId);
    if (byInscription) return byInscription;
    return this.findById(idOrInscriptionId);
  }

  listAllWithIds(): Array<{ id: string; inscriptionId: string; sellerAddress: string }> {
    this.ensureTables();
    const db = getDb();
    const rows = db.prepare('SELECT id, inscription_id, seller_address FROM parcel_listings').all() as Array<{ id: string; inscription_id: string; seller_address: string }>;
    return rows.map(r => ({ id: r.id, inscriptionId: r.inscription_id, sellerAddress: r.seller_address }));
  }
}

export function getParcelListingOrThrow(idOrInscriptionId: string): ParcelListing {
  const repo = new ParcelListingRepository();
  const listing = repo.getByIdOrInscriptionId(idOrInscriptionId);
  if (!listing) {
    throw new NotFoundError('Listing de parcela no encontrado: ' + idOrInscriptionId);
  }
  return listing;
}
