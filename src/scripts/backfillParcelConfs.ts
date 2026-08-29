import { initDb, getDb } from '../database/db';
import { AssetProxyService } from '../services/AssetProxyService';
import { ParcelListingRepository } from '../repositories/ParcelListingRepository';

async function main() {
  initDb();
  const repo = new ParcelListingRepository();
  const asset = new AssetProxyService();

  const rows = repo.listAllWithIds();
  console.log('Listings a procesar:', rows.length);

  const bySeller: Record<string, string[]> = {};
  for (const row of rows) {
    (bySeller[row.sellerAddress] = bySeller[row.sellerAddress] || []).push(row.inscriptionId);
  }

  for (const seller of Object.keys(bySeller)) {
    const ids = bySeller[seller];
    console.log('Vendedor', seller.slice(0, 12) + '...', '-', ids.length, 'parcelas');
    try {
      const map = await asset.getBulkParcelConfirmations(ids, seller);
      for (const row of rows.filter(r => r.sellerAddress === seller)) {
        const conf = map[row.inscriptionId];
        const c = conf && conf.confirmations;
        if (c && c[0] && c[1]) {
          repo.updateConfirmations(row.id, {
            inscriberWallet: c[0].inscriberWallet || undefined,
            genesisHeight: c[0].genesisHeight || undefined,
            tx1Txid: c[0].txid || undefined,
            selfTransferFrom: c[1].selfTransferFrom || undefined,
            selfTransferTo: c[1].selfTransferTo || undefined,
            selfTransferHeight: c[1].selfTransferHeight || undefined,
            tx2Txid: c[1].txid || undefined,
          });
          console.log('  OK  ', row.inscriptionId.slice(0, 16));
        } else {
          console.log('  SIN CONFIRMACIONES', row.inscriptionId.slice(0, 16));
        }
      }
    } catch (e: any) {
      console.log('  ERROR vendedor', seller.slice(0, 12), e.message);
    }
  }

  const db = getDb();
  const filled = db.prepare("SELECT COUNT(*) as c FROM parcel_listings WHERE conf_tx1_txid IS NOT NULL AND conf_tx2_txid IS NOT NULL").get() as { c: number };
  console.log('Listings con confirmaciones guardadas:', filled.c, 'de', rows.length);
  console.log('Backfill terminado');
}

main();
