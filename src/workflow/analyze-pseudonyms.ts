/*
 Pipeline:
 1) Discover final cropped images (*USDT_*_v1.png) in ~/Desktop/CLI App testing
 2) Create anonymized copies with pseudonym filenames into ~/Desktop/CLI App testing/anonymized
 3) Maintain mappings.json linking pseudonym -> original
 4) Send anonymized images to Gemini and collect JSON analyses
 5) Produce a ranked CSV/JSON table on Desktop for strategy work
*/

import { join, basename } from 'path';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, copyFileSync } from 'fs';

function getDesktopDir(): string {
  const home = process.env.HOME || process.cwd();
  return join(home, 'Desktop', 'CLI App testing');
}

function ensureDir(p: string): void {
  if (!existsSync(p)) mkdirSync(p, { recursive: true });
}

function listFinals(dir: string): string[] {
  return readdirSync(dir)
    .filter(f => /USDT_.*_v1\.png$/i.test(f))
    .map(f => join(dir, f));
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
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as Mapping[];
  } catch {
    return [];
  }
}

function saveMappings(file: string, mappings: Mapping[]): void {
  writeFileSync(file, JSON.stringify(mappings, null, 2), 'utf8');
}

const REQUEST_TIMEOUT_MS = Number(process.env.ANALYZE_TIMEOUT_MS || '60000');
const MAX_RETRIES_PER_ITEM = Number(process.env.ANALYZE_MAX_RETRIES || '2');
const RETRY_BACKOFF_MS = Number(process.env.ANALYZE_RETRY_BACKOFF_MS || '5000');
const MAX_ANALYZE = Number(process.env.MAX_ANALYZE || '0');
const FLUSH_EVERY = Number(process.env.ANALYZE_FLUSH_EVERY || '5');

// --- Gemini client (with timeout and rate-limit handling) ---
async function analyzeWithGemini(base64png: string): Promise<any> {
  const apiKey = process.env.GEMINI_API_KEY || 'AIzaSyC5qPVs-DEV-PLACEHOLDER-ONLY';
  const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

  const prompt = `Analyze the attached chart screenshot for trends without knowing the asset or time details. Use technical patterns to determine confidences with 3-6 decimals.
Respond ONLY with valid JSON in this exact shape:
{
  "up": {"confidence": <0..1>, "countertrend": "Yes|No|Low", "counter_conf": <0..1>},
  "down": {"confidence": <0..1>, "countertrend": "Yes|No|Low", "counter_conf": <0..1>},
  "sideways": {"confidence": <0..1>, "countertrend": "Yes|No|Low", "counter_conf": <0..1>}
}`;

  const payload = {
    contents: [{
      parts: [
        { text: prompt },
        { inline_data: { mime_type: 'image/png', data: base64png } }
      ]
    }],
    generationConfig: { temperature: 0.1, topP: 0.8, topK: 10, maxOutputTokens: 1000, response_mime_type: 'application/json' }
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-goog-api-key': apiKey },
    body: JSON.stringify(payload),
    signal: controller.signal
  }).catch((e: any) => { throw new Error(`Gemini request failed: ${e?.message || e}`); });
  clearTimeout(timer);
  if (!res.ok) {
    if (res.status === 429) throw new Error('RATE_LIMIT');
    throw new Error(`Gemini API error ${res.status}`);
  }
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

