// Sundrift local server — no dependencies, Node 18+.
// Serves index.html and relays a short allowlist of public travel pages that
// don't allow direct browser calls (no CORS header). Each relayed URL is
// cached for 14 minutes so the sites see very few requests.
//
//   node server.js            -> http://127.0.0.1:8765/
//   PORT=9000 node server.js
'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const PORT = Number(process.env.PORT) || 8765;
const HOST = process.env.HOST || '127.0.0.1';
const { spawn } = require('node:child_process');
// Packaged as Sundrift.exe (Node single-executable): index.html is embedded as an asset.
let SEA = null;
try { const sea = require('node:sea'); if (sea.isSea()) SEA = sea; } catch {}
const PAGE = path.join(__dirname, 'index.html');
function readPage(cb) {
  if (SEA) { try { return cb(null, Buffer.from(SEA.getAsset('index.html'))); } catch (e) { return cb(e); } }
  fs.readFile(PAGE, cb);
}
const TTL_MS = 14 * 60 * 1000;          // just under the shortest repeat-scan interval (15 min)
const MAX_BODY = 8 * 1024 * 1024;       // largest real page is ~1.3 MB (Sunwing)
const MAX_REDIRECTS = 4;
const ALLOW = new Set([
  'www.sunwing.ca',        // Sunwing package deals (page-data JSON)
  'www.transat.com',       // Transat deals page (current campaign codes)
  'flights.flyflair.com',  // Flair "flights from" fare pages
  'www.carnival.com',      // Carnival cruise search JSON
]);
// Only these Host headers are served (blocks DNS-rebinding pages).
const HOSTS = new Set([`127.0.0.1:${PORT}`, `localhost:${PORT}`, `[::1]:${PORT}`]);
const UA = 'Mozilla/5.0 (X11; Linux x86_64) Sundrift/1.0 (personal deal finder)';

const cache = new Map();    // url -> {ts, status, type, body}
const inflight = new Map(); // url -> Promise

function allowed(u) {
  return u.protocol === 'https:' && ALLOW.has(u.hostname) && !u.port && !u.username && !u.password;
}

async function readCapped(r) {
  const chunks = []; let size = 0;
  for await (const c of r.body) {
    size += c.length;
    if (size > MAX_BODY) throw new Error('response too large');
    chunks.push(c);
  }
  return Buffer.concat(chunks);
}

async function fetchAllowed(start) {
  let url = start;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const r = await fetch(url, {
      headers: { 'User-Agent': UA, 'Accept': 'text/html,application/json;q=0.9,*/*;q=0.8', 'Accept-Language': 'en-CA,en;q=0.8' },
      redirect: 'manual',
      signal: AbortSignal.timeout(20000),
    });
    if (r.status >= 300 && r.status < 400 && r.headers.get('location')) {
      const next = new URL(r.headers.get('location'), url);
      if (!allowed(next)) throw new Error('redirect to non-allowed host ' + next.host);
      url = next.href;
      continue;
    }
    return r;
  }
  throw new Error('too many redirects');
}

async function relay(target) {
  const hit = cache.get(target);
  if (hit && Date.now() - hit.ts < TTL_MS) return hit;
  if (inflight.has(target)) return inflight.get(target);
  const job = (async () => {
    const r = await fetchAllowed(target);
    const entry = { ts: Date.now(), status: r.status, type: r.headers.get('content-type') || '', body: r.body ? await readCapped(r) : Buffer.alloc(0) };
    if (r.ok) {
      cache.set(target, entry);
      if (cache.size > 200) cache.delete(cache.keys().next().value);
    }
    return entry;
  })();
  inflight.set(target, job);
  try { return await job; } finally { inflight.delete(target); }
}

function send(res, status, type, body, extra) {
  res.writeHead(status, Object.assign({ 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }, extra || {}));
  res.end(body);
}

