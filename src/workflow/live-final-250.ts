/*
 End-to-end stress test for 250 pairs:
 - Fetch ~300 coins (3 pages) and pick first 250 non-stable symbols
 - Capture TradingView with strict 1Y click, 1920x1080
 - Single-step final crop to 1440x850 into ~/Desktop/CLI App testing
 - Run analyzer script to generate rankings
 - Copy final ranked table to ~/Desktop/CLI App testing/final table/final-table_<ts>.csv
*/

import { join } from 'path';
import { existsSync, mkdirSync, copyFileSync } from 'fs';
import sharp from 'sharp';
import { chromium } from 'playwright';
import { spawn } from 'child_process';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { fetchAllCoinBatches, DEFAULT_CONFIG } from '../../download-usdt-pairs.js';

function ensureDir(dirPath: string): void {
  if (!existsSync(dirPath)) mkdirSync(dirPath, { recursive: true });
}

async function dismissOverlays(page: import('playwright').Page): Promise<void> {
  const overlayTexts = [
    'I understand','I Understand','Accept all','Accept All','I agree','I Agree',
    'No thanks','No Thanks','Got it','Got It','Maybe later','Maybe Later','Allow all'
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

async function captureStrict(browser: import('playwright').Browser, symbol: string, destPath: string): Promise<void> {
  const url = `https://www.tradingview.com/chart/?symbol=${symbol}USDT&interval=1D`;
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
    await page.waitForTimeout(2000);
    await clickOneYearStrict(page);
    await page.waitForTimeout(1000);
    await page.screenshot({ path: destPath, fullPage: false, type: 'png' });
  } finally {
    await context.close();
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

function getFinalTableDir(): string {
  return join(getDesktopDir(), 'final table');
}

function isStable(symbol: string): boolean {
  const s = symbol.toLowerCase();
  return ['usdt','usdc','usd','dai','busd','tusd','usdp','usdd','frax','lusd','susd','gusd','usds','usde','usdf','usdt0','usdtb'].includes(s);
}

function runCmd(command: string, args: string[], env?: NodeJS.ProcessEnv): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn(command, args, { stdio: 'inherit', env: env || process.env });
    child.on('close', code => resolve(code ?? 1));
  });
}

async function main(): Promise<void> {
  const desktopDir = getDesktopDir();
  const finalTableDir = getFinalTableDir();
  ensureDir(desktopDir);
  ensureDir(finalTableDir);

  // Fetch ~300 coins (3 pages)
  const cfg = { ...DEFAULT_CONFIG, maxPages: 3, perPage: 100 };
  const coins = await fetchAllCoinBatches(cfg);
  const pool = Array.from(new Set(coins.map((c: any) => (c?.symbol ?? '').toString().toUpperCase())))
    .filter(sym => sym && !isStable(sym) && sym !== 'BTC' && sym !== 'ETH');
  const symbols = pool.slice(0, 250);
  if (symbols.length < 250) throw new Error(`Only ${symbols.length} eligible symbols available`);

  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    for (let i = 0; i < symbols.length; i++) {
      const symbol = symbols[i];
      const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const rawPath = join(desktopDir, `${symbol}USDT_${ts}.png`);
      console.log(`[${i + 1}/${symbols.length}] ${symbol} -> ${rawPath}`);
      try {
        await captureStrict(browser, symbol, rawPath);
        await cropFinal1440x850(rawPath);
      } catch (e: any) {
        console.log(`Capture/crop failed for ${symbol}: ${e?.message || e}`);
      }
      // small pacing delay to be courteous
      if (i < symbols.length - 1) await new Promise(r => setTimeout(r, 700));
    }
  } finally {
    await browser.close();
  }

  // Analyze with existing analyzer script (expects GEMINI_API_KEY in env)
  const code = await runCmd('npm', ['run', 'analyze:pseudonyms']);
  if (code !== 0) throw new Error('Analyzer failed');

  // Copy ranked table to final table folder
  const tableRanked = join(desktopDir, 'ai-analysis-table-ranked.csv');
  const outName = `final-table_${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.csv`;
  const finalPath = join(finalTableDir, outName);
  copyFileSync(tableRanked, finalPath);
  console.log(`✅ Final ranked table saved: ${finalPath}`);
}

main().catch(err => {
  console.error('live-final-250 failed:', err?.message || err);
  process.exit(1);
});