async function main(): Promise<void> {
  const baseDir = getDesktopDir();
  const anonDir = join(baseDir, 'anonymized');
  ensureDir(anonDir);
  const mapFile = join(baseDir, 'mappings.json');
  const mappings = loadMappings(mapFile);
  const existingResultsPath = join(baseDir, 'ai-analysis-results.json');
  const existingResults: { pseudonym: string; symbol: string; result: any }[] = existsSync(existingResultsPath)
    ? JSON.parse(readFileSync(existingResultsPath, 'utf8'))
    : [];
  const donePseudos = new Set(existingResults.map(r => r.pseudonym));
  const rawToPseudo = new Map<string, { pseudonym: string; anonPath: string; symbol: string }>();
  for (const m of mappings) {
    rawToPseudo.set(m.rawPath, { pseudonym: m.pseudonym, anonPath: m.finalPath, symbol: m.symbol });
  }

  // Step 1: collect finals
  const finals = listFinals(baseDir);
  if (finals.length === 0) throw new Error('No final *_v1.png found to anonymize');

  // Step 2: anonymize filenames and copy (dedupe by rawPath)
  const work: { pseudonym: string; finalPath: string; anonPath: string; symbol: string }[] = [];
  for (const f of finals) {
    const bn = basename(f); // e.g., ADAUSDT_..._v1.png
    const symbol = bn.split('USDT_')[0].toUpperCase();
    const existing = rawToPseudo.get(f);
    if (existing) {
      // ensure anonymized file exists
      if (!existsSync(existing.anonPath)) copyFileSync(f, existing.anonPath);
      work.push({ pseudonym: existing.pseudonym, finalPath: f, anonPath: existing.anonPath, symbol });
      continue;
    }
    let pseudonym = makePseudonym();
    while (mappings.some(m => m.pseudonym === pseudonym) || work.some(w => w.pseudonym === pseudonym)) {
      pseudonym = makePseudonym();
    }
    const anonPath = join(anonDir, `${pseudonym}.png`);
    copyFileSync(f, anonPath);
    mappings.push({ pseudonym, symbol, rawPath: f, finalPath: anonPath, createdAt: new Date().toISOString() });
    rawToPseudo.set(f, { pseudonym, anonPath, symbol });
    work.push({ pseudonym, finalPath: f, anonPath, symbol });
  }
  saveMappings(mapFile, mappings);

  // Step 3: analyze anonymized images
  const analyses: { pseudonym: string; symbol: string; result: any }[] = [];
  let processed = 0;
  for (let i = 0; i < work.length; i++) {
    if (MAX_ANALYZE > 0 && processed >= MAX_ANALYZE) {
      console.log(`Reached MAX_ANALYZE=${MAX_ANALYZE}, stopping early.`);
      break;
    }
    const w = work[i];
    if (donePseudos.has(w.pseudonym)) continue;
    let attempt = 0;
    let success = false;
    while (attempt <= MAX_RETRIES_PER_ITEM && !success) {
      attempt++;
      try {
        const b64 = await fileToBase64(w.anonPath);
        const result = await analyzeWithGemini(b64);
        analyses.push({ pseudonym: w.pseudonym, symbol: w.symbol, result });
        existingResults.push({ pseudonym: w.pseudonym, symbol: w.symbol, result });
        processed++;
        success = true;
        if (processed % FLUSH_EVERY === 0) {
          writeFileSync(existingResultsPath, JSON.stringify(existingResults, null, 2), 'utf8');
        }
        await new Promise(r => setTimeout(r, 800));
      } catch (e: any) {
        const msg = e?.message || String(e);
        if (msg.includes('RATE_LIMIT')) {
          console.log('Rate limit detected. Stopping further analysis to avoid hangs.');
          // Flush partial results
          writeFileSync(existingResultsPath, JSON.stringify(existingResults, null, 2), 'utf8');
          // Break outer loops
          i = work.length;
          break;
        }
        if (attempt > MAX_RETRIES_PER_ITEM) {
          console.log(`Analysis failed for ${w.pseudonym} after retries: ${msg}`);
        } else {
          console.log(`Retry ${attempt}/${MAX_RETRIES_PER_ITEM} for ${w.pseudonym} after error: ${msg}`);
          await new Promise(r => setTimeout(r, RETRY_BACKOFF_MS));
        }
      }
    }
  }

  // Step 4: build ranking CSV
  const rows: string[] = [];
  rows.push(['pseudonym', 'symbol', 'trend', 'trend_c', 'countertrend', 'counter_conf'].join(','));
  analyses.forEach(a => {
    const r = a.result;
    rows.push([a.pseudonym, a.symbol, 'Up', Number(r?.up?.confidence ?? 0).toFixed(6), r?.up?.countertrend ?? '', Number(r?.up?.counter_conf ?? 0).toFixed(6)].join(','));
    rows.push([a.pseudonym, a.symbol, 'Down', Number(r?.down?.confidence ?? 0).toFixed(6), r?.down?.countertrend ?? '', Number(r?.down?.counter_conf ?? 0).toFixed(6)].join(','));
    rows.push([a.pseudonym, a.symbol, 'Sideways', Number(r?.sideways?.confidence ?? 0).toFixed(6), r?.sideways?.countertrend ?? '', Number(r?.sideways?.counter_conf ?? 0).toFixed(6)].join(','));
  });
  const csvPath = join(baseDir, 'ai-analysis-table.csv');
  writeFileSync(csvPath, rows.join('\n'), 'utf8');

  // Save raw analyses as JSON
  const jsonPath = existingResultsPath;
  writeFileSync(jsonPath, JSON.stringify(existingResults, null, 2), 'utf8');

  // Step 5: coin-level rankings (per-anonymized image)
  const rankingSource = existingResults.length > 0 ? existingResults : analyses;
  const rankingEntries = rankingSource.map(a => {
    const up = Number(a.result?.up?.confidence ?? 0);
    const down = Number(a.result?.down?.confidence ?? 0);
    const sideways = Number(a.result?.sideways?.confidence ?? 0);
    const coinScore = Math.max(up, down, sideways);
    return { pseudonym: a.pseudonym, symbol: a.symbol, up, down, sideways, coin_score: coinScore };
  }).sort((a, b) => b.coin_score - a.coin_score);

  const rankingsCsv: string[] = [];
  rankingsCsv.push(['rank', 'pseudonym', 'symbol', 'up_conf', 'down_conf', 'sideways_conf', 'coin_score'].join(','));
  rankingEntries.forEach((e, idx) => {
    const rank = idx + 1;
    rankingsCsv.push([String(rank), e.pseudonym, e.symbol, e.up.toFixed(6), e.down.toFixed(6), e.sideways.toFixed(6), e.coin_score.toFixed(6)].join(','));
  });
  const rankingsPath = join(baseDir, 'ai-analysis-rankings.csv');
  writeFileSync(rankingsPath, rankingsCsv.join('\n'), 'utf8');

  // Also emit a table including rank column alongside confidences (flat, per-anonymized image)
  const tableRankedCsv: string[] = [];
  tableRankedCsv.push(['rank', 'pseudonym', 'symbol', 'up_conf', 'down_conf', 'sideways_conf', 'coin_score'].join(','));
  rankingEntries.forEach((e, idx) => {
    const rank = idx + 1;
    tableRankedCsv.push([String(rank), e.pseudonym, e.symbol, e.up.toFixed(6), e.down.toFixed(6), e.sideways.toFixed(6), e.coin_score.toFixed(6)].join(','));
  });
  const tableRankedPath = join(baseDir, 'ai-analysis-table-ranked.csv');
  writeFileSync(tableRankedPath, tableRankedCsv.join('\n'), 'utf8');

  console.log('Mappings:', mapFile);
  console.log('CSV:', csvPath);
  console.log('JSON:', jsonPath);
  console.log('Rankings:', rankingsPath);
  console.log('TableRanked:', tableRankedPath);
}

main().catch(err => {
  console.error('analyze-pseudonyms failed:', err?.message || err);
  process.exit(1);
});


