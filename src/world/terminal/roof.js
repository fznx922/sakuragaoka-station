// The great dome roof over the tracks (after Osaka Station's 大屋根: ~180 m × 100 m, a space truss that rises
// toward the north, partly glazed): a curved surface of glass and white panels on a two-layer steel truss,
// with edge girders; the panels and members cast striped shadows onto the platforms.
import * as THREE from 'three';

export const ROOF = { u0: -90, u1: 90, v0: -66, v1: 34 };
/** roof surface height (underside of the truss) */
export function roofY(u, v) {
  const t = (ROOF.v1 - v) / (ROOF.v1 - ROOF.v0);              // 0 south … 1 north
  const au = u / ((ROOF.u1 - ROOF.u0) / 2);
  return 26 + 15 * t + 5 * Math.sin(Math.PI * t) + 6.5 * (1 - au * au);
}

export function buildRoof(ctx, H) {
  const { root, M } = H;
  const { mat } = ctx;
  const NU = 30, NV = 20, DEPTH = 2.2;
  const U = (i) => ROOF.u0 + (ROOF.u1 - ROOF.u0) * i / NU, V = (j) => ROOF.v0 + (ROOF.v1 - ROOF.v0) * j / NV;
  const pt = (i, j, dy = 0) => new THREE.Vector3(U(i), roofY(U(i), V(j)) + dy, V(j));
  // ---- skin: glass cells + white opaque cells (every third row and the rim), just above the top chords
  const glassP = [], solidP = [];
  for (let i = 0; i < NU; i++) for (let j = 0; j < NV; j++) {
    const a = pt(i, j, DEPTH + 0.15), b = pt(i + 1, j, DEPTH + 0.15), c = pt(i + 1, j + 1, DEPTH + 0.15), d = pt(i, j + 1, DEPTH + 0.15);
    const solid = j % 3 === 1 || i === 0 || i === NU - 1 || j === 0 || j === NV - 1 || (i % 5 === 2 && j % 3 === 0);
    (solid ? solidP : glassP).push(...a.toArray(), ...c.toArray(), ...b.toArray(), ...a.toArray(), ...d.toArray(), ...c.toArray());
  }
  const mk = (arr, m, shadow) => {
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3)); g.computeVertexNormals();
    g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(arr.length / 3 * 2), 2));
    const mesh = new THREE.Mesh(g, m); mesh.castShadow = shadow; mesh.receiveShadow = !shadow ? false : true; root.add(mesh); return mesh;
  };
  mk(solidP, mat.toon('#eef0f1', { side: 'double', paint: 0.02 }), true);
  const glass = mk(glassP, mat.glass({ tint: '#b9d1e2', opacity: 0.14 }), false);
  ctx.noBatch(glass);
  // ---- truss members: bottom chord grid, top chord grid, verticals + diagonals (one instanced mesh)
  const members = [];
  for (let j = 0; j <= NV; j++) for (let i = 0; i < NU; i++) { members.push([pt(i, j), pt(i + 1, j), 0.22]); members.push([pt(i, j, DEPTH), pt(i + 1, j, DEPTH), 0.18]); }
  for (let i = 0; i <= NU; i++) for (let j = 0; j < NV; j++) { members.push([pt(i, j), pt(i, j + 1), 0.22]); members.push([pt(i, j, DEPTH), pt(i, j + 1, DEPTH), 0.18]); }
  for (let i = 0; i < NU; i++) for (let j = 0; j < NV; j++) { members.push([pt(i, j), pt(i + 1, j + 1, DEPTH), 0.12]); members.push([pt(i + 1, j), pt(i, j + 1, DEPTH), 0.12]); }
  {
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const im = new THREE.InstancedMesh(geo, mat.toon('#f1f2f3', { paint: 0.02 }), members.length);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), X = new THREE.Vector3(1, 0, 0), d = new THREE.Vector3(), mid = new THREE.Vector3(), s = new THREE.Vector3();
    members.forEach(([a, b, r], k) => {
      d.subVectors(b, a); const L = d.length(); q.setFromUnitVectors(X, d.normalize()); mid.addVectors(a, b).multiplyScalar(0.5); s.set(L, r, r);
      m4.compose(mid, q, s); im.setMatrixAt(k, m4);
    });
    im.castShadow = true; im.receiveShadow = true; im.computeBoundingSphere(); root.add(im);
  }
  // ---- edge girders along the east / west ends (deep box trusses) and the gutters on the buildings
  const K = H.kit();
  for (const i of [0, NU]) {
    for (let j = 0; j < NV; j++) {
      const a = pt(i, j, DEPTH / 2), b = pt(i, j + 1, DEPTH / 2), mid = a.clone().add(b).multiplyScalar(0.5), L = a.distanceTo(b);
      K.box(1.4, DEPTH + 1.2, L + 0.1, M.steel, mid.toArray(), [Math.atan2(-(b.y - a.y), b.z - a.z), 0, 0]);
    }
  }
  for (const j of [0, NV]) for (let i = 0; i < NU; i++) {
    const a = pt(i, j, DEPTH / 2), b = pt(i + 1, j, DEPTH / 2), mid = a.clone().add(b).multiplyScalar(0.5), L = a.distanceTo(b);
    K.box(L + 0.1, DEPTH + 1.0, 1.6, M.steel, mid.toArray(), [0, 0, Math.atan2(b.y - a.y, b.x - a.x)]);
  }
  // big tree-like support columns at the open east / west ends (two per end)
  for (const u of [ROOF.u0, ROOF.u1]) for (const v of [-15.2, 2.4]) {   // on the island platforms' centre lines, clear of the tracks
    const y1 = roofY(u, v);
    K.cyl(0.9, 1.2, y1 - 5.3, M.steel, [u, 5.3 + (y1 - 5.3) / 2, v], null, 16);
    for (const s of [-1, 1]) K.box(0.5, 0.5, 12, M.steel, [u, y1 - 3, v + s * 4.5], [s * 0.6, 0, 0]);
    H.cyl(u, v, 1.3, 4, y1);
  }
  return { roofY };
}
