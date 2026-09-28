// Shrine architecture helpers: thick roof slabs (top / underside / edge band as three meshes so the
// batcher can merge each by material), 入母屋 (hip-and-gable) and 流造 / 切妻 (gable, asymmetric) roofs.
import * as THREE from 'three';

function newell(pts) {
  const n = new THREE.Vector3();
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    n.x += (a[1] - b[1]) * (a[2] + b[2]); n.y += (a[2] - b[2]) * (a[0] + b[0]); n.z += (a[0] - b[0]) * (a[1] + b[1]);
  }
  return n.normalize();
}
function tri(buf, a, b, c, n, uvf) {
  for (const p of [a, b, c]) { buf.pos.push(p[0], p[1], p[2]); buf.nor.push(n.x, n.y, n.z); const t = uvf(p); buf.uv.push(t[0], t[1]); }
}
function geo(buf) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(buf.pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(buf.nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(buf.uv, 2));
  g.computeBoundingBox(); g.computeBoundingSphere();
  return g;
}

/** Collects slabs (planar convex polygons with thickness) into top / under / edge buffers. */
export function slabSet() {
  const top = { pos: [], nor: [], uv: [] }, under = { pos: [], nor: [], uv: [] }, edge = { pos: [], nor: [], uv: [] };
  return {
    /** pts: convex planar polygon [[x,y,z]…]; t: thickness (pushed against the normal); up: preferred normal hint */
    add(pts, t, up = [0, 1, 0]) {
      let n = newell(pts);
      if (n.x * up[0] + n.y * up[1] + n.z * up[2] < 0) { pts = pts.slice().reverse(); n = newell(pts); }
      // uv: along the polygon plane (1 unit = 1 m): u along the first edge, v across
      const e = new THREE.Vector3(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1], pts[1][2] - pts[0][2]).normalize();
      const f = n.clone().cross(e);
      const uvf = (p) => [p[0] * e.x + p[1] * e.y + p[2] * e.z, p[0] * f.x + p[1] * f.y + p[2] * f.z];
      const low = pts.map(p => [p[0] - n.x * t, p[1] - n.y * t, p[2] - n.z * t]);
      for (let i = 1; i < pts.length - 1; i++) tri(top, pts[0], pts[i], pts[i + 1], n, uvf);
      const nn = n.clone().negate();
      for (let i = 1; i < low.length - 1; i++) tri(under, low[0], low[i + 1], low[i], nn, uvf);
      for (let i = 0; i < pts.length; i++) {
        const j = (i + 1) % pts.length, a = pts[i], b = pts[j], c = low[j], d = low[i];
        const en = newell([a, d, c, b]);
        const L = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
        const uvE = (p) => [p === a || p === d ? 0 : L, p === a || p === b ? t : 0];
        tri(edge, a, d, c, en, uvE); tri(edge, a, c, b, en, uvE);
      }
    },
    meshes(k, mats) {
      const out = [];
      for (const [buf, m] of [[top, mats.top], [under, mats.under], [edge, mats.edge]]) if (buf.pos.length) out.push(k.mesh(geo(buf), m, [0, 0, 0]));
      return out;
    },
  };
}

/** 入母屋 roof over a w (x) × d (z) body. y: eave height, h: roof height, o: eave overhang,
 *  ridge: ridge half-length as a fraction of the eave half-width, brk: height fraction of the hip/gable break,
 *  flare: corner up-turn (m). mats: {top, under, edge, gable, ridge}. */
