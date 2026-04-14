import { Router, Response } from 'express';
import { getBlocksDb } from '../database/db';
import { sendSuccess, sendError } from '../utils/responseFormatter';
import { logger } from '../utils/logger';

const router = Router();

interface BlockParams {
  blockNumber: string;
}

router.get('/:blockNumber', async (req: { params: BlockParams }, res: Response) => {
  try {
    const blockNumberStr = req.params.blockNumber;
    
    if (!blockNumberStr) {
      return sendError(res, 'Invalid block number', 400);
    }

    const blockNumber = parseInt(blockNumberStr, 10);
    if (isNaN(blockNumber)) {
      return sendError(res, 'Invalid block number', 400);
    }
    
    const db = getBlocksDb();
    const stmt = db.prepare('SELECT bloque, mempool FROM bloques WHERE bloque = ?');
    const row = stmt.get(blockNumberStr) as { bloque: number; mempool: string } | undefined;

    if (!row) {
      return sendError(res, 'Block not found', 404);
    }

    const mempool = row.mempool;
    const transactions: Array<{index: number; weight: number; btc: number; fee: number; satPerVB: number}> = [];

    const txPattern = /tx (\d+): (\d+) sv \| ([\d.]+) btc \| fee: ([\d.]+) btc \| (\d+) sat\/vB/g;
    let match;

    while ((match = txPattern.exec(mempool)) !== null) {
      transactions.push({
        index: parseInt(match[1]),
        weight: parseInt(match[2]),
        btc: parseFloat(match[3]),
        fee: parseFloat(match[4]),
        satPerVB: parseInt(match[5]),
      });
    }

    const totalTxMatch = mempool.match(/total transaciones: (\d+)/);
    const totalBtcMatch = mempool.match(/total BTC: ([\d.]+)/);
    const totalFeeMatch = mempool.match(/total fee: ([\d.]+)/);
    const totalWeightMatch = mempool.match(/total peso: (\d+)/);

    const result = {
      blockNumber: blockNumber,
      totalTransactions: totalTxMatch ? parseInt(totalTxMatch[1]) : transactions.length,
      totalBtc: totalBtcMatch ? parseFloat(totalBtcMatch[1]) : 0,
      totalFee: totalFeeMatch ? parseFloat(totalFeeMatch[1]) : 0,
      totalWeight: totalWeightMatch ? parseInt(totalWeightMatch[1]) : 0,
      transactions: transactions,
    };

    logger.info('Block transactions retrieved', { blockNumber: blockNumber, txCount: transactions.length });

    sendSuccess(res, result);
  } catch (error) {
    logger.error('Error fetching block transactions', {
      blockNumber: req.params.blockNumber,
      error: (error as Error).message,
    });
    sendError(res, 'Failed to fetch block transactions', 500);
  }
});

export default router;