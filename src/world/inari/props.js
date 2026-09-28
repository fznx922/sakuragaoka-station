// Small pieces shared by the 稲荷山 builders. Every function draws into a kit (ctx.kit(group)) in the
// group's local frame: origin on the ground, front = +z.
import * as THREE from 'three';
import { bentBox, VERM, BLACK } from './torii.js';

export function materials(ctx, tx) {
  const { mat } = ctx;
  return {
    verm: mat.toon(VERM, { paint: 0.04 }), vermDark: mat.toon('#c9502f', { paint: 0.04 }), black: mat.toon(BLACK, { paint: 0.03 }),
    stone: mat.toon('#ffffff', { map: tx.stone, paint: 0.06 }), stoneD: mat.toon('#c9c4ba', { map: tx.stone, paint: 0.06 }), stoneMoss: mat.toon('#b7bca4', { map: tx.stone, paint: 0.08 }),
    statue: mat.toon('#ecebe5', { map: tx.stone, paint: 0.05 }), bronze: mat.toon('#6f8a78', { paint: 0.06 }), bronzeD: mat.toon('#56705f', { paint: 0.05 }),
    gold: mat.toon('#dcb866', { paint: 0.02 }), white: mat.toon('#f3efe6', { paint: 0.02 }), ink: mat.toon('#3a3346', { paint: 0 }),
    red: mat.toon('#d9503f', { paint: 0.03 }), redD: mat.toon('#b8453a', { paint: 0.03, side: 'double' }), felt: mat.toon('#d4463d', { paint: 0.04 }),
    wood: mat.toon('#ffffff', { map: tx.wood, paint: 0.04 }), woodL: mat.toon('#b89470', { paint: 0.05 }), woodD: mat.toon('#5e4636', { paint: 0.04 }),
    plaster: mat.toon('#ffffff', { map: tx.plaster, paint: 0.04 }), rope: mat.toon('#d9c690', { paint: 0.03 }), shide: mat.toon('#f6f3ec', { side: 'double', paint: 0.01 }),
    roofBark: mat.toon('#ffffff', { map: tx.roofBark, paint: 0.04 }), roofUnder: mat.toon('#c85a3a', { paint: 0.04 }), roofEdge: mat.toon('#5f4d42', { paint: 0.03 }),
    tile: mat.toon('#ffffff', { map: tx.roofTile, paint: 0.04 }), tileUnder: mat.toon('#8c7a68', { paint: 0.04 }), tileEdge: mat.toon('#4f555f', { paint: 0.03 }),
    copper: mat.toon('#8bb6a4', { paint: 0.05 }), copperD: mat.toon('#6f9a8a', { paint: 0.04 }),
    lampGlow: mat.emissive('#ffd9a0', 1.15), paper: mat.toon('#f4ecd8', { paint: 0.02 }),
    glass: mat.glass({ tint: '#8aa6b8', opacity: 0.5 }),
  };
}

/** 石灯籠 kasuga-style stone lantern, ~s × 2.1 m. bronze: dark metal version (金灯籠). */
export function lantern(k, M, s = 1, bronze = false) {
  const m = bronze ? M.bronze : M.stone, md = bronze ? M.bronzeD : M.stoneD;
  k.cyl(0.36 * s, 0.4 * s, 0.16 * s, md, [0, 0.08 * s, 0], null, 6);
  k.cyl(0.26 * s, 0.32 * s, 0.14 * s, m, [0, 0.23 * s, 0], null, 6);
  k.cyl(0.1 * s, 0.115 * s, 0.78 * s, m, [0, 0.69 * s, 0], null, 12);
  k.cyl(0.13 * s, 0.13 * s, 0.05 * s, m, [0, 0.7 * s, 0], null, 12);
  k.cyl(0.32 * s, 0.18 * s, 0.17 * s, m, [0, 1.16 * s, 0], null, 6);
  k.cyl(0.21 * s, 0.21 * s, 0.34 * s, bronze ? M.bronzeD : M.ink, [0, 1.42 * s, 0], null, 6);
  for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + Math.PI / 6; k.box(0.065 * s, 0.34 * s, 0.065 * s, m, [Math.sin(a) * 0.23 * s, 1.42 * s, Math.cos(a) * 0.23 * s], [0, a, 0]); }
  k.cyl(0.27 * s, 0.27 * s, 0.045 * s, m, [0, 1.25 * s, 0], null, 6);
  k.cyl(0.5 * s, 0.5 * s, 0.05 * s, m, [0, 1.62 * s, 0], null, 6);
  k.cyl(0.08 * s, 0.5 * s, 0.25 * s, m, [0, 1.76 * s, 0], null, 6);
  for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; k.sphere(0.045 * s, m, [Math.sin(a) * 0.49 * s, 1.68 * s, Math.cos(a) * 0.49 * s], 6); }
  k.cyl(0.09 * s, 0.09 * s, 0.05 * s, m, [0, 1.92 * s, 0], null, 10);
  k.sphere(0.085 * s, m, [0, 2.02 * s, 0], 10);
  k.mesh(new THREE.CylinderGeometry(0, 0.06 * s, 0.09 * s, 10), m, [0, 2.12 * s, 0]);
}

