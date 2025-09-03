/*
 Capture+crop final v1 images for 5 random USDT pairs (excluding BTC/ETH).
 Saves RAW 1920x1080 and final 1440x850 to ~/Desktop/CLI App testing.
 Does not analyze; run analyze:pseudonyms after this to generate rankings.
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

async function dismissOverlays(page: import('playwright').Page): Promise<void> {
  const overlayTexts = [
    'I understand', 'I Understand', 'Accept all', 'Accept All', 'I agree', 'I Agree',
    'No thanks', 'No Thanks', 'Got it', 'Got It', 'Maybe later', 'Maybe Later', 'Allow all'
  ];
  for (const text of overlayTexts) {
    try {
      const loc = page.getByText(text, { exact: true }).first();
      if (await loc.count().catch(() => 0)) {
        await loc.click({ timeout: 1000 }).catch(() => {});
        await page.waitForTimeout(300);
      }
    } catch {}
  }
}

async function clickOneYearStrict(page: import('playwright').Page): Promise<void> {
  const candidateLocators = async () => [
    page.getByRole('button', { name: '1Y' }).first(),
    page.locator('button[aria-label="1Y"]').first(),
    page.locator('button[title="1Y"]').first(),
    page.locator('div[aria-label="1Y"]').first(),
    page.locator('[data-name="timeframes-toolbar"] button:has-text("1Y")').first(),
    page.locator('[data-name="timeframes-toolbar"] :text("1Y")').first(),
    page.locator('div[role="tab"]:has-text("1Y")').first(),
    page.locator(':text("1Y")').first()
  ];

  for (let cycle = 0; cycle < 2; cycle++) {
    await dismissOverlays(page).catch(() => {});
    for (let attempt = 0; attempt < 3; attempt++) {
      const locs = await candidateLocators();
      for (const loc of locs) {
        try {
          if (await loc.count().catch(() => 0)) {
            await loc.scrollIntoViewIfNeeded().catch(() => {});
            await loc.click({ timeout: 3000 }).catch(() => {});
            await page.waitForTimeout(900);
            await loc.click({ timeout: 1500 }).catch(() => {});
            await page.waitForTimeout(600);
            return;
          }
        } catch {}
      }
      await page.waitForTimeout(800);
    }
    await page.reload({ waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(1500);
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

function getDesktopDir(): string {
  const home = process.env.HOME || process.cwd();
  return join(home, 'Desktop', 'CLI App testing');
}

function chooseRandomFive(allCoins: any[]): string[] {
  const blacklist = new Set(['btc', 'eth']);
  const options = allCoins
    .map(c => (c?.symbol ?? '').toString().toLowerCase())
    .filter(sym => sym && !blacklist.has(sym));
  const unique = Array.from(new Set(options));
  const picks: string[] = [];
  while (picks.length < 5 && unique.length > 0) {
    const idx = Math.floor(Math.random() * unique.length);
    const [sym] = unique.splice(idx, 1);
    picks.push(sym.toUpperCase());
  }
  if (picks.length < 5) throw new Error('Insufficient unique symbols to pick 5');
  return picks;
}

async function main(): Promise<void> {
  const desktopDir = getDesktopDir();
  ensureDir(desktopDir);

  const coins = await fetchAllCoinBatches(DEFAULT_CONFIG);
  const symbols = chooseRandomFive(coins);

  for (const symbol of symbols) {
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const rawPath = join(desktopDir, `${symbol}USDT_${ts}.png`);
    await captureStrict(symbol, rawPath);
    const outPath = await cropFinal1440x850(rawPath);
    const outMeta = await sharp(outPath).metadata();
    console.log('Symbol:', symbol);
    console.log('RAW:', rawPath, '-> expected 1920x1080');
    console.log('OUT:', outPath, `${outMeta.width ?? '?'}x${outMeta.height ?? '?'}`);
  }
}

main().catch(err => {
  console.error('live-final-five failed:', err?.message || err);
  process.exit(1);
});


