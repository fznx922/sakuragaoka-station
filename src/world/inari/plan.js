// 稲荷山 (Inariyama) — the pure plan of the mountain shrine area, modelled on Fushimi Inari Taisha:
// a shop-lined approach (門前町) → 一の鳥居 → 二の鳥居 → 楼門 → 外拝殿 / 本殿 → the forked 千本鳥居
// tunnels → 奥社奉拝所 → a torii-tunnel trail past 新池 up to the 四ツ辻 viewpoint → the summit (一ノ峰).
//
// Self-contained (no imports): layout.js imports groundAt() for heightAt(), so this file must not
// import layout.js back. Everything is a pure function of coordinates (deterministic).
//
// Local frame: u = x - ORIGIN.x (+u = east, up the mountain), v = z - ORIGIN.z (+v = south).
// The shrine faces WEST (like the real one): visitors walk east (+u) from the town side.

export const ORIGIN = { x: 4000, z: 0 };
/** Walkable bounds in local coords (the player is clamped to these while in the area). */
export const BOUNDS = { u0: -46, u1: 440, v0: -190, v1: 110 };
export const RISE = 0.15; // stone step riser height; every plateau / flat is a multiple of it

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const sm = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
export const quant = (y) => Math.round(y / RISE) * RISE;

// ------------------------------------------------------------------ noise (own copy: no imports)
function hash2(ix, iz, seed) {
  let h = (Math.imul(ix | 0, 374761393) + Math.imul(iz | 0, 668265263) + Math.imul(seed | 0, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
export function vnoise(x, z, seed = 0) {
  const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx), uz = fz * fz * (3 - 2 * fz);
  const a = hash2(ix, iz, seed), b = hash2(ix + 1, iz, seed), c = hash2(ix, iz + 1, seed), d = hash2(ix + 1, iz + 1, seed);
  return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz;
}
export function fbm(x, z, oct = 3, seed = 0) {
  let s = 0, a = 0.5, n = 0, f = 1;
  for (let i = 0; i < oct; i++) { s += a * vnoise(x * f + i * 17.3, z * f - i * 9.1, seed + i * 7); n += a; a *= 0.5; f *= 2.03; }
  return s / n;
}

// ------------------------------------------------------------------ natural relief
export const SUMMIT = { u: 392, v: -46 };
/** The untouched mountain: flat town basin in the west, the 東山 range rising east, 稲荷山 on it. */
export function natural(u, v) {
  let h = 2.4 * sm(24, 66, u);
  // the range (continues north / south beyond the area)
  const ru = u + 30 * (fbm(v / 140, 3.1, 2, 5) - 0.5);
  h += 26 * sm(180, 520, ru);
  // Inariyama: a broad cone with a concave foot
  const du = u - SUMMIT.u, dv = (v - SUMMIT.v) * 1.08;
  const x = Math.min(1, Math.hypot(du, dv) / 300);
  h += 50 * Math.pow(1 - x, 2.2);
  // ridges / gullies and small bumps on the forested slopes
  const w = sm(70, 170, u);
  if (w > 0) h += w * ((fbm(u / 70, v / 70, 3, 11) - 0.5) * 9 + (vnoise(u / 13, v / 13, 12) - 0.5) * 1.6);
  // far east: more mountains
  if (u > 470) h += (u - 470) * 0.12 * (0.6 + 0.8 * fbm(u / 300, v / 300, 2, 13));
  return h;
}

// ------------------------------------------------------------------ flats (plateaus)
// Rounded rectangles flattened to y; m = fall-off width (m) outside the rectangle.
export const FLATS = [
  { id: 'town', u0: -2600, u1: 56, v0: -2600, v1: 2600, y: 0, m: 1.5, r: 0 },         // 門前町 + city basin
  { id: 'precinct', u0: 62, u1: 132, v0: -30, v1: 30, y: 2.4, m: 1.0, r: 3 },       // 境内 (楼門 / 拝殿 / 本殿)
  { id: 'senbonGate', u0: 144, u1: 157, v0: -29.5, v1: -14.5, y: 5.4, m: 3, r: 2 },   // 千本鳥居 entrance
  { id: 'okusha', u0: 236, u1: 257, v0: -35, v1: -10, y: 'auto', m: 4, r: 3 },        // 奥社奉拝所
  { id: 'shinike', u0: 282, u1: 304, v0: -4, v1: 14, y: 'auto', m: 4, r: 6 },         // 新池 (pond) + 熊鷹社
  { id: 'mitsu', u0: 290, u1: 306, v0: -53, v1: -41, y: 'auto', m: 3, r: 3 },         // 三ツ辻 茶屋
  { id: 'yotsu', u0: 306, u1: 326, v0: -100, v1: -82, y: 'auto', m: 4, r: 4 },        // 四ツ辻 viewpoint
  { id: 'summit', u0: 383, u1: 401, v0: -56, v1: -37, y: 'auto', m: 4, r: 5 },        // 一ノ峰 (上社神蹟)
];
const FLAT_BY = Object.fromEntries(FLATS.map(f => [f.id, f]));
for (const f of FLATS) if (f.y === 'auto') f.y = quant(natural((f.u0 + f.u1) / 2, (f.v0 + f.v1) / 2));
/** distance outside a rounded rectangle (0 inside) */
export function flatDist(f, u, v) {
  const r = f.r || 0;
  const du = Math.max(f.u0 + r - u, 0, u - f.u1 + r), dv = Math.max(f.v0 + r - v, 0, v - f.v1 + r);
  return Math.max(0, Math.hypot(du, dv) - r);
}
export function flatAt(u, v) { for (const f of FLATS) if (flatDist(f, u, v) <= 0) return f; return null; }
/** 新池: an elliptic pond basin on the shinike flat. */
export const POND = { u: 294.5, v: 6.2, ru: 6.8, rv: 4.8, depth: 1.1 };
export const pondDist = (u, v) => Math.hypot((u - POND.u) / POND.ru, (v - POND.v) / POND.rv);
function flattened(u, v) {
  let h = natural(u, v);
  for (const f of FLATS) {
    const d = flatDist(f, u, v);
    if (d >= f.m) continue;
    h = lerp(h, f.y, 1 - sm(0, f.m, d));
  }
  const pd = pondDist(u, v);
  if (pd < 1.05) h -= POND.depth * (1 - sm(0.72, 1.02, pd));
  return h;
}

// ------------------------------------------------------------------ paths
// pts: control points (u,v) — resampled as a centripetal Catmull-Rom curve every DS m.
// hw: half width of the flat corridor (walkway + torii pillars). prof: explicit [s, y] profile
// (s in metres from the start) or null = follow the (flattened) terrain, smoothed, ends pinned.
// torii: tunnel spec { gap: [[s0, s1], ...] of s without torii, step (m between torii), h, span }.
export const PATHS = [
  { id: 'front', pts: [[48, 0], [70, 0]], hw: 4.2, prof: [[0, 0], [7.1, 0], [14.6, 2.4], [22, 2.4]], kind: 'grand' },
  { id: 'back', pts: [[99, -21.5], [116, -21.5], [132, -21.5], [150, -21.5]], hw: 1.7, prof: [[0, 2.4], [33, 2.4], [47, 5.4], [51, 5.4]], kind: 'stair' },
  { id: 'senbonL', pts: [[150, -24.3], [156, -24.3], [168, -25.2], [182, -27.8], [196, -29.6], [210, -29.4], [222, -27.4], [232, -25.2], [240, -24.6]], hw: 1.12, prof: null, kind: 'tunnel', torii: { step: 0.44, h: 2.5, span: 1.86, s0: 6.0, gaps: [] } },
  { id: 'senbonR', pts: [[150, -18.7], [156, -18.7], [168, -19.6], [182, -22.2], [196, -24.0], [210, -23.8], [222, -21.8], [232, -19.6], [240, -19.0]], hw: 1.12, prof: null, kind: 'tunnel', torii: { step: 0.44, h: 2.5, span: 1.86, s0: 6.0, gaps: [] } },
  { id: 'upper', pts: [[250, -12], [258, -6], [268, -4], [280, -6], [290, -12], [298, -24], [301, -36], [301, -47], [304, -58], [310, -68], [314, -80], [316, -88]], hw: 1.3, prof: null, kind: 'tunnel', torii: { step: 0.62, h: 2.9, span: 2.1, s0: 3.5, gaps: [[31, 43], [58, 65], [75, 88]] } },
  { id: 'summitA', pts: [[322, -86], [336, -98], [354, -106], [372, -102], [386, -90], [396, -76], [400, -63], [396, -54]], hw: 1.3, prof: null, kind: 'tunnel', torii: { step: 0.7, h: 2.9, span: 2.1, s0: 3.0, gaps: [[40, 48]] } },
  { id: 'summitB', pts: [[394, -38], [392, -24], [382, -10], [366, -4], [350, -10], [338, -24], [330, -42], [324, -62], [318, -78], [317, -85]], hw: 1.2, prof: null, kind: 'tunnel', torii: { step: 0.95, h: 2.7, span: 1.95, s0: 4.0, gaps: [[30, 44], [70, 80], [98, 104]] } },
];
const DS = 0.5;

function catmull(pts, ds) {
  // centripetal Catmull-Rom through pts, then arc-length resample
  const P = pts.map(p => ({ u: p[0], v: p[1] }));
  const ext = [{ u: 2 * P[0].u - P[1].u, v: 2 * P[0].v - P[1].v }, ...P, { u: 2 * P[P.length - 1].u - P[P.length - 2].u, v: 2 * P[P.length - 1].v - P[P.length - 2].v }];
  const dense = [];
  for (let i = 1; i < ext.length - 2; i++) {
    const p0 = ext[i - 1], p1 = ext[i], p2 = ext[i + 1], p3 = ext[i + 2];
    const n = Math.max(4, Math.ceil(Math.hypot(p2.u - p1.u, p2.v - p1.v) / 0.1));
    for (let j = 0; j < n; j++) {
      const t = j / n, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      dense.push([f(p0.u, p1.u, p2.u, p3.u), f(p0.v, p1.v, p2.v, p3.v)]);
    }
  }
  dense.push(pts[pts.length - 1]);
  const out = [dense[0]]; let acc = 0, need = ds;
  for (let i = 1; i < dense.length; i++) {
    let [au, av] = dense[i - 1]; const [bu, bv] = dense[i];
    let seg = Math.hypot(bu - au, bv - av);
    while (acc + seg >= need) {
      const t = (need - acc) / seg; au += (bu - au) * t; av += (bv - av) * t; seg -= (need - acc);
      out.push([au, av]); acc = 0; need = ds;
    }
    acc += seg;
  }
  const last = dense[dense.length - 1], lo = out[out.length - 1];
  if (Math.hypot(last[0] - lo[0], last[1] - lo[1]) > ds * 0.3) out.push(last); else out[out.length - 1] = last;
  return out;
}

function interpProfile(prof, s) {
  if (s <= prof[0][0]) return prof[0][1];
  for (let i = 1; i < prof.length; i++) if (s <= prof[i][0]) { const [s0, y0] = prof[i - 1], [s1, y1] = prof[i]; return lerp(y0, y1, (s - s0) / (s1 - s0)); }
  return prof[prof.length - 1][1];
}

// Prepare every path: samples {u, v, s, tu, tv (unit tangent), y (smooth), q (stepped)}.
for (const p of PATHS) {
  const pts = catmull(p.pts, DS);
  const S = [0]; for (let i = 1; i < pts.length; i++) S.push(S[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  let Y;
  if (p.prof) Y = S.map(s => interpProfile(p.prof, s));
  else {
    Y = pts.map(([u, v]) => flattened(u, v));
    const y0 = Y[0], y1 = Y[Y.length - 1];
    const win = Math.round(9 / DS);
    for (let pass = 0; pass < 4; pass++) {
      const Z = Y.slice();
      for (let i = 0; i < Y.length; i++) { let a = 0, n = 0; for (let j = -win; j <= win; j++) { const k = clamp(i + j, 0, Y.length - 1); a += Y[k]; n++; } Z[i] = a / n; }
      Y = Z;
    }
    // pin both ends to the flats they start / end in: spread the correction over the whole length
    const L = S[S.length - 1], c0 = quant(y0) - Y[0], c1 = quant(y1) - Y[Y.length - 1];
    Y = Y.map((y, i) => y + c0 * (1 - S[i] / L) + c1 * (S[i] / L));
    Y[0] = quant(y0); Y[Y.length - 1] = quant(y1);
  }
  p.samples = pts.map(([u, v], i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    const tl = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return { u, v, s: S[i], tu: (b[0] - a[0]) / tl, tv: (b[1] - a[1]) / tl, y: Y[i] };
  });
  p.length = S[S.length - 1];
}
export const pathById = (id) => PATHS.find(p => p.id === id);
/** smooth path height at arc length s */
export function pathY(p, s) {
  const ss = p.samples, i = clamp(Math.floor(s / DS), 0, ss.length - 2);
  const a = ss[i], b = ss[i + 1];
  return lerp(a.y, b.y, clamp((s - a.s) / ((b.s - a.s) || 1), 0, 1));
}
/** stepped (stair) height at arc length s — what you walk on */
export const stepY = (p, s) => quant(pathY(p, s));
/** frame on a path at s: {u, v, tu, tv, y, q} */
export function pathFrame(p, s) {
  const ss = p.samples, i = clamp(Math.floor(s / DS), 0, ss.length - 2);
  const a = ss[i], b = ss[i + 1], t = clamp((s - a.s) / ((b.s - a.s) || 1), 0, 1);
  let tu = lerp(a.tu, b.tu, t), tv = lerp(a.tv, b.tv, t); const l = Math.hypot(tu, tv) || 1; tu /= l; tv /= l;
  const y = lerp(a.y, b.y, t);
  return { u: lerp(a.u, b.u, t), v: lerp(a.v, b.v, t), tu, tv, y, q: quant(y) };
}

// spatial index of path segments (8 m cells), for nearest-point queries
const CELL = 8, REACH = 14;
const grid = new Map();
PATHS.forEach((p, pi) => {
  const ss = p.samples;
  for (let i = 0; i < ss.length - 1; i++) {
    const a = ss[i], b = ss[i + 1];
    const r = p.hw + REACH;
    const x0 = Math.floor((Math.min(a.u, b.u) - r) / CELL), x1 = Math.floor((Math.max(a.u, b.u) + r) / CELL);
    const z0 = Math.floor((Math.min(a.v, b.v) - r) / CELL), z1 = Math.floor((Math.max(a.v, b.v) + r) / CELL);
    for (let ix = x0; ix <= x1; ix++) for (let iz = z0; iz <= z1; iz++) { const k = ix * 100003 + iz; let arr = grid.get(k); if (!arr) grid.set(k, (arr = [])); arr.push(pi, i); }
  }
});
/** Nearest path point: { p, s, d (lateral distance), side (+1 = right of travel) } or null (> REACH). */
export function nearestPath(u, v, only = null) {
  const arr = grid.get(Math.floor(u / CELL) * 100003 + Math.floor(v / CELL));
  if (!arr) return null;
  let best = null, bd = 1e9;
  for (let k = 0; k < arr.length; k += 2) {
    const p = PATHS[arr[k]]; if (only && p !== only) continue;
    const a = p.samples[arr[k + 1]], b = p.samples[arr[k + 1] + 1];
    const eu = b.u - a.u, ev = b.v - a.v, l2 = eu * eu + ev * ev || 1;
    const t = clamp(((u - a.u) * eu + (v - a.v) * ev) / l2, 0, 1);
    const pu = a.u + eu * t, pv = a.v + ev * t, d = Math.hypot(u - pu, v - pv);
    // prefer the path whose corridor we are inside (relative distance)
    const rel = d - p.hw;
    if (rel < bd) { bd = rel; best = { p, s: a.s + (b.s - a.s) * t, d, side: Math.sign(eu * (v - a.v) - ev * (u - a.u)) }; }
  }
  return best;
}

/** Ground height (local coords). Exact flat stairs inside path corridors; terrain blended around them. */
export function groundLocal(u, v) {
  const f = flattened(u, v);
  const np = nearestPath(u, v);
  if (!np) return f;
  const { p, s, d } = np;
  if (d <= p.hw) return stepY(p, s);
  const py = pathY(p, s);
  const m = clamp(1.4 + 0.8 * Math.abs(f - py), 1.4, REACH - 0.5);
  return lerp(f, py, 1 - sm(0, m, d - p.hw));
}
/** World-space ground height, used by layout.heightAt for x beyond the town. */
export function groundAt(x, z) { return groundLocal(x - ORIGIN.x, z - ORIGIN.z); }
export const isInari = (x) => x > ORIGIN.x - 1500;
export const toWorld = (u, v) => ({ x: ORIGIN.x + u, z: ORIGIN.z + v });
export const flatById = (id) => FLAT_BY[id];

// ------------------------------------------------------------------ named spots (for the HUD, portals, views)
export const SPOTS = {
  arrive: { u: -38, v: 1.2, yaw: -90, pitch: 3 },        // start of the approach, looking east at 一の鳥居
  leave: { u0: -46, u1: -42.5 },                          // walking back past here returns to town
  ichi: { u: 6 }, ni: { u: 36 },                          // great torii
  romon: { u: 72 }, gehaiden: { u: 94 }, honden: { u: 116 },
  view: { u: 316, v: -96, yaw: 72, pitch: -4 },           // 四ツ辻 view over the basin
};
export const AREAS = [
  { name: '一ノ峰 · 上社神蹟', ...box('summit', 8) },
  { name: '四ツ辻 · 眺望', ...box('yotsu', 6) },
  { name: '三ツ辻', ...box('mitsu', 4) },
  { name: '新池 · 熊鷹社', ...box('shinike', 5) },
  { name: '奥社奉拝所', ...box('okusha', 2) },
  { name: '千本鳥居', u0: 143, u1: 240, v0: -34, v1: -12 },
  { name: '稲荷山 本殿', u0: 62, u1: 140, v0: -32, v1: 32 },
  { name: '稲荷山 表参道', u0: -46, u1: 62, v0: -30, v1: 30 },
  { name: '稲荷山 お山めぐり', u0: -60, u1: 500, v0: -260, v1: 200 },
];
function box(id, pad) { const f = FLAT_BY[id]; return { u0: f.u0 - pad, u1: f.u1 + pad, v0: f.v0 - pad, v1: f.v1 + pad }; }
