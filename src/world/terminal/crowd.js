// The crowd of 大阪駅: ~180 lightweight passengers (instanced, one draw call per outfit + one for all legs) whose lives
// are pure functions of the timetable. Each boards a particular train: walks in from the street, taps through the
// IC gates (you hear the ピッ), takes the stairs or rides the escalator (standing on the right — this is Osaka),
// walks along the platform and queues in two lines at its door marker, and boards when the doors open. Others get
// off each train, walk to the stairs, down, out through the gates and away into the street. Shinkansen passengers
// go on through the 新幹線のりかえ口. Deterministic (no state), so it loops seamlessly every timetable period.
import * as THREE from 'three';
import * as P from './plan.js';

const seeded = (seed) => { let s = seed >>> 0 || 1; return () => ((s = (s * 16807) % 2147483647) / 2147483647); };
const mod = (a, n) => ((a % n) + n) % n;

// ------------------------------------------------------------------ figures
const SKIN = ['#f3d5c1', '#f0cfb8', '#e9c4ab'];
const OUTFITS = [   // top, bottom (legs), hair, extra
  { top: '#3f4758', bottom: '#3a3f4c', hair: '#2b2426', collar: '#eceae6', bag: 'brief' },
  { top: '#6d6a60', bottom: '#5a574f', hair: '#1f1b1f', collar: '#eceae6', bag: 'brief' },
  { top: '#c9b79a', bottom: '#6b5a58', hair: '#5a4436', skirt: '#6f6a78', bag: 'hand' },
  { top: '#eeebe6', bottom: '#6b5a58', hair: '#2b2426', skirt: '#44507a', collar: '#44507a', bag: 'shoulder' },
  { top: '#b35d4d', bottom: '#4f5a70', hair: '#3a2e2c', bag: 'back' },
  { top: '#4f6a58', bottom: '#3a3f52', hair: '#1f1b1f', bag: 'back' },
  { top: '#7a6450', bottom: '#6d6760', hair: '#b9b5bf', bag: null },
  { top: '#e0ddd5', bottom: '#3a3f52', hair: '#3a2e2c', bag: 'case' },
  { top: '#2f3a52', bottom: '#2f3440', hair: '#2b2426', scarf: '#c9503c', bag: 'hand' },
  { top: '#e9e6e0', bottom: '#4a4f5c', hair: '#5a4436', bag: 'shoulder' },
];
function figureGeo(o, skin) {
  const parts = [];
  const add = (g, color, pos, rot, scale) => {
    g = g.index ? g.toNonIndexed() : g;
    const m = new THREE.Matrix4().compose(new THREE.Vector3(...pos), new THREE.Quaternion().setFromEuler(new THREE.Euler(...(rot || [0, 0, 0]))), new THREE.Vector3(...(scale || [1, 1, 1])));
    g.applyMatrix4(m); g.deleteAttribute('uv');
    const c = new THREE.Color(color), n = g.attributes.position.count, a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(a, 3)); parts.push(g);
  };
  const cyl = (rt, rb, h, seg = 8) => new THREE.CylinderGeometry(rt, rb, h, seg);
  // hips / skirt, torso, shoulders, neck, head, hair
  if (o.skirt) add(cyl(0.15, 0.24, 0.36, 10), o.skirt, [0, 0.72, 0], null, [1, 1, 0.8]);
  else add(cyl(0.16, 0.15, 0.16, 8), o.bottom, [0, 0.86, 0], null, [1, 1, 0.7]);
  add(cyl(0.2, 0.16, 0.58, 10), o.top, [0, 1.16, 0], null, [1, 1, 0.64]);
  add(new THREE.SphereGeometry(0.2, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), o.top, [0, 1.43, 0], null, [1, 0.45, 0.66]);
  if (o.collar) add(cyl(0.06, 0.08, 0.06, 8), o.collar, [0, 1.49, 0.01]);
  if (o.scarf) add(cyl(0.085, 0.1, 0.09, 8), o.scarf, [0, 1.5, 0]);
  add(cyl(0.045, 0.05, 0.08, 6), skin, [0, 1.52, 0]);
  add(new THREE.SphereGeometry(0.105, 12, 8), skin, [0, 1.62, 0.005], null, [0.95, 1.05, 1]);
  add(new THREE.SphereGeometry(0.114, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), o.hair, [0, 1.635, -0.01], [-0.25, 0, 0], [1, 1, 1.02]);
  if (o.skirt) add(new THREE.BoxGeometry(0.2, 0.22, 0.05), o.hair, [0, 1.52, -0.09]);
  // arms (hanging, slightly forward) + hands
  for (const s of [-1, 1]) {
    add(cyl(0.05, 0.045, 0.56, 6), o.top, [s * 0.225, 1.14, 0.01], [0.06, 0, s * 0.08]);
    add(new THREE.SphereGeometry(0.045, 6, 4), skin, [s * 0.25, 0.84, 0.03]);
  }
  // bags
  if (o.bag === 'brief') add(new THREE.BoxGeometry(0.08, 0.28, 0.38), '#2f2a2c', [0.27, 0.72, 0.02]);
  if (o.bag === 'hand') add(new THREE.BoxGeometry(0.1, 0.24, 0.3), '#b9a88f', [-0.27, 0.78, 0.02]);
  if (o.bag === 'shoulder') add(new THREE.BoxGeometry(0.1, 0.26, 0.3), '#475072', [0.24, 0.95, -0.05]);
  if (o.bag === 'back') add(new THREE.BoxGeometry(0.3, 0.4, 0.16), '#3f4a5e', [0, 1.18, -0.2]);
  if (o.bag === 'case') { add(new THREE.BoxGeometry(0.22, 0.52, 0.38), '#4a6fa5', [0.36, 0.3, -0.28]); add(new THREE.BoxGeometry(0.02, 0.5, 0.02), '#2f3238', [0.29, 0.75, -0.14], [0.45, 0, 0]); }
  const g = mergeAll(parts); g.computeBoundingSphere(); return g;
}
function mergeAll(list) {
  let n = 0; for (const g of list) n += g.attributes.position.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3);
  let o = 0;
  for (const g of list) { pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); col.set(g.attributes.color.array, o * 3); o += g.attributes.position.count; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}

