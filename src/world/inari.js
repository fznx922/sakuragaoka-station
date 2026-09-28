// inari — 稲荷山 (Inariyama), a walkable mountain shrine modelled on Fushimi Inari Taisha, in its own region
// of world space far east of the town (see src/world/inari/plan.js and layout.INARI).
//   門前町 approach → 一の鳥居 → 二の鳥居 → 楼門 + guardian foxes → 外拝殿 / 本殿 → 千本鳥居 (two parallel
//   torii tunnels) → 奥社奉拝所 → torii-tunnel trail past 新池 and 三ツ辻 → 四ツ辻 viewpoint → 一ノ峰 summit loop.
// The area has its own root (batched separately). While the player is inside it the town roots are
// hidden (and vice versa), so neither costs anything while you are in the other.
// Portals: pray (stand still) in front of the town's E6 shrine, or key 6 → arrive at the approach;
// walk back out west past the first shops → return to the E6 shrine.
import * as THREE from 'three';
import * as P from './inari/plan.js';
import { batchStatic } from '../core/batch2.js';
import { makeTextures } from './inari/textures.js';
import { buildTerrain } from './inari/terrain.js';
import { buildPaths, flatQuad } from './inari/paths.js';
import { buildTunnels } from './inari/torii.js';
import { buildShrine } from './inari/shrine.js';
import { buildTown } from './inari/town.js';
import { buildMountain } from './inari/mountain.js';
import { buildForest } from './inari/forest.js';

export async function build(ctx) {
  const { L } = ctx;
  // top (identity, what gets batched / hidden) > root (at the area origin: children use local u, y, v)
  const top = new THREE.Group(); top.name = 'inari';
  const root = new THREE.Group(); root.name = 'inari-local';
  root.position.set(P.ORIGIN.x, 0, P.ORIGIN.z);
  top.add(root); ctx.scene.add(top);
  const tx = makeTextures(ctx);
  const step = (name, fn) => { try { return fn(); } catch (e) { console.error('[inari] ' + name + ' failed:', e); return null; } };
  // helpers shared by the builders: local (u, v) coords, world colliders
  const H = {
    root, tx, P,
    kit: (parent = root) => ctx.kit(parent),
    group(u, y, v, rotY = 0, parent = root) { const g = new THREE.Group(); g.position.set(u, y, v); g.rotation.y = rotY; parent.add(g); return g; },
    ground: (u, v) => P.groundLocal(u, v),
    box(u, v, w, d, rotY, y0, y1) { const p = P.toWorld(u, v); ctx.physics.addBox(p.x, p.z, w, d, rotY, y0, y1); },
    cyl(u, v, r, y0, y1) { const p = P.toWorld(u, v); ctx.physics.addCylinder(p.x, p.z, r, y0, y1); },
    walk(u, v, w, d, rotY, top) { const p = P.toWorld(u, v); ctx.physics.addWalkBox(p.x, p.z, w, d, rotY, top); },
    /** local kit-space point (x, z) in a group frame (u, v, rotY) -> local area coords */
    at(u, v, rotY, x, z) { const c = Math.cos(rotY), s = Math.sin(rotY); return { u: u + x * c + z * s, v: v - x * s + z * c }; },
    dynamic: [],
  };

  const terrain = step('terrain', () => buildTerrain(ctx, root, tx));
  step('paths', () => buildPaths(ctx, root, tx));
  step('flats', () => buildFlats(ctx, H));
  const tunnels = step('tunnels', () => buildTunnels(ctx, root, tx));
  const shrine = step('shrine', () => buildShrine(ctx, H)) || {};
  const town = step('town', () => buildTown(ctx, H)) || {};
  const mountain = step('mountain', () => buildMountain(ctx, H)) || {};
  const forest = step('forest', () => buildForest(ctx, H, { shrine, town, mountain })) || {};

  // merge the static meshes of the area by material (own pass: the town batch never sees this root)
  const stats = step('batch', () => batchStatic(top, { mat: ctx.mat, farR: 1e9 }));
  ctx.services.inari = { origin: P.ORIGIN, torii: tunnels?.count || 0, trees: forest.counts, stats, plan: P };

  // ---------------------------------------------------------------- realm switching (visibility)
  let inside = null, wires = null;
  const setRealm = (v) => {
    inside = v;
    top.visible = v;
    ctx.staticRoot.visible = !v; ctx.dynamicRoot.visible = !v;
    if (!wires) wires = ctx.scene.children.find(o => o.name === 'wires') || null;
    if (wires) wires.visible = !v;
  };
  ctx.onUpdate(() => {
    const v = L.INARI.contains(ctx.camera.position.x);
    if (v !== inside) setRealm(v);
  });

  // ---------------------------------------------------------------- portals
  const e6 = L.lotById('E6');
  const prayLocal = [0.4, -10.55];                                   // in front of the hokora's offering box
  const pray = e6 ? L.lotToWorld(e6, prayLocal[0], prayLocal[1]) : null;
  const hokora = e6 ? L.lotToWorld(e6, 0.4, -12.7) : null;
  const back = e6 ? L.lotToWorld(e6, 0.4, 1.1) : { x: L.HERO.x, z: L.HERO.z };
  const backYaw = e6 ? ((Math.atan2(-(back.x - hokora.x), -(back.z - hokora.z)) * 180 / Math.PI)) : 0;
  let still = 0, hinted = false;
  const fwd = new THREE.Vector3();
  ctx.onUpdate((dt) => {
    if (!ctx.travel) return;
    const p = ctx.player.position;
    if (L.INARI.contains(p.x)) {
      if (p.x - P.ORIGIN.x < P.SPOTS.leave.u1) ctx.travel({ x: back.x, z: back.z, yaw: backYaw, pitch: 2 }, { toast: '桜ヶ丘稲荷神社' });
      return;
    }
    if (!pray) return;
    const d = Math.hypot(p.x - pray.x, p.z - pray.z);
    if (d > 1.0) { still = 0; if (d > 3) hinted = false; return; }
    ctx.camera.getWorldDirection(fwd);
    const tx_ = hokora.x - p.x, tz = hokora.z - p.z, tl = Math.hypot(tx_, tz) || 1;
    const facing = (fwd.x * tx_ + fwd.z * tz) / (tl * Math.hypot(fwd.x, fwd.z) || 1);
    if (facing < 0.6) { still = 0; return; }
    if (!hinted) { hinted = true; ctx.toast?.('お参り… 稲荷山へ'); }
    still += dt;
    if (still > 2.2) { still = 0; ctx.travel(L.INARI.arrive, { toast: '稲荷山 表参道' }); }
  });
  for (const fn of H.dynamic) ctx.onUpdate(fn);

  return { terrain: terrain?.tris, torii: tunnels?.count };
}