export function irimoya(k, o) {
  const { w, d, y, h, t = 0.35, ridge = 0.55, brk = 0.5, flare = 0.35 } = o;
  const X = w / 2 + o.o, Z = d / 2 + (o.oz ?? o.o), xg = X * ridge, yb = y + h * brk, zb = Z * (1 - brk), yr = y + h;
  const S = slabSet();
  // corner flare: split each long eave into 3 so the ends can lift
  const xe = X * 0.62;
  for (const s of [-1, 1]) {
    const zz = s * Z;
    const P = [[-X, y + flare, zz], [-xe, y, zz], [xe, y, zz], [X, y + flare, zz], [xg, yb, s * zb], [xg, yr, 0], [-xg, yr, 0], [-xg, yb, s * zb]];
    // split into convex parts: centre quad + two side quads + top rectangle
    S.add([[-xe, y, zz], [xe, y, zz], [xg, yb, s * zb], [-xg, yb, s * zb]], t, [0, 1, s]);
    S.add([[xe, y, zz], [X, y + flare, zz], [xg, yb, s * zb]], t, [0, 1, s]);
    S.add([[-X, y + flare, zz], [-xe, y, zz], [-xg, yb, s * zb]], t, [0, 1, s]);
    S.add([[-xg, yb, s * zb], [xg, yb, s * zb], [xg, yr, 0], [-xg, yr, 0]], t, [0, 1, s]);
    void P;
  }
  for (const s of [-1, 1]) {
    const xx = s * X;
    S.add([[xx, y + flare, Z], [xx, y + flare * 0.25, 0], [s * xg, yb, 0]].map(p => p), t, [s, 1, 0]);
    S.add([[xx, y + flare, -Z], [xx, y + flare * 0.25, 0], [s * xg, yb, 0]], t, [s, 1, 0]);
    S.add([[xx, y + flare, Z], [s * xg, yb, 0], [s * xg, yb, zb]], t, [s, 1, 0]);
    S.add([[xx, y + flare, -Z], [s * xg, yb, 0], [s * xg, yb, -zb]], t, [s, 1, 0]);
  }
  const meshes = S.meshes(k, o.mats);
  // gable triangles (妻) slightly inside the roof ends, with a bargeboard line
  const g = new THREE.BufferGeometry();
  const gp = [];
  for (const s of [-1, 1]) {
    const x = s * (xg - 0.12);
    const a = [x, yb - 0.05, zb], b = [x, yb - 0.05, -zb], c = [x, yr - 0.1, 0];
    if (s > 0) gp.push(...a, ...b, ...c); else gp.push(...a, ...c, ...b);
  }
  g.setAttribute('position', new THREE.Float32BufferAttribute(gp, 3)); g.computeVertexNormals();
  const uv = new Float32Array(gp.length / 3 * 2); for (let i = 0; i < gp.length / 3; i++) { uv[i * 2] = gp[i * 3 + 2]; uv[i * 2 + 1] = gp[i * 3 + 1]; }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  meshes.push(k.mesh(g, o.mats.gable, [0, 0, 0]));
  // ridge (棟) + end caps
  meshes.push(k.box(2 * xg + 0.5, 0.42, 0.62, o.mats.ridge, [0, yr + 0.12, 0]));
  for (const s of [-1, 1]) meshes.push(k.box(0.5, 0.75, 0.7, o.mats.ridge, [s * (xg + 0.1), yr + 0.22, 0]));
  return { meshes, X, Z, yr };
}

/** Gable (切妻 / 流造) roof: ridge along x at (yR, zR); front eave at (yF, zF), back eave at (yB, zB).
 *  w: gable-to-gable width incl. overhang; gableY: height of the wall plate under the gables. */
export function gableRoof(k, o) {
  const { w, zF, zB, yF, yB, yR, zR, t = 0.3, flare = 0.2 } = o;
  const X = w / 2, xe = X * 0.6;
  const S = slabSet();
  for (const [ze, ye, s] of [[zF, yF, 1], [zB, yB, -1]]) {
    S.add([[-xe, ye, ze], [xe, ye, ze], [xe, yR, zR], [-xe, yR, zR]], t, [0, 1, s]);
    S.add([[xe, ye, ze], [X, ye + flare, ze], [X, yR + flare * 0.3, zR], [xe, yR, zR]], t, [0, 1, s]);
    S.add([[-X, ye + flare, ze], [-xe, ye, ze], [-xe, yR, zR], [-X, yR + flare * 0.3, zR]], t, [0, 1, s]);
  }
  const meshes = S.meshes(k, o.mats);
  if (o.gable) { // gable wall triangles at x = ±gable.x from the wall plate to the ridge
    const G = o.gable;
    const g = new THREE.BufferGeometry(), gp = [];
    for (const s of [-1, 1]) {
      const x = s * G.x;
      const kF = (G.y - yF) / (yR - yF), kB = (G.y - yB) / (yR - yB);
      const a = [x, G.y, zF + (zR - zF) * kF - 0.05 * Math.sign(zF - zR)], b = [x, G.y, zB + (zR - zB) * kB - 0.05 * Math.sign(zB - zR)], c = [x, yR - 0.12, zR];
      if (s > 0) gp.push(...a, ...b, ...c); else gp.push(...a, ...c, ...b);
    }
    g.setAttribute('position', new THREE.Float32BufferAttribute(gp, 3)); g.computeVertexNormals();
    const uv = new Float32Array(gp.length / 3 * 2); for (let i = 0; i < gp.length / 3; i++) { uv[i * 2] = gp[i * 3 + 2]; uv[i * 2 + 1] = gp[i * 3 + 1]; }
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    meshes.push(k.mesh(g, o.mats.gable, [0, 0, 0]));
  }
  meshes.push(k.box(w * 0.98, 0.34, 0.5, o.mats.ridge, [0, yR + 0.1, zR]));
  return { meshes };
}
