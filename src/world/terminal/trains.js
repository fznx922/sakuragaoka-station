// Trains of 桜都駅: 8-car commuter EMUs in line liveries (stainless with a line-colour band, the all-orange
// loop line, the cream / pink 桜川線 through train) and 16-car Shinkansen (white, blue stripes, lofted aero
// noses) — each train merged into a handful of meshes, with sliding doors, head / tail lights, destination LEDs,
// and positional running sounds. Motion is a pure function of time (plan.convState / plan.shinState).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import * as P from './plan.js';

const col = (hex) => new THREE.Color(hex);
/** accumulates coloured, transformed geometry pieces and merges them (vertex colours, position/normal/color only) */
class Acc {
  constructor() { this.list = []; }
  add(geo, pos = [0, 0, 0], color = '#ffffff', rot = null, scale = null) {
    let g = geo.index ? geo.toNonIndexed() : geo.clone();
    const m = new THREE.Matrix4().compose(new THREE.Vector3(...pos), new THREE.Quaternion().setFromEuler(new THREE.Euler(...(rot || [0, 0, 0]))), new THREE.Vector3(...(scale || [1, 1, 1])));
    g.applyMatrix4(m);
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'color') g.deleteAttribute(k);
    if (!g.attributes.color) { const c = col(color), n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); }
    this.list.push(g); return this;
  }
  box(w, h, d, pos, color, rot) { return this.add(new THREE.BoxGeometry(w, h, d), pos, color, rot); }
  build() { const g = mergeGeometries(this.list, false); g.computeBoundingSphere(); g.computeBoundingBox(); return g; }
}

