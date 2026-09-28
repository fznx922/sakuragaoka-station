// Torii: the 千本鳥居 tunnels (instanced, ~800 gates on stepped bases, inscriptions on the uphill face
// of every pillar) and the great 稲荷鳥居 (vermilion, black kasagi + 台輪 rings + 根巻).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as P from './plan.js';

export const VERM = '#e55a34', BLACK = '#3f3a45';

/** Box bent along x: y += bend(xNorm), xNorm in [-1, 1]. */
export function bentBox(w, h, d, seg, bend) {
  const g = new THREE.BoxGeometry(w, h, d, seg, 1, 1);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) + bend(p.getX(i) / (w / 2)));
  g.computeVertexNormals();
  return g;
}
const strip = (g) => { const n = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(n.attributes)) if (!['position', 'normal', 'uv'].includes(k)) n.deleteAttribute(k); return n; };

// unit tunnel torii: span 1.86 m between pillar centres, height 2.5 m
const U = { S: 1.86, H: 2.5, R: 0.112 };
function unitParts() {
  const { S, H, R } = U;
  const pillar = new THREE.CylinderGeometry(R * 0.93, R, H + 0.2, 12, 1, true).rotateY(Math.PI).translate(0, (H + 0.2) / 2 - 0.2, 0);
  const verm = mergeGeometries([
    new THREE.BoxGeometry(S + 0.46, 0.12, 0.085).translate(0, H * 0.79, 0),                    // 貫 nuki
    new THREE.BoxGeometry(S + 0.5, 0.1, 0.13).translate(0, H - 0.03, 0),                       // 島木 shimaki
    new THREE.BoxGeometry(0.09, H * 0.2 - 0.14, 0.07).translate(0, (H * 0.79 + H - 0.03) / 2, 0), // 額束 gakuzuka
  ].map(strip));
  const black = mergeGeometries([
    bentBox(S + 0.86, 0.1, 0.19, 12, (t) => 0.075 * Math.pow(Math.abs(t), 2.6)).translate(0, H + 0.075, 0), // 笠木 kasagi
    ...[-1, 1].map(s => new THREE.CylinderGeometry(R * 1.2, R * 1.26, 0.52, 12).translate(s * S / 2, 0.05, 0)), // 根巻 nemaki
  ].map(strip));
  return { pillar, verm, black };
}

/** All tunnel torii of every path with a `torii` spec. Returns {count}. */
export function buildTunnels(ctx, root, tx) {
  const { mat, physics } = ctx;
  const parts = unitParts();
  const list = [];
  for (const p of P.PATHS) {
    const T = p.torii; if (!T) continue;
    const r = ctx.rng('inari.torii.' + p.id);
    const inGap = (s) => T.gaps.some(([a, b]) => s > a && s < b);
    let s = T.s0, run = null;
    const flush = () => { if (run) { walls(p, T, run); run = null; } };
    while (s < p.length - T.s0) {
      if (inGap(s)) { flush(); s += T.step; continue; }
      const f = P.pathFrame(p, s);
      const y = P.stepY(p, s);
      const sc = 1 + (r() - 0.5) * 0.05;
      list.push({ u: f.u, v: f.v, y, rot: Math.atan2(f.tu, f.tv), sx: T.span / U.S * sc, sy: T.h / U.H * (1 + (r() - 0.5) * 0.06), tone: 0.9 + r() * 0.16, var: r() < 0.5 ? 0 : 1 });
      if (!run) run = { s0: s, s1: s }; else run.s1 = s;
      s += T.step * (1 + (r() - 0.5) * 0.12);
    }
    flush();
  }
  // colliders: the tunnel walls (pillar rows) in ~2 m chunks
  function walls(p, T, run) {
    for (let a = run.s0; a < run.s1; a += 2) {
      const b = Math.min(run.s1, a + 2), m = (a + b) / 2, f = P.pathFrame(p, m);
      let y0 = Infinity, y1 = -Infinity; for (const s of [a, m, b]) { const y = P.stepY(p, s); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
      for (const side of [-1, 1]) {
        const off = side * T.span / 2;
        const w = P.toWorld(f.u - f.tv * off, f.v + f.tu * off);
        physics.addBox(w.x, w.z, 0.3, b - a + 0.3, Math.atan2(f.tu, f.tv), y0 - 1, y1 + T.h);
      }
    }
  }
  const n = list.length;
  const vermM = mat.toon(VERM, { paint: 0.04 }), blackM = mat.toon(BLACK, { paint: 0.03 });
  const pillarM = [0, 1].flatMap(i => [mat.toon('#ffffff', { map: tx.pillars.L[i], paint: 0.04 }), mat.toon('#ffffff', { map: tx.pillars.R[i], paint: 0.04 })]);
  const mk = (geo, m, count) => { const im = new THREE.InstancedMesh(geo, m, count); im.castShadow = true; im.receiveShadow = true; im.frustumCulled = true; root.add(im); return im; };
  const vermI = mk(parts.verm, vermM, n), blackI = mk(parts.black, blackM, n);
  const byVar = [0, 1].map(v => list.filter(t => t.var === v));
  const pil = byVar.map((arr, v) => [mk(parts.pillar, pillarM[v * 2], arr.length), mk(parts.pillar, pillarM[v * 2 + 1], arr.length)]);
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), Y = new THREE.Vector3(0, 1, 0), V = new THREE.Vector3(), Sv = new THREE.Vector3(), O = new THREE.Matrix4();
  const c = new THREE.Color();
  list.forEach((t, i) => {
    Q.setFromAxisAngle(Y, t.rot); V.set(t.u, t.y, t.v); Sv.set(t.sx, t.sy, t.sx);
    M.compose(V, Q, Sv);
    vermI.setMatrixAt(i, M); blackI.setMatrixAt(i, M);
    c.setRGB(t.tone, t.tone * (0.97 + 0.03 * t.tone), t.tone); vermI.setColorAt(i, c);
  });
  byVar.forEach((arr, v) => arr.forEach((t, i) => {
    Q.setFromAxisAngle(Y, t.rot); V.set(t.u, t.y, t.v); Sv.set(t.sx, t.sy, t.sx); M.compose(V, Q, Sv);
    c.setScalar(t.tone);
    for (const side of [0, 1]) { // 0 = left (+x), 1 = right (-x)
      O.makeTranslation((side ? -1 : 1) * U.S / 2, 0, 0).premultiply(M);
      pil[v][side].setMatrixAt(i, O); pil[v][side].setColorAt(i, c);
    }
  }));
  for (const im of [vermI, blackI, ...pil.flat()]) { im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; im.computeBoundingSphere(); }
  return { count: n };
}

