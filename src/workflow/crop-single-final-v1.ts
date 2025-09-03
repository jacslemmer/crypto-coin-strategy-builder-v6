/*
 Single-step final crop:
 - Source: original 1920x1080 TradingView screenshot (latest in ~/Desktop/CLI App testing, or path arg)
 - Crop: top 130 px, bottom 100 px, left 40 px, right 440 px
 - Output: save as *_v1.png in the same folder (final desired image 1440x850)

 This script is standalone and does not depend on other local routines.
*/

import { join, dirname } from 'path';
import { existsSync, readdirSync, statSync } from 'fs';
import sharp from 'sharp';

function getDesktopTestDir(): string {
  const home = process.env.HOME || process.cwd();
  return join(home, 'Desktop', 'CLI App testing');
}

function findLatestRaw(dir: string): string {
  if (!existsSync(dir)) throw new Error(`Directory not found: ${dir}`);
  const candidates = readdirSync(dir)
    .filter(f => /^(?!.*_v\d+\.png$).*USDT_.*\.png$/i.test(f)) // exclude _v*.png
    .map(f => ({ f, m: (() => { try { return statSync(join(dir, f)).mtimeMs; } catch { return 0; } })() }))
    .sort((a, b) => b.m - a.m);
  if (candidates.length === 0) throw new Error('No raw USDT_*.png found');
  return join(dir, candidates[0].f);
}

async function cropFinal(srcPath: string): Promise<string> {
  const meta = await sharp(srcPath).metadata();
  if (meta.width !== 1920 || meta.height !== 1080) {
    throw new Error(`Expected 1920x1080 input, got ${meta.width}x${meta.height}`);
  }
  const top = 130;
  const bottom = 100;
  const left = 40;
  const right = 440;
  const outW = 1920 - left - right; // 1440
  const outH = 1080 - top - bottom; // 850
  const outPath = srcPath.replace(/\.png$/i, '_v1.png');
  await sharp(srcPath)
    .extract({ left, top, width: outW, height: outH })
    .toFile(outPath);
  return outPath;
}

async function main(): Promise<void> {
  const inputArg = process.argv[2] || '';
  const dir = getDesktopTestDir();
  const src = inputArg && existsSync(inputArg) ? inputArg : findLatestRaw(dir);
  const out = await cropFinal(src);
  const o = await sharp(out).metadata();
  console.log('SRC:', src);
  console.log('OUT:', out, `${o.width ?? '?'}x${o.height ?? '?'}`);
}

main().catch(err => {
  console.error('crop-single-final-v1 failed:', err?.message || err);
  process.exit(1);
});