// ------------------------------------------------------------------ commuter EMU
const LIVERY = {
  sakuragawa: { body: '#f3eee4', band: '#ef9fbe', band2: '#d9718f', roof: '#9aa1a8', front: '#f3eee4' },
  kyoto: { body: '#cdd2d7', band: '#2f7fc0', band2: '#e9853a', roof: '#9aa1a8', front: '#cdd2d7' },
  kobe: { body: '#cdd2d7', band: '#2f7fc0', band2: '#1f5f9a', roof: '#9aa1a8', front: '#cdd2d7' },
  loop: { body: '#e9853a', band: '#c96a24', band2: '#f3eee4', roof: '#8c939c', front: '#e9853a' },
  yume: { body: '#cdd2d7', band: '#3fa36b', band2: '#2b7d50', roof: '#9aa1a8', front: '#cdd2d7' },
};
const CW = P.CAR.w / 2;
function emuGeometry(cars, liv) {
  const A = new Acc(), step = P.CAR.len + P.CAR.gap;
  const bodyG = new RoundedBoxGeometry(P.CAR.len - 0.4, 2.62, P.CAR.w, 2, 0.12);
  for (let k = 0; k < cars; k++) {
    const c = (k - (cars - 1) / 2) * step;
    A.add(bodyG, [c, 2.31, 0], liv.body);
    A.box(P.CAR.len - 0.6, 0.18, P.CAR.w - 0.3, [c, 3.68, 0], liv.roof);
    for (const x of [-5, 5]) A.box(2.3, 0.34, 1.7, [c + x, 3.92, 0], '#b5bbc2');
    A.box(P.CAR.len - 1.8, 0.55, P.CAR.w - 0.4, [c, 0.74, 0], '#454850');
    for (const b of [-7, 7]) {
      A.box(2.6, 0.42, 2.2, [c + b, 0.56, 0], '#3a3d43');
      for (const w of [-1.05, 1.05]) for (const s of [-1, 1]) A.add(new THREE.CylinderGeometry(0.43, 0.43, 0.12, 12), [c + b + w, 0.43, s * 0.72], '#2c2e33', [Math.PI / 2, 0, 0]);
    }
    for (const s of [-1, 1]) {
      const z = s * (CW + 0.012);
      A.box(P.CAR.len - 0.5, 0.2, 0.02, [c, 2.06, z], liv.band); A.box(P.CAR.len - 0.5, 0.07, 0.02, [c, 3.36, z], liv.band2);
      // windows between the doors + at the car ends
      for (const [x, w] of [[-4.9, 3.1], [0, 3.1], [4.9, 3.1], [-9.05, 1.1], [9.05, 1.1]]) A.box(w, 0.95, 0.03, [c + x, 2.72, z], '#46505e');
      // door frames (dark recess behind the leaves)
      for (const o of P.DOOR_OFFS) { A.box(1.42, 2.02, 0.02, [c + o, 2.12, s * (CW + 0.004)], '#6d747c'); }
    }
    // gangway bellows
    if (k < cars - 1) A.box(0.7, 2.2, 1.3, [c + step / 2, 2.2, 0], '#3a3d43');
    // pantograph on cars 1 and n-2
    if (k === 1 || k === cars - 2) { A.box(1.6, 0.08, 1.4, [c, 4.25, 0], '#3a3d43'); A.box(0.06, 0.7, 0.06, [c - 0.4, 4.0, 0], '#3a3d43', [0, 0, 0.6]); A.box(0.06, 0.7, 0.06, [c + 0.4, 4.0, 0], '#3a3d43', [0, 0, -0.6]); }
  }
  // cab fronts at both ends
  for (const e of [-1, 1]) {
    const x = e * (cars * step - P.CAR.gap) / 2;
    A.box(0.3, 2.66, P.CAR.w - 0.02, [x - e * 0.15, 2.31, 0], liv.front);
    A.box(0.04, 1.02, P.CAR.w - 0.3, [x + e * 0.01, 2.85, 0], '#2b3038');
    A.box(0.04, 0.2, P.CAR.w - 0.02, [x + e * 0.012, 2.06, 0], liv.band);
    A.box(0.3, 0.3, 0.5, [x + e * 0.1, 0.95, 0], '#3a3d43');
  }
  // door leaves: L (slides toward -u) and R (toward +u)
  const L = new Acc(), R = new Acc();
  for (let k = 0; k < cars; k++) {
    const c = (k - (cars - 1) / 2) * step;
    for (const o of P.DOOR_OFFS) for (const s of [-1, 1]) {
      const z = s * (CW + 0.02);
      for (const [acc, dx] of [[L, -0.33], [R, 0.33]]) {
        acc.box(0.64, 1.92, 0.03, [c + o + dx, 2.1, z], liv === LIVERY.loop ? '#e9853a' : '#c2c8ce');
        acc.box(0.44, 0.78, 0.035, [c + o + dx, 2.62, z], '#46505e');
      }
    }
  }
  return { body: A.build(), doorL: L.build(), doorR: R.build(), len: cars * step - P.CAR.gap };
}

