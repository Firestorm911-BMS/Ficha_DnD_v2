/**
 * Runner automático para tests/tests.html usando Playwright headless.
 * Uso: npm test  (requiere haber corrido npm install primero)
 */
import { createServer }       from 'node:http';
import { readFile }           from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath }      from 'node:url';
import { chromium }           from 'playwright';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const PORT = 8765;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png':  'image/png',
  '.ico':  'image/x-icon',
  '.svg':  'image/svg+xml',
  '.woff2':'font/woff2',
  '.woff': 'font/woff',
};

// ── Servidor estático mínimo ──────────────────────────────────────────────────
const server = createServer(async (req, res) => {
  try {
    const urlPath  = decodeURIComponent(req.url.split('?')[0]);
    const filePath = join(ROOT, urlPath === '/' ? 'index.html' : urlPath);
    if (!filePath.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
    const data = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': MIME[extname(filePath)] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404); res.end('Not found');
  }
});

await new Promise(r => server.listen(PORT, '127.0.0.1', r));
console.log(`Servidor en http://localhost:${PORT}`);

// ── Playwright ────────────────────────────────────────────────────────────────
let exitCode = 0;

try {
  const browser = await chromium.launch();
  const page    = await browser.newPage();

  const jsErrors = [];
  page.on('pageerror', err => jsErrors.push(err.message));

  await page.goto(`http://localhost:${PORT}/tests/tests.html`, { waitUntil: 'load' });

  // Espera a que #summary tenga contenido (los tests incluyen await import() async)
  await page.waitForFunction(
    () => document.getElementById('summary')?.textContent?.trim() !== '',
    { timeout: 20_000 }
  );

  const summary   = await page.$eval('#summary', el => el.textContent.trim());
  const failures  = await page.$$eval('.fail',   els => els.map(e => e.textContent.trim()));
  const passCount = await page.$$eval('.pass',   els => els.length);

  console.log(`\n${summary}\n`);

  if (failures.length) {
    console.error('Tests fallados:');
    failures.forEach(f => console.error(`  ✗ ${f}`));
    exitCode = 1;
  }

  if (jsErrors.length) {
    console.error('\nErrores JS en página:');
    jsErrors.forEach(e => console.error(`  ${e}`));
    exitCode = 1;
  }

  if (exitCode === 0) {
    console.log(`✓ ${passCount} tests pasaron — sin regresiones`);
  }

  await browser.close();
} catch (err) {
  console.error('Error al correr tests:', err.message);
  exitCode = 1;
} finally {
  server.close();
}

process.exit(exitCode);