// ------------------------------------------------------------------ trips (keyframes relative to the doors opening)
/** keys: [{t, u, y, v, mode: 'walk'|'stand'|'ride', yaw?}] */
class Trip {
  constructor(t0, u, y, v) { this.keys = [{ t: t0, u, y, v, mode: 'stand' }]; this.gates = []; }
  get last() { return this.keys[this.keys.length - 1]; }
  to(u, y, v, speed, mode = 'walk') { const a = this.last, d = Math.hypot(u - a.u, v - a.v, (y - a.y) * 0.5); this.keys.push({ t: a.t + d / speed, u, y, v, mode }); return this; }
  path(pts, speed) { for (const [u, y, v] of pts) this.to(u, y, v, speed); return this; }
  stand(dt, yaw = null) { const a = this.last; this.keys.push({ t: a.t + dt, u: a.u, y: a.y, v: a.v, mode: 'stand', yaw }); return this; }
  shift(dt) { for (const k of this.keys) k.t += dt; for (const g of this.gates) g.t += dt; return this; }
  get t0() { return this.keys[0].t; }
  get t1() { return this.last.t; }
  /** remember when this trip crosses a gate line (for the beep) */
  gate(v, u, kind) { this.gates.push({ t: this.last.t, v, u, kind }); return this; }
}