async function handle(req, res) {
  if (!HOSTS.has(String(req.headers.host || '').toLowerCase())) return send(res, 421, 'text/plain', 'wrong host');
  if (req.method !== 'GET') return send(res, 405, 'text/plain', 'GET only');
  let u;
  try { u = new URL(req.url, 'http://localhost'); } catch { return send(res, 400, 'text/plain', 'bad request'); }

  if (u.pathname === '/' || u.pathname === '/index.html') {
    return readPage((err, buf) => err ? send(res, 500, 'text/plain', 'index.html missing') : send(res, 200, 'text/html; charset=utf-8', buf));
  }
  if (u.pathname === '/proxy/health') return send(res, 200, 'application/json', JSON.stringify({ ok: true, hosts: [...ALLOW] }));

  if (u.pathname === '/proxy') {
    let target;
    try { target = new URL(u.searchParams.get('url') || ''); } catch { return send(res, 400, 'text/plain', 'bad url'); }
    if (!allowed(target)) return send(res, 403, 'text/plain', 'not allowed: ' + target.protocol + '//' + target.host);
    try {
      const e = await relay(target.href);
      const age = Math.round((Date.now() - e.ts) / 1000);
      console.log(`${new Date().toISOString()} relay ${e.status} ${target.hostname}${target.pathname} (age ${age}s)`);
      // Relayed content is data for the app, never a page: JSON stays JSON, everything else is plain text, and
      // the sandbox CSP stops it running scripts on this origin even if opened directly.
      const type = /json/i.test(e.type) ? 'application/json; charset=utf-8' : 'text/plain; charset=utf-8';
      return send(res, e.status, type, e.body, { 'Content-Security-Policy': "sandbox; default-src 'none'" });
    } catch (err) {
      console.log(`${new Date().toISOString()} relay FAILED ${target.hostname}: ${err.message}`);
      return send(res, 502, 'text/plain', 'upstream failed: ' + err.message);
    }
  }
  send(res, 404, 'text/plain', 'not found');
}

const server = http.createServer((req, res) => {
  handle(req, res).catch(err => {
    console.log(`${new Date().toISOString()} handler error: ${err && err.message}`);
    try { if (!res.headersSent) send(res, 500, 'text/plain', 'error'); else res.end(); } catch {}
  });
});

const APP_URL = `http://${HOST}:${PORT}/`;

function openBrowser() {
  if (process.env.SUNDRIFT_NO_BROWSER) return;   // for automated tests
  try {
    if (process.platform === 'win32') spawn('cmd', ['/c', 'start', '', APP_URL], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
    else if (process.platform === 'darwin') spawn('open', [APP_URL], { detached: true, stdio: 'ignore' }).unref();
    else spawn('xdg-open', [APP_URL], { detached: true, stdio: 'ignore' }).unref();
  } catch {}
}

// In the .exe, keep the window open on a fatal error so the message can be read.
function fatal(msg) {
  console.log('\n  ' + msg + '\n');
  if (SEA) { console.log('  This window will close in 60 seconds.'); setTimeout(() => process.exit(1), 60000); }
  else process.exit(1);
}

server.on('error', err => {
  if (err.code === 'EADDRINUSE') {
    // Most likely Sundrift is already running (window minimised) — just show it again.
    console.log(`\n  Sundrift is already running. Opening ${APP_URL} ...`);
    if (SEA || process.env.OPEN_BROWSER) openBrowser();
    setTimeout(() => process.exit(0), 4000);
    return;
  }
  fatal('Sundrift could not start: ' + err.message);
});
process.on('uncaughtException', err => fatal('Sundrift hit an error: ' + (err && err.message)));

server.listen(PORT, HOST, () => {
  if (SEA) {
    console.log('\n  ==============================================');
    console.log('   Sundrift is running.');
    console.log(`   Your browser should open by itself. If not, go to: ${APP_URL}`);
    console.log('   Leave this window open while you use Sundrift.');
    console.log('   Close this window to stop Sundrift.');
    console.log('  ==============================================\n');
  } else {
    console.log(`Sundrift on ${APP_URL}  (relay hosts: ${[...ALLOW].join(', ')})`);
  }
  if (SEA || process.env.OPEN_BROWSER) openBrowser();
});
