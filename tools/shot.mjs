// Headless GPU screenshots of the real renderer (Edge + puppeteer-core). Starts its own server.
// usage:
//   node tools/shot.mjs --only environment,railway --cams "x,z,yaw,pitch;x,y,z,yaw,pitch" --out shots/railway [--t 20] [--w 1280 --h 720] [--q high]
//   --only   comma list of world modules to build (omit = full scene)
//   --cams   ';'-separated cameras. 4 numbers = walking eye at ground (x,z,yawDeg,pitchDeg);
//            5 numbers = free camera (x,y,z,yawDeg,pitchDeg). yaw 0 = north(-Z), 90 = west, 180 = south, -90 = east.
//   --t      simulation time in seconds (animations are fast-forwarded deterministically)
//   --out    output path prefix; files are <out>_0.png, <out>_1.png, ...
// Prints page errors, module errors and render stats. Then view the PNGs with your image viewer / Read tool.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import puppeteer from 'puppeteer-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = {};
for (let i = 2; i < process.argv.length; i++) { const a = process.argv[i]; if (a.startsWith('--')) { const k = a.slice(2); const v = process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[++i] : '1'; args[k] = v; } }
const W = Number(args.w || 1280), H = Number(args.h || 720);
const cams = (args.cams || '1.6,34,4,2').split(';').map(s => s.trim()).filter(Boolean);
const out = args.out || 'shots/shot';
fs.mkdirSync(path.dirname(path.resolve(root, out)), { recursive: true });

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(root, p);
  // serve three from node_modules when available (faster, offline-safe)
  fs.readFile(f, (err, data) => { if (err) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(data); });
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

const EDGE = [process.env.CHROME_PATH, 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/opt/pw-browsers/chromium', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome'].find(p => p && fs.existsSync(p));
const WIN = process.platform === 'win32';
const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
const browser = await puppeteer.launch({
  executablePath: EDGE, headless: true,
  args: [WIN ? '--use-angle=d3d11' : '--use-angle=swiftshader', ...(WIN ? [] : ['--enable-unsafe-swiftshader', '--no-sandbox']), ...(proxy && !WIN ? [`--proxy-server=${proxy}`] : []),
    '--enable-gpu', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox', '--no-first-run', '--disable-extensions', `--window-size=${W},${H}`],
  defaultViewport: { width: W, height: H, deviceScaleFactor: 1 },
  protocolTimeout: 300000,
});
const logs = [];
try {
  const page = await browser.newPage();
  // serve three.js from node_modules instead of the CDN (faster, offline-safe); when a proxy is set
  // (sandboxed CI), fetch Google Fonts through curl (which trusts the system CA store) and cache them
  await page.setRequestInterception(true);
  const fontCache = path.join(root, 'shots/.fontcache');
  page.on('request', (req) => {
    const url = req.url();
    const m = /^https:\/\/cdn\.jsdelivr\.net\/npm\/three@[^/]+\/(.*)$/.exec(url);
    if (m) return fs.readFile(path.join(root, 'node_modules/three', m[1]), (err, data) => err ? req.continue() : req.respond({ status: 200, contentType: 'text/javascript; charset=utf-8', headers: { 'Access-Control-Allow-Origin': '*' }, body: data }));
    if (proxy && !WIN && /^https:\/\/fonts\.(googleapis|gstatic)\.com\//.test(url)) {
      fs.mkdirSync(fontCache, { recursive: true });
      const f = path.join(fontCache, url.replace(/[^a-z0-9.]+/gi, '_').slice(-180));
      if (!fs.existsSync(f)) { try { execFileSync('curl', ['-sSfL', '-A', 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/130 Safari/537.36', '-o', f, url], { timeout: 60000 }); } catch (e) { return req.abort(); } }
      const css = url.includes('googleapis');
      return req.respond({ status: 200, contentType: css ? 'text/css; charset=utf-8' : 'font/woff2', headers: { 'Access-Control-Allow-Origin': '*' }, body: fs.readFileSync(f) });
    }
    req.continue();
  });
  page.on('console', (m) => { const t = m.type(); if (t === 'error' || t === 'warning' || t === 'warn') logs.push(`[console.${t}] ${m.text()}`); });
  page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
  page.on('requestfailed', (r) => logs.push(`[requestfailed] ${r.url()} ${r.failure()?.errorText}`));
  const q = new URLSearchParams({ shot: '1', w: String(W), h: String(H), t: String(args.t || 0), q: args.q || 'high' });
  if (args.only) q.set('only', args.only);
  if (args.batch) q.set('batch', args.batch);
  q.set('cam', cams[0]);
  await page.goto(`http://127.0.0.1:${port}/index.html?${q}`, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction('window.__ready === true', { timeout: 280000, polling: 250 });
  const info = await page.evaluate(() => ({ errors: window.__errors, stats: window.__stats, gl: (() => { try { const gl = document.getElementById('scene').getContext('webgl2'); const d = gl.getExtension('WEBGL_debug_renderer_info'); return d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : 'unknown'; } catch (e) { return 'n/a'; } })() }));
  for (let i = 0; i < cams.length; i++) {
    const v = cams[i].split(',').map(Number);
    await page.evaluate((v) => { if (v.length === 4) window.__setCam(v[0], null, v[1], v[2], v[3]); else window.__setCam(v[0], v[1], v[2], v[3], v[4]); }, v);
    await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(r)))));
    const file = path.resolve(root, `${out}_${i}.png`);
    await page.screenshot({ path: file });
    const st = await page.evaluate(() => ({ calls: window.__stats.calls, triangles: window.__stats.triangles }));
    console.log(`saved ${path.relative(root, file)}  cam=[${cams[i]}]  calls=${st.calls} tris=${st.triangles}`);
    if (args.bench) { const b = await page.evaluate((n) => window.__bench(n), Number(args.bench) > 1 ? Number(args.bench) : 40); console.log(`  bench: ${JSON.stringify(b)}`); }
  }
  if (args.diag) { const d = await page.evaluate(() => window.__diag()); console.log('diag:', JSON.stringify(d, null, 1)); }
  console.log('gpu:', info.gl);
  console.log('module stats:', JSON.stringify(info.stats.modules), 'batch:', JSON.stringify(info.stats.batch));
  if (info.errors && info.errors.length) { console.log('MODULE ERRORS:'); for (const e of info.errors) console.log(` - [${e.module}] ${e.message.split('\n').slice(0, 6).join('\n   ')}`); }
} catch (e) {
  console.log('SHOT FAILED:', e.message);
  process.exitCode = 1;
} finally {
  if (logs.length) { console.log('PAGE LOGS:'); for (const l of logs.slice(0, 60)) console.log(' ', l.slice(0, 600)); }
  await browser.close();
  server.close();
}
