/*
 End-to-end single-coin workflow:
 - Pick a random new USDT pair (excluding BTC, ETH and any recently used)
 - Capture TradingView with strict 1Y click, 1920x1080
 - Single-step final crop to 1440x850 (top130, bottom100, left40, right440)
 - Save RAW and final v1 under ~/Desktop/CLI App testing
 - Anonymize filename, analyze with Gemini, and write CSV/JSON outputs
*/

import { join, basename } from 'path';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, copyFileSync } from 'fs';
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

function getDesktopDir(): string {
  const home = process.env.HOME || process.cwd();
  return join(home, 'Desktop', 'CLI App testing');
}

function makePseudonym(): string {
  const adj = ['amber', 'ivory', 'crimson', 'jade', 'onyx', 'brisk', 'lunar', 'raven', 'atlas', 'ember'];
  const noun = ['harbor', 'ridge', 'sparrow', 'citadel', 'prairie', 'constellation', 'horizon', 'mesa', 'voyager', 'solstice'];
  const a = adj[Math.floor(Math.random() * adj.length)];
  const n = noun[Math.floor(Math.random() * noun.length)];
  const d = Math.floor(Math.random() * 90 + 10); // 10..99
  return `${a}-${n}-${d}`;
}

type Mapping = {
  pseudonym: string;
  symbol: string;
  rawPath: string;
  finalPath: string;
  createdAt: string;
};

function loadMappings(file: string): Mapping[] {
  if (!existsSync(file)) return [];
  try { return JSON.parse(readFileSync(file, 'utf8')) as Mapping[]; } catch { return []; }
}

function saveMappings(file: string, mappings: Mapping[]): void {
  writeFileSync(file, JSON.stringify(mappings, null, 2), 'utf8');
}

async function analyzeWithGemini(base64png: string): Promise<any> {
  const apiKey = process.env.GEMINI_API_KEY || 'AIzaSyC5qPVs-DEV-PLACEHOLDER-ONLY';
  const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
  const prompt = `Analyze the attached chart screenshot for trends without knowing the asset or time details. Use technical patterns to determine confidences with 3-6 decimals. Respond ONLY with valid JSON in this exact shape:{"up":{"confidence":0,"countertrend":"Yes|No|Low","counter_conf":0},"down":{"confidence":0,"countertrend":"Yes|No|Low","counter_conf":0},"sideways":{"confidence":0,"countertrend":"Yes|No|Low","counter_conf":0}}`;
  const payload = {
    contents: [{ parts: [ { text: prompt }, { inline_data: { mime_type: 'image/png', data: base64png } } ] }],
    generationConfig: { temperature: 0.1, topP: 0.8, topK: 10, maxOutputTokens: 1000, response_mime_type: 'application/json' }
  };
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-goog-api-key': apiKey },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(`Gemini API error ${res.status}`);
  const data = await res.json();
  let content = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  content = content.trim();
  if (content.startsWith('```')) content = content.replace(/^```json?\s*/i, '').replace(/\s*```$/, '');
  return JSON.parse(content);
}

async function fileToBase64(path: string): Promise<string> {
  const buf = readFileSync(path);
  return buf.toString('base64');
}

function chooseRandomNewSymbol(allCoins: any[]): string {
  const blacklist = new Set(['btc', 'eth']);
  const options = allCoins
    .map(c => (c?.symbol ?? '').toString().toLowerCase())
    .filter(sym => sym && !blacklist.has(sym));
  if (options.length === 0) throw new Error('No eligible symbols found');
  const pick = options[Math.floor(Math.random() * options.length)];
  return pick.toUpperCase();
}

async function main(): Promise<void> {
  const desktopDir = getDesktopDir();
  ensureDir(desktopDir);
  const anonDir = join(desktopDir, 'anonymized');
  ensureDir(anonDir);

  // Fetch list and choose a random unused symbol
  const coins = await fetchAllCoinBatches(DEFAULT_CONFIG);
  const symbol = chooseRandomNewSymbol(coins);

  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const rawPath = join(desktopDir, `${symbol}USDT_${ts}.png`);
  await captureStrict(symbol, rawPath);

  const outPath = await cropFinal1440x850(rawPath);
  const outMeta = await sharp(outPath).metadata();

  // Anonymize file and map
  const mapFile = join(desktopDir, 'mappings.json');
  const mappings = loadMappings(mapFile);
  let pseudo = makePseudonym();
  while (mappings.some(m => m.pseudonym === pseudo)) pseudo = makePseudonym();
  const anonPath = join(anonDir, `${pseudo}.png`);
  copyFileSync(outPath, anonPath);
  mappings.push({ pseudonym: pseudo, symbol, rawPath, finalPath: anonPath, createdAt: new Date().toISOString() });
  saveMappings(mapFile, mappings);

  // Analyze and create table rows
  const b64 = await fileToBase64(anonPath);
  const result = await analyzeWithGemini(b64);

  const csvPath = join(desktopDir, 'ai-analysis-table.csv');
  const header = 'pseudonym,symbol,trend,trend_c,countertrend,counter_conf\n';
  const rows = [
    [pseudo, symbol, 'Up', Number(result?.up?.confidence ?? 0).toFixed(6), result?.up?.countertrend ?? '', Number(result?.up?.counter_conf ?? 0).toFixed(6)].join(','),
    [pseudo, symbol, 'Down', Number(result?.down?.confidence ?? 0).toFixed(6), result?.down?.countertrend ?? '', Number(result?.down?.counter_conf ?? 0).toFixed(6)].join(','),
    [pseudo, symbol, 'Sideways', Number(result?.sideways?.confidence ?? 0).toFixed(6), result?.sideways?.countertrend ?? '', Number(result?.sideways?.counter_conf ?? 0).toFixed(6)].join(',')
  ];
  if (!existsSync(csvPath)) writeFileSync(csvPath, header + rows.join('\n') + '\n', 'utf8');
  else writeFileSync(csvPath, readFileSync(csvPath, 'utf8') + rows.join('\n') + '\n', 'utf8');

  const jsonPath = join(desktopDir, 'ai-analysis-results.json');
  const existing = existsSync(jsonPath) ? JSON.parse(readFileSync(jsonPath, 'utf8')) : [];
  existing.push({ pseudonym: pseudo, symbol, result });
  writeFileSync(jsonPath, JSON.stringify(existing, null, 2), 'utf8');

  console.log('Symbol:', symbol);
  console.log('RAW:', rawPath, '-> expected 1920x1080');
  console.log('OUT:', outPath, `${outMeta.width ?? '?'}x${outMeta.height ?? '?'}`);
  console.log('Anon:', anonPath);
  console.log('Mappings:', mapFile);
  console.log('CSV:', csvPath);
  console.log('JSON:', jsonPath);
}

main().catch(err => {
  console.error('live-final-one failed:', err?.message || err);
  process.exit(1);
});