// ------------------------------------------------------------------ Shinkansen
const SW = P.SCAR.w / 2;
const S_WHITE = '#f3f4f5', S_BLUE = '#1553a8', S_GREY = '#d5d9de', S_WIN = '#394350';
/** lofted aero nose along +x from x = 0 (joint with the body) to x = len (tip) */
function noseGeo(len) {
  const NS = 26, NR = 28, pos = [], colr = [], idx = [];
  const yTop = 3.55, yBot = 0.95;
  for (let i = 0; i <= NS; i++) {
    const s = i / NS, x = s * len;
    const w = Math.max(0.06, SW * (1 - Math.pow(s, 2.4) * 0.96));
    const top = yTop - (yTop - 1.35) * Math.pow(s, 1.55), bot = yBot + 0.05 * s;
    const yc = (top + bot) / 2, b = (top - bot) / 2;
    for (let j = 0; j < NR; j++) {
      const a = j / NR * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
      const e = 2 / 3.2, y = yc + b * Math.sign(sa) * Math.pow(Math.abs(sa), e), z = w * Math.sign(ca) * Math.pow(Math.abs(ca), e);
      pos.push(x, y, z);
      let c = S_WHITE;
      if (y > 1.28 && y < 1.56 && Math.abs(z) > w * 0.35) c = S_BLUE;
      else if (y < 1.2) c = S_GREY;
      if (s > 0.3 && s < 0.56 && y > top - (top - yc) * 0.55 && Math.abs(z) < w * 0.78) c = S_WIN;   // windshield
      const cc = col(c); colr.push(cc.r, cc.g, cc.b);
    }
  }
  for (let i = 0; i < NS; i++) for (let j = 0; j < NR; j++) {
    const a = i * NR + j, b = i * NR + (j + 1) % NR, c = (i + 1) * NR + j, d = (i + 1) * NR + (j + 1) % NR;
    idx.push(a, c, b, b, c, d);
  }
  // cap the tip
  const tip = pos.length / 3; const tc = col(S_WHITE); pos.push(len + 0.25, 1.28, 0); colr.push(tc.r, tc.g, tc.b);
  for (let j = 0; j < NR; j++) idx.push(NS * NR + j, tip, NS * NR + (j + 1) % NR);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(colr, 3));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}
function shinGeometry() {
  const A = new Acc(), L = new Acc();
  const cars = P.shinCars(), doors = P.shinDoors();
  const NOSE = 13;
  cars.forEach((car, k) => {
    const bodyLen = car.nose ? car.len - NOSE : car.len - 0.3;
    const bc = car.nose ? car.c - car.nose * NOSE / 2 : car.c;
    A.add(new RoundedBoxGeometry(bodyLen, 2.62, P.SCAR.w, 3, 0.4), [bc, 2.26, 0], S_WHITE);
    A.box(bodyLen - 0.4, 0.5, P.SCAR.w - 0.12, [bc, 0.82, 0], S_GREY);
    for (const s of [-1, 1]) {
      const z = s * (SW + 0.005);
      A.box(bodyLen - 0.3, 0.28, 0.02, [bc, 1.42, z], S_BLUE); A.box(bodyLen - 0.3, 0.07, 0.02, [bc, 1.66, z], S_BLUE);
      for (let x = -bodyLen / 2 + 1.6; x < bodyLen / 2 - 1.2; x += 1.18) { if (Math.abs(bc + x - doors[k]) < 1.2) continue; A.box(0.78, 0.5, 0.025, [bc + x, 2.52, z], S_WIN); }
      A.box(1.2, 2.0, 0.015, [doors[k], 2.25, z], '#b9bec4');
    }
    if (car.nose) {
      const g = noseGeo(NOSE); if (car.nose < 0) g.scale(-1, 1, 1);
      if (car.nose < 0) { const ix = g.index.array; for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; } g.computeVertexNormals(); }
      A.add(g, [bc + car.nose * bodyLen / 2, 0, 0]);
    }
    if (k < cars.length - 1) A.box(0.8, 2.4, 2.4, [car.c + car.len / 2 + P.SCAR.gap / 2, 2.2, 0], '#8c939c');
    if (k === 4 || k === 11) { A.box(3, 0.35, 1.2, [car.c, 3.7, 0], S_GREY); A.box(0.08, 0.6, 0.08, [car.c, 3.95, 0], '#3a3d43', [0, 0, 0.5]); }
    const bog = car.nose ? [car.c - car.nose * (car.len / 2 - 3), car.c + car.nose * (car.len / 2 - NOSE - 2.2)] : [car.c - car.len / 2 + 3, car.c + car.len / 2 - 3];
    for (const bc2 of bog) for (const w of [-1.25, 1.25]) for (const s of [-1, 1]) A.add(new THREE.CylinderGeometry(0.43, 0.43, 0.12, 12), [bc2 + w, 0.43, s * 0.76], '#2c2e33', [Math.PI / 2, 0, 0]);
  });
  // plug doors (one leaf per car per side), slid by the train's door state
  for (const d of doors) for (const s of [-1, 1]) { L.box(1.05, 1.9, 0.04, [d, 2.25, s * (SW + 0.03)], S_WHITE); L.box(0.3, 0.5, 0.045, [d, 2.7, s * (SW + 0.03)], S_WIN); }
  return { body: A.build(), doorL: L.build(), doorR: null, len: P.sTrainLen() };
}

