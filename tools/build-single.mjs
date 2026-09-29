// Builds ONE self-contained HTML file of the whole game: all modules and three.js bundled (esbuild) and inlined
// into index.html, so it runs by double-clicking the file — no server, no install. (Fonts still come from Google
// Fonts when online; offline the system Japanese fonts are used.)
//   node tools/build-single.mjs            -> play/Sakuragaoka.html
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'play', 'Sakuragaoka.html');

const res = await esbuild.build({
  entryPoints: [path.join(root, 'src/main.js')],
  bundle: true, format: 'esm', target: 'es2022', write: false, legalComments: 'none',
  // whitespace / syntax only: three.js keys patched shaders by onBeforeCompile.toString(), and renaming identifiers
  // makes different patch functions print identically (-> materials sharing the wrong shader -> black surfaces)
  minifyWhitespace: true, minifySyntax: true, minifyIdentifiers: false,
  logLevel: 'warning',
});
let js = res.outputFiles[0].text;
js = js.replace(/<\/script/gi, '<\\/script');   // must not close the inline <script> early

let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const im = /<script type="importmap">[\s\S]*?<\/script>\s*/;
if (!im.test(html)) throw new Error('import map not found in index.html');
html = html.replace(im, '');
const entry = '<script type="module" src="./src/main.js"></script>';
if (!html.includes(entry)) throw new Error('entry script tag not found in index.html');
html = html.replace(entry, () => `<script type="module">\n${js}\n</script>`);

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
console.log(`wrote ${path.relative(root, out)} (${(fs.statSync(out).size / 1e6).toFixed(2)} MB)`);
