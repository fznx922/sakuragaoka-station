// 稲荷山 forest: cedar (杉) and evergreen broadleaf (椎 / 樫) woods, bamboo groves, a few mountain cherries
// (山桜) and an understory along the trails. All instanced (shared smooth cel foliage from lib/foliage):
// detailed crowns within ~22 m of a path or plaza, single-lobe crowns farther away. Trees keep clear of
// the paths (their crowns still arch over the torii tunnels), flats, buildings and the 四ツ辻 view.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as P from './plan.js';
import { CORE } from './terrain.js';
import { shrubGeometry, foliageMaterial } from '../lib/foliage.js';

const COL = {
  cedar: { top: '#7da866', mid: '#4f7c55', base: '#33584b' },
  cedarB: { top: '#88ad6a', mid: '#5a8558', base: '#3a604f' },
  broad: { top: '#a9c97c', mid: '#6d9a5a', base: '#46725a' },
  broadB: { top: '#98bf72', mid: '#5f8e58', base: '#3f6a55' },
  cherry: { top: '#fbe3ea', mid: '#f1bccb', base: '#d99aae' },
  bamboo: { top: '#c9dc8e', mid: '#95bb6c', base: '#6a9560' },
  shrub: { top: '#9cc276', mid: '#628f58', base: '#426b55' },
};

function lobes(list, colors, detail, seed) {
  return mergeGeometries(list.map(([x, y, z, rx, ry, rz], i) => {
    const g = shrubGeometry({ rx, ry, rz, detail, seed: seed + i * 7, colors, flatBottom: false, cutBottom: false, lumps: 0.24, puffAmp: 0.4, normalBlend: 0.6 }).clone();
    g.translate(x, y - ry * 0.55, z);
    return g;
  }), false);
}