/** Inari fox (稲荷狐) sitting upright on its own base; holds: 'key' | 'jewel' | 'scroll' | 'rice'. ~0.95 m tall × s. */
export function fox(k, M, holds, s = 1, bib = true) {
  const m = M.statue, G = (r, seg = 12) => new THREE.SphereGeometry(r, seg, Math.max(6, seg * 0.66 | 0));
  const ell = (pos, size) => k.mesh(G(0.5, 14), m, pos.map(v => v * s), null, size.map(v => v * s));
  const limb = (a, b, r0, r1) => { const A = new THREE.Vector3(...a).multiplyScalar(s), B = new THREE.Vector3(...b).multiplyScalar(s), d = B.clone().sub(A); const c = k.mesh(new THREE.CylinderGeometry(r1 * s, r0 * s, d.length(), 10), m, A.clone().add(B).multiplyScalar(0.5).toArray()); c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); return c; };
  ell([0, 0.12, -0.05], [0.23, 0.19, 0.29]);
  for (const x of [-1, 1]) ell([x * 0.1, 0.05, 0.03], [0.07, 0.06, 0.15]);
  limb([0, 0.14, -0.04], [0, 0.44, 0.02], 0.1, 0.055);
  ell([0, 0.31, 0.06], [0.12, 0.22, 0.1]);
  for (const x of [-1, 1]) {
    limb([x * 0.038, 0.03, 0.115], [x * 0.035, 0.3, 0.07], 0.026, 0.03);
    ell([x * 0.038, 0.03, 0.13], [0.05, 0.035, 0.07]);
    k.mesh(new THREE.CylinderGeometry(0.004 * s, 0.032 * s, 0.13 * s, 8), m, [x * 0.044 * s, 0.63 * s, 0.05 * s], [-0.12, 0, -x * 0.24]);
    k.mesh(G(0.5, 8), M.ink, [x * 0.034 * s, 0.555 * s, 0.112 * s], [0, 0, x * 0.42], [0.028 * s, 0.008 * s, 0.01 * s]);
  }
  limb([0, 0.42, 0.02], [0, 0.52, 0.05], 0.05, 0.045);
  ell([0, 0.545, 0.06], [0.11, 0.1, 0.12]);
  k.mesh(new THREE.CylinderGeometry(0.011 * s, 0.04 * s, 0.13 * s, 10), m, [0, 0.52 * s, 0.165 * s], [Math.PI / 2 + 0.2, 0, 0]);
  k.sphere(0.01 * s, M.ink, [0, 0.508 * s, 0.232 * s], 6);
  // big bushy tail rising behind
  [[0, 0.1, -0.2, 0.065], [0.02, 0.22, -0.24, 0.085], [0.035, 0.36, -0.23, 0.085], [0.045, 0.49, -0.19, 0.068], [0.045, 0.59, -0.14, 0.045], [0.04, 0.65, -0.1, 0.024]]
    .forEach(([x, y, z, r]) => ell([x, y, z], [r * 2, r * 2.3, r * 2]));
  if (bib) k.mesh(new THREE.CylinderGeometry(0.05 * s, 0.1 * s, 0.11 * s, 16, 1, true, -Math.PI * 0.56, Math.PI * 1.12), M.redD, [0, 0.42 * s, 0.035 * s]);
  if (holds === 'key') { k.cyl(0.008 * s, 0.008 * s, 0.12 * s, M.gold, [0, 0.495 * s, 0.2 * s], [0, 0, Math.PI / 2], 8); k.mesh(new THREE.TorusGeometry(0.018 * s, 0.006 * s, 6, 12), M.gold, [0.07 * s, 0.495 * s, 0.2 * s]); }
  else if (holds === 'jewel') k.sphere(0.026 * s, M.gold, [0, 0.49 * s, 0.225 * s], 10);
  else if (holds === 'scroll') k.cyl(0.014 * s, 0.014 * s, 0.14 * s, M.white, [0, 0.49 * s, 0.2 * s], [0, 0, Math.PI / 2], 8);
  else if (holds === 'rice') { k.sphere(0.03 * s, M.gold, [0.02 * s, 0.49 * s, 0.215 * s], 8); k.sphere(0.024 * s, M.gold, [-0.02 * s, 0.5 * s, 0.21 * s], 8); }
}

