// scripts/stress1k-anonymize-10.js
// Pick 10 random originals and run Python cropper to produce *_cropped.png in-place; copy to anonymized dir

import { homedir } from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { readdirSync, existsSync, mkdirSync, copyFileSync } from 'fs';
import { join } from 'path';

const execFileAsync = promisify(execFile);

function sample(array, n) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, n);
}

async function main() {
  const base = join(homedir(), 'Desktop', '1000 Pair Test');
  const sessionsDir = join(base, 'screenshots');
  const sessions = readdirSync(sessionsDir).filter(d => d.startsWith('session_')).sort();
  const latest = sessions[sessions.length - 1];
  const originalsDir = join(sessionsDir, latest, 'originals');
  const anonymizedDir = join(sessionsDir, 'anonymized');
  if (!existsSync(anonymizedDir)) mkdirSync(anonymizedDir, { recursive: true });

  const originals = readdirSync(originalsDir).filter(f => f.toLowerCase().endsWith('.png') && !f.toLowerCase().includes('_cropped'));
  const chosen = sample(originals, Math.min(10, originals.length));
  console.log(`Anonymizing ${chosen.length} of ${originals.length} originals`);

  // Run cropper for the whole directory; it will produce *_cropped.png for all files present
  // To limit to 10, temporarily copy the chosen files into a temp dir
  const tempDir = join(originalsDir, '..', 'temp_anon');
  mkdirSync(tempDir, { recursive: true });
  for (const f of chosen) {
    copyFileSync(join(originalsDir, f), join(tempDir, f));
  }
  await execFileAsync('python3', ['src/batch-crop-usdt-pairs-v2.py', tempDir], { cwd: process.cwd() });

  // Copy cropped results back next to originals and to anonymizedDir
  const cropped = readdirSync(tempDir).filter(f => f.toLowerCase().includes('_cropped'));
  for (const f of cropped) {
    const from = join(tempDir, f);
    const toMain = join(originalsDir, f);
    const toAnon = join(anonymizedDir, f);
    copyFileSync(from, toMain);
    copyFileSync(from, toAnon);
  }
  console.log('Done.');
}

main().catch(err => {
  console.error('Anonymize 10 failed:', err?.message || err);
  process.exit(1);
});