// ------------------------------------------------------------------ build + run
export function buildTrains(ctx, H) {
  const { dyn } = H;
  const { mat } = ctx;
  const T = ctx.tex, F = T.FONTS;
  const bodyM = mat.toon('#ffffff', { vertexColors: true, paint: 0.01 });
  const headM = mat.emissive('#fff8ee', 2.2), tailM = mat.emissive('#ff4a3d', 1.8);
  const ledTex = (S, key) => T.draw(256, 48, (g, w, h) => {
    g.fillStyle = '#101216'; g.fillRect(0, 0, w, h);
    const tc = S.type === '新快速' ? '#4fb0ff' : S.type === '快速' ? '#ff9a3a' : S.type === '環状' ? '#ff9a3a' : S.type === '直通' ? '#6fe08a' : '#f4f2ea';
    g.fillStyle = tc; g.font = `700 30px ${F.sans}`; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(S.type, 10, 25);
    g.fillStyle = '#ffb347'; g.textAlign = 'right'; T.fitText(g, S.dest, w - 10, 25, 150, 30, F.sans, 700);
  }, { key: 'term.led.' + key });
  const geos = new Map();
  const trains = [];
  const lamps = (grp, xEnd, y, spread, m) => { const g = new THREE.Group(); for (const s of [-1, 1]) { const b = new THREE.Mesh(new THREE.CircleGeometry(0.12, 12), m); b.position.set(xEnd, y, s * spread); b.rotation.y = xEnd > 0 ? Math.PI / 2 : -Math.PI / 2; g.add(b); } grp.add(g); return g; };

  for (const [trk, S] of Object.entries(P.SERVICES)) {
    const key = S.line + S.cars;
    if (!geos.has(key)) geos.set(key, emuGeometry(S.cars, LIVERY[S.line]));
    const G = geos.get(key);
    const grp = new THREE.Group(); grp.position.set(0, P.Y.rail, P.TRACKS[trk]);
    const body = new THREE.Mesh(G.body, bodyM), dl = new THREE.Mesh(G.doorL, bodyM), dr = new THREE.Mesh(G.doorR, bodyM);
    for (const m of [body, dl, dr]) { m.castShadow = true; m.receiveShadow = true; grp.add(m); }
    const e = G.len / 2 + 0.02;
    const heads = [lamps(grp, e, 1.55, 1.0, headM), lamps(grp, -e, 1.55, 1.0, headM)], tails = [lamps(grp, e, 1.3, 1.1, tailM), lamps(grp, -e, 1.3, 1.1, tailM)];
    const led = mat.emissive('#ffffff', 1.25, { map: ledTex(S, trk) });
    for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.24), led); p.position.set(s * (e + 0.005), 3.48, 0); p.rotation.y = s * Math.PI / 2; grp.add(p); }
    dyn.add(grp);
    trains.push({ kind: 'emu', track: +trk, S, grp, dl, dr, heads, tails, len: G.len, v: P.TRACKS[trk], doors: 0, snd: null, brake: false, lastPhase: '' });
  }
  const SG = shinGeometry();
  for (const [trk, S] of Object.entries(P.S_SERVICES)) {
    const grp = new THREE.Group(); grp.position.set(0, P.Y.rail, P.S_TRACKS[trk]);
    const body = new THREE.Mesh(SG.body, bodyM), dl = new THREE.Mesh(SG.doorL, bodyM);
    for (const m of [body, dl]) { m.castShadow = true; m.receiveShadow = true; grp.add(m); }
    const e = SG.len / 2 + 0.2;
    const heads = [lamps(grp, e - 2.6, 1.32, 0.66, headM), lamps(grp, -e + 2.6, 1.32, 0.66, headM)], tails = [lamps(grp, e - 3.2, 1.3, 0.86, tailM), lamps(grp, -e + 3.2, 1.3, 0.86, tailM)];
    dyn.add(grp);
    trains.push({ kind: 'shin', track: trk, S, grp, dl, dr: null, heads, tails, len: SG.len, v: P.S_TRACKS[trk], doors: 0, snd: null, brake: false, lastPhase: '' });
  }

  // ---------------------------------------------------------------- update: motion, doors, lights, sound
  const listener = new THREE.Vector3();
  const au = ctx.audio;
  const soundPos = (tr) => { // nearest point of the train (a line) to the listener, in world space
    const lu = listener.x - P.ORIGIN.x, half = tr.len / 2, cu = tr.grp.position.x;
    const u = Math.max(cu - half, Math.min(cu + half, lu));
    return { x: P.ORIGIN.x + u, y: P.Y.rail + 1.6, z: P.ORIGIN.z + tr.v };
  };
  for (const tr of trains) {
    tr.pos = { x: 0, y: 0, z: 0 };
    tr.snd = au?.loop?.(tr.kind === 'shin' ? 'hsRun' : 'trainRun', { position: () => tr.pos, volume: 0, params: { speed: 0 } }) || null;
  }
  H.update((dt, t) => {
    const here = H.visible();
    listener.copy(ctx.camera.position);
    for (const tr of trains) {
      const s = tr.kind === 'shin' ? P.shinState(tr.track, t) : P.convState(tr.track, t);
      const vis = s.phase !== 'gone' && Math.abs(s.center) < (tr.kind === 'shin' ? 1400 : 900);
      tr.grp.visible = vis;
      tr.state = s;
      if (!vis) { if (tr.snd) tr.snd.setVolume(0, 0.3); tr.brake = false; continue; }
      tr.grp.position.x = s.center;
      // lights: headlights at the leading end, tail lights at the rear
      const lead = s.dir > 0 ? 0 : 1;
      tr.heads[lead].visible = true; tr.heads[1 - lead].visible = false; tr.tails[lead].visible = false; tr.tails[1 - lead].visible = true;
      // doors
      const d = s.doors;
      if (tr.kind === 'emu') { tr.dl.position.x = -0.62 * d; tr.dr.position.x = 0.62 * d; }
      else { tr.dl.position.x = 1.15 * d; tr.dl.scale.z = 1 + 0.02 * d; }
      if (d > 0.5 && tr.doors <= 0.5 && here) { const p = soundPos(tr); au?.play('doorOpen', { position: p }); au?.play(tr.kind === 'shin' ? 'shinDoor' : 'doorChime', { position: p }); }
      if (d < 0.99 && tr.doors >= 0.99 && here) { const p = soundPos(tr); au?.play('doorClose', { position: p }); au?.play(tr.kind === 'shin' ? 'shinDoor' : 'doorChime', { position: p }); }
      tr.doors = d;
      // sound
      if (tr.snd) {
        const p = soundPos(tr); tr.pos.x = p.x; tr.pos.y = p.y; tr.pos.z = p.z;
        tr.snd.setVolume(here ? (tr.kind === 'shin' ? 1.0 : 0.9) : 0, 0.3);
        tr.snd.setParam('speed', s.speed);
      }
      if (s.phase === 'approach' && s.speed < (tr.kind === 'shin' ? 12 : 8) && !tr.brake) { tr.brake = true; if (here) au?.play('trainBrake', { position: soundPos(tr) }); }
      if (s.phase !== 'approach') tr.brake = false;
    }
  });
  return { list: trains };
}
