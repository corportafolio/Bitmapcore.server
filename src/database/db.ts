import Database from 'better-sqlite3';
import { config } from '../config/environment';
import { logger } from '../utils/logger';
import * as fs from 'fs';
import * as path from 'path';

let db: Database.Database | null = null;
let blocksDb: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDb() first.');
  }
  return db;
}

export function getBlocksDb(): Database.Database {
  if (!blocksDb) {
    const dbPath = config.database.blocksPath;
    if (!fs.existsSync(dbPath)) {
      throw new Error(`Blocks database not found at: ${dbPath}`);
    }
    blocksDb = new Database(dbPath);
    blocksDb.pragma('journal_mode = WAL');
    logger.info('Blocks database connected', { path: dbPath });
  }
  return blocksDb;
}

export function initDb(): Database.Database {
  const dbPath = config.database.path;
  const dbDir = path.dirname(dbPath);

  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  db = new Database(dbPath);
  
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  runMigrations(db);

  logger.info('Database initialized', { path: dbPath });
  return db;
}

function runMigrations(database: Database.Database): void {
  logger.info('Running database migrations');

  database.exec(`
    CREATE TABLE IF NOT EXISTS listings (
      id TEXT PRIMARY KEY,
      inscription_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      price INTEGER NOT NULL,
      seller_address TEXT NOT NULL,
      buyer_address TEXT,
      listed_at INTEGER NOT NULL,
      sold_at INTEGER,
      image_url TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      bitmap_number INTEGER,
      inscription_number INTEGER,
      bitmap_hash TEXT,
      owner_address TEXT
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      listing_id TEXT NOT NULL,
      buyer_address TEXT NOT NULL,
      seller_address TEXT NOT NULL,
      price INTEGER NOT NULL,
      psbt TEXT,
      txid TEXT,
      status TEXT NOT NULL,
      idempotency_key TEXT UNIQUE,
      error TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (listing_id) REFERENCES listings(id)
    );

    CREATE TABLE IF NOT EXISTS idempotency_keys (
      key TEXT PRIMARY KEY,
      result TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_listings_is_active ON listings(is_active);
    CREATE INDEX IF NOT EXISTS idx_listings_inscription_id ON listings(inscription_id);
    CREATE INDEX IF NOT EXISTS idx_listings_bitmap_number ON listings(bitmap_number);
    CREATE INDEX IF NOT EXISTS idx_transactions_listing_id ON transactions(listing_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
    CREATE INDEX IF NOT EXISTS idx_transactions_idempotency_key ON transactions(idempotency_key);
    CREATE INDEX IF NOT EXISTS idx_idempotency_expires ON idempotency_keys(expires_at);
  `);

  logger.info('Database migrations completed');
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
    logger.info('Database connection closed');
  }
  if (blocksDb) {
    blocksDb.close();
    blocksDb = null;
    logger.info('Blocks database connection closed');
  }
}
