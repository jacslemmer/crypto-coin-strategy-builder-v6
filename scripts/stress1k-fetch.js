// scripts/stress1k-fetch.js
// Fetch top ~1000 coins (10 pages x 100) and write CSV+JSON to Desktop/1000 Pair Test/data/crypto-pairs

import { homedir } from 'os';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { fetchAllCoinBatches, DEFAULT_CONFIG, USDTPair, saveToCSV } from '../download-usdt-pairs.js';

function getTimestamp() {
  const now = new Date();
  return now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

function ensureDir(dirPath) {
  mkdirSync(dirPath, { recursive: true });
}

function coinsToUSDTPairs(coins) {
  return coins.map(c => new USDTPair(c));
}

async function main() {
  console.log('Data provided by CoinGecko API');
  const baseDir = join(homedir(), 'Desktop', '1000 Pair Test', 'data', 'crypto-pairs');
  ensureDir(baseDir);
  const timestamp = getTimestamp();
  const csvPath = join(baseDir, `crypto_pairs_${timestamp}.csv`);
  const jsonPath = join(baseDir, `crypto_pairs_${timestamp}.json`);

  const config = { ...DEFAULT_CONFIG, maxPages: 10, perPage: 100 };
  console.log(`Fetching up to ${config.maxPages * config.perPage} coins...`);
  const coins = await fetchAllCoinBatches(config);

  if (!Array.isArray(coins) || coins.length === 0) {
    throw new Error('No data returned from CoinGecko');
  }

  const pairs = coinsToUSDTPairs(coins);
  saveToCSV(pairs, csvPath);
  writeFileSync(jsonPath, JSON.stringify(coins, null, 2), 'utf8');

  console.log(`CSV written: ${csvPath}`);
  console.log(`JSON written: ${jsonPath}`);
}

main().catch(err => {
  console.error('Stress 1k fetch failed:', err?.message || err);
  process.exit(1);
});