/** Fox on a stone pedestal (h tall). */
export function foxOnPedestal(k, M, holds, h = 1.6, s = 2.2) {
  k.box(1.1 * s / 2.2, 0.2, 1.1 * s / 2.2, M.stoneD, [0, 0.1, 0]);
  k.box(0.8 * s / 2.2, h - 0.35, 0.8 * s / 2.2, M.stone, [0, 0.2 + (h - 0.35) / 2, 0]);
  k.box(0.98 * s / 2.2, 0.15, 0.98 * s / 2.2, M.stoneD, [0, h - 0.075, 0]);
  const g = new THREE.Group(); g.position.set(0, h, 0); k.parent.add(g);
  fox(kitOf(g), M, holds, s);
}
function kitOf(g) { // minimal kit on a plain group (same API as ctx.kit)
  const place = (mesh, pos, rot, scale) => { if (pos) mesh.position.set(...pos); if (rot) mesh.rotation.set(rot[0] || 0, rot[1] || 0, rot[2] || 0); if (scale) mesh.scale.set(...scale); mesh.castShadow = true; mesh.receiveShadow = true; g.add(mesh); return mesh; };
  return {
    parent: g,
    box: (w, h, d, m, pos, rot) => place(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), m), pos, rot, [w, h, d]),
    cyl: (a, b, h, m, pos, rot, seg = 12) => place(new THREE.Mesh(new THREE.CylinderGeometry(a, b, h, seg), m), pos, rot),
    sphere: (r, m, pos, seg = 12) => place(new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.max(6, seg * 0.66 | 0)), m), pos),
    mesh: (geo, m, pos, rot, scale) => place(new THREE.Mesh(geo, m), pos, rot, scale),
    plane: (w, h, m, pos, rot) => { const p = place(new THREE.Mesh(new THREE.PlaneGeometry(w, h), m), pos, rot); p.castShadow = false; return p; },
  };
}
export { kitOf };

/** 賽銭箱 offering box (w wide). tex: front label texture. */
export function saisen(ctx, k, M, w = 1.6, tex = null) {
  k.box(w, 0.62, 0.7, M.woodD, [0, 0.36, 0]);
  k.box(w + 0.08, 0.06, 0.78, M.woodL, [0, 0.7, 0]);
  for (let i = 0; i < 8; i++) k.box(w - 0.1, 0.05, 0.05, M.woodL, [0, 0.75, -0.28 + i * 0.08], [Math.PI / 4, 0, 0]);
  for (const x of [-1, 1]) k.box(0.08, 0.05, 0.74, M.gold, [x * (w / 2 - 0.02), 0.74, 0]);
  k.box(w + 0.04, 0.06, 0.74, M.woodD, [0, 0.03, 0]);
  if (tex) k.plane(w * 0.9, 0.46, ctx.mat.toon('#ffffff', { map: tex, paint: 0.02 }), [0, 0.37, 0.352]);
}

/** Hanging bell (鈴) + red/white rope from height y. */
export function bell(k, M, y) {
  k.cyl(0.006, 0.006, 0.12, M.ink, [0, y - 0.06, 0], null, 4);
  k.sphere(0.12, M.gold, [0, y - 0.2, 0], 14);
  k.box(0.2, 0.02, 0.02, M.ink, [0, y - 0.26, 0.1]);
  const len = y - 0.35;
  k.cyl(0.024, 0.028, len, M.red, [0.012, y - 0.3 - len / 2, 0.01], null, 8);
  k.cyl(0.02, 0.022, len, M.white, [-0.02, y - 0.3 - len / 2, 0.0], null, 8);
}

