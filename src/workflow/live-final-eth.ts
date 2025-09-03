/*
 Live final workflow (ETH):
 - Fetch coins from CoinGecko (validation only)
 - Capture TradingView (strict 1Y click), 1920x1080
 - Single-step final crop to desired 1440x850 (top130, bottom100, left40, right440)
 - Save RAW and final v1 to ~/Desktop/CLI App testing

 Standalone: does not import local screenshot/crop helpers.
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
    await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
    await page.waitForTimeout(2000);
    await clickOneYearStrict(page);
    await page.waitForTimeout(1000);
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

  // Fetch coins (validate availability) and select ETH explicitly
  const coins = await fetchAllCoinBatches(DEFAULT_CONFIG);
  const hasETH = coins.some((c: any) => (c?.symbol ?? '').toString().toLowerCase() === 'eth');
  if (!hasETH) throw new Error('ETH not found in fetched list');
  const symbol = 'ETH';

  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const rawPath = join(desktopDir, `${symbol}USDT_${ts}.png`);
  await captureStrict(symbol, rawPath);

  const outPath = await cropFinal1440x850(rawPath);
  const outMeta = await sharp(outPath).metadata();

  console.log('RAW:', rawPath, '-> expected 1920x1080');
  console.log('OUT:', outPath, `${outMeta.width ?? '?'}x${outMeta.height ?? '?'}`);
}

main().catch(err => {
  console.error('live-final-eth failed:', err?.message || err);
  process.exit(1);
});