/** Great 稲荷鳥居 in kit space: centre of the passage at the origin, facing ±z. o: {span, h, r, gaku (texture), lean} */
export function greatTorii(ctx, k, o) {
  const { mat } = ctx;
  const S = o.span, H = o.h, R = o.r, lean = o.lean ?? 0.012;
  const verm = mat.toon(VERM, { paint: 0.04 }), black = mat.toon(BLACK, { paint: 0.03 });
  for (const s of [-1, 1]) {
    const top = S / 2 - s * 0 - Math.sin(lean) * H;
    k.mesh(new THREE.CylinderGeometry(R * 0.9, R, H, 28), verm, [s * (S / 2 - Math.sin(lean) * H / 2), H / 2, 0], [0, 0, s * lean]);
    k.cyl(R * 1.13, R * 1.18, H * 0.085, black, [s * S / 2, H * 0.042, 0], null, 28);       // 根巻
    k.cyl(R * 1.25, R * 1.25, R * 0.42, black, [s * top, H - R * 0.05, 0], null, 28);        // 台輪
    k.cyl(R * 0.97, R * 0.97, R * 0.2, black, [s * top, H * 0.7, 0], null, 28);             // band at the nuki
  }
  k.box(S + R * 2.9, R * 0.95, R * 0.72, verm, [0, H * 0.77, 0]);                               // 貫
  for (const s of [-1, 1]) k.box(R * 0.32, R * 1.1, R * 0.95, black, [s * (S / 2 + R * 1.02), H * 0.77, 0]); // 楔
  k.mesh(bentBox(S + R * 4.8, R * 0.85, R * 1.25, 24, (t) => R * 0.45 * Math.pow(Math.abs(t), 2.4)), verm, [0, H + R * 0.55, 0]);   // 島木
  k.mesh(bentBox(S + R * 6.2, R * 0.8, R * 1.6, 28, (t) => R * 1.05 * Math.pow(Math.abs(t), 2.4)), black, [0, H + R * 1.35, 0]);   // 笠木
  const gh = H * 0.23 - R * 0.6;
  k.box(R * 0.75, gh, R * 0.6, verm, [0, H * 0.77 + R * 0.45 + gh / 2, 0]);                   // 額束
  if (o.gaku) {
    const gy = H * 0.77 + R * 0.45 + gh / 2, gw = R * 1.7, ghh = Math.min(gh * 0.9, R * 3.0);
    k.box(gw, ghh, R * 0.3, black, [0, gy, R * 0.32]);
    k.plane(gw * 0.82, ghh * 0.86, mat.toon('#ffffff', { map: o.gaku, paint: 0.01 }), [0, gy, R * 0.475]);
  }
  return { collide: (addCyl) => { for (const s of [-1, 1]) addCyl(s * S / 2, 0, R * 1.2); } };
}