// Paved / gravelled flats.
function buildFlats(ctx, H) {
  const { mat } = ctx; const { root, tx } = H;
  const paving = mat.toon('#ffffff', { map: tx.paving, paint: 0.04 });
  const gravel = mat.toon('#ffffff', { map: tx.gravel, paint: 0.03 });
  const steps = mat.toon('#e6e1d6', { map: tx.steps, paint: 0.04 });
  // approach street (表参道): granite slabs, 8.4 m wide
  flatQuad(ctx, root, paving, -120, 48.2, -4.2, 4.2, 0.012, 4);
  // precinct: white gravel everywhere + a stone walk on the axis and to the back stairs
  const pr = P.flatById('precinct');
  flatQuad(ctx, root, gravel, pr.u0 + 0.2, pr.u1 - 0.2, pr.v0 + 0.2, pr.v1 - 0.2, pr.y + 0.01, 2);
  flatQuad(ctx, root, steps, 62, 106, -2.2, 2.2, pr.y + 0.022, 2);
  flatQuad(ctx, root, steps, 97.5, 100.5, -21.5, -2.2, pr.y + 0.022, 2);
  // small plazas: gravel
  for (const id of ['senbonGate', 'okusha', 'mitsu', 'yotsu', 'summit']) {
    const f = P.flatById(id);
    flatQuad(ctx, root, gravel, f.u0 + 0.3, f.u1 - 0.3, f.v0 + 0.3, f.v1 - 0.3, f.y + 0.012, 2);
  }
}