export function buildForest(ctx, H, parts) {
  const { mat } = ctx;
  const r = ctx.rng('inari.forest');
  const excl = [].concat(parts.shrine?.excl || [], parts.town?.excl || [], parts.mountain?.excl || []);
  const inExcl = (u, v, pad) => excl.some(e => u > e.u0 - pad && u < e.u1 + pad && v > e.v0 - pad && v < e.v1 + pad);
  const yot = P.flatById('yotsu');
  const inView = (u, v) => { // keep the 四ツ辻 view west open (near part of the cone)
    const du = u - yot.u0, dv = v - (yot.v0 + yot.v1) / 2;
    return du < 0 && du > -75 && Math.abs(dv) < 14 - du * 0.55;
  };

  // ---------------------------------------------------------------- placement
  const T = { cedarN: [], cedarF: [], broadN: [], broadF: [], cherry: [], bamboo: [], shrub: [] };
  const clear = (u, v, trunkPad) => {
    const fa = P.flatAt(u, v); if (fa && fa.id !== 'town') return false;
    for (const f of P.FLATS) if (f.id !== 'town' && P.flatDist(f, u, v) < 1.2) return false;
    if (P.pondDist(u, v) < 1.3) return false;
    const np = P.nearestPath(u, v);
    if (np && np.d < np.p.hw + trunkPad) return false;
    if (inExcl(u, v, 0)) return false;
    if (u < 60 && Math.abs(v) < 12.5) return false; // the approach
    return true;
  };
  const nearOf = (u, v) => { const np = P.nearestPath(u, v); if (np && np.d < np.p.hw + 22) return true; for (const f of P.FLATS) if (f.id !== 'town' && P.flatDist(f, u, v) < 18) return true; return false; };
  // near band: 5.2 m jittered grid; far: 7.5 m
  const u0 = 8, u1 = CORE.u1 - 4, v0 = CORE.v0 + 4, v1 = CORE.v1 - 4;
  for (const [sp, wantNear] of [[5.4, true], [8.4, false]]) {
    for (let v = v0; v < v1; v += sp) for (let u = u0; u < u1; u += sp) {
      const x = u + (r() - 0.5) * sp * 0.8, z = v + (r() - 0.5) * sp * 0.8;
      const near = nearOf(x, z);
      if (near !== wantNear) continue;
      if (!clear(x, z, 1.5)) continue;
      if (inView(x, z)) { // only low growth in the view cone (and nothing right below the railing)
        if (x < yot.u0 - 9 && r() < 0.7) T.shrub.push({ u: x, v: z, y: P.groundLocal(x, z), s: 0.7 + r() * 0.6, rot: r() * 6.28, tone: 0.9 + r() * 0.2 });
        continue;
      }
      const y = P.groundLocal(x, z);
      const grove = P.fbm(x / 45, z / 45, 2, 91);
      const lower = x < 170;
      if (grove > 0.67 && y > 6 && y < 50) { // bamboo grove: a clump of culms
        const n = 2 + ((r() * 3) | 0);
        for (let i = 0; i < n; i++) { const bu = x + (r() - 0.5) * sp * 0.8, bv = z + (r() - 0.5) * sp * 0.8; if (clear(bu, bv, 0.9)) T.bamboo.push({ u: bu, v: bv, y: P.groundLocal(bu, bv), h: 7 + r() * 4, lean: (r() - 0.5) * 0.12, rot: r() * 6.28 }); }
        continue;
      }
      const t = { u: x, v: z, y, s: 0.85 + r() * 0.35, rot: r() * 6.28, tone: 0.92 + r() * 0.14, var: r() < 0.5 ? 0 : 1 };
      const pCherry = 0.025, pBroad = lower ? 0.65 : 0.33;
      const k = r();
      if (k < pCherry) T.cherry.push(t);
      else if (k < pCherry + pBroad) (near ? T.broadN : T.broadF).push(t);
      else (near ? T.cedarN : T.cedarF).push(t);
      if (near && r() < 0.5) {
        const su = x + (r() - 0.5) * 3, sv = z + (r() - 0.5) * 3;
        if (clear(su, sv, 0.6)) T.shrub.push({ u: su, v: sv, y: P.groundLocal(su, sv), s: 0.6 + r() * 0.7, rot: r() * 6.28, tone: 0.9 + r() * 0.2 });
      }
    }
  }
  // understory right along the trails (between the tunnel walls and the trees)
  for (const p of P.PATHS) {
    if (!p.torii) continue;
    for (let s = 2; s < p.length - 2; s += 2.3) for (const side of [-1, 1]) {
      if (r() < 0.45) continue;
      const f = P.pathFrame(p, s), off = p.hw + 0.9 + r() * 1.6;
      const u = f.u - f.tv * side * off, v = f.v + f.tu * side * off;
      if (!clear(u, v, 0.55)) continue;
      T.shrub.push({ u, v, y: P.groundLocal(u, v), s: 0.45 + r() * 0.55, rot: r() * 6.28, tone: 0.9 + r() * 0.2 });
    }
  }

  // ---------------------------------------------------------------- geometries (unit trees, scaled per instance)
  const fm = foliageMaterial(ctx);
  const bark = mat.toon('#7a5a48', { paint: 0.06 }), barkL = mat.toon('#a58f7a', { paint: 0.05 }), bambooM = mat.toon('#9ab86c', { paint: 0.04 });
  const cedarTrunk = new THREE.CylinderGeometry(0.16, 0.3, 14, 7, 1, true).translate(0, 7, 0);
  const cedarCrownN = [0, 1].map(vv => lobes([[0, 8.8, 0, 2.6, 2.8, 2.6], [0.2, 12.2, -0.1, 2.0, 2.6, 2.0], [0, 15.3, 0.1, 1.2, 2.4, 1.2]], vv ? COL.cedarB : COL.cedar, 3, 11 + vv * 5));
  const cedarCrownF = lobes([[0, 9.0, 0, 2.9, 5.6, 2.9]], COL.cedar, 2, 31);
  const broadTrunk = mergeGeometries([
    new THREE.CylinderGeometry(0.16, 0.28, 5.2, 7, 1, true).translate(0, 2.6, 0),
    new THREE.CylinderGeometry(0.07, 0.12, 2.6, 5, 1, true).rotateZ(0.6).translate(0.7, 4.2, 0),
    new THREE.CylinderGeometry(0.07, 0.12, 2.4, 5, 1, true).rotateZ(-0.55).rotateY(2.1).translate(-0.4, 4.1, 0.55),
  ], false);
  const broadCrownN = [0, 1].map(vv => lobes([[0, 5.5, 0, 3.1, 2.2, 3.0], [1.7, 6.4, 0.6, 2.2, 1.8, 2.1], [-1.2, 6.9, -0.7, 2.1, 1.8, 2.1]], vv ? COL.broadB : COL.broad, 3, 51 + vv * 5));
  const broadCrownF = lobes([[0, 5.6, 0, 3.8, 2.8, 3.7]], COL.broad, 2, 71);
  const cherryCrown = lobes([[0, 5.2, 0, 2.8, 1.7, 2.7], [1.3, 5.8, 0.6, 1.7, 1.3, 1.7], [-1.2, 6.0, -0.6, 1.7, 1.3, 1.7]], COL.cherry, 2, 81);
  const culm = new THREE.CylinderGeometry(0.045, 0.06, 1, 5, 1, true).translate(0, 0.5, 0);
  const bambooTop = lobes([[0, 0.72, 0, 1.0, 1.4, 1.0]], COL.bamboo, 1, 91);
  const shrubG = lobes([[0, 0.55, 0, 1.0, 0.75, 0.95]], COL.shrub, 2, 101);

  const Mx = new THREE.Matrix4(), Q = new THREE.Quaternion(), Y = new THREE.Vector3(0, 1, 0), V = new THREE.Vector3(), S = new THREE.Vector3(), c = new THREE.Color();
  const inst = (geo, m, list, fn, shadow = true) => {
    if (!list.length) return null;
    const im = new THREE.InstancedMesh(geo, m, list.length);
    list.forEach((t, i) => { fn(t, Mx); im.setMatrixAt(i, Mx); c.setScalar(t.tone ?? 1); im.setColorAt(i, c); });
    im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
    im.castShadow = shadow; im.receiveShadow = true; im.computeBoundingSphere();
    H.root.add(im); return im;
  };
  const std = (t, M) => { Q.setFromAxisAngle(Y, t.rot); V.set(t.u, t.y - 0.1, t.v); S.setScalar(t.s); M.compose(V, Q, S); };
  const cedars = T.cedarN.concat(T.cedarF);
  inst(cedarTrunk, bark, cedars, std);
  for (const vv of [0, 1]) inst(cedarCrownN[vv], fm, T.cedarN.filter(t => t.var === vv), std);
  inst(cedarCrownF, fm, T.cedarF, std);
  const broads = T.broadN.concat(T.broadF, T.cherry);
  inst(broadTrunk, bark, broads, std);
  for (const vv of [0, 1]) inst(broadCrownN[vv], fm, T.broadN.filter(t => t.var === vv), std);
  inst(broadCrownF, fm, T.broadF, std);
  inst(cherryCrown, fm, T.cherry, std);
  inst(culm, bambooM, T.bamboo, (t, M) => { Q.setFromAxisAngle(new THREE.Vector3(Math.cos(t.rot), 0, Math.sin(t.rot)), t.lean); V.set(t.u, t.y - 0.1, t.v); S.set(1, t.h, 1); M.compose(V, Q, S); });
  inst(bambooTop, fm, T.bamboo, (t, M) => { Q.setFromAxisAngle(Y, t.rot); const lx = Math.sin(t.lean) * t.h; V.set(t.u + Math.cos(t.rot) * lx * 0.9, t.y + t.h - 1.6, t.v + Math.sin(t.rot) * lx * 0.9); S.setScalar(1.3); M.compose(V, Q, S); });
  inst(shrubG, fm, T.shrub, std, false);
  void barkL;

  // colliders: trunks near the paths / plazas
  for (const t of T.cedarN.concat(T.broadN, T.cherry)) H.cyl(t.u, t.v, 0.32 * t.s, t.y - 1, t.y + 6);
  for (const t of T.bamboo) if (nearOf(t.u, t.v)) H.cyl(t.u, t.v, 0.1, t.y - 1, t.y + 5);

  return { counts: Object.fromEntries(Object.entries(T).map(([k, v]) => [k, v.length])) };
}
