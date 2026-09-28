// 稲荷山 terrain: 8 m tiles around the paths (0.8 m grid near a path corridor, 2 m elsewhere in the
// walkable area), a 24 m-tile outer ring (6 m grid), and a far painted ring (hills + the city basin).
// Tiles of different resolution meet through outward skirts (no cracks). Normals are analytic.
import * as THREE from 'three';
import * as P from './plan.js';
import { distantMaterial } from '../environment/shaders.js';

const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const lin = (hex) => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; }; // THREE.Color(hex) is already linear
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

export const CORE = { u0: -64, u1: 480, v0: -224, v1: 160 };   // 8 m tiles
export const OUTER = { u0: -704, u1: 1056, v0: -800, v1: 800 }; // 32 m tiles (aligned with the core)

export function buildTerrain(ctx, root, tx) {
  const C = {
    moss: lin('#86a05e'), mossD: lin('#6e8a52'), litter: lin('#a58f68'), litterD: lin('#8a7a58'),
    earth: lin('#b39a74'), soil: lin('#a07d5e'), town: lin('#b9b2a3'), grassT: lin('#9dbb74'), far: lin('#8fae70'),
    gravel: lin('#d3cdbf'), floorA: lin('#5f7448'), floorB: lin('#6f6a4a'), forA: lin('#7ea46a'), forB: lin('#6b9163'), basin: lin('#b3b3a2'),
  };
  // height used for the mesh: exact ground, pushed down under stair corridors (the stone ribbons sit on top)
  function meshH(u, v) {
    let h = P.groundLocal(u, v);
    const np = P.nearestPath(u, v);
    if (np && np.d < np.p.hw + 0.35) h -= 0.3;
    return h;
  }
  function color(u, v, h, ny) {
    if (u < 56) { // town basin; grass and moss beside the approach (under its trees)
      const g = u > 4 && Math.abs(v) > 8.5 ? sm(4, 12, u) * sm(8.5, 12, Math.abs(v)) : 0;
      return mix(mix(C.town, C.grassT, Math.abs(v) > 30 ? 0.5 : 0.15), mix(C.moss, C.floorA, 0.3), g);
    }
    const n1 = P.fbm(u / 9, v / 9, 3, 61), n2 = P.vnoise(u / 3.1, v / 3.1, 62), n3 = P.fbm(u / 40, v / 40, 2, 63);
    let c = mix(C.litter, C.moss, sm(0.35, 0.7, n1));
    c = mix(c, C.litterD, sm(0.55, 0.85, n3) * 0.6);
    c = mix(c, C.mossD, sm(0.6, 0.9, n2) * 0.4);
    // steep cut / fill banks: bare reddish soil
    c = mix(c, C.soil, sm(0.82, 0.62, ny) * 0.8);
    // trodden earth along the path corridors
    const np = P.nearestPath(u, v);
    if (np) { const k = 1 - sm(0.3, 2.6, np.d - np.p.hw); c = mix(c, C.earth, k * (0.6 + 0.3 * n2)); }
    // deep forest floor (under the canopy, away from the trails): darker, mossier
    const deep = np ? sm(6, 14, np.d - np.p.hw) : 1;
    c = mix(c, mix(C.floorA, C.floorB, n1), deep * 0.6 * sm(64, 90, u));
    // flats: packed gravel / earth
    const f = P.flatAt(u, v);
    if (f && f.id !== 'town') c = mix(c, C.gravel, f.id === 'precinct' ? 0.9 : 0.55);
    return c;
  }

  const bufs = [];
  const newBuf = () => { const b = { pos: [], nor: [], col: [], uvs: [], idx: [] }; bufs.push(b); return b; };
  const GROUND = newBuf(), FOREST = newBuf();
  let pos, nor, col, uvs, idx;
  const use = (b) => ({ pos, nor, col, uvs, idx } = b);
  use(GROUND);
  let tris = 0;
  const E = 0.9;
  const vert = (u, v, h, hf = meshH) => {
    if (idx === FOREST.idx) { // painted forest: colour from height only (the shader paints the crowns)
      const hx = hf(u + 6, v) - hf(u - 6, v), hz = hf(u, v + 6) - hf(u, v - 6);
      const n = new THREE.Vector3(-hx, 12, -hz).normalize();
      pos.push(u, h, v); nor.push(n.x, n.y, n.z);
      const c = mix(C.forA, C.forB, sm(20, 140, h) * 0.8); col.push(c[0], c[1], c[2]); uvs.push(u / 6, v / 6);
      return pos.length / 3 - 1;
    }
    const hx = hf(u + E, v) - hf(u - E, v), hz = hf(u, v + E) - hf(u, v - E);
    const n = new THREE.Vector3(-hx, 2 * E, -hz).normalize();
    pos.push(u, h, v); nor.push(n.x, n.y, n.z);
    const c = color(u, v, h, n.y); col.push(c[0], c[1], c[2]);
    uvs.push(u / 6, v / 6);
    return pos.length / 3 - 1;
  };
  function tile(u0, v0, size, n, hf = meshH, sk = [1, 1, 1, 1]) {
    const ids = [], H = [];
    for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) {
      const u = u0 + size * i / n, v = v0 + size * j / n, h = hf(u, v);
      H.push(h); ids.push(vert(u, v, h, hf));
    }
    const at = (i, j) => ids[j * (n + 1) + i];
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const a = at(i, j), b = at(i + 1, j), c = at(i, j + 1), d = at(i + 1, j + 1);
      idx.push(a, c, b, b, c, d); tris += 2;
    }
    // skirts: duplicate the border ring 1.2 m lower, facing outward
    const ring = (list, out) => {
      const low = list.map(k => { const u = pos[k * 3], h = pos[k * 3 + 1], v = pos[k * 3 + 2]; pos.push(u, h - 1.2, v); nor.push(nor[k * 3], nor[k * 3 + 1], nor[k * 3 + 2]); col.push(col[k * 3], col[k * 3 + 1], col[k * 3 + 2]); uvs.push(uvs[k * 2], uvs[k * 2 + 1]); return pos.length / 3 - 1; });
      for (let i = 0; i < list.length - 1; i++) {
        const a = list[i], b = list[i + 1], c = low[i], d = low[i + 1];
        const ex = pos[b * 3] - pos[a * 3], ez = pos[b * 3 + 2] - pos[a * 3 + 2];
        // triangle a,c,b normal ~ (edge x down); choose winding so the face looks along `out`
        const fx = -ez, fz = ex; // normal of a->b rotated (for winding a,b,c)
        if (fx * out[0] + fz * out[1] > 0) idx.push(a, b, c, b, d, c); else idx.push(a, c, b, b, c, d);
        tris += 2;
      }
    };
    const rowJ = (j) => Array.from({ length: n + 1 }, (_, i) => at(i, j)), colI = (i) => Array.from({ length: n + 1 }, (_, j) => at(i, j));
    if (sk[0]) ring(rowJ(0), [0, -1]); if (sk[1]) ring(rowJ(n), [0, 1]); if (sk[2]) ring(colI(0), [-1, 0]); if (sk[3]) ring(colI(n), [1, 0]);
  }

  // ---- core tiles: resolution per 8 m tile (10 near a path corridor, 4 within reach of one, 2 elsewhere,
  // 1 on the flat town basin); skirts only on edges whose neighbour has a different resolution
  const T8 = 8, NU = (CORE.u1 - CORE.u0) / T8, NV = (CORE.v1 - CORE.v0) / T8;
  const res = new Int32Array(NU * NV);
  for (let j = 0; j < NV; j++) for (let i = 0; i < NU; i++) {
    const u0 = CORE.u0 + i * T8, v0 = CORE.v0 + j * T8;
    let r = u0 + T8 <= 48 ? 1 : 2;
    for (let a = 0; a <= 2; a++) for (let b = 0; b <= 2; b++) {
      const np = P.nearestPath(u0 + a * 4, v0 + b * 4);
      if (np) r = Math.max(r, np.d < np.p.hw + 9 ? 10 : 4);
    }
    if (r < 4) for (const f of P.FLATS) if (f.id !== 'town' && P.flatDist(f, u0 + 4, v0 + 4) < 10) r = 4;
    res[j * NU + i] = r;
  }
  const R = (i, j) => (i < 0 || j < 0 || i >= NU || j >= NV ? -1 : res[j * NU + i]);
  for (let j = 0; j < NV; j++) for (let i = 0; i < NU; i++) {
    const r = R(i, j);
    tile(CORE.u0 + i * T8, CORE.v0 + j * T8, T8, r, meshH, [R(i, j - 1) !== r, R(i, j + 1) !== r, R(i - 1, j) !== r, R(i + 1, j) !== r]);
  }
  // ---- outer ring (32 m tiles, 8 m grid); skirts only next to the core
  const T32 = 32;
  const outerH = (u, v) => P.groundLocal(u, v);
  const inCore = (u0, v0) => u0 >= CORE.u0 && u0 + T32 <= CORE.u1 && v0 >= CORE.v0 && v0 + T32 <= CORE.v1;
  for (let v0 = OUTER.v0; v0 < OUTER.v1; v0 += T32) for (let u0 = OUTER.u0; u0 < OUTER.u1; u0 += T32) {
    if (inCore(u0, v0)) continue;
    use(u0 + T32 / 2 > 70 ? FOREST : GROUND);
    const edge = (a, b) => inCore(a, b) || a < OUTER.u0 || a >= OUTER.u1 || b < OUTER.v0 || b >= OUTER.v1; // core or far ring next door
    tile(u0, v0, T32, 4, outerH, [edge(u0, v0 - T32), edge(u0, v0 + T32), edge(u0 - T32, v0), edge(u0 + T32, v0)]);
  }

  // ---- far ring (160 m tiles out to ~2.6 km): the city basin in the west, ridges everywhere else
  const T160 = 160, FAR = { u0: -2624, u1: 2496, v0: -2560, v1: 2560 };
  const west = (u, v) => 260 * sm(-1250, -2100, u + 180 * (P.fbm(v / 500, 1.3, 2, 71) - 0.5)) * (0.55 + 0.6 * P.fbm(u / 260, v / 260, 3, 72));
  const farH = (u, v) => Math.max(0, P.natural(u, v)) + west(u, v);
  const inOuter = (u0, v0) => u0 >= OUTER.u0 && u0 + T160 <= OUTER.u1 + 1e-6 && v0 >= OUTER.v0 && v0 + T160 <= OUTER.v1 + 1e-6;
  for (let v0 = FAR.v0; v0 < FAR.v1; v0 += T160) for (let u0 = FAR.u0; u0 < FAR.u1; u0 += T160) {
    const cu = u0 + T160 / 2;
    if (inOuter(u0, v0)) continue;
    const basin = cu < 40 && cu > -1250;
    use(basin ? GROUND : FOREST);
    tile(u0, v0, T160, basin ? 2 : 5, farH, [1, 1, 1, 1]);
  }

  const meshes = [];
  const finish = (b, m, name) => {
    if (!b.idx.length) return;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(b.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(b.nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(b.col, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(b.uvs, 2));
    g.setIndex(b.pos.length / 3 > 65535 ? new THREE.Uint32BufferAttribute(b.idx, 1) : new THREE.Uint16BufferAttribute(b.idx, 1));
    g.computeBoundingSphere(); g.computeBoundingBox();
    const mesh = new THREE.Mesh(g, m);
    mesh.receiveShadow = true; mesh.castShadow = false; mesh.name = name;
    root.add(mesh); meshes.push(mesh);
  };
  finish(GROUND, ctx.mat.toon('#ffffff', { vertexColors: true, map: tx.ground, paint: 0.04, name: 'inari-ground' }), 'inari-terrain');
  const forestMat = distantMaterial(ctx, { vertexColors: true, crown: 9.5, crownAmt: 1.0, pinkAmt: 0.35, pink: '#ecc6d3', youngAmt: 0.5, darkAmt: 0.7, patch: 70, mistY0: 0, mistY1: 40, mistAmt: 0.22, fogMul: 0.45, hazeK: 0.0006, hazeMax: 0.5, haze: '#c3d3e6', rim: 1 });
  finish(FOREST, forestMat, 'inari-forest-hills');
  for (const m of meshes.slice(1)) ctx.noBatch(m);
  return { meshes, tris };
}
