// Trains of 大阪駅: commuter EMUs in JR West liveries (stainless with the line-colour bands, the orange Loop Line,
// the cream / pink 桜川線 train) and 16-car N700-style Shinkansen. Each train is ONE vertex-coloured mesh on a painted
// texture atlas (the lit interiors you see through the windows, logos, car numbers), plus the sliding door leaves
// on the platform side, head / tail lights, destination LEDs and positional running sounds.
//   EMU: a swept car-body section with the bands in the geometry, framed windows, 4 doors a side, gangway bellows,
//        cab fronts (black mask, windscreen, LED, headlights, skirt, coupler), single-arm pantographs, AC units,
//        underfloor equipment and bogies.
//   Shinkansen: a superelliptic body section swept along each car, and a lofted "double-wing" nose (cockpit canopy,
//        long flattened bill, the blue stripe sweeping forward to the headlights), plug doors, pantograph shields.
// Motion is a pure function of time (plan.convState / plan.shinState).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import * as P from './plan.js';

// ================================================================== atlas (1024²) + accumulator
export const ATLAS = 1024;
export const WHITE = [4, 4, 12, 12];
export const R = {
  emuWin: (i) => [(i % 4) * 256 + 2, 18 + Math.floor(i / 4) * 128, (i % 4) * 256 + 254, 18 + Math.floor(i / 4) * 128 + 124],   // 8 variants
  doorWin: (i) => [i * 64 + 2, 276, i * 64 + 62, 396],                                                                 // 4 variants
  cabGlass: [258, 276, 510, 396],
  shinWin: (i) => [512 + i * 128 + 2, 276, 512 + i * 128 + 126, 368],                                                  // 4 variants
  shinCab: [2, 404, 254, 524],
  jrWest: [258, 404, 382, 464], jrCentral: [258, 468, 382, 528],
  n700: [388, 404, 636, 464],
  num: (n) => [((n - 1) % 16) * 64 + 2, 536, ((n - 1) % 16) * 64 + 62, 596],
  shinDoorWin: [644, 404, 700, 524],
};
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3();
export const mat4 = (pos = [0, 0, 0], rot = null, scale = null) => _m.clone().compose(_v.set(pos[0], pos[1], pos[2]), _q.setFromEuler(_e.set(rot ? rot[0] : 0, rot ? rot[1] : 0, rot ? rot[2] : 0, 'YXZ')), _s.set(scale ? scale[0] : 1, scale ? scale[1] : 1, scale ? scale[2] : 1));
const _c = new THREE.Color();

/** accumulates geometry (position, normal, colour, atlas uv) and merges it into one BufferGeometry */
export class Acc {
  constructor() { this.list = []; }
  add(geo, m = null, color = '#ffffff', rect = null) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    if (m) g.applyMatrix4(m);
    if (!g.attributes.normal) g.computeVertexNormals();
    const n = g.attributes.position.count, uv = new Float32Array(n * 2);
    if (rect && g.attributes.uv) { const s = g.attributes.uv; for (let i = 0; i < n; i++) { uv[i * 2] = (rect[0] + (rect[2] - rect[0]) * s.getX(i)) / ATLAS; uv[i * 2 + 1] = 1 - (rect[3] - (rect[3] - rect[1]) * s.getY(i)) / ATLAS; } }
    else { const u = (WHITE[0] + WHITE[2]) / 2 / ATLAS, v = 1 - (WHITE[1] + WHITE[3]) / 2 / ATLAS; for (let i = 0; i < n; i++) { uv[i * 2] = u; uv[i * 2 + 1] = v; } }
    if (!g.attributes.color) { _c.set(color); const a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = _c.r; a[i * 3 + 1] = _c.g; a[i * 3 + 2] = _c.b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); }
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'color'].includes(k)) g.deleteAttribute(k);
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    this.list.push(g); return this;
  }
  box(w, h, d, pos, color, rot) { return this.add(G.box, mat4(pos, rot, [w, h, d]), color); }
  rbox(w, h, d, r, pos, color, rot) { return this.add(new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3)), mat4(pos, rot), color); }
  cyl(r1, r2, h, pos, color, rot, seg = 12) { return this.add(new THREE.CylinderGeometry(r1, r2, h, seg), mat4(pos, rot), color); }
  /** textured quad facing +z of its own frame (rot turns it) */
  plane(w, h, pos, rot, rect, color = '#ffffff') { return this.add(G.plane, mat4(pos, rot, [w, h, 1]), color, rect); }
  build() { if (!this.list.length) return null; const g = mergeGeometries(this.list, false); g.computeBoundingSphere(); g.computeBoundingBox(); return g; }
}
export const G = { box: new THREE.BoxGeometry(1, 1, 1), plane: new THREE.PlaneGeometry(1, 1) };

/** a closed profile loop [[z, y], ...] (counter-clockwise seen from +x) swept from x0 to x1; per-face colours from
 *  colorAt(y, z); smooth normals around the loop. Returns a non-indexed geometry. */
