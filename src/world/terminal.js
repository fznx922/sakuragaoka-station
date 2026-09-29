// terminal — 大阪駅 (JR Osaka, a personal fan recreation), a big JR terminal in its own region far west of the town, modelled on
// Osaka Station (ground-level island platforms under a huge glass dome, a concourse below) with a
// Shin-Osaka-style Shinkansen side (side platforms with platform gates + two through tracks).
//   concourse: ticket machines, fare chart, 中央改札 (IC gates that beep), shops, stairs + escalators
//   platforms 1–6: 8-car EMUs on a timetable with approach / departure melodies and announcements
//   新幹線のりかえ口 → platforms 13 / 14: 16-car Shinkansen pulling in, and others passing at 250 km/h
// Real JR West line names + destinations (plus the 桜川線 branch home); melodies are original. Plan + timetable: src/world/terminal/plan.js.
// Portals: step into the open door of the train at Sakuragaoka platform 1 (or key 7) → arrive on
// platform 1 here; step into the 桜川線 train on track 1 while its doors are open → back to town.
import * as THREE from 'three';
import * as P from './terminal/plan.js';
import { batchStatic } from '../core/batch2.js';
import { makeTextures } from './terminal/tex.js';
import { makeMaterials } from './terminal/mats.js';
import { buildStructure } from './terminal/structure.js';
import { buildRoof } from './terminal/roof.js';
import { buildCanopy } from './terminal/canopy.js';
import { buildGates } from './terminal/gates.js';
import { buildFurniture } from './terminal/furniture.js';
import { buildSigns } from './terminal/signs.js';
import { buildTrains } from './terminal/trains.js';
import { buildCity } from './terminal/city.js';
import { buildOps } from './terminal/ops.js';
import { buildPeople } from './terminal/people.js';
import { buildCrowd } from './terminal/crowd.js';

export async function build(ctx) {
  const { L } = ctx;
  // top (identity: batched + shown / hidden as a realm) > root (area origin; children use local u, y, v)
  const top = new THREE.Group(); top.name = 'terminal';
  const root = new THREE.Group(); root.name = 'terminal-local';
  root.position.set(P.ORIGIN.x, 0, P.ORIGIN.z);
  const dyn = new THREE.Group(); dyn.name = 'terminal-dynamic';   // animated things (never batched)
  dyn.position.copy(root.position); dyn.userData.noBatch = true;
  top.add(root); top.add(dyn); ctx.scene.add(top);
  const tx = makeTextures(ctx), M = makeMaterials(ctx, tx);
  const step = (name, fn) => { try { return fn(); } catch (e) { console.error('[terminal] ' + name + ' failed:', e); return null; } };
  const updates = [];
  const H = {
    root, dyn, tx, M, P,
    kit: (parent = root) => ctx.kit(parent),
    group(u, y, v, rotY = 0, parent = root) { const g = new THREE.Group(); g.position.set(u, y, v); g.rotation.y = rotY; parent.add(g); return g; },
    box(u, v, w, d, rotY, y0, y1) { const p = P.toWorld(u, v); return ctx.physics.addBox(p.x, p.z, w, d, rotY, y0, y1); },
    cyl(u, v, r, y0, y1) { const p = P.toWorld(u, v); return ctx.physics.addCylinder(p.x, p.z, r, y0, y1); },
    walk(u, v, w, d, rotY, top_, bottom) { const p = P.toWorld(u, v); return ctx.physics.addWalkBox(p.x, p.z, w, d, rotY, top_, bottom); },
    /** local kit-space point (x, z) in a group frame (u, v, rotY) -> local area coords */
    at(u, v, rotY, x, z) { const c = Math.cos(rotY), s = Math.sin(rotY); return { u: u + x * c + z * s, v: v - x * s + z * c }; },
    update: (fn) => updates.push(fn),
    visible: () => top.visible,
    /** player feet in local coords (null when elsewhere) */
    player() { const p = ctx.player.position; if (!L.TERMINAL.contains(p.x)) return null; return { u: p.x - P.ORIGIN.x, y: p.y, v: p.z - P.ORIGIN.z }; },
  };

  const structure = step('structure', () => buildStructure(ctx, H)) || {};
  step('roof', () => buildRoof(ctx, H));
  step('canopy', () => buildCanopy(ctx, H));
  step('gates', () => buildGates(ctx, H));
  step('furniture', () => buildFurniture(ctx, H, structure));
  const signs = step('signs', () => buildSigns(ctx, H)) || {};
  const trains = step('trains', () => buildTrains(ctx, H)) || {};
  step('city', () => buildCity(ctx, H));
  step('ops', () => buildOps(ctx, H, { signs, trains }));
  step('people', () => buildPeople(ctx, H));
  const crowd = step('crowd', () => buildCrowd(ctx, H)) || {};

  const stats = step('batch', () => batchStatic(top, { mat: ctx.mat, farR: 1e9, nearCell: 110 }));
  ctx.services.terminal = { origin: P.ORIGIN, stats, plan: P, trains: trains.list?.length || 0, crowd: crowd.count || 0 };
  ctx.realm?.register('terminal', top);
  ctx.onUpdate((dt, t) => { for (const fn of updates) fn(dt, t); });

  // ---------------------------------------------------------------- portals
  // town -> terminal: step into an open door of the train standing at Sakuragaoka platform 1 (track A)
  let hold = 0;
  ctx.onUpdate((dt) => {
    if (!ctx.travel || dt <= 0) return;
    const p = ctx.player.position;
    if (L.regionAt(p.x)) { hold = 0; return; }
    const rail = ctx.services.rail, tr = rail?.trains?.find(t => t.track === 'A');
    const open = tr ? tr.doorsOpen > 0.8 && tr.stopped : false;
    const atDoor = open && p.y > L.PLATFORM.y - 0.3 && p.z < L.PLATFORM.south.edgeZ + 0.75 && p.z > L.PLATFORM.south.edgeZ - 0.3 && L.TRAIN_DOORS_X.some(x => Math.abs(p.x - x) < 0.7);
    if (!atDoor) { hold = 0; return; }
    hold += dt;
    if (hold > 0.5) { hold = 0; ctx.travel(L.TERMINAL.arrive, { toast: '桜川線 → 大阪駅 1番のりば' }); }
  });
  return { stats };
}
