/*
 Single-run orchestrator that wires Steps 1–4 using existing modules.
 - Step 1: Fetch top 100 coins (CoinGecko) using download-usdt-pairs.js exports
 - Step 2: Capture TradingView screenshots via BatchProcessor (1920x1080)
 - Step 3: Anonymize charts via Python cropper (runs in the originals folder)
 - Step 4: Run Gemini AI analysis on anonymized images and save results

 Cloud constraints: This workflow uses Playwright/Puppeteer-like browser automation and Python.
 It is not suitable for Cloudflare Workers runtime. Deploy orchestration to a server/runner; expose
 a Cloudflare Pages/Worker frontend that triggers this workflow externally if needed.
*/

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync, writeFileSync, readdirSync, statSync, copyFileSync } from 'fs';
import { spawn } from 'child_process';

// Step 1: CoinGecko fetch utilities (ESM JS module)
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { fetchAllCoinBatches, DEFAULT_CONFIG } from '../../download-usdt-pairs.js';

// Step 2: Screenshot batch processor
import { BatchProcessor } from '../screenshot/batch-processor.js';

// Step 4: AI analysis (Gemini)
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { analyzeTrendImages } from '../trend-analysis-v3.js';

type WorkflowResult = {
  symbols: string[];
  screenshotsDir: string;
  anonymizedCount: number;
  aiSummaryPath: string;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runCommand(command: string, args: string[], options: { cwd?: string } = {}): Promise<{ code: number }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      cwd: options.cwd,
      env: process.env,
    });
    child.on('error', reject);
    child.on('close', code => resolve({ code: code ?? 1 }));
  });
}

function ensureDir(dirPath: string): void {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
}

function toPairSymbolsFromCoins(rawCoins: any[]): string[] {
  // Use the coin symbol as the base (e.g., btc -> BTC). We'll pass base symbol to BatchProcessor which appends USDT.
  const excluded = new Set([
    'usdt', 'usdc', 'usd', 'dai', 'busd', 'tusd', 'usdp', 'usdd',
    'frax', 'lusd', 'susd', 'gusd', 'usds', 'usde', 'usdf', 'usdt0', 'usdtb'
  ]);
  const symbols: string[] = [];
  for (const c of rawCoins) {
    const sym = (c?.symbol ?? '').toString().trim().toLowerCase();
    if (!sym || excluded.has(sym)) continue;
    symbols.push(sym.toUpperCase());
  }
  const envLimit = Number.parseInt(process.env.WF_LIMIT || '0', 10);
  const limit = Number.isFinite(envLimit) && envLimit > 0 ? envLimit : 100;
  return symbols.slice(0, limit);
}

async function step1_fetchTopCoins(): Promise<string[]> {
  // Use DEFAULT_CONFIG which already contains a development fallback API key
  // Env var COINGECKO_API_KEY will be used by download-usdt-pairs.js if provided
  // Single batch mode already set in DEFAULT_CONFIG
  const coins = await fetchAllCoinBatches(DEFAULT_CONFIG);
  const symbols = toPairSymbolsFromCoins(coins);
  if (symbols.length === 0) {
    throw new Error('No symbols derived from CoinGecko response');
  }
  return symbols;
}