/** Stone monument (石碑 / 神名碑) with engraved god name. tex: alpha decal with the name. */
export function monument(ctx, k, M, w, h, tex) {
  k.box(w + 0.3, 0.2, 0.55, M.stoneD, [0, 0.1, 0]);
  const g = new THREE.BoxGeometry(w, h, 0.28, 1, 4, 1); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i) / h + 0.5; p.setX(i, p.getX(i) * (1 - 0.12 * Math.max(0, y - 0.8) * 5 * Math.abs(p.getX(i)) / w)); }
  g.computeVertexNormals();
  k.mesh(g, M.stoneMoss, [0, 0.2 + h / 2, 0]);
  if (tex) k.plane(w * 0.55, h * 0.84, ctx.mat.decal('#ffffff', { map: tex, transparent: true }), [0, 0.2 + h * 0.52, 0.146]);
}

/** Small offered torii (奉納 小鳥居), w wide, h tall. */
export function miniTorii(k, M, w, h) {
  const r = w * 0.055;
  for (const x of [-1, 1]) { k.cyl(r, r, h, M.verm, [x * w / 2, h / 2, 0], null, 8); k.cyl(r * 1.25, r * 1.25, h * 0.14, M.black, [x * w / 2, h * 0.07, 0], null, 8); }
  k.box(w * 1.22, r * 1.2, r * 0.9, M.verm, [0, h * 0.8, 0]);
  k.mesh(bentBox(w * 1.45, r * 1.2, r * 1.7, 6, (t) => r * 0.9 * t * t), M.black, [0, h + r * 0.6, 0]);
}

/** 茶屋 bench with red felt (毛氈) + optional red parasol (野点傘). */
export function bench(k, M, len = 1.8, parasol = false) {
  for (const x of [-1, 1]) for (const z of [-1, 1]) k.box(0.07, 0.42, 0.07, M.woodD, [x * (len / 2 - 0.1), 0.21, z * 0.26]);
  k.box(len, 0.06, 0.64, M.wood, [0, 0.45, 0]);
  k.box(len + 0.02, 0.02, 0.68, M.felt, [0, 0.49, 0]);
  k.box(len * 0.9, 0.012, 0.01, M.felt, [0, 0.4, 0.34]);
  if (parasol) {
    k.cyl(0.025, 0.025, 2.4, M.woodL, [len / 2 + 0.15, 1.2, 0], null, 8);
    const cone = new THREE.ConeGeometry(1.35, 0.55, 20, 1, true);
    k.mesh(cone, M.redD, [len / 2 + 0.15, 2.45, 0]);
    k.cyl(0.05, 0.05, 0.1, M.woodD, [len / 2 + 0.15, 2.76, 0], null, 8);
  }
}

/** Wooden direction signpost (道標). tex: board with vertical text. */
export function signpost(ctx, k, M, tex, h = 1.7) {
  k.box(0.12, h, 0.12, M.woodL, [0, h / 2, 0]);
  k.mesh(new THREE.CylinderGeometry(0.0, 0.1, 0.1, 4).rotateY(Math.PI / 4), M.woodL, [0, h + 0.05, 0]);
  if (tex) { k.box(0.3, 0.9, 0.03, M.woodL, [0, h - 0.55, 0.075]); k.plane(0.27, 0.86, ctx.mat.toon('#ffffff', { map: tex, paint: 0.02 }), [0, h - 0.55, 0.0915]); }
}

/** Generic drink vending machine (fictional brand panel texture). */
export function vending(ctx, k, M, tex) {
  k.box(1.0, 1.83, 0.75, ctx.mat.toon('#e8e6e0', { paint: 0.03 }), [0, 0.915, 0]);
  k.box(0.94, 0.9, 0.02, M.glass, [0, 1.3, 0.38]);
  if (tex) k.plane(0.9, 1.5, ctx.mat.emissive('#ffffff', 0.95, { map: tex }), [0, 1.08, 0.376]);
  k.box(0.6, 0.14, 0.05, ctx.mat.toon('#4b4d52'), [0, 0.3, 0.39]);
}

