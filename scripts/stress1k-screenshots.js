// scripts/stress1k-screenshots.js
// Use BatchProcessor to capture screenshots for many symbols into Desktop/1000 Pair Test/screenshots

import { homedir } from 'os';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { BatchProcessor } from '../src/screenshot/batch-processor.js';

function loadSymbolsFromJson(jsonPath) {
  if (!existsSync(jsonPath)) throw new Error(`Missing JSON: ${jsonPath}`);
  const coins = JSON.parse(readFileSync(jsonPath, 'utf8'));
  const excluded = new Set(['usdt','usdc','usd','dai','busd','tusd','usdp','usdd','frax','lusd','susd','gusd','usds','usde','usdf','usdt0','usdtb']);
  const blacklist = new Set(['eth','xrp']);
  const symbols = coins
    .map(c => (c?.symbol ?? '').toString().toUpperCase())
    .filter(s => s && !excluded.has(s.toLowerCase()) && !blacklist.has(s.toLowerCase()));
  return Array.from(new Set(symbols));
}

async function main() {
  const base = join(homedir(), 'Desktop', '1000 Pair Test');
  const dataJson = process.argv[2] || join(base, 'data', 'crypto-pairs', 'latest.json');
  const outDir = join(base, 'screenshots');
  const symbols = loadSymbolsFromJson(dataJson);
  console.log(`Loaded ${symbols.length} symbols for screenshotting`);

  const processor = new BatchProcessor({
    outputDir: outDir,
    batchSize: 8,
    delayBetweenScreenshots: 4000,
    delayBetweenBatches: 10000,
    maxConcurrentBrowsers: 2,
  });

  const result = await processor.processScreenshots(symbols);
  console.log('Summary:', result.summary);
}

main().catch(err => {
  console.error('Stress 1k screenshots failed:', err?.message || err);
  process.exit(1);
});