function findLatestSessionDir(baseDir: string): string | null {
  if (!existsSync(baseDir)) return null;
  const entries = readdirSync(baseDir, { withFileTypes: true });
  const sessionDirs = entries
    .filter(d => d.isDirectory() && d.name.startsWith('session_'))
    .map(d => ({ name: d.name, mtime: statSync(join(baseDir, d.name)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
  return sessionDirs.length > 0 ? join(baseDir, sessionDirs[0].name) : null;
}

async function step2_captureScreenshots(symbols: string[], sessionRoot: string): Promise<string> {
  const screenshotsDir = join(sessionRoot, 'screenshots');
  ensureDir(screenshotsDir);

  const processor = new BatchProcessor({
    outputDir: screenshotsDir,
    batchSize: 10,
    delayBetweenScreenshots: 8000,
    delayBetweenBatches: 30000,
    maxConcurrentBrowsers: 2,
  });
  const result = await processor.processScreenshots(symbols);
  if (!result.success) {
    console.log('Proceeding despite some screenshot failures');
  }
  const latestSession = findLatestSessionDir(screenshotsDir);
  if (!latestSession) {
    console.warn('No session directory found under screenshots');
    return screenshotsDir;
  }
  return latestSession;
}

async function step3_anonymizePython(originalsDir: string): Promise<number> {
  // Run the Python cropper inside the originals folder so outputs land alongside inputs
  const pyPath = join(__dirname, '..', 'batch-crop-usdt-pairs-v2.py');
  const { code } = await runCommand('python3', [pyPath, '.',], { cwd: originalsDir });
  if (code !== 0) {
    console.warn('Anonymization step exited with non-zero code; check logs');
  }
  // Count anonymized files by suffix "_cropped.png"
  try {
    const files = readdirSync(originalsDir);
    return files.filter(f => f.toLowerCase().endsWith('_cropped.png')).length;
  } catch {
    return 0;
  }
}

async function step4_aiAnalyze(anonymizedDir: string, outputDir: string): Promise<string> {
  // Development fallback for UAT (env first)
  const geminiKey = process.env.GEMINI_API_KEY || 'AIzaSyC5qPVs-DEV-PLACEHOLDER-ONLY';
  const results = await analyzeTrendImages(anonymizedDir, geminiKey, { provider: 'gemini', maxConcurrency: 2 });
  const outPath = join(outputDir, 'workflow-trend-results.json');
  writeFileSync(outPath, JSON.stringify(results, null, 2));
  return outPath;
}

async function main(): Promise<void> {
  console.log('🚀 Starting end-to-end workflow');

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const sessionRoot = join(process.cwd(), 'workflow_runs', `run_${timestamp}`);
  ensureDir(sessionRoot);

  // Human-readable export directory on Desktop
  const humanDir = join(process.env.HOME || process.cwd(), 'Desktop', 'CLI App testing');
  ensureDir(humanDir);

  // Step 1
  console.log('\n[Step 1] Fetching top coins from CoinGecko...');
  const symbols = await step1_fetchTopCoins();
  console.log(`[Step 1] Derived ${symbols.length} symbols`);
  // Save Step 1 summary
  const step1Txt = [
    'Step 1: CoinGecko Top Symbols',
    `Count: ${symbols.length}`,
    '',
    ...symbols.slice(0, 50)
  ].join('\n');
  writeFileSync(join(humanDir, `step1_symbols_${timestamp}.txt`), step1Txt, 'utf8');

  // Step 2
  console.log('\n[Step 2] Capturing TradingView screenshots (1920x1080)...');
  const latestSessionDir = await step2_captureScreenshots(symbols, sessionRoot);
  // Originals live at <session>/originals
  const originalsPath = join(latestSessionDir, 'originals');
  // Save Step 2 summary
  try {
    const shots = readdirSync(originalsPath).filter(f => f.toLowerCase().endsWith('.png'));
    const step2Txt = [
      'Step 2: TradingView Screenshots (1920x1080)',
      `Saved: ${shots.length}`,
      '',
      ...shots.slice(0, 50)
    ].join('\n');
    writeFileSync(join(humanDir, `step2_screenshots_${timestamp}.txt`), step2Txt, 'utf8');
    // Copy first screenshot for quick viewing
    if (shots.length > 0) {
      copyFileSync(join(originalsPath, shots[0]), join(humanDir, `step2_sample_${shots[0]}`));
    }
  } catch {}

  console.log('\n[Step 3] Anonymizing charts with Python cropper...');
  const anonCount = await step3_anonymizePython(originalsPath);
  console.log(`[Step 3] Anonymization invoked (cropped files saved alongside originals)`);
  // Save Step 3 summary
  try {
    const cropped = readdirSync(originalsPath).filter(f => f.toLowerCase().includes('_cropped'));
    const step3Txt = [
      'Step 3: Anonymized Charts (cropped)',
      `Cropped: ${cropped.length}`,
      '',
      ...cropped.slice(0, 50)
    ].join('\n');
    writeFileSync(join(humanDir, `step3_anonymized_${timestamp}.txt`), step3Txt, 'utf8');
    if (cropped.length > 0) {
      copyFileSync(join(originalsPath, cropped[0]), join(humanDir, `step3_sample_${cropped[0]}`));
    }
  } catch {}

  console.log('\n[Step 4] Running AI analysis (Gemini) on anonymized charts...');
  const aiSummaryPath = await step4_aiAnalyze(originalsPath, sessionRoot);
  console.log(`[Step 4] AI analysis completed: ${aiSummaryPath}`);
  // Save Step 4 human-readable summary
  try {
    const data = JSON.parse((await import('fs/promises')).then ? await (await import('fs/promises')).readFile(aiSummaryPath, 'utf8') : '');
  } catch {}
  try {
    const fsP = await import('fs/promises');
    const raw = await fsP.readFile(aiSummaryPath, 'utf8');
    const json = JSON.parse(raw);
    const lines: string[] = [];
    lines.push('Step 4: AI Analysis Summary');
    lines.push('');
    if (json && json.tableData && Array.isArray(json.tableData)) {
      const top = json.tableData.slice(0, 15);
      top.forEach((row: any) => {
        lines.push(`${row.pair} | ${row.trend} ${typeof row.trend_c==='number'?row.trend_c.toFixed(3):row.trend_c} | Rank ${row.rank}`);
      });
    } else {
      lines.push('No tableData found (possibly zero pairs analyzed).');
    }
    writeFileSync(join(humanDir, `step4_ai_summary_${timestamp}.txt`), lines.join('\n'), 'utf8');
  } catch {}

  const summary: WorkflowResult = {
    symbols,
    screenshotsDir: originalsPath,
    anonymizedCount: anonCount,
    aiSummaryPath,
  };
  const summaryPath = join(sessionRoot, 'workflow-summary.json');
  writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  console.log(`\n✅ Workflow complete. Summary: ${summaryPath}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(err => {
    console.error('💥 Workflow failed:', err?.message || err);
    process.exit(1);
  });
}


