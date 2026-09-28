// Stone stairs along every path (treads + risers + side skirts), exactly at plan.stepY() so what you
// see is what you walk on, and the paved / gravelled flats (approach street, precinct, plazas).
import * as THREE from 'three';
import * as P from './plan.js';

const lin = (hex) => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; };

/** Geometry builder with position / normal / colour / uv. */
export function geoBuilder() {
  const pos = [], nor = [], col = [], uv = [];
  const api = {
    pos, nor, col, uv,
    /** quad a,b,c,d (counter-clockwise seen from the front), flat normal, per-vertex uv [[u,v]x4], colour */
    quad(a, b, c, d, uvq, color) {
      const e1 = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]), e2 = new THREE.Vector3(d[0] - a[0], d[1] - a[1], d[2] - a[2]);
      const n = e1.clone().cross(e2).normalize();
      for (const [p, t] of [[a, uvq[0]], [b, uvq[1]], [c, uvq[2]], [a, uvq[0]], [c, uvq[2]], [d, uvq[3]]]) { pos.push(p[0], p[1], p[2]); nor.push(n.x, n.y, n.z); col.push(color[0], color[1], color[2]); uv.push(t[0], t[1]); }
    },
    build() {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      g.computeBoundingBox(); g.computeBoundingSphere();
      return g;
    },
  };
  return api;
}

/** Runs of constant step height along a path: [{s0, s1, y}] (s in metres). */
export function stepRuns(p) {
  const runs = []; let s0 = 0, y = P.stepY(p, 0);
  for (let s = 0.02; s <= p.length; s += 0.02) {
    const q = P.stepY(p, s);
    if (Math.abs(q - y) > 1e-6) {
      // refine the edge
      let a = s - 0.02, b = s; for (let k = 0; k < 8; k++) { const m = (a + b) / 2; if (Math.abs(P.stepY(p, m) - y) < 1e-6) a = m; else b = m; }
      runs.push({ s0, s1: b, y }); s0 = b; y = q;
    }
  }
  runs.push({ s0, s1: p.length, y });
  return runs;
}

export function buildPaths(ctx, root, tx) {
  const { mat } = ctx;
  const stepMat = mat.toon('#ffffff', { map: tx.steps, vertexColors: true, paint: 0.05, name: 'inari-steps' });
  const out = [];
  const cTread = lin('#e2ddd2'), cNose = lin('#f1ede4'), cRiser = lin('#b9b2a6'), cSkirt = lin('#a79f92'), cEarth = lin('#d6c3a0');
  for (const p of P.PATHS) {
    const B = geoBuilder();
    const hw = p.hw;
    const runs = stepRuns(p);
    const edge = (s, side, y) => { const f = P.pathFrame(p, s); return [f.u - f.tv * side * hw, y, f.v + f.tu * side * hw]; };
    runs.forEach((r, ri) => {
      const len = r.s1 - r.s0;
      // treads: a stone nosing band (first 0.34 m) then the rest; long runs = paved walk
      const cuts = [r.s0]; const nose = Math.min(0.34, len * 0.5);
      if (len > 0.05) cuts.push(r.s0 + nose);
      for (let s = r.s0 + nose + 0.6; s < r.s1 - 0.1; s += 0.6) cuts.push(s);
      cuts.push(r.s1);
      for (let i = 0; i < cuts.length - 1; i++) {
        const sa = cuts[i], sb = cuts[i + 1];
        const L0 = edge(sa, -1, r.y), R0 = edge(sa, 1, r.y), L1 = edge(sb, -1, r.y), R1 = edge(sb, 1, r.y);
        const c = i === 0 ? cNose : (p.kind === 'tunnel' && len > 1.2 ? cEarth : cTread);
        const us = hw / 1.0; // texture tile = 2 m across
        B.quad(L0, R0, R1, L1, [[0, sa], [us, sa], [us, sb], [0, sb]], c);
      }
      // riser up to the next run (or down)
      const nx = runs[ri + 1];
      if (nx) {
        const s = r.s1, y0 = r.y, y1 = nx.y;
        const a = edge(s, -1, y0), b = edge(s, 1, y0), c = edge(s, 1, y1), d = edge(s, -1, y1);
        B.quad(a, b, c, d, [[0, 0], [hw, 0], [hw, 0.15], [0, 0.15]], cRiser); // faces down-slope either way
      }
      // side skirts (hide the terrain seam)
      for (const side of [-1, 1]) {
        for (let i = 0; i < cuts.length - 1; i++) {
          const sa = cuts[i], sb = cuts[i + 1];
          const top0 = edge(sa, side, r.y), top1 = edge(sb, side, r.y), bot0 = edge(sa, side, r.y - 0.9), bot1 = edge(sb, side, r.y - 0.9);
          if (side > 0) B.quad(top0, bot0, bot1, top1, [[sa, 0.9], [sa, 0], [sb, 0], [sb, 0.9]], cSkirt);
          else B.quad(top0, top1, bot1, bot0, [[sa, 0.9], [sb, 0.9], [sb, 0], [sa, 0]], cSkirt);
        }
      }
    });
    const m = new THREE.Mesh(B.build(), stepMat); m.receiveShadow = true; m.castShadow = false; m.name = 'inari-steps-' + p.id;
    root.add(m); out.push(m);
  }
  return out;
}

/** Flat paved / gravel quads (subdivided so the batcher can cell them). y offset above the flat. */
export function flatQuad(ctx, root, material, u0, u1, v0, v1, y, tile, opts = {}) {
  const n = Math.max(1, Math.ceil((u1 - u0) / 16)), m = Math.max(1, Math.ceil((v1 - v0) / 16));
  for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) {
    const a0 = u0 + (u1 - u0) * i / n, a1 = u0 + (u1 - u0) * (i + 1) / n, b0 = v0 + (v1 - v0) * j / m, b1 = v0 + (v1 - v0) * (j + 1) / m;
    const g = new THREE.PlaneGeometry(a1 - a0, b1 - b0); g.rotateX(-Math.PI / 2);
    const uv = g.attributes.uv, p = g.attributes.position;
    for (let k = 0; k < uv.count; k++) uv.setXY(k, (p.getX(k) + (a0 + a1) / 2) / tile, -(p.getZ(k) + (b0 + b1) / 2) / tile);
    const mesh = new THREE.Mesh(g, material); mesh.position.set((a0 + a1) / 2, y, (b0 + b1) / 2);
    mesh.receiveShadow = true; mesh.castShadow = false; root.add(mesh);
  }
}
