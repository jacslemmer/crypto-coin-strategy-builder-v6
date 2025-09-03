// scripts/stress1k-wait-anon10.js
// Watch the screenshots folder until >=10 originals exist, then anonymize 10 and write progress markers

import { homedir } from 'os';
import { readdirSync, existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { spawn } from 'child_process';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function getBase() {
  return join(homedir(), 'Desktop', '1000 Pair Test');
}

function getLatestSessionDir(base) {
  const dir = join(base, 'screenshots');
  const sessions = existsSync(dir) ? readdirSync(dir).filter(d => d.startsWith('session_')).sort() : [];
  return sessions.length ? join(dir, sessions[sessions.length - 1]) : null;
}

function countOriginals(sessionDir) {
  const orig = join(sessionDir, 'originals');
  const files = existsSync(orig) ? readdirSync(orig) : [];
  return files.filter(f => f.toLowerCase().endsWith('.png') && !f.toLowerCase().includes('_cropped')).length;
}

async function main() {
  const base = getBase();
  const logsDir = join(base, 'logs');
  mkdirSync(logsDir, { recursive: true });
  const progressPath = join(base, 'progress.json');

  const start = Date.now();
  const maxWaitMs = 8 * 60 * 60 * 1000; // 8 hours safeguard

  while (Date.now() - start < maxWaitMs) {
    const sessionDir = getLatestSessionDir(base);
    if (!sessionDir) { await sleep(30000); continue; }

    const n = countOriginals(sessionDir);
    writeFileSync(progressPath, JSON.stringify({ step: 'screenshots', status: 'in_progress', originalsFound: n, sessionDir, updatedAt: new Date().toISOString() }, null, 2));

    if (n >= 10) {
      writeFileSync(progressPath, JSON.stringify({ step: 'anonymize10', status: 'starting', originalsFound: n, sessionDir, updatedAt: new Date().toISOString() }, null, 2));
      await new Promise((resolve, reject) => {
        const p = spawn(process.execPath, ['scripts/stress1k-anonymize-10.js'], { stdio: 'inherit' });
        p.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`anon10 exit ${code}`)));
      });
      writeFileSync(progressPath, JSON.stringify({ step: 'anonymize10', status: 'done', sessionDir, updatedAt: new Date().toISOString() }, null, 2));
      return;
    }

    await sleep(30000);
  }

  writeFileSync(progressPath, JSON.stringify({ step: 'anonymize10', status: 'timeout', updatedAt: new Date().toISOString() }, null, 2));
}

main().catch(err => {
  const base = getBase();
  writeFileSync(join(base, 'progress.json'), JSON.stringify({ step: 'watcher', status: 'error', error: err?.message || String(err), updatedAt: new Date().toISOString() }, null, 2));
  process.exit(1);
});