/** Otsuka (お塚): a stone monument + a thicket of small offered torii + foxes + a candle stand. */
export function otsuka(ctx, k, M, rnd, tex) {
  k.box(2.4, 0.3, 1.6, M.stoneMoss, [0, 0.15, -0.2]);
  monument(ctx, kitOf(sub(k, 0, 0.3, -0.5)), M, 0.62, 1.3 + rnd() * 0.5, tex);
  const n = 7 + ((rnd() * 7) | 0);
  for (let i = 0; i < n; i++) {
    const w = 0.22 + rnd() * 0.3, h = w * (1.1 + rnd() * 0.3);
    const g = sub(k, (rnd() - 0.5) * 2.1, 0.3, 0.1 + rnd() * 0.45, (rnd() - 0.5) * 0.4);
    miniTorii(kitOf(g), M, w, h);
  }
  for (const x of [-0.85, 0.85]) { const g = sub(k, x, 0.3, 0.35, -x * 0.3); fox(kitOf(g), M, x < 0 ? 'key' : 'jewel', 0.42); }
  // candle stand (ろうそく立て)
  k.box(0.06, 0.8, 0.06, M.black, [1.3, 0.4, 0.5]);
  k.box(0.5, 0.04, 0.22, M.black, [1.3, 0.82, 0.5]);
  for (let i = 0; i < 4; i++) k.cyl(0.012, 0.012, 0.08, M.white, [1.12 + i * 0.12, 0.88, 0.5], null, 6);
}
export function sub(k, x, y, z, rotY = 0) { const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rotY; k.parent.add(g); return g; }

/** Sagging straw rope (しめ縄) with shide between a and b (kit space). */
export function shimenawa(k, M, a, b, sag, r, nShide = 3) {
  const pts = []; for (let i = 0; i <= 16; i++) { const t = i / 16; pts.push(new THREE.Vector3(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - sag * 4 * t * (1 - t), a[2] + (b[2] - a[2]) * t)); }
  k.mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, r, 8, false), M.rope, [0, 0, 0]);
  for (let j = 1; j <= nShide; j++) {
    const t = j / (nShide + 1), p = pts[Math.round(t * 16)];
    for (let i = 0; i < 4; i++) k.plane(r * 1.6, r * 2.4, M.shide, [p.x + (i % 2 ? r * 0.6 : -r * 0.3), p.y - r * 1.8 - i * r * 2.2, p.z + r * 0.8], [0, 0.1, (i % 2 ? -0.06 : 0.06)]);
  }
}

/** 絵馬掛所 rack of white fox-face ema (狐絵馬). emaTex: atlas of faces (cols × rows). */
export function emaRack(ctx, k, M, len, emaMat, cells) {
  for (const x of [-1, 1]) k.box(0.1, 2.0, 0.1, M.woodD, [x * len / 2, 1.0, 0]);
  const ra = 0.45; k.box(len + 0.5, 0.05, 0.5, M.roofEdge, [0, 2.1, 0.12], [ra, 0, 0]); k.box(len + 0.5, 0.05, 0.5, M.roofEdge, [0, 2.1, -0.12], [-ra, 0, 0]);
  const bars = [1.05, 1.42, 1.79];
  let c = 0;
  for (const by of bars) {
    k.box(len, 0.04, 0.04, M.woodL, [0, by, 0]);
    const n = Math.floor(len / 0.2);
    for (let i = 0; i < n; i++) for (const side of [1, -1]) {
      if (((i * 7 + c) % 11) === 3) continue;
      const g = foxEmaGeo(cells, (c++ * 5 + i) % cells.n);
      const e = k.mesh(g, emaMat, [-len / 2 + 0.12 + i * (len - 0.24) / (n - 1), by - 0.13, side * 0.03], [side * 0.08, side < 0 ? Math.PI : 0, ((i * 13) % 7 - 3) * 0.03]);
      e.castShadow = false;
    }
  }
}
const _fe = new Map();
/** fox-face ema (triangular-ish head shape with ears) using cell ci of the face atlas. */
function foxEmaGeo(cells, ci) {
  if (_fe.has(ci)) return _fe.get(ci);
  const shape = new THREE.Shape();
  const w = 0.16, h = 0.17;
  shape.moveTo(0, -h / 2); shape.lineTo(w * 0.42, -h * 0.05); shape.lineTo(w / 2, h / 2); shape.lineTo(w * 0.16, h * 0.28);
  shape.lineTo(-w * 0.16, h * 0.28); shape.lineTo(-w / 2, h / 2); shape.lineTo(-w * 0.42, -h * 0.05); shape.lineTo(0, -h / 2);
  const g = new THREE.ExtrudeGeometry(shape, { depth: 0.008, bevelEnabled: false });
  const cx = ci % cells.cols, cy = Math.floor(ci / cells.cols);
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const u = (p.getX(i) / w + 0.5), v = (p.getY(i) / h + 0.5);
    uv.setXY(i, (cx + u) / cells.cols, 1 - (cy + 1 - v) / cells.rows);
  }
  _fe.set(ci, g);
  return g;
}
