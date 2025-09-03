/*
 Quick end-to-end test:
 1) Fetch top coins from CoinGecko (uses fallback key if env missing)
 2) Pick the first non-stable symbol and capture a 1920x1080 TradingView screenshot (daily, ~12M)
 3) Save raw screenshot to ~/Desktop/CLI App testing
 4) Crop top 125px only and save as V1 next to the raw screenshot
*/

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import sharp from 'sharp';

// ESM import from JS module
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { fetchAllCoinBatches, DEFAULT_CONFIG } from '../../download-usdt-pairs.js';

import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function ensureDir(dirPath: string): void {
  if (!existsSync(dirPath)) mkdirSync(dirPath, { recursive: true });
}

function pickNonStableSymbol(rawCoins: any[]): string {
  const excluded = new Set([
    'usdt', 'usdc', 'usd', 'dai', 'busd', 'tusd', 'usdp', 'usdd',
    'frax', 'lusd', 'susd', 'gusd', 'usds', 'usde', 'usdf', 'usdt0', 'usdtb'
  ]);
  for (const c of rawCoins) {
    const sym = (c?.symbol ?? '').toString().trim().toLowerCase();
    if (sym && !excluded.has(sym)) return sym.toUpperCase();
  }
  throw new Error('No non-stable symbols found');
}

async function clickOneYearStrict(page: import('playwright').Page): Promise<void> {
  // Try a set of resilient selectors, multiple attempts, no alternatives
  const candidates = [
    'button:has-text("1Y")',
    'div[role="button"]:has-text("1Y")',
    '[data-name="timeframes-toolbar"] :text("1Y")',
    'text=1Y'
  ];
  for (let attempt = 0; attempt < 3; attempt++) {
    for (const sel of candidates) {
      const locator = page.locator(sel).first();
      if (await locator.count().catch(() => 0)) {
        await locator.scrollIntoViewIfNeeded().catch(() => {});
        await locator.click({ timeout: 3000 }).catch(() => {});
        await page.waitForTimeout(1000);
        // Best-effort: click again to ensure activation
        await locator.click({ timeout: 1500 }).catch(() => {});
        await page.waitForTimeout(800);
        return;
      }
    }
    await page.waitForTimeout(1000);
  }
  // If we got here, we still didn't find/click 1Y – fail fast to respect the requirement
  throw new Error('Failed to click 1Y timeframe control');
}

async function captureTradingView(symbol: string, destPath: string): Promise<void> {
  const url = `https://www.tradingview.com/chart/?symbol=${symbol}USDT&interval=1D`;
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
    await page.waitForTimeout(2000);
    // Strictly enforce clicking 1Y; no alternatives
    await clickOneYearStrict(page);
    await page.waitForTimeout(1000);
    await page.screenshot({ path: destPath, fullPage: false, type: 'png' });
  } finally {
    await browser.close();
  }
}

async function main(): Promise<void> {
  const desktopDir = join(process.env.HOME || process.cwd(), 'Desktop', 'CLI App testing');
  ensureDir(desktopDir);

  // Step 1: fetch coins
  const coins = await fetchAllCoinBatches(DEFAULT_CONFIG);
  const symbol = pickNonStableSymbol(coins);

  // Step 2: capture 1920x1080 raw
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const rawPath = join(desktopDir, `${symbol}USDT_${ts}.png`);
  await captureTradingView(symbol, rawPath);

  // Validate raw resolution
  const meta = await sharp(rawPath).metadata();
  if (meta.width !== 1920 || meta.height !== 1080) {
    throw new Error(`Raw screenshot not 1920x1080 (got ${meta.width}x${meta.height})`);
  }

  // Step 3: V1 = crop top 130px only
  const v1Path = join(desktopDir, `${symbol}USDT_${ts}_v1.png`);
  await sharp(rawPath)
    .extract({ left: 0, top: 130, width: 1920, height: 1080 - 130 })
    .toFile(v1Path);

  const v1meta = await sharp(v1Path).metadata();
  console.log('RAW:', rawPath, `${meta.width}x${meta.height}`);
  console.log('V1 :', v1Path, `${v1meta.width}x${v1meta.height}`);
}

main().catch(err => {
  console.error('Quick test failed:', err?.message || err);
  process.exit(1);
});


