// tokyo — 東京 and the JR 山手線 (Yamanote Line): a half-scale ring viaduct through a Tokyo cityscape with all 30
// stations (platform doors, JR East name boards, canopies, departure boards, a jingle each), and 11-car E235 trains in
// both directions on a timetable. You can ride them: walk in while the doors are open, hold a strap, watch the next-
// station screens, hear the announcements (Japanese + English) and get off wherever you like.
// Reached on the のぞみ to 東京 from 大阪駅 13番線 (or key 8); the 東海道新幹線 stairs at 東京 lead back to 大阪.
// Plan + timetable: src/world/tokyo/plan.js.
import * as THREE from 'three';
import * as P from './tokyo/plan.js';
import { batchStatic } from '../core/batch2.js';
import { makeTextures } from './terminal/tex.js';
import { makeMaterials } from './terminal/mats.js';
import { buildViaduct } from './tokyo/viaduct.js';
import { buildStations } from './tokyo/stations.js';
import { buildCity } from './tokyo/city.js';
import { buildTrains } from './tokyo/trains.js';
import { buildOps } from './tokyo/ops.js';

export async function build(ctx) {
  const { L } = ctx;
  const top = new THREE.Group(); top.name = 'tokyo';
  const root = new THREE.Group(); root.name = 'tokyo-local'; root.position.set(P.ORIGIN.x, 0, P.ORIGIN.z);
  const dyn = new THREE.Group(); dyn.name = 'tokyo-dynamic'; dyn.position.copy(root.position); dyn.userData.noBatch = true;
  top.add(root); top.add(dyn); ctx.scene.add(top);
  const tx = makeTextures(ctx), M = makeMaterials(ctx, tx);
  const step = (name, fn) => { try { return fn(); } catch (e) { console.error('[tokyo] ' + name + ' failed:', e); return null; } };
  const updates = [];
  const H = {
    root, dyn, tx, M, P,
    kit: (parent = root) => ctx.kit(parent),
    group(u, y, v, rotY = 0, parent = root) { const g = new THREE.Group(); g.position.set(u, y, v); g.rotation.y = rotY; parent.add(g); return g; },
    box(u, v, w, d, rotY, y0, y1) { const p = P.toWorld(u, v); return ctx.physics.addBox(p.x, p.z, w, d, rotY, y0, y1); },
    cyl(u, v, r, y0, y1) { const p = P.toWorld(u, v); return ctx.physics.addCylinder(p.x, p.z, r, y0, y1); },
    walk(u, v, w, d, rotY, top_, bottom) { const p = P.toWorld(u, v); return ctx.physics.addWalkBox(p.x, p.z, w, d, rotY, top_, bottom); },
    update: (fn) => updates.push(fn),
    visible: () => top.visible,
    /** player feet in local coords (null when elsewhere) */
    player() { const p = ctx.player.position; if (!L.TOKYO.contains(p.x)) return null; return { u: p.x - P.ORIGIN.x, y: p.y, v: p.z - P.ORIGIN.z }; },
  };
  step('viaduct', () => buildViaduct(ctx, H));
  const stations = step('stations', () => buildStations(ctx, H)) || {};
  step('city', () => buildCity(ctx, H));
  const trains = step('trains', () => buildTrains(ctx, H, stations)) || {};
  step('ops', () => buildOps(ctx, H, { stations, trains }));

  const stats = step('batch', () => batchStatic(top, { mat: ctx.mat, farR: 1e9, nearCell: 110 }));
  ctx.services.tokyo = { origin: P.ORIGIN, stats, plan: P, trains: trains.list?.length || 0 };
  ctx.realm?.register('tokyo', top);
  ctx.onUpdate((dt, t) => { for (const fn of updates) fn(dt, t); });
  return { stats };
}
