/**
 * Dev launcher — replaces concurrently + wait-on
 * Starts Vite, waits for it to be ready, then launches Electron.
 */
import { spawn, execSync } from 'child_process';
import { existsSync } from 'fs';
import { resolve } from 'path';
import http from 'http';

const VITE_URL = 'http://localhost:5173';
const POLL_MS = 500;
const TIMEOUT_MS = 30_000;

// ── helpers ────────────────────────────────────

/** Resolve electron binary — local node_modules first, then Volta global */
function findElectron() {
  // Prefer local node_modules cli.js (standard pnpm/npm install)
  const localCli = resolve('node_modules/electron/cli.js');
  if (existsSync(localCli)) return localCli;

  // Volta global install — look for cli.js
  const voltaPkg = resolve(
    process.env.LOCALAPPDATA || '',
    'Volta/tools/image/packages/electron/node_modules/electron/cli.js'
  );
  if (existsSync(voltaPkg)) return voltaPkg;

  // Fallback: any electron on PATH
  const localCmd = resolve('node_modules/.bin/electron.cmd');
  if (existsSync(localCmd)) return localCmd;
  try {
    const p = execSync('where electron', { encoding: 'utf8' }).trim().split(/\r?\n/)[0];
    if (p && existsSync(p)) return p;
  } catch { /* ignore */ }
  return null;
}

function run(cmd, args, env = {}) {
  const child = spawn(cmd, args, {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, ...env },
  });
  child.on('error', (err) => console.error(`[dev] ${cmd} error:`, err.message));
  return child;
}

function waitForServer(url, timeout) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeout;
    const check = () => {
      http
        .get(url, (res) => {
          res.resume();
          resolve();
        })
        .on('error', () => {
          if (Date.now() > deadline) return reject(new Error(`Timed out waiting for ${url}`));
          setTimeout(check, POLL_MS);
        });
    };
    check();
  });
}

// ── main ───────────────────────────────────────
const vite = run('pnpm', ['run', 'vite']);

console.log('[dev] Waiting for Vite server…');
try {
  await waitForServer(VITE_URL, TIMEOUT_MS);
} catch (err) {
  console.error('[dev]', err.message);
  vite.kill();
  process.exit(1);
}

console.log('[dev] Vite ready — launching Electron');
const electronBin = findElectron();
if (!electronBin) {
  console.error('[dev] ERROR: Cannot find electron binary. Run: pnpm install');
  vite.kill();
  process.exit(1);
}

// electron's index.js exports the path to the actual .exe
const electronDir = resolve(electronBin, '..');
let electronExe;
try {
  const mod = await import(`file://${resolve(electronDir, 'index.js').replace(/\\/g, '/')}`);
  electronExe = mod.default;
} catch {
  electronExe = electronBin; // fallback: use the found path directly
}
console.log(`[dev] Using electron: ${electronExe}`);
const electron = run(electronExe, ['.'], {
  VITE_DEV_SERVER_URL: VITE_URL,
  NODE_ENV: 'development',
});

// Graceful shutdown
function cleanup() {
  electron.kill();
  vite.kill();
}
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// If either process exits, tear down the other
vite.on('close', (code) => {
  console.log(`[dev] Vite exited (${code})`);
  electron.kill();
});
electron.on('close', (code) => {
  console.log(`[dev] Electron exited (${code})`);
  vite.kill();
  process.exit(code ?? 0);
});
