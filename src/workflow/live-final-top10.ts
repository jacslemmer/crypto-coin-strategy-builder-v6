/*
 Live final workflow (Top 10 non-stable, excluding BTC/ETH):
 - Fetch top coins from CoinGecko
 - Select 10 symbols excluding stables + BTC + ETH
 - For each symbol sequentially (rate-limit friendly):
   * Capture TradingView (strict 1Y click), 1920x1080
   * Single-step final crop to 1440x850 (top130, bottom100, left40, right440)
   * Save RAW and final v1 to ~/Desktop/CLI App testing

 Standalone: no shared local imports.
*/

import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import sharp from 'sharp';
import { chromium } from 'playwright';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { fetchAllCoinBatches, DEFAULT_CONFIG } from '../../download-usdt-pairs.js';

function ensureDir(dirPath: string): void {
  if (!existsSync(dirPath)) mkdirSync(dirPath, { recursive: true });
}

function pickSymbols(rawCoins: any[], count: number): string[] {
  const excluded = new Set([
    'btc', 'eth',
    'usdt', 'usdc', 'usd', 'dai', 'busd', 'tusd', 'usdp', 'usdd',
    'frax', 'lusd', 'susd', 'gusd', 'usds', 'usde', 'usdf', 'usdt0', 'usdtb'
  ]);
  const unique: string[] = [];
  for (const c of rawCoins) {
    const sym = (c?.symbol ?? '').toString().trim().toLowerCase();
    if (!sym || excluded.has(sym)) continue;
    const upper = sym.toUpperCase();
    if (!unique.includes(upper)) unique.push(upper);
    if (unique.length >= count) break;
  }
  if (unique.length < count) throw new Error(`Only found ${unique.length} eligible symbols`);
  return unique;
}

async function clickOneYearStrict(page: import('playwright').Page): Promise<void> {
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
        await locator.click({ timeout: 1500 }).catch(() => {});
        await page.waitForTimeout(800);
        return;
      }
    }
    await page.waitForTimeout(1000);
  }
  throw new Error('Failed to click 1Y timeframe control');
}

async function captureStrict(symbol: string, destPath: string): Promise<void> {
  const url = `https://www.tradingview.com/chart/?symbol=${symbol}USDT&interval=1D`;
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(2500);
    await clickOneYearStrict(page);
    await page.waitForTimeout(1200);
    await page.screenshot({ path: destPath, fullPage: false, type: 'png' });
  } finally {
    await browser.close();
  }
}

async function cropFinal1440x850(srcPath: string): Promise<string> {
  const meta = await sharp(srcPath).metadata();
  if (meta.width !== 1920 || meta.height !== 1080) throw new Error(`Expected 1920x1080, got ${meta.width}x${meta.height}`);
  const top = 130, bottom = 100, left = 40, right = 440;
  const outW = 1920 - left - right;
  const outH = 1080 - top - bottom;
  const outPath = srcPath.replace(/\.png$/i, '_v1.png');
  await sharp(srcPath).extract({ left, top, width: outW, height: outH }).toFile(outPath);
  return outPath;
}

async function main(): Promise<void> {
  const desktopDir = join(process.env.HOME || process.cwd(), 'Desktop', 'CLI App testing');
  ensureDir(desktopDir);

  const coins = await fetchAllCoinBatches(DEFAULT_CONFIG);
  const symbols = pickSymbols(coins, 10);
  console.log('Symbols:', symbols.join(', '));

  for (let i = 0; i < symbols.length; i++) {
    const symbol = symbols[i];
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const rawPath = join(desktopDir, `${symbol}USDT_${ts}.png`);
    try {
      console.log(`[${i + 1}/${symbols.length}] Capturing ${symbol}USDT...`);
      await captureStrict(symbol, rawPath);
      await cropFinal1440x850(rawPath);
      console.log(`  ✓ Saved final v1 for ${symbol}`);
    } catch (e: any) {
      console.log(`  ✗ ${symbol} failed: ${e?.message || e}`);
    }
    // Delay between symbols to respect site limits
    if (i < symbols.length - 1) await new Promise(r => setTimeout(r, 12000));
  }
}

main().catch(err => {
  console.error('live-final-top10 failed:', err?.message || err);
  process.exit(1);
});







