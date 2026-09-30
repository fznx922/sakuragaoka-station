// Arc geometry for the 山手線 ring (local frame: a point at radius r, angle φ is (r cos φ, y, r sin φ)).
import * as THREE from 'three';

/** build a BufferGeometry from quads [[p0, p1, p2, p3, normalHint]] (p = [x, y, z]); winding fixed to the hint */
function fromQuads(quads, uvs = null) {
  const pos = [], uv = [];
  quads.forEach((q, i) => {
    const [a, b, c, d, n] = q;
    const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], e2 = [d[0] - a[0], d[1] - a[1], d[2] - a[2]];
    const cr = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
    const flip = cr[0] * n[0] + cr[1] * n[1] + cr[2] * n[2] < 0;
    const order = flip ? [0, 3, 2, 0, 2, 1] : [0, 1, 2, 0, 2, 3];
    const P = [a, b, c, d], U = uvs ? uvs[i] : [[0, 0], [1, 0], [1, 1], [0, 1]];
    for (const k of order) { pos.push(...P[k]); uv.push(...U[k]); }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}
const P3 = (r, phi, y) => [r * Math.cos(phi), y, r * Math.sin(phi)];
const segs = (r, p0, p1, maxLen) => Math.max(1, Math.ceil(Math.abs(p1 - p0) * r / maxLen));

/** horizontal ring sector between radii r0 < r1, angles p0 < p1, at height y, facing up (down = true: facing down).
 *  uv: u = arc length / tile (along the ring), v = radial distance / tile */
export function arcBand(r0, r1, p0, p1, y, { tile = 2, maxLen = 6, down = false } = {}) {
  const n = segs(r1, p0, p1, maxLen), quads = [], uvs = [];
  const rm = (r0 + r1) / 2;
  for (let i = 0; i < n; i++) {
    const a = p0 + (p1 - p0) * i / n, b = p0 + (p1 - p0) * (i + 1) / n;
    quads.push([P3(r0, a, y), P3(r1, a, y), P3(r1, b, y), P3(r0, b, y), [0, down ? -1 : 1, 0]]);
    const ua = (a - p0) * rm / tile, ub = (b - p0) * rm / tile;
    uvs.push([[ua, 0], [ua, (r1 - r0) / tile], [ub, (r1 - r0) / tile], [ub, 0]]);
  }
  return fromQuads(quads, uvs);
}
/** vertical cylindrical wall at radius r between angles, facing outward (out = true) or inward */
export function arcWall(r, p0, p1, y0, y1, { out = true, tile = 2, maxLen = 6 } = {}) {
  const n = segs(r, p0, p1, maxLen), quads = [], uvs = [];
  for (let i = 0; i < n; i++) {
    const a = p0 + (p1 - p0) * i / n, b = p0 + (p1 - p0) * (i + 1) / n, m = (a + b) / 2;
    quads.push([P3(r, a, y0), P3(r, b, y0), P3(r, b, y1), P3(r, a, y1), [(out ? 1 : -1) * Math.cos(m), 0, (out ? 1 : -1) * Math.sin(m)]]);
    const ua = (a - p0) * r / tile, ub = (b - p0) * r / tile;
    uvs.push([[ua, y0 / tile], [ub, y0 / tile], [ub, y1 / tile], [ua, y1 / tile]]);
  }
  return fromQuads(quads, uvs);
}
/** a solid arc block: top, both curved sides, both ends (bottom omitted unless bottom = true) */
export function arcBox(r0, r1, p0, p1, y0, y1, { tile = 2, maxLen = 6, bottom = false } = {}) {
  const parts = [arcBand(r0, r1, p0, p1, y1, { tile, maxLen }), arcWall(r1, p0, p1, y0, y1, { out: true, tile, maxLen }), arcWall(r0, p0, p1, y0, y1, { out: false, tile, maxLen })];
  if (bottom) parts.push(arcBand(r0, r1, p0, p1, y0, { tile, maxLen, down: true }));
  for (const [p, s] of [[p0, -1], [p1, 1]]) {
    const t = [-Math.sin(p) * s, 0, Math.cos(p) * s];
    parts.push(fromQuads([[P3(r0, p, y0), P3(r1, p, y0), P3(r1, p, y1), P3(r0, p, y1), t]]));
  }
  return merge(parts);
}
/** a rectangular section (w wide radially, h tall) swept along an arc: rails, wires, kerbs */
export function arcBar(r, p0, p1, y, w, h, maxLen = 12) {
  return arcBox(r - w / 2, r + w / 2, p0, p1, y - h / 2, y + h / 2, { maxLen, bottom: true });
}
export function merge(list) {
  const geos = list.map(g => (g.index ? g.toNonIndexed() : g));
  let n = 0; for (const g of geos) n += g.attributes.position.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2);
  let o = 0;
  for (const g of geos) {
    pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3);
    if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2);
    o += g.attributes.position.count;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.computeBoundingSphere();
  return g;
}
/** Matrix placing a +x-forward object at (r, φ) facing the clockwise tangent (flip = anticlockwise) */
export function atRing(r, phi, y = 0, flip = false, lateral = 0) {
  const m = new THREE.Matrix4();
  const yaw = -phi - Math.PI / 2 + (flip ? Math.PI : 0);
  m.makeRotationY(yaw);
  m.setPosition((r + lateral) * Math.cos(phi), y, (r + lateral) * Math.sin(phi));
  return m;
}