export function buildCrowd(ctx, H) {
  const { dyn } = H;
  const { mat } = ctx;
  const Y = P.Y;
  const trips = [];   // { trip, period, base, variant, scale, legCol }
  const WALK = 1.32;

  // ---- geometry helpers (concourse routes)
  const laneU = (i) => P.GATES.u0 + (i + 0.5) * P.GATES.pitch;
  const sLaneU = (i) => P.SGATES.u0 + (i + 0.5) * P.SGATES.pitch;
  const liftOf = (id) => P.LIFTS.find(l => l.plat === id);
  const stairsV = (L, up) => L.v - 0.6 + L.w * (up ? 0.72 : 0.28);
  const escV = (L) => L.v - 2.1 + 0.3;           // stand on the right
  const entrance = (r) => { const s = r() < 0.5 ? -1 : 1; return s * (5.5 + r() * 6); };

  /** street -> central gate -> (optional shop) -> west corridor -> bottom of the lift. Returns the trip (at the lift foot). */
  const inbound = (trip, r, L, lane, viaShin, escalator) => {
    const ue = entrance(r), ul = laneU(lane);
    trip.path([[ue * 0.6, 0, 45], [ul, 0, 34.2]], WALK);
    trip.to(ul, 0, 29.6, WALK * 0.8).gate(P.GATES.v, ul, 'in');
    if (viaShin) {
      const sl = sLaneU(Math.floor(r() * P.SGATES.n));
      trip.path([[2 + r() * 1.5, 0, 25], [2 + r() * 1.5, 0, -26], [sl, 0, -29]], WALK);
      trip.to(sl, 0, -32.2, WALK * 0.8).gate(P.SGATES.v, sl, 'in');
      trip.to(-21 + r(), 0, -33.5, WALK);
    } else {
      if (r() < 0.22) { trip.to(23 + r() * 1.5, 0, 16 + r() * 8, WALK).stand(4 + r() * 6, Math.PI / 2); trip.to(2, 0, 26, WALK); }
      trip.to(-21 + r(), 0, 27, WALK);
    }
    const v = escalator ? escV(L) : stairsV(L, true);
    trip.path([[-21 + r(), 0, v], [L.u0 - 0.6, 0, v]], WALK);
    return v;
  };
  /** up the stairs / escalator to the platform landing */
  const climb = (trip, L, v, escalator) => {
    const top = L.s ? Y.platS : Y.plat;
    if (escalator) { trip.to(L.u0 + 1.2, 0, v, 0.8); trip.to(L.u0 + 12.8, top, v, 0.5 * Math.hypot(11.6, top) / 11.6 * 1.0, 'ride'); trip.to(L.u0 + 13.4, top, v, 0.5, 'ride'); }
    else trip.to(L.u0 + 13.4, top, v, 0.62);
    trip.to(L.u0 + 15, top, v, WALK);
    return top;
  };
  /** down the stairs and out through the central gate to the street */
  const outbound = (trip, r, L, viaShin) => {
    const top = L.s ? Y.platS : Y.plat, v = stairsV(L, false);
    trip.to(L.u0 + 15, top, v, WALK); trip.to(L.u0 + 13.4, top, v, WALK);
    trip.to(L.u0, 0, v, 0.62); trip.to(L.u0 - 1.5, 0, v, WALK);
    if (viaShin) {
      const sl = sLaneU(Math.floor(r() * P.SGATES.n));
      trip.path([[-21 + r(), 0, -34], [sl, 0, -32.4]], WALK);
      trip.to(sl, 0, -28.8, WALK * 0.8).gate(P.SGATES.v, sl, 'out');
      trip.path([[3.5 + r(), 0, -26], [3.5 + r(), 0, 25]], WALK);
    } else trip.path([[-21 + r(), 0, v], [-21 + r(), 0, 27.5]], WALK);
    const ul = laneU(Math.floor(r() * P.GATES.n)), ue = entrance(r);
    trip.to(ul, 0, 29.8, WALK); trip.to(ul, 0, 34.4, WALK * 0.8).gate(P.GATES.v, ul, 'out');
    trip.path([[ue * 0.6, 0, 45], [ue, 0, 57]], WALK);
  };

  // ---- conventional tracks
  for (const [trkS, S] of Object.entries(P.SERVICES)) {
    const trk = +trkS, I = P.ISLANDS.find(i => i.tracks.includes(trk)), L = liftOf(I.id);
    const side = Math.sign(P.TRACKS[trk] - I.v), edge = I.v + side * P.ISLAND_W / 2, inward = -side;
    const doors = P.convDoors(S.cars).filter(u => u < -18.5 || u > -1.5);
    const base = S.offset + P.T_CONV.approach + P.T_CONV.doorsOpen[0];
    const r = seeded(trk * 977 + 13);
    const laneFor = (u) => (u < -2 ? I.v + side * 3.9 : I.v + side * 1.5);
    // boarders
    const used = new Map();
    for (let n = 0; n < 13; n++) {
      const di = Math.floor(r() * doors.length), ud = doors[di];
      const slot = used.get(di) || 0; used.set(di, slot + 1);
      const col = slot % 2 ? 1 : -1, row = slot >> 1;
      const esc = r() < 0.4;
      const trip = new Trip(0, entrance(r), 0, 57);
      const v0 = inbound(trip, r, L, Math.floor(r() * P.GATES.n), false, esc);
      const top = climb(trip, L, v0, esc);
      const lane = laneFor(ud);
      trip.path([[L.u0 + 15.5, top, lane], [ud + col * 0.5, top, lane]], WALK);
      trip.to(ud + col * 0.5, top, edge + inward * (1.45 + row * 0.55), WALK);
      // shift so the trip reaches its queue spot some time before the doors open, then wait, then board
      const arrive = trip.t1, budget = P.PERIOD - 12 - (arrive - trip.t0) - 8 - slot * 1.1, wait = Math.min(6 + r() * 60, budget);
      if (wait < 2) continue;
      trip.shift(-arrive - wait);
      trip.stand(wait + 5.5 + slot * 1.1, Math.atan2(0, side));
      trip.to(ud + col * 0.22, top, edge + inward * 0.4, WALK * 0.8);
      trip.to(ud + col * 0.2, top, edge - inward * 0.7, WALK * 0.8);
      if (trip.t1 - trip.t0 > P.PERIOD - 4) continue;
      trips.push({ trip, period: P.PERIOD, base, variant: Math.floor(r() * OUTFITS.length), scale: 0.93 + r() * 0.12, seed: r() });
    }
    // alighting passengers
    for (let n = 0; n < 11; n++) {
      const ud = doors[Math.floor(r() * doors.length)], off = (r() - 0.5) * 0.4;
      const trip = new Trip(1 + n * 0.7 + r() * 2, ud + off, Y.plat, edge - inward * 0.6);
      trip.to(ud + off, Y.plat, edge + inward * 1.1, WALK);
      const lane = laneFor(ud);
      trip.path([[ud + off * 2, Y.plat, lane], [L.u0 + 15.5, Y.plat, lane]], WALK * 1.05);
      outbound(trip, r, L, false);
      if (trip.t1 - trip.t0 > P.PERIOD - 4) continue;
      trips.push({ trip, period: P.PERIOD, base, variant: Math.floor(r() * OUTFITS.length), scale: 0.93 + r() * 0.12, seed: r() });
    }
  }
  // ---- Shinkansen
  for (const Pl of P.S_PLATS) {
    const trk = Pl.track, S = P.S_SERVICES[trk], L = liftOf(Pl.id);
    const back = Pl.edge === Pl.v0 ? Pl.v1 : Pl.v0, inward = Math.sign(back - Pl.edge);
    const doors = P.shinDoors().filter(u => (u < -18.5 || u > -1.5) && Math.abs(u) < 95);   // the cars within a walk
    const base = S.offset + P.T_SHIN.approach + P.T_SHIN.doorsOpen[0];
    const r = seeded(trk * 733 + 5);
    const lane = Pl.edge + inward * 2.3;
    const used = new Map();
    for (let n = 0; n < 12; n++) {
      const di = Math.floor(r() * doors.length), ud = doors[di];
      const slot = used.get(di) || 0; used.set(di, slot + 1);
      const col = slot % 2 ? 1 : -1, row = slot >> 1, esc = r() < 0.5;
      const trip = new Trip(0, entrance(r), 0, 57);
      const v0 = inbound(trip, r, L, Math.floor(r() * P.GATES.n), true, esc);
      const top = climb(trip, L, v0, esc);
      trip.path([[L.u0 + 15.5, top, lane], [ud + col * 0.5, top, lane]], WALK);
      trip.to(ud + col * 0.5, top, Pl.edge + inward * (1.5 + row * 0.55), WALK);
      const arrive = trip.t1, budget = P.S_PERIOD - 12 - (arrive - trip.t0) - 9 - slot * 1.2, wait = Math.min(8 + r() * 50, budget);
      if (wait < 2) continue;
      trip.shift(-arrive - wait);
      trip.stand(wait + 6 + slot * 1.2, Math.atan2(0, -inward));
      trip.to(ud + col * 0.2, top, Pl.edge + inward * 0.4, WALK * 0.8);
      trip.to(ud, top, Pl.edge - inward * 0.9, WALK * 0.8);
      if (trip.t1 - trip.t0 > P.S_PERIOD - 4) continue;
      trips.push({ trip, period: P.S_PERIOD, base, variant: Math.floor(r() * OUTFITS.length), scale: 0.93 + r() * 0.12, seed: r() });
    }
    for (let n = 0; n < 10; n++) {
      const ud = doors[Math.floor(r() * doors.length)];
      const trip = new Trip(1.5 + n * 0.9 + r() * 2, ud, Y.platS, Pl.edge - inward * 0.9);
      trip.to(ud, Y.platS, Pl.edge + inward * 1.2, WALK);
      trip.path([[ud, Y.platS, lane], [L.u0 + 15.5, Y.platS, lane]], WALK * 1.05);
      outbound(trip, r, L, true);
      if (trip.t1 - trip.t0 > P.S_PERIOD - 4) continue;
      trips.push({ trip, period: P.S_PERIOD, base, variant: Math.floor(r() * OUTFITS.length), scale: 0.93 + r() * 0.12, seed: r() });
    }
  }
  // ---- people who only use the ticket machines / the office / lockers outside the gates (short loops)
  {
    const r = seeded(4242);
    const spots = [[-26 + 0, 35.2, 0], [-24, 35.2, 0], [-22.5, 35.2, 0], [22, 39.4, 0], [26, 39.4, 0], [31.8, 42, -Math.PI / 2], [-20.5, 35.2, 0]];
    for (let n = 0; n < 12; n++) {
      const [su, sv, yaw] = spots[n % spots.length];
      const trip = new Trip(0, entrance(r), 0, 57);
      trip.path([[su * 0.5, 0, 46], [su + (r() - 0.5) * 0.4, 0, sv + 0.9]], WALK);
      trip.stand(6 + r() * 14, yaw === 0 ? Math.PI : yaw);
      trip.path([[su * 0.4, 0, 46], [entrance(r), 0, 57]], WALK);
      trips.push({ trip, period: 90 + r() * 60, base: r() * 200, variant: Math.floor(r() * OUTFITS.length), scale: 0.93 + r() * 0.12, seed: r() });
    }
  }

  // ------------------------------------------------------------------ instancing
  const bodyM = mat.toon('#ffffff', { vertexColors: true, paint: 0.02 });
  const legM = mat.toon('#ffffff', { paint: 0.02 });
  const variants = OUTFITS.map((o, i) => figureGeo(o, SKIN[i % SKIN.length]));
  const counts = OUTFITS.map(() => 0);
  trips.forEach(T => { T.index = counts[T.variant]++; });
  const bodies = variants.map((g, i) => { const im = new THREE.InstancedMesh(g, bodyM, Math.max(1, counts[i])); im.frustumCulled = false; im.castShadow = true; im.receiveShadow = true; dyn.add(im); return im; });
  const legGeo = new THREE.CylinderGeometry(0.07, 0.055, 0.8, 7).translate(0, -0.4, 0);
  { const s = new THREE.BoxGeometry(0.1, 0.07, 0.22).translate(0, -0.78, 0.04); const m = mergeAll([legGeo.toNonIndexed(), s.toNonIndexed()].map(g => { g.deleteAttribute('uv'); const n = g.attributes.position.count; g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3).fill(1), 3)); return g; })); legGeo.copy(m); }
  const legs = new THREE.InstancedMesh(legGeo, legM, trips.length * 2);
  legs.frustumCulled = false; legs.castShadow = true;
  const c = new THREE.Color();
  trips.forEach((T, i) => { const o = OUTFITS[T.variant]; c.set(o.skirt ? '#5a4a4a' : o.bottom).multiplyScalar(0.9 + T.seed * 0.2); legs.setColorAt(i * 2, c); legs.setColorAt(i * 2 + 1, c); });
  dyn.add(legs);

  // ------------------------------------------------------------------ update
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), pos = new THREE.Vector3(), scl = new THREE.Vector3(), hip = new THREE.Matrix4(), rot = new THREE.Matrix4();
  const up = new THREE.Vector3(0, 1, 0), zero = new THREE.Matrix4().makeScale(0, 0, 0);
  const near = [];   // agents near the player (for colliders)
  const au = ctx.audio;
  let lastBeep = 0;
  const evalTrip = (T, t, out) => {
    let r = mod(t - T.base, T.period);
    if (r > T.trip.t1) r -= T.period;
    const K = T.trip.keys;
    if (r < K[0].t || r > K[K.length - 1].t) return false;
    let i = 1; while (i < K.length - 1 && K[i].t < r) i++;
    const a = K[i - 1], b = K[i], f = b.t > a.t ? (r - a.t) / (b.t - a.t) : 1;
    out.u = a.u + (b.u - a.u) * f; out.y = a.y + (b.y - a.y) * f; out.v = a.v + (b.v - a.v) * f;
    out.mode = b.mode; out.r = r;
    if (b.mode === 'stand') out.yaw = b.yaw ?? out.prevYaw ?? 0;
    else { const du = b.u - a.u, dv = b.v - a.v; out.yaw = Math.abs(du) + Math.abs(dv) > 1e-4 ? Math.atan2(du, dv) : (out.prevYaw ?? 0); }
    // keep the last travel heading while standing without an explicit yaw
    if (b.mode !== 'stand') out.prevYaw = out.yaw; else if (b.yaw == null) { for (let j = i - 1; j > 0; j--) { const p = K[j - 1], k2 = K[j]; if (Math.abs(k2.u - p.u) + Math.abs(k2.v - p.v) > 1e-4) { out.yaw = Math.atan2(k2.u - p.u, k2.v - p.v); break; } } }
    return true;
  };
  const st = trips.map(() => ({ u: 0, y: 0, v: 0, yaw: 0, mode: 'stand', r: 0, prevYaw: 0 }));
  let prevT = null;
  H.update((dt, t) => {
    if (!H.visible()) return;
    const pl = H.player();
    near.length = 0;
    for (let i = 0; i < trips.length; i++) {
      const T = trips[i], s = st[i], im = bodies[T.variant];
      if (!evalTrip(T, t, s)) { im.setMatrixAt(T.index, zero); legs.setMatrixAt(i * 2, zero); legs.setMatrixAt(i * 2 + 1, zero); continue; }
      const walking = s.mode === 'walk';
      const ph = walking ? s.r * 1.9 * Math.PI + T.seed * 6 : 0;
      const bob = walking ? Math.abs(Math.sin(ph)) * 0.035 : 0;
      const sway = s.mode === 'stand' ? Math.sin(t * 0.5 + T.seed * 9) * 0.05 : 0;
      q.setFromAxisAngle(up, s.yaw + sway); pos.set(s.u, s.y + bob, s.v); scl.setScalar(T.scale);
      m4.compose(pos, q, scl); im.setMatrixAt(T.index, m4);
      for (const sg of [-1, 1]) {
        const sw = walking ? Math.sin(ph) * 0.5 * sg : 0;
        hip.makeTranslation(sg * 0.085, 0.82, 0); rot.makeRotationX(sw);
        legs.setMatrixAt(i * 2 + (sg > 0 ? 1 : 0), m4.clone().multiply(hip).multiply(rot));
      }
      if (pl && Math.abs(pl.u - s.u) < 12 && Math.abs(pl.v - s.v) < 12 && Math.abs(pl.y - s.y) < 2) near.push(s);
      // gate beeps as they pass (only close to the listener, and not too many)
      if (prevT !== null && t > prevT && pl) for (const g of T.trip.gates) {
        const r0 = s.r - (t - prevT);
        if (r0 < g.t && s.r >= g.t && Math.abs(pl.u - g.u) < 26 && Math.abs(pl.v - g.v) < 26 && t - lastBeep > 0.22) {
          lastBeep = t; const w = P.toWorld(g.u, g.v);
          au?.play(T.seed < 0.7 ? 'icTouch' : T.seed < 0.93 ? 'icPass' : 'icLow', { position: { x: w.x, y: 1.0, z: w.z }, volume: 0.55 });
        }
      }
    }
    prevT = t;
    for (const im of bodies) im.instanceMatrix.needsUpdate = true;
    legs.instanceMatrix.needsUpdate = true;
  });
  // colliders for the passengers near the player (so you bump into queues instead of walking through them)
  ctx.physics.addDynamic(() => {
    if (!H.visible()) return [];
    return near.slice(0, 24).map(s => { const w = P.toWorld(s.u, s.v); return { cx: w.x, cz: w.z, w: 0.44, d: 0.44, y0: s.y - 0.3, y1: s.y + 1.6 }; });
  });
  return { count: trips.length };
}
