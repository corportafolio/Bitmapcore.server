import { getDb } from '../database/db';

interface IdempotencyRow {
  key: string;
  result: string;
  created_at: number;
  expires_at: number;
}

export class IdempotencyRepository {
  private expirationMs = 24 * 60 * 60 * 1000;

  save(key: string, result: object): void {
    const db = getDb();
    const now = Date.now();
    const expiresAt = now + this.expirationMs;

    db.prepare(`
      INSERT OR REPLACE INTO idempotency_keys (key, result, created_at, expires_at)
      VALUES (?, ?, ?, ?)
    `).run(key, JSON.stringify(result), now, expiresAt);
  }

  get(key: string): object | null {
    const db = getDb();
    const row = db.prepare('SELECT * FROM idempotency_keys WHERE key = ?').get(key) as IdempotencyRow | undefined;

    if (!row) {
      return null;
    }

    if (Date.now() > row.expires_at) {
      db.prepare('DELETE FROM idempotency_keys WHERE key = ?').run(key);
      return null;
    }

    return JSON.parse(row.result);
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): void {
    const db = getDb();
    db.prepare('DELETE FROM idempotency_keys WHERE key = ?').run(key);
  }

  cleanup(): void {
    const db = getDb();
    const now = Date.now();
    db.prepare('DELETE FROM idempotency_keys WHERE expires_at < ?').run(now);
  }
}