export function sweep(prof, x0, x1, colorAt) {
  const n = prof.length, pos = [], nor = [], col = [];
  const segN = prof.map((p, i) => { const q = prof[(i + 1) % n]; const dz = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dz, dy) || 1; return [dy / l, -dz / l]; }); // (nz, ny) outward
  const vN = prof.map((p, i) => { const a = segN[(i - 1 + n) % n], b = segN[i]; const dot = a[0] * b[0] + a[1] * b[1]; if (dot < 0.5) return null; const z = a[0] + b[0], y = a[1] + b[1], l = Math.hypot(z, y) || 1; return [z / l, y / l]; });
  for (let i = 0; i < n; i++) {
    const p = prof[i], q = prof[(i + 1) % n];
    const na = vN[i] || segN[i], nb = vN[(i + 1) % n] || segN[i];
    _c.set(colorAt((p[1] + q[1]) / 2, (p[0] + q[0]) / 2));
    const V = [[x0, p[1], p[0], na], [x0, q[1], q[0], nb], [x1, q[1], q[0], nb], [x1, p[1], p[0], na]];
    // winding: outward normal must agree with the triangle's geometric normal
    const e1 = [0, q[1] - p[1], q[0] - p[0]], e2 = [x1 - x0, 0, 0];
    const gx = e1[1] * e2[2] - e1[2] * e2[1], gy = e1[2] * e2[0] - e1[0] * e2[2], gz = e1[0] * e2[1] - e1[1] * e2[0];
    const flip = gy * segN[i][1] + gz * segN[i][0] < 0;
    const tri = flip ? [0, 2, 1, 0, 3, 2] : [0, 1, 2, 0, 2, 3];
    for (const k of tri) { const v = V[k]; pos.push(v[0], v[1], v[2]); nor.push(0, v[3][1], v[3][0]); col.push(_c.r, _c.g, _c.b); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return g;
}
/** flat cap of a profile loop at x, facing dir (±1) */
export function cap(prof, x, dir, color) {
  const sh = new THREE.Shape(prof.map(([z, y]) => new THREE.Vector2(z, y)));
  const g = new THREE.ShapeGeometry(sh); g.rotateY(dir > 0 ? Math.PI / 2 : -Math.PI / 2); g.translate(x, 0, 0);
  if (dir > 0) g.scale(1, 1, 1);
  return { g, color };
}
/** insert exact band levels into the side segments of a half profile (z > 0.9·max) so colour edges are crisp */
export function withBands(half, ys) {
  const out = [];
  for (let i = 0; i < half.length; i++) {
    out.push(half[i]);
    const a = half[i], b = half[i + 1]; if (!b) break;
    const lo = Math.min(a[1], b[1]), hi = Math.max(a[1], b[1]);
    for (const y of ys.filter(y => y > lo + 1e-4 && y < hi - 1e-4).sort((p, q) => (b[1] > a[1] ? p - q : q - p))) { const t = (y - a[1]) / (b[1] - a[1]); out.push([a[0] + (b[0] - a[0]) * t, y]); }
  }
  return out;
}
/** full CCW loop from a half profile (bottom centre -> +z side -> top centre) */
export const mirrorLoop = (half) => [...half, ...half.slice(1, -1).reverse().map(([z, y]) => [-z, y])];
export const seeded = (seed) => { let s = seed >>> 0 || 1; return () => ((s = (s * 16807) % 2147483647) / 2147483647); };

// ================================================================== atlas painting
export function paintAtlas(ctx) {
  const T = ctx.tex, F = T.FONTS;
  return T.draw(ATLAS, ATLAS, (g) => {
    const r = seeded(77);
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, 16, 16);
    const clip = (rc, fn) => { g.save(); g.beginPath(); g.rect(rc[0], rc[1], rc[2] - rc[0], rc[3] - rc[1]); g.clip(); fn(rc[0], rc[1], rc[2] - rc[0], rc[3] - rc[1]); g.restore(); };
    const person = (x, y, s, coat, hair, seated) => {
      g.fillStyle = coat; g.beginPath(); g.moveTo(x - s * 0.55, y + s * (seated ? 1.5 : 2.6)); g.lineTo(x - s * 0.45, y + s * 0.55); g.quadraticCurveTo(x, y + s * 0.3, x + s * 0.45, y + s * 0.55); g.lineTo(x + s * 0.55, y + s * (seated ? 1.5 : 2.6)); g.fill();
      g.fillStyle = '#f0d3c0'; g.beginPath(); g.arc(x, y, s * 0.34, 0, 6.3); g.fill();
      g.fillStyle = hair; g.beginPath(); g.arc(x, y - s * 0.06, s * 0.36, Math.PI * 1.05, Math.PI * 1.95); g.fill(); g.fillRect(x - s * 0.36, y - s * 0.12, s * 0.72, s * 0.1);
    };
    const COATS = ['#3f4758', '#6d6a60', '#c9b79a', '#2f3a52', '#8a5a5a', '#e0ddd5', '#4f6a58', '#5b4a66', '#1f2530'], HAIRS = ['#2b2426', '#3a2e2c', '#5a4436', '#1f1b1f', '#8b8790'];
    const reflect = (x, y, w, h, a = 0.16) => { g.fillStyle = `rgba(255,255,255,${a})`; g.beginPath(); g.moveTo(x + w * 0.15, y + h); g.lineTo(x + w * 0.42, y); g.lineTo(x + w * 0.55, y); g.lineTo(x + w * 0.28, y + h); g.fill(); g.fillStyle = `rgba(255,255,255,${a * 0.6})`; g.beginPath(); g.moveTo(x + w * 0.62, y + h); g.lineTo(x + w * 0.8, y); g.lineTo(x + w * 0.86, y); g.lineTo(x + w * 0.68, y + h); g.fill(); };
    // ---- EMU saloon interiors (0-3 JR blue-green seats, 4-5 pink 桜川線, 6-7 orange/brown Loop Line)
    const SEATS = ['#3e5d8f', '#3e5d8f', '#3a6f8a', '#3e5d8f', '#c9607e', '#c9607e', '#a65a3a', '#8c4b3a'];
    for (let i = 0; i < 8; i++) clip(R.emuWin(i), (x, y, w, h) => {
      const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, '#f6f4ee'); gr.addColorStop(1, '#d7d3ca'); g.fillStyle = gr; g.fillRect(x, y, w, h);
      g.fillStyle = '#fffdf2'; g.fillRect(x, y + h * 0.03, w, h * 0.07);                 // ceiling light line
      g.fillStyle = '#e9e6de'; g.fillRect(x, y + h * 0.1, w, h * 0.1);
      const sk = g.createLinearGradient(0, y + h * 0.26, 0, y + h * 0.6); sk.addColorStop(0, '#a9c9e2'); sk.addColorStop(1, '#e3edf2');
      g.fillStyle = sk; g.fillRect(x, y + h * 0.26, w, h * 0.34);                         // far-side windows
      g.fillStyle = '#cfcac0'; for (let k = 0; k < 3; k++) g.fillRect(x + (k + 0.1) * w / 2.6, y + h * 0.26, 5, h * 0.34);
      g.fillStyle = '#8d9299'; g.fillRect(x, y + h * 0.2, w, 4);                          // luggage rack
      g.strokeStyle = '#9aa0a8'; g.lineWidth = 2; g.fillStyle = '#f2f0ea';
      for (let k = 0; k < 9; k++) { const sx = x + 10 + k * (w - 20) / 8; g.beginPath(); g.moveTo(sx, y + h * 0.22); g.lineTo(sx, y + h * 0.36); g.stroke(); g.beginPath(); g.arc(sx, y + h * 0.39, 4, 0, 6.3); g.stroke(); }
      g.fillStyle = '#c7ccd2'; g.fillRect(x + w * 0.08, y + h * 0.22, 4, h * 0.78); g.fillRect(x + w * 0.9, y + h * 0.22, 4, h * 0.78);   // poles
      const n = [1, 3, 2, 0, 2, 1, 3, 1][i];
      for (let k = 0; k < n; k++) { const stand = r() < 0.4; person(x + w * (0.18 + 0.64 * r()), y + h * (stand ? 0.34 : 0.5), h * 0.13, COATS[(r() * COATS.length) | 0], HAIRS[(r() * HAIRS.length) | 0], !stand); }
      g.fillStyle = SEATS[i]; g.fillRect(x, y + h * 0.66, w, h * 0.22);                   // seat backs (near side)
      g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(x, y + h * 0.66, w, 3);
      g.fillStyle = '#5b5e66'; g.fillRect(x, y + h * 0.88, w, h * 0.12);
      reflect(x, y, w, h);
    });
    // ---- door windows
    for (let i = 0; i < 4; i++) clip(R.doorWin(i), (x, y, w, h) => {
      const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, '#f3f1ea'); gr.addColorStop(1, '#cfcac0'); g.fillStyle = gr; g.fillRect(x, y, w, h);
      g.fillStyle = '#b9d3e6'; g.fillRect(x, y + h * 0.2, w, h * 0.35);
      g.fillStyle = '#c7ccd2'; g.fillRect(x + w * (0.3 + 0.2 * i), y, 4, h);
      if (i % 2) person(x + w * 0.62, y + h * 0.3, w * 0.28, COATS[(i * 3) % COATS.length], HAIRS[i % HAIRS.length], false);
      reflect(x, y, w, h, 0.2);
    });
    // ---- cab windscreen (dark, the console showing through, reflections)
    clip(R.cabGlass, (x, y, w, h) => {
      const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, '#39465a'); gr.addColorStop(0.6, '#1d2430'); gr.addColorStop(1, '#141922'); g.fillStyle = gr; g.fillRect(x, y, w, h);
      g.fillStyle = '#2a2f38'; g.fillRect(x, y + h * 0.78, w, h * 0.22);
      g.fillStyle = '#6fd08a'; g.fillRect(x + w * 0.2, y + h * 0.8, 10, 5); g.fillStyle = '#e6c34a'; g.fillRect(x + w * 0.26, y + h * 0.8, 8, 5);
      reflect(x, y, w, h, 0.22);
    });
    // ---- Shinkansen seat windows (blue seats, white headrest covers)
    for (let i = 0; i < 4; i++) clip(R.shinWin(i), (x, y, w, h) => {
      const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, '#efece4'); gr.addColorStop(1, '#d9d4c9'); g.fillStyle = gr; g.fillRect(x, y, w, h);
      g.fillStyle = '#fbf8ee'; g.fillRect(x, y + h * 0.04, w, h * 0.06);
      g.fillStyle = '#9aa0a8'; g.fillRect(x, y + h * 0.14, w, 5);
      const heads = [[0.3, i % 2], [0.72, i < 2]];
      for (const [fx, on] of heads) {
        if (on) person(x + w * fx, y + h * 0.42, h * 0.2, COATS[(i * 5 + fx * 10) % COATS.length | 0], HAIRS[(i + 1) % HAIRS.length], true);
        g.fillStyle = '#41598a'; T.roundRect(g, x + w * (fx - 0.19), y + h * 0.5, w * 0.38, h * 0.5, 8); g.fill();
        g.fillStyle = '#f4f3ef'; g.fillRect(x + w * (fx - 0.16), y + h * 0.52, w * 0.32, h * 0.12);
      }
      reflect(x, y, w, h, 0.18);
    });
    clip(R.shinCab, (x, y, w, h) => { const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, '#2d3a4f'); gr.addColorStop(1, '#0f141c'); g.fillStyle = gr; g.fillRect(x, y, w, h); reflect(x, y, w, h, 0.25); });
    clip(R.shinDoorWin, (x, y, w, h) => { g.fillStyle = '#e9e5dc'; g.fillRect(x, y, w, h); g.fillStyle = '#b9d3e6'; g.fillRect(x, y + h * 0.3, w, h * 0.3); reflect(x, y, w, h, 0.2); });
    // ---- logos
    const jr = (rc, c) => clip(rc, (x, y, w, h) => { g.clearRect(x, y, w, h); g.fillStyle = 'rgba(255,255,255,0)'; g.fillStyle = c; g.font = `italic 900 ${h * 0.95}px ${F.en}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('JR', x + w / 2, y + h * 0.55); });
    g.fillStyle = '#c9ced4'; g.fillRect(R.jrWest[0], R.jrWest[1], 124, 60); jr(R.jrWest, '#0072bc');
    g.fillStyle = '#f4f5f6'; g.fillRect(R.jrCentral[0], R.jrCentral[1], 124, 60);
    clip(R.jrCentral, (x, y, w, h) => { g.fillStyle = '#f4f5f6'; g.fillRect(x, y, w, h); g.fillStyle = '#f77321'; g.font = `italic 900 ${h * 0.95}px ${F.en}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('JR', x + w / 2, y + h * 0.55); });
    clip(R.n700, (x, y, w, h) => { g.fillStyle = '#f4f5f6'; g.fillRect(x, y, w, h); g.fillStyle = '#1553a8'; g.font = `italic 900 ${h * 0.8}px ${F.en}`; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText('N700', x + 8, y + h * 0.5); g.fillStyle = '#c9a04a'; g.fillText('S', x + w * 0.74, y + h * 0.5); g.fillRect(x + 8, y + h * 0.86, w * 0.8, 4); });
    for (let n = 1; n <= 16; n++) clip(R.num(n), (x, y, w, h) => { g.fillStyle = '#f7f7f4'; g.fillRect(x, y, w, h); g.strokeStyle = '#2d3038'; g.lineWidth = 3; g.strokeRect(x + 3, y + 3, w - 6, h - 6); g.fillStyle = '#2d3038'; g.font = `900 ${n > 9 ? 30 : 38}px ${F.en}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(n), x + w / 2, y + h / 2 + 2); });
  }, { key: 'term.trainAtlas' });
}

// ================================================================== commuter EMU
const LIVERY = {   // body, bands [y0, y1, colour] (side), front colour, door colour, roof, seat variants
  sakuragawa: { body: '#f2ece0', bands: [[1.93, 2.13, '#ee9dbb'], [2.16, 2.2, '#86cdbb']], front: '#f2ece0', door: '#f2ece0', roof: '#b7bcc3', seats: [4, 5], logo: false },
  kyoto: { body: '#cdd2d8', bands: [[1.9, 2.1, '#0072bc'], [2.13, 2.18, '#7a4a2e']], front: '#cdd2d8', door: '#c3c9cf', roof: '#9ea5ad', seats: [0, 1, 2, 3], logo: true },
  kobe: { body: '#cdd2d8', bands: [[1.9, 2.1, '#0072bc'], [2.13, 2.18, '#7a4a2e']], front: '#cdd2d8', door: '#c3c9cf', roof: '#9ea5ad', seats: [0, 1, 2, 3], logo: true },
  loop: { body: '#cdd2d8', bands: [[1.9, 2.14, '#f15a22'], [3.28, 3.36, '#f15a22']], front: '#f15a22', door: '#f15a22', roof: '#9ea5ad', seats: [6, 7], logo: true },
  yume: { body: '#cdd2d8', bands: [[1.9, 2.1, '#1f6fbd'], [2.13, 2.18, '#e3007f']], front: '#cdd2d8', door: '#c3c9cf', roof: '#9ea5ad', seats: [0, 3], logo: true },
};
export const EMU_HALF = [[0, 1.02], [1.34, 1.02], [1.43, 1.07], [1.465, 1.22], [1.475, 1.6], [1.476, 2.0], [1.47, 2.6], [1.458, 3.0], [1.437, 3.25], [1.4, 3.4], [1.32, 3.5], [1.12, 3.6], [0.7, 3.68], [0, 3.71]];
export const ZW = 1.465;   // side wall z at window height
export const WIN_Y0 = 2.3, WIN_Y1 = 3.16;
export const DOOR_HW = 0.66, DOOR_Y0 = 1.16, DOOR_Y1 = 3.12;
/** z-offset of the cab front face at height y (the top rakes back) */
export const rake = (y) => 0.3 * Math.pow(Math.max(0, (y - 2.0) / 1.71), 1.6);

function emuGeometry(cars, liv, platSide, r) {
  const A = new Acc(), L = new Acc(), Rr = new Acc(), step = P.CAR.len + P.CAR.gap;
  const bandYs = [1.22, 3.4, ...liv.bands.flatMap(b => [b[0], b[1]])];
  const half = withBands(EMU_HALF, bandYs), prof = mirrorLoop(half);
  const colorAt = (y, z) => {
    if (y > 3.42) return liv.roof;
    if (Math.abs(z) < 0.2 && y < 1.1) return '#50545c';
    for (const [a, b, c] of liv.bands) if (y > a && y < b) return c;
    if (y < 1.24) return '#b3b8bf';
    return liv.body;
  };
  const trainL = cars * step - P.CAR.gap, E = trainL / 2;
  const front = liv.front;
  for (let k = 0; k < cars; k++) {
    const c = (k - (cars - 1) / 2) * step;
    const cabNeg = k === 0, cabPos = k === cars - 1;
    const x0 = c - P.CAR.len / 2 + (cabNeg ? 0.62 : 0.2), x1 = c + P.CAR.len / 2 - (cabPos ? 0.62 : 0.2);
    A.add(sweep(prof, x0, x1, colorAt));
    for (const [x, d] of [[x0, -1], [x1, 1]]) { const cp = cap(prof, x, d, '#9aa0a8'); A.add(cp.g, null, cp.color); }
    const doors = P.DOOR_OFFS.map(o => c + o);
    // ---- per side: windows, door recesses + leaves, logos, lamps
    for (const s of [-1, 1]) {
      const rot = [0, s > 0 ? 0 : Math.PI, 0], z = s * ZW;
      const bays = [];
      for (let i = 0; i < 3; i++) bays.push([doors[i] + DOOR_HW + 0.38, doors[i + 1] - DOOR_HW - 0.38]);
      if (!cabNeg) bays.push([c - P.CAR.len / 2 + 0.45, doors[0] - DOOR_HW - 0.42]);
      if (!cabPos) bays.push([doors[3] + DOOR_HW + 0.42, c + P.CAR.len / 2 - 0.45]);
      for (const [a, b] of bays) {
        const w = b - a, split = w > 2 ? 2 : 1;
        A.box(w + 0.1, WIN_Y1 - WIN_Y0 + 0.1, 0.012, [(a + b) / 2, (WIN_Y0 + WIN_Y1) / 2, z + s * 0.006], '#2b2f37');
        for (let j = 0; j < split; j++) {
          const pa = a + j * w / split, pb = a + (j + 1) * w / split;
          A.plane(pb - pa - 0.05, WIN_Y1 - WIN_Y0 - 0.04, [(pa + pb) / 2, (WIN_Y0 + WIN_Y1) / 2, z + s * 0.0135], rot, R.emuWin(liv.seats[(r() * liv.seats.length) | 0]));
        }
      }
      // cab side window + crew door outline at the cab ends
      for (const [isCab, e] of [[cabNeg, -1], [cabPos, 1]]) if (isCab) {
        const xc = c + e * (P.CAR.len / 2 - 1.25);
        A.box(0.7, 0.8, 0.012, [xc, 2.72, z + s * 0.006], '#2b2f37'); A.plane(0.62, 0.72, [xc, 2.72, z + s * 0.0135], rot, R.cabGlass);
        A.box(0.03, 1.9, 0.01, [xc - e * 0.45, 2.1, z + s * 0.01], '#8a9098'); A.box(0.03, 1.9, 0.01, [xc + e * 0.42, 2.1, z + s * 0.01], '#8a9098');
      }
      for (const d of doors) {
        A.box(2 * DOOR_HW + 0.08, DOOR_Y1 - DOOR_Y0 + 0.06, 0.01, [d, (DOOR_Y0 + DOOR_Y1) / 2, z + s * 0.004], '#50565e');
        A.box(2 * DOOR_HW + 0.1, 0.04, 0.06, [d, DOOR_Y0 - 0.01, z + s * 0.02], '#e8bf2c');
        const target = s === platSide ? [L, Rr] : [A, A];
        for (const [acc, dx] of [[target[0], -0.33], [target[1], 0.33]]) {
          const lx = d + dx;
          acc.box(0.655, DOOR_Y1 - DOOR_Y0, 0.03, [lx, (DOOR_Y0 + DOOR_Y1) / 2, z + s * 0.022], liv.door);
          acc.box(0.47, 0.9, 0.01, [lx, 2.74, z + s * 0.039], '#2b2f37');
          acc.plane(0.42, 0.84, [lx, 2.74, z + s * 0.045], rot, R.doorWin((r() * 4) | 0));
          acc.box(0.012, DOOR_Y1 - DOOR_Y0, 0.012, [d + (dx < 0 ? -0.004 : 0.004), (DOOR_Y0 + DOOR_Y1) / 2, z + s * 0.04], '#3a3d44');
        }
      }
      // logos, car number, car side lamps
      if (liv.logo) A.plane(0.42, 0.2, [c - s * 0, 1.62, z + s * 0.012], rot, R.jrWest, '#ffffff');
      A.plane(0.26, 0.26, [c + (k % 2 ? 1 : -1) * 8.9 * s, 1.66, z + s * 0.012], rot, R.num(s > 0 ? k + 1 : cars - k));
      for (const e of [-1, 1]) A.box(0.1, 0.1, 0.03, [c + e * 9.35, 3.3, z + s * 0.012], '#7a3a44');
      // rain gutter
      A.box(P.CAR.len - 0.5, 0.035, 0.035, [c, 3.44, s * 1.39], '#8a9098');
    }
    // ---- roof: AC units / pantograph
    const panto = cars >= 6 && (k === 1 || k === cars - 2);
    const acs = panto ? [4.6] : [-4.8, 4.8];
    for (const ax of acs) {
      A.rbox(2.4, 0.34, 1.75, 0.08, [c + ax, 3.78, 0], '#b8bdc3');
      for (const fx of [-0.55, 0.55]) { A.cyl(0.34, 0.34, 0.02, [c + ax + fx, 3.955, 0], '#50555d', null, 16); A.cyl(0.08, 0.08, 0.03, [c + ax + fx, 3.97, 0], '#8a9098', null, 8); }
      for (let g = -1; g <= 1; g++) A.box(2.2, 0.03, 0.02, [c + ax, 3.8 + g * 0.08, 0.885], '#8f959c');
    }
    if (panto) {
      const px = c - 4.2;
      A.box(1.3, 0.06, 1.1, [px, 3.98, 0], '#50555d');
      for (const [ix, iz] of [[-0.5, -0.4], [0.5, -0.4], [-0.5, 0.4], [0.5, 0.4]]) A.cyl(0.07, 0.09, 0.26, [px + ix, 3.83, iz], '#ebe8e2', null, 8);
      // single arm: lower arm (hinge -> knee), upper arm (knee -> head), pan head at the contact wire height
      const hinge = [px - 0.45, 4.03], knee = [px + 0.75, 4.55], head = [px - 0.1, 5.0];
      const seg = (a, b, t, col) => { const dx = b[0] - a[0], dy = b[1] - a[1]; A.box(Math.hypot(dx, dy), t, t, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 0], col, [0, 0, Math.atan2(dy, dx)]); };
      for (const zz of [-0.25, 0.25]) { const dx = knee[0] - hinge[0], dy = knee[1] - hinge[1]; A.box(Math.hypot(dx, dy), 0.07, 0.07, [(hinge[0] + knee[0]) / 2, (hinge[1] + knee[1]) / 2, zz], '#3a3d44', [0, 0, Math.atan2(dy, dx)]); }
      seg(knee, head, 0.06, '#3a3d44');
      A.box(0.09, 0.07, 1.9, [head[0] - 0.1, head[1], 0], '#2f3238'); A.box(0.09, 0.07, 1.9, [head[0] + 0.12, head[1], 0], '#2f3238');
      for (const zs of [-1, 1]) A.box(0.05, 0.05, 0.35, [head[0], head[1] - 0.1, zs * 1.05], '#2f3238', [zs * 0.6, 0, 0]);
      seg([px + 0.45, 4.03], [px + 0.2, 4.4], 0.05, '#6d7179');
    }
    A.box(P.CAR.len - 1.2, 0.02, 0.5, [c, 3.715, 0], '#8e949b');
    // ---- underfloor: equipment + bogies
    const eq = [];
    let ex = c - 5.1;
    while (ex < c + 4.6) { const w = 1.0 + r() * 1.7; if (ex + w > c + 5.1) break; eq.push([ex + w / 2, w]); ex += w + 0.25 + r() * 0.5; }
    for (const [x, w] of eq) { const h = 0.38 + r() * 0.28, d = 1.2 + r() * 1.1; A.box(w, h, d, [x, 1.0 - h / 2, (r() - 0.5) * 0.3], ['#474c54', '#555b63', '#3e4249'][(r() * 3) | 0]); }
    A.cyl(0.18, 0.18, 1.6, [c + 1, 0.78, -0.9], '#5c626b', [0, 0, Math.PI / 2], 10);
    for (const b of [-7, 7]) {
      const bx = c + b;
      A.box(0.6, 0.28, 2.2, [bx, 0.78, 0], '#3a3d44');
      for (const zs of [-1, 1]) {
        A.box(2.6, 0.24, 0.14, [bx, 0.6, zs * 1.0], '#40444b');
        A.box(0.9, 0.12, 0.1, [bx, 0.44, zs * 1.0], '#40444b');
        for (const wx of [-1.05, 1.05]) {
          A.cyl(0.43, 0.43, 0.12, [bx + wx, 0.43, zs * 0.62], '#2f3136', [Math.PI / 2, 0, 0], 16);
          A.cyl(0.3, 0.3, 0.13, [bx + wx, 0.43, zs * 0.62], '#4a4d54', [Math.PI / 2, 0, 0], 12);
          A.box(0.3, 0.26, 0.22, [bx + wx, 0.45, zs * 1.0], '#35383e');
          A.cyl(0.09, 0.09, 0.2, [bx + wx, 0.68, zs * 1.0], '#6a6f77', null, 8);
        }
      }
      for (const wx of [-1.05, 1.05]) A.cyl(0.075, 0.075, 1.3, [bx + wx, 0.43, 0], '#50545b', [Math.PI / 2, 0, 0], 8);
    }
    // ---- gangway bellows to the next car
    if (k < cars - 1) {
      const gx = c + step / 2;
      A.box(0.72, 2.15, 1.26, [gx, 2.24, 0], '#34373e');
      for (let i = -2; i <= 2; i++) A.box(0.03, 2.18, 1.3, [gx + i * 0.13, 2.24, 0], '#484c54');
      A.box(0.9, 0.2, 0.3, [gx, 0.86, 0], '#2f3238');
    }
  }
  // ---- cab fronts (both ends): lofted from the body section, raked top, black mask
  const heads = [], tails = [], leds = [];
  for (const e of [-1, 1]) {
    const xb = e * (E - 0.62);
    const slices = [0, 0.3, 0.6, 0.85, 1].map(t => half.map(([z, y]) => {
      const zz = z * (1 - 0.07 * t * t) * (y > 3.3 ? 1 - 0.1 * t : 1), yy = y > 3.45 ? y - 0.1 * t * t * (y - 3.45) / 0.26 : y;
      return [xb + e * (0.62 * t - rake(yy) * t), yy, zz];
    }));
    const colF = (y) => (y > 2.06 && y < 3.44 ? '#1e222b' : y > 3.44 ? liv.roof : y < 1.24 ? '#b3b8bf' : liv.bands.find(b => y > b[0] && y < b[1] && b[0] < 2.5)?.[2] || front);
    // loft (both sides) + the front face (fan)
    const pos = [], col = [];
    const tri = (a, b, cc, color) => { const o = e > 0 ? [a, b, cc] : [a, cc, b]; for (const p of o) pos.push(...p); _c.set(color); for (let i = 0; i < 3; i++) col.push(_c.r, _c.g, _c.b); };
    for (let i = 0; i < slices.length - 1; i++) for (let j = 0; j < half.length - 1; j++) for (const s of [-1, 1]) {
      const m = (p) => [p[0], p[1], s * p[2]];
      const a = m(slices[i][j]), b = m(slices[i][j + 1]), cc = m(slices[i + 1][j + 1]), d = m(slices[i + 1][j]);
      const color = colF((a[1] + b[1]) / 2);
      if (s > 0) { tri(a, cc, b, color); tri(a, d, cc, color); } else { tri(a, b, cc, color); tri(a, cc, d, color); }
    }
    const last = slices[slices.length - 1];
    for (let j = 0; j < half.length - 1; j++) for (const s of [-1, 1]) {
      const p = last[j], q = last[j + 1], cen0 = [p[0], p[1], 0], cen1 = [q[0], q[1], 0];
      const a = [p[0], p[1], s * p[2]], b = [q[0], q[1], s * q[2]];
      const color = colF((p[1] + q[1]) / 2);
      if (s > 0) { tri(cen0, b, a, color); tri(cen0, cen1, b, color); } else { tri(cen0, a, b, color); tri(cen0, b, cen1, color); }
    }
    const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); lg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); lg.computeVertexNormals();
    A.add(lg);
    const fx = (y) => xb + e * (0.62 - rake(y));   // front face x at height y
    // windscreen (two panes + centre pillar), wipers
    const wy0 = 2.3, wy1 = 3.22, wm = (wy0 + wy1) / 2, tilt = Math.atan2(rake(wy1) - rake(wy0), wy1 - wy0);
    for (const zc of [-0.66, 0.66]) {
      const g = G.plane.clone(); g.scale(1.22, (wy1 - wy0) / Math.cos(tilt), 1); g.rotateX(-tilt); g.rotateY(e > 0 ? Math.PI / 2 : -Math.PI / 2); g.translate(fx(wm) + e * 0.012, wm, zc);
      A.add(g, null, '#ffffff', R.cabGlass);
      A.box(0.012, 0.03, 0.62, [fx(2.36) + e * 0.02, 2.36, zc + 0.1], '#20242c', [0, 0, 0]);
    }
    A.box(0.03, wy1 - wy0, 0.06, [fx(wm) + e * 0.014, wm, 0], '#2b2f37', [0, 0, e * tilt]);
    // destination LED (emissive, separate) + headlights / taillights housings (lenses separate)
    leds.push({ x: fx(3.3) + e * 0.02, y: 3.32, z: 0, w: 1.0, h: 0.2, rotY: e > 0 ? Math.PI / 2 : -Math.PI / 2 });
    for (const zs of [-1, 1]) {
      A.box(0.08, 0.26, 0.62, [fx(1.62) + e * 0.02, 1.62, zs * 0.98], '#2b2f37');
      heads.push({ x: fx(1.62) + e * 0.065, y: 1.66, z: zs * 1.08, w: 0.3, h: 0.14, e });
      tails.push({ x: fx(1.62) + e * 0.065, y: 1.58, z: zs * 0.8, w: 0.14, h: 0.1, e });
    }
    if (liv.logo) A.plane(0.36, 0.17, [fx(1.9) + e * 0.02, 1.9, 0], [0, e > 0 ? Math.PI / 2 : -Math.PI / 2, 0], R.jrWest);
    // skirt (排障器) + coupler + hoses
    const sx = xb + e * 0.62;
    A.box(0.1, 0.62, 2.5, [sx + e * 0.08, 0.72, 0], '#3d4048');
    for (const zs of [-1, 1]) A.box(0.1, 0.6, 0.7, [sx - e * 0.12, 0.72, zs * 1.34], '#3d4048', [0, zs * e * 0.55, 0]);
    for (let i = -3; i <= 3; i++) A.box(0.12, 0.5, 0.03, [sx + e * 0.14, 0.72, i * 0.33], '#4a4d55');
    A.box(0.55, 0.2, 0.3, [sx + e * 0.25, 0.86, 0], '#2f3238'); A.box(0.12, 0.34, 0.4, [sx + e * 0.5, 0.86, 0], '#2f3238');
    for (const zs of [-1, 1]) A.cyl(0.03, 0.03, 0.4, [sx + e * 0.2, 0.98, zs * 0.4], '#d9463b', [0, 0, Math.PI / 2], 6);
    // grab handles + the front number plate
    for (const zs of [-1, 1]) A.box(0.03, 0.4, 0.03, [fx(2.0) + e * 0.03, 1.95, zs * 1.25], '#a9afb6');
  }
  return { body: A.build(), doorL: L.build(), doorR: Rr.build(), len: trainL, heads, tails, leds };
}

// ================================================================== Shinkansen (N700-style)
const S_HW = P.SCAR.w / 2;
const NOSE_L = 11.2;
/** piecewise cubic (smoothstep) interpolation through [[s, v], ...] */
const tab = (T, s) => { if (s <= T[0][0]) return T[0][1]; for (let i = 1; i < T.length; i++) if (s <= T[i][0]) { const t = (s - T[i - 1][0]) / (T[i][0] - T[i - 1][0]), k = t * t * (3 - 2 * t); return T[i - 1][1] + (T[i][1] - T[i - 1][1]) * k; } return T[T.length - 1][1]; };
const YB = [[0, 0.95], [0.7, 0.97], [0.9, 1.04], [1, 1.12]];
const YS = [[0, 1.95], [0.35, 1.86], [0.6, 1.66], [0.85, 1.4], [1, 1.2]];
const YT = [[0, 3.62], [0.1, 3.52], [0.3, 3.0], [0.5, 2.36], [0.7, 1.96], [0.86, 1.64], [1, 1.26]];
const CAB = [[0, 0], [0.1, 0.1], [0.24, 0.4], [0.36, 0.5], [0.5, 0.32], [0.62, 0.08], [0.72, 0]];
const shinSec = (s) => ({ s, w: S_HW * Math.pow(Math.max(0, 1 - Math.pow(s, 3.4)), 0.46), yb: tab(YB, s), ys: tab(YS, s), yt: tab(YT, s), cab: tab(CAB, s), n: 3.2 - 0.9 * s, n2: 3.6 - 1.2 * s });
/** a in [0, 2π): 0 = +z side, π/2 = top, π = -z side, 3π/2 = bottom */
function secPt(sec, a) {
  const ca = Math.cos(a), sa = Math.sin(a), up = sa >= 0;
  const z = sec.w * Math.sign(ca) * Math.pow(Math.abs(ca), 2 / (up ? sec.n : sec.n2));
  let y;
  if (up) { y = sec.ys + (sec.yt - sec.ys) * Math.pow(sa, 2 / sec.n); const q = sec.w > 1e-4 ? z / (sec.w * 0.58) : 0; y += sec.cab * Math.pow(Math.max(0, 1 - q * q), 0.8); }
  else y = sec.ys - (sec.ys - sec.yb) * Math.pow(-sa, 2 / sec.n2);
  return [z, y];
}
const S_WHITE = '#f4f5f6', S_BLUE = '#1a4fa3', S_GREY = '#c9ced4', S_GLASS = '#1b2330';
const STRIPE = [1.55, 1.78], THIN = [1.43, 1.48];
function shinColor(y, z, sec, s) {
  const side = sec.w > 1e-3 ? Math.abs(z) / sec.w : 0;
  if (y < sec.yb + 0.16) return S_GREY;
  // windscreen: on the cockpit canopy
  if (s > 0.2 && s < 0.5 && sec.cab > 0.2) { const q = z / (sec.w * 0.58); const c = Math.max(0, 1 - q * q); if (c > 0.35 && y > sec.yt + sec.cab * 0.5) return S_GLASS; }
  // the stripes sweep down along the nose and end at the headlights
  if (s < 0.8 && side > 0.55) {
    const k = s / 0.8, drop = 0.28 * k * k, taper = Math.pow(1 - k, 0.55);
    const mid = (STRIPE[0] + STRIPE[1]) / 2 - drop, hh = (STRIPE[1] - STRIPE[0]) / 2 * taper;
    if (Math.abs(y - mid) < hh) return S_BLUE;
    const tm = (THIN[0] + THIN[1]) / 2 - drop * 1.1, th = (THIN[1] - THIN[0]) / 2 * taper;
    if (s < 0.65 && Math.abs(y - tm) < th) return S_BLUE;
  }
  return S_WHITE;
}
/** body section loop (s = 0) with the stripe levels inserted */
function shinBodyProfile() {
  const sec = shinSec(0), half = [];
  const N = 40;
  for (let i = 0; i <= N; i++) { const a = -Math.PI / 2 + Math.PI * i / N; half.push(secPt(sec, a)); }
  half[0] = [0, half[0][1]]; half[N] = [0, half[N][1]];
  return mirrorLoop(withBands(half, [...STRIPE, ...THIN, 2.02, 2.55, sec.yb + 0.16]));
}
/** a (right side, -π/2..π/2) where the section reaches height y (y is monotonic in a there) */
function aForY(sec, y) {
  let lo = -Math.PI / 2, hi = Math.PI / 2;
  if (y <= secPt(sec, lo)[1]) return lo; if (y >= secPt(sec, hi)[1]) return hi;
  for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (secPt(sec, m)[1] < y) lo = m; else hi = m; }
  return (lo + hi) / 2;
}
/** a (upper half, 0..π) where the section reaches lateral position z (z decreases with a there) */
function aForZ(sec, z) {
  let lo = 0, hi = Math.PI;
  for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (secPt(sec, m)[0] > z) lo = m; else hi = m; }
  return (lo + hi) / 2;
}
/** the colour bands of the nose at s: y levels (bottom -> top) and the colour of each band between them */
function noseBands(sec, s) {
  const k = Math.min(1, s / 0.8), drop = 0.28 * k * k, taper = s < 0.8 ? Math.pow(1 - k, 0.55) : 0;
  const mid = (STRIPE[0] + STRIPE[1]) / 2 - drop, hh = (STRIPE[1] - STRIPE[0]) / 2 * taper;
  const k2 = Math.min(1, s / 0.65), tm = (THIN[0] + THIN[1]) / 2 - 0.28 * k * k * 1.1, th = s < 0.65 ? (THIN[1] - THIN[0]) / 2 * Math.pow(1 - k2, 0.55) : 0;
  const g = Math.min(sec.yb + 0.16, tm - th - 0.01);
  return { ys: [g, tm - th, tm + th, mid - hh, mid + hh], cols: [S_GREY, S_WHITE, S_BLUE, S_WHITE, S_BLUE, S_WHITE] };
}
const NOSE_SEG = [5, 6, 1, 4, 2, 34];   // ring samples per band on each side (bottom -> top)
/** lofted nose from x0 (joint) toward dir: every ring has the same topology, with vertices exactly on the band
 *  edges (so the stripes / skirt edges are crisp curves), smooth normals, per-face colours by band. */
function noseGeometry(x0, dir) {
  const NS = 70, rings = [];
  for (let i = 0; i <= NS; i++) {
    const u = i / NS, s = Math.pow(Math.sin(u * Math.PI / 2), 1.15), sec = shinSec(s), B = noseBands(sec, s);
    const anchors = [-Math.PI / 2, ...B.ys.map(y => aForY(sec, y)), Math.PI / 2];
    for (let k = 1; k < anchors.length; k++) anchors[k] = Math.max(anchors[k], anchors[k - 1]);
    const right = [], bandOf = [];
    for (let k = 0; k < anchors.length - 1; k++) for (let j = 0; j < NOSE_SEG[k]; j++) { const t = j / NOSE_SEG[k]; right.push(anchors[k] + (anchors[k + 1] - anchors[k]) * (k === 5 ? Math.sin(t * Math.PI / 2) : t)); bandOf.push(k); }
    right.push(Math.PI / 2);
    // full ring: right side bottom->top, then the left side top->bottom (mirrored)
    const as = [...right, ...right.slice(1, -1).reverse().map(a => Math.PI - a)];
    const cols = [...bandOf, ...bandOf.slice().reverse()].map(k => B.cols[k]);
    const ring = as.map(a => { const [z, y] = secPt(sec, a); return [x0 + dir * s * NOSE_L, y, z]; });
    rings.push({ s, sec, ring, cols });
  }
  const NR = rings[0].ring.length, idx = [], pos = [], fcol = [];
  for (const R0 of rings) for (const p of R0.ring) pos.push(...p);
  for (let i = 0; i < NS; i++) for (let j = 0; j < NR; j++) {
    const a = i * NR + j, b = i * NR + (j + 1) % NR, c = (i + 1) * NR + j, d = (i + 1) * NR + (j + 1) % NR;
    if (dir > 0) idx.push(a, c, b, b, c, d); else idx.push(a, b, c, b, d, c);
    const col = rings[i].cols[j] || S_WHITE; fcol.push(col, col);
  }
  const tip = pos.length / 3; const last = rings[NS]; pos.push(x0 + dir * (NOSE_L + 0.03), last.sec.yb * 0.5 + last.sec.yt * 0.5, 0);
  for (let j = 0; j < NR; j++) { const a = NS * NR + j, b = NS * NR + (j + 1) % NR; if (dir > 0) idx.push(a, tip, b); else idx.push(a, b, tip); fcol.push(S_WHITE); }
  let g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  g = g.toNonIndexed();
  const n = g.attributes.position.count, col = new Float32Array(n * 3);
  for (let t = 0; t < n / 3; t++) { _c.set(fcol[t]); for (let k = 0; k < 3; k++) { col[(t * 3 + k) * 3] = _c.r; col[(t * 3 + k) * 3 + 1] = _c.g; col[(t * 3 + k) * 3 + 2] = _c.b; } }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}
/** the cockpit windscreen: a smooth elliptical patch on the canopy (polar grid in (s, lateral q)), lifted off the
 *  surface, textured with the dark glass; plus its black frame */
function windscreen(A, x0, dir) {
  const SC = 0.335, RS = 0.105, RQ = 0.78, NRAD = 7, NPH = 48;
  const at = (rho, ph) => {
    const s = SC + RS * rho * Math.sin(ph), q = RQ * rho * Math.cos(ph), sec = shinSec(s);
    const z = q * 0.58 * sec.w, a = aForZ(sec, z), f = noseFrame(x0, dir, s, a);
    return { p: f.p.clone().addScaledVector(f.n, 0.012 + 0.006 * (rho > 1 ? 0 : 1)), uv: [0.5 + 0.5 * rho * Math.cos(ph), 0.5 + 0.5 * rho * Math.sin(ph)] };
  };
  const tri = (list, pa, pb, pc) => list.push(pa, pb, pc);
  for (const [r0, r1, rect, color] of [[0, 1, R.shinCab, '#ffffff'], [1, 1.1, null, '#0e1218']]) {
    const pos = [], uv = [];
    const steps = r1 - r0 > 0.5 ? NRAD : 1;
    for (let i = 0; i < steps; i++) for (let j = 0; j < NPH; j++) {
      const ra = r0 + (r1 - r0) * i / steps, rb = r0 + (r1 - r0) * (i + 1) / steps, pa = j / NPH * Math.PI * 2, pb = (j + 1) / NPH * Math.PI * 2;
      const v00 = at(ra, pa), v01 = at(ra, pb), v10 = at(rb, pa), v11 = at(rb, pb);
      const quad = dir > 0 ? [v00, v01, v11, v00, v11, v10] : [v00, v11, v01, v00, v10, v11];
      for (const v of quad) { pos.push(v.p.x, v.p.y, v.p.z); uv.push(v.uv[0], v.uv[1]); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.computeVertexNormals();
    // make sure the patch faces outward (upward on the canopy)
    let nY = 0; { const nn = g.attributes.normal; for (let i = 0; i < nn.count; i++) nY += nn.getY(i) || 0; } if (nY < 0) { const p3 = g.attributes.position; for (let t = 0; t < p3.count; t += 3) { for (const arr of [p3, g.attributes.uv]) { const sz = arr.itemSize; for (let c = 0; c < sz; c++) { const tmp = arr.array[(t + 1) * sz + c]; arr.array[(t + 1) * sz + c] = arr.array[(t + 2) * sz + c]; arr.array[(t + 2) * sz + c] = tmp; } } } g.computeVertexNormals(); }
    A.add(g, null, color, rect);
  }
}
/** point + outward normal on the nose surface at (s, a) */
function noseFrame(x0, dir, s, a) {
  const p = (ss, aa) => { const [z, y] = secPt(shinSec(ss), aa); return new THREE.Vector3(x0 + dir * ss * NOSE_L, y, z); };
  const c = p(s, a), ds = p(Math.min(1, s + 0.004), a).sub(p(Math.max(0, s - 0.004), a)), da = p(s, a + 0.004).sub(p(s, a - 0.004));
  const nrm = new THREE.Vector3().crossVectors(ds, da).normalize();
  if (nrm.dot(new THREE.Vector3(dir * 0.2, 0, Math.sign(c.z) || 1)) < 0) nrm.negate();
  return { p: c, n: nrm };
}

function shinGeometry(platSide, r) {
  const A = new Acc(), L = new Acc();
  const cars = P.shinCars(), doors = P.shinDoors();
  const prof = shinBodyProfile(), sec0 = shinSec(0);
  const bodyColor = (y, z) => shinColor(y, z, sec0, 0);
  const zAt = (y) => { const up = y >= sec0.ys, n = up ? sec0.n : sec0.n2, t = up ? (y - sec0.ys) / (sec0.yt - sec0.ys) : (sec0.ys - y) / (sec0.ys - sec0.yb); return sec0.w * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(t), n)), 1 / n); };
  const WY0 = 2.04, WY1 = 2.52, zw = zAt((WY0 + WY1) / 2);
  const heads = [], tails = [], leds = [];
  cars.forEach((car, k) => {
    const cx0 = car.c - car.len / 2 + (car.nose < 0 ? NOSE_L : 0.02), cx1 = car.c + car.len / 2 - (car.nose > 0 ? NOSE_L : 0.02);
    A.add(sweep(prof, cx0, cx1, bodyColor));
    if (car.nose) { const x0 = car.nose > 0 ? cx1 : cx0; A.add(noseGeometry(x0, car.nose)); windscreen(A, x0, car.nose); }
    // gangway rubber to the next car (a slightly smaller dark section)
    if (k < cars.length - 1) { const gp = prof.map(([z, y]) => [z * 0.95, 0.98 + (y - 0.98) * 0.97]); A.add(sweep(gp, car.c + car.len / 2 - 0.03, car.c + car.len / 2 + P.SCAR.gap + 0.03, () => '#555a62')); }
    const d = doors[k];
    for (const s of [-1, 1]) {
      const rot = [0, s > 0 ? 0 : Math.PI, 0];
      // windows at the seat pitch, clear of the door and the car ends / nose
      for (let x = cx0 + 1.2; x < cx1 - 1.0; x += 1.04) {
        if (Math.abs(x - d) < 1.4) continue;
        A.box(0.72, WY1 - WY0 + 0.07, 0.01, [x, (WY0 + WY1) / 2, s * (zw + 0.004)], '#2a2f38');
        A.plane(0.64, WY1 - WY0, [x, (WY0 + WY1) / 2, s * (zw + 0.011)], rot, R.shinWin((r() * 4) | 0));
      }
      // door: recess + leaf with its window (platform side slides)
      A.box(1.12, 1.96, 0.01, [d, 2.2, s * (zw + 0.003)], '#8d939a');
      const acc = s === platSide ? L : A;
      acc.box(1.02, 1.86, 0.03, [d, 2.18, s * (zw + 0.02)], S_WHITE);
      acc.box(0.36, 0.52, 0.01, [d, 2.55, s * (zw + 0.036)], '#2a2f38');
      acc.plane(0.3, 0.46, [d, 2.55, s * (zw + 0.042)], rot, R.shinDoorWin);
      acc.box(0.03, 0.26, 0.03, [d + 0.4, 2.0, s * (zw + 0.045)], '#a9afb6');
      // logos, car number + the small LED next to the door
      A.plane(0.34, 0.17, [d + (d > car.c ? -1.1 : 1.1), 2.3, s * (zw + 0.01)], rot, R.jrCentral);
      A.plane(0.26, 0.26, [d + (d > car.c ? -1.1 : 1.1), 2.72, s * (zw + 0.01)], rot, R.num(k + 1));
      leds.push({ x: d + (d > car.c ? -1.9 : 1.9), y: 2.78, z: s * (zw + 0.012), w: 0.62, h: 0.14, rotY: s > 0 ? 0 : Math.PI });
      if (car.nose) A.plane(0.9, 0.22, [car.c - car.nose * 3.5, 1.28, s * (zAt(1.28) + 0.012)], rot, R.n700);
    }
    // roof: pantograph shields on cars 5 and 12
    if (k === 4 || k === 11) {
      for (const zs of [-1, 1]) A.rbox(3.6, 0.42, 0.1, 0.04, [car.c, 3.75, zs * 0.8], S_GREY);
      A.box(1.2, 0.06, 1.0, [car.c, 3.66, 0], '#50555d');
      const hinge = [car.c - 0.5, 3.72], knee = [car.c + 0.9, 4.35], head = [car.c - 0.05, 5.0];
      for (const [a, b, t] of [[hinge, knee, 0.07], [knee, head, 0.06]]) { const dx = b[0] - a[0], dy = b[1] - a[1]; A.box(Math.hypot(dx, dy), t, t, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 0], '#3a3d44', [0, 0, Math.atan2(dy, dx)]); }
      A.box(0.12, 0.06, 1.6, [head[0], head[1], 0], '#2f3238');
    }
    // underside: bogies below the body skirt
    const bogies = car.nose ? [car.c - car.nose * (car.len / 2 - 3.2), car.c + car.nose * (car.len / 2 - NOSE_L - 0.8)] : [car.c - 8.75, car.c + 8.75];
    for (const bx of bogies) {
      A.box(3.0, 0.3, 2.1, [bx, 0.78, 0], '#3a3d44');
      for (const wx of [-1.25, 1.25]) for (const zs of [-1, 1]) { A.cyl(0.43, 0.43, 0.12, [bx + wx, 0.43, zs * 0.78], '#2f3136', [Math.PI / 2, 0, 0], 16); A.box(0.34, 0.26, 0.24, [bx + wx, 0.46, zs * 1.05], '#35383e'); }
    }
  });
  // headlights / taillights on the two noses
  for (const car of cars.filter(c => c.nose)) {
    const x0 = car.nose > 0 ? car.c + car.len / 2 - NOSE_L : car.c - car.len / 2 + NOSE_L, e = car.nose;
    for (const zs of [-1, 1]) {
      // long lamp units where the stripe ends: a dark housing strip following the surface, lens planes on it
      const hs = 0.79, secH = shinSec(hs), aH = aForY(secH, 1.47), mir = (a) => (zs > 0 ? a : Math.PI - a);
      const pos = [];
      const N = 8, pt = (s, a, off) => { const f = noseFrame(x0, e, s, mir(a)); return f.p.addScaledVector(f.n, off); };
      for (let i = 0; i < N; i++) {
        const s0 = 0.72 + 0.12 * i / N, s1 = 0.72 + 0.12 * (i + 1) / N;
        const a0 = aForY(shinSec(s0), 1.47 - 0.35 * (s0 - 0.72)), a1 = aForY(shinSec(s1), 1.47 - 0.35 * (s1 - 0.72));
        const q = [pt(s0, a0 - 0.1, 0.01), pt(s1, a1 - 0.1, 0.01), pt(s1, a1 + 0.1, 0.01), pt(s0, a0 + 0.1, 0.01)];
        const order = (e > 0) === (zs > 0) ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2];
        for (const k of order) pos.push(q[k].x, q[k].y, q[k].z);
      }
      const hg = new THREE.BufferGeometry(); hg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); hg.computeVertexNormals();
      A.add(hg, null, '#20252f');
      const hf = noseFrame(x0, e, 0.77, mir(aH)), tf = noseFrame(x0, e, 0.83, mir(aForY(shinSec(0.83), 1.3)));
      heads.push({ p: hf.p.clone().addScaledVector(hf.n, 0.03), n: hf.n.clone(), w: 0.7, h: 0.12, e });
      tails.push({ p: tf.p.clone().addScaledVector(tf.n, 0.02), n: tf.n.clone(), w: 0.26, h: 0.08, e });
    }
  }
  return { body: A.build(), doorL: L.build(), doorR: null, len: P.sTrainLen(), heads, tails, leds };
}

// ================================================================== build + run
export function buildTrains(ctx, H) {
  const { dyn } = H;
  const { mat } = ctx;
  const T = ctx.tex, F = T.FONTS;
  const atlas = paintAtlas(ctx);
  const bodyM = mat.toon('#ffffff', { vertexColors: true, map: atlas, paint: 0.01 });
  const headM = mat.emissive('#fff8ee', 2.4), tailM = mat.emissive('#ff4a3d', 1.9);
  const ledTex = (S, key, shin) => T.draw(256, 48, (g, w, h) => {
    g.fillStyle = '#101216'; g.fillRect(0, 0, w, h);
    if (shin) {
      g.fillStyle = '#ffb347'; g.font = `700 26px ${F.sans}`; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(`${S.name} ${S.no}号`, 8, 25);
      g.fillStyle = '#f4f2ea'; g.textAlign = 'right'; T.fitText(g, S.dest, w - 8, 25, 90, 26, F.sans, 700);
      return;
    }
    const tc = S.type === '新快速' ? '#4fb0ff' : S.type === '快速' ? '#ff9a3a' : S.type === '環状' ? '#ff9a3a' : S.type === '直通' ? '#6fe08a' : '#f4f2ea';
    g.fillStyle = tc; g.font = `700 30px ${F.sans}`; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(S.type, 10, 25);
    g.fillStyle = '#ffb347'; g.textAlign = 'right'; T.fitText(g, S.dest, w - 10, 25, 150, 30, F.sans, 700);
  }, { key: 'term.led.' + key });
  const trains = [];
  /** emissive planes for lights / LEDs of a train (merged per kind) */
  const planes = (list, m, grp) => {
    if (!list.length) return null;
    const geos = list.map(o => {
      const g = new THREE.PlaneGeometry(o.w, o.h);
      if (o.n) { g.applyMatrix4(new THREE.Matrix4().makeRotationY(Math.PI)); g.applyMatrix4(new THREE.Matrix4().lookAt(new THREE.Vector3(), o.n, new THREE.Vector3(0, 1, 0))); g.translate(o.p.x, o.p.y, o.p.z); }
      else { g.rotateY(o.rotY ?? (o.e > 0 ? Math.PI / 2 : -Math.PI / 2)); g.translate(o.x, o.y, o.z); }
      return g;
    });
    const mesh = new THREE.Mesh(mergeGeometries(geos, false), m); mesh.castShadow = false; grp.add(mesh); return mesh;
  };
  const lightsByEnd = (list, m, grp) => [-1, 1].map(e => planes(list.filter(o => o.e === e), m, grp));

  const geos = new Map();
  for (const [trk, S] of Object.entries(P.SERVICES)) {
    const I = P.ISLANDS.find(i => i.tracks.includes(+trk)), platSide = Math.sign(I.v - P.TRACKS[trk]);
    const key = S.line + S.cars + ':' + platSide;
    if (!geos.has(key)) geos.set(key, emuGeometry(S.cars, LIVERY[S.line], platSide, seeded(+trk * 31 + 7)));
    const Gm = geos.get(key);
    const grp = new THREE.Group(); grp.position.set(0, P.Y.rail, P.TRACKS[trk]);
    const body = new THREE.Mesh(Gm.body, bodyM), dl = new THREE.Mesh(Gm.doorL, bodyM), dr = new THREE.Mesh(Gm.doorR, bodyM);
    for (const m of [body, dl, dr]) { m.castShadow = true; m.receiveShadow = true; grp.add(m); }
    const heads = lightsByEnd(Gm.heads, headM, grp), tails = lightsByEnd(Gm.tails, tailM, grp);
    const ledM = mat.emissive('#ffffff', 1.25, { map: ledTex(S, trk) });
    const sideLeds = [];
    for (let k = 0; k < S.cars; k++) { const c = (k - (S.cars - 1) / 2) * (P.CAR.len + P.CAR.gap); for (const s of [-1, 1]) sideLeds.push({ x: c - 4.9, y: 3.3, z: s * (ZW + 0.016), w: 0.9, h: 0.17, rotY: s > 0 ? 0 : Math.PI }); }
    planes([...Gm.leds, ...sideLeds], ledM, grp);
    dyn.add(grp);
    trains.push({ kind: 'emu', track: +trk, S, grp, dl, dr, heads, tails, len: Gm.len, v: P.TRACKS[trk], doors: 0, snd: null, brake: false });
  }
  for (const [trk, S] of Object.entries(P.S_SERVICES)) {
    const Pl = P.S_PLATS.find(p => p.track === +trk), platSide = Pl ? Math.sign((Pl.v0 + Pl.v1) / 2 - P.S_TRACKS[trk]) : 0;
    const key = 'shin:' + platSide;
    if (!geos.has(key)) geos.set(key, shinGeometry(platSide, seeded(1301 + platSide)));
    const Gm = geos.get(key);
    const grp = new THREE.Group(); grp.position.set(0, P.Y.rail, P.S_TRACKS[trk]);
    const body = new THREE.Mesh(Gm.body, bodyM); body.castShadow = true; body.receiveShadow = true; grp.add(body);
    let dl = null; if (Gm.doorL) { dl = new THREE.Mesh(Gm.doorL, bodyM); dl.castShadow = true; grp.add(dl); }
    const heads = lightsByEnd(Gm.heads, headM, grp), tails = lightsByEnd(Gm.tails, tailM, grp);
    if (!S.pass) planes(Gm.leds, mat.emissive('#ffffff', 1.2, { map: ledTex(S, 's' + trk, true) }), grp);
    dyn.add(grp);
    trains.push({ kind: 'shin', track: trk, S, grp, dl, dr: null, heads, tails, len: Gm.len, v: P.S_TRACKS[trk], doors: 0, snd: null, brake: false });
  }

  // ---------------------------------------------------------------- update: motion, doors, lights, sound
  const listener = new THREE.Vector3();
  const au = ctx.audio;
  const soundPos = (tr) => { // nearest point of the train (a line) to the listener, in world space
    const lu = listener.x - P.ORIGIN.x, half = tr.len / 2, cu = tr.grp.position.x;
    const u = Math.max(cu - half, Math.min(cu + half, lu));
    return { x: P.ORIGIN.x + u, y: P.Y.rail + 1.6, z: P.ORIGIN.z + tr.v };
  };
  for (const tr of trains) {
    tr.pos = { x: 0, y: 0, z: 0 };
    tr.snd = au?.loop?.(tr.kind === 'shin' ? 'hsRun' : 'trainRun', { position: () => tr.pos, volume: 0, params: { speed: 0 } }) || null;
  }
  H.update((dt, t) => {
    const here = H.visible();
    listener.copy(ctx.camera.position);
    for (const tr of trains) {
      const s = tr.kind === 'shin' ? P.shinState(tr.track, t) : P.convState(tr.track, t);
      const vis = s.phase !== 'gone' && Math.abs(s.center) < (tr.kind === 'shin' ? 1400 : 900);
      tr.grp.visible = vis;
      tr.state = s;
      if (!vis) { if (tr.snd) tr.snd.setVolume(0, 0.3); tr.brake = false; continue; }
      tr.grp.position.x = s.center;
      // lights: headlights at the leading end, tail lights at the rear
      const lead = s.dir > 0 ? 1 : 0;
      for (let i = 0; i < 2; i++) { if (tr.heads[i]) tr.heads[i].visible = i === lead; if (tr.tails[i]) tr.tails[i].visible = i !== lead; }
      // doors (platform side only)
      const d = s.doors;
      if (tr.kind === 'emu') { tr.dl.position.x = -0.64 * d; tr.dr.position.x = 0.64 * d; }
      else if (tr.dl) { tr.dl.position.x = 1.1 * d; }
      if (d > 0.5 && tr.doors <= 0.5 && here) { const p = soundPos(tr); au?.play('doorOpen', { position: p }); au?.play(tr.kind === 'shin' ? 'shinDoor' : 'doorChime', { position: p }); }
      if (d < 0.99 && tr.doors >= 0.99 && here) { const p = soundPos(tr); au?.play('doorClose', { position: p }); au?.play(tr.kind === 'shin' ? 'shinDoor' : 'doorChime', { position: p }); }
      tr.doors = d;
      // sound
      if (tr.snd) {
        const p = soundPos(tr); tr.pos.x = p.x; tr.pos.y = p.y; tr.pos.z = p.z;
        tr.snd.setVolume(here ? (tr.kind === 'shin' ? 1.0 : 0.9) : 0, 0.3);
        tr.snd.setParam('speed', s.speed);
      }
      if (s.phase === 'approach' && s.speed < (tr.kind === 'shin' ? 12 : 8) && !tr.brake) { tr.brake = true; if (here) au?.play('trainBrake', { position: soundPos(tr) }); }
      if (s.phase !== 'approach') tr.brake = false;
    }
  });
  return { list: trains };
}
