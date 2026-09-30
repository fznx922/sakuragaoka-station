// The 30 stations of the 山手線 ring: at each, two curved side platforms (外回り outside the ring, 内回り inside) with
// JR East platform doors (ホームドア) whose openings line up with the stopped train's doors, canopies on columns, JR East
// 駅名標 (station number badge, hiragana / kanji / romaji, neighbours on the line-colour band), direction signs, a live
// departure board, benches, bins, a vending machine, the stairs down (出口), and the walkable surfaces / colliders.
import * as THREE from 'three';
import * as P from './plan.js';
import { arcBox, arcBand, arcBar, arcWall } from './geo.js';
import { vendingMachine } from '../props/vending.js';

const MAJOR = [0, 6, 11, 14, 18, 26];   // 東京 品川 渋谷 新宿 池袋 上野 (for the 〜方面 signs)
/** the next two major stations in a direction from station i (dir +1 = 外回り / clockwise) */
export function towards(i, dir) {
  const n = P.STATIONS.length, out = [];
  for (let k = 1; k <= n && out.length < 2; k++) { const j = ((i + dir * k) % n + n) % n; if (MAJOR.includes(j)) out.push(P.STATIONS[j]); }
  return out;
}
/** door centre offsets (along the train, from its centre) of the 11-car train */
export const TRAIN_DOORS = (() => { const out = []; for (let k = 0; k < P.CAR.cars; k++) { const c = (k - (P.CAR.cars - 1) / 2) * (P.CAR.len + P.CAR.gap); for (const o of P.DOOR_OFFS) out.push(c + o); } return out; })();

export function buildStations(ctx, H) {
  const { root, M } = H;
  const { mat } = ctx;
  const T = ctx.tex, F = T.FONTS;
  const Y = P.Y, TAU = Math.PI * 2;
  const add = (g, m, shadow = true) => { const mesh = new THREE.Mesh(g, m); mesh.castShadow = shadow; mesh.receiveShadow = true; root.add(mesh); return mesh; };
  const platM = mat.toon('#ffffff', { map: H.tx.platform, paint: 0.04 });
  const concrete = mat.toon('#ffffff', { map: H.tx.concrete, paint: 0.05 });
  const white = mat.toon('#f1f1ee', { paint: 0.02 }), green = mat.toon(P.LINE_COLOR, { paint: 0.02 }), grey = mat.toon('#c9ced4', { paint: 0.02 });
  const roofM = mat.toon('#e8eaeb', { paint: 0.02, side: 'double' });
  const lightM = M.light, glassM = M.glass;
  const yawAt = (phi, flip = false) => -phi - Math.PI / 2 + (flip ? Math.PI : 0);
  const at = (r, phi) => ({ u: r * Math.cos(phi), v: r * Math.sin(phi) });

  // ---- JR East 駅名標: white, station number badge (green frame, JY + number), hiragana big, kanji, romaji,
  //      the line-colour band with the neighbouring stations (arranged as they physically lie)
  const nameTex = (s, left, right, key) => T.draw(512, 192, (g, w, h) => {
    g.fillStyle = '#fbfbf8'; g.fillRect(0, 0, w, h);
    g.fillStyle = P.LINE_COLOR; g.fillRect(0, h - 46, w, 46);
    g.fillStyle = '#2d3038'; g.fillRect(0, h - 48, w, 2);
    // station number badge
    g.fillStyle = '#fff'; g.strokeStyle = P.LINE_COLOR; g.lineWidth = 6; T.roundRect(g, 18, 22, 60, 76, 8); g.fill(); g.stroke();
    g.fillStyle = '#2d3038'; g.font = `900 22px ${F.en}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('JY', 48, 44); g.font = `900 28px ${F.en}`; g.fillText(s.id.slice(2), 48, 76);
    g.fillStyle = '#2d3038'; T.fitText(g, s.kana, w / 2 + 20, 48, 330, 44, F.sans, 900);
    g.font = `700 22px ${F.sans}`; g.fillStyle = '#44444f'; g.fillText(s.kanji, w / 2 + 20, 86);
    g.font = `600 18px ${F.en}`; g.fillText(s.en, w / 2 + 20, 112);
    g.fillStyle = '#2d3038'; g.textBaseline = 'middle';
    g.textAlign = 'left'; g.font = `700 20px ${F.sans}`; g.fillText('◀ ' + left.kana, 12, h - 30); g.font = `500 12px ${F.en}`; g.fillText(`${left.id} ${left.en}`, 34, h - 11);
    g.textAlign = 'right'; g.font = `700 20px ${F.sans}`; g.fillText(right.kana + ' ▶', w - 12, h - 30); g.font = `500 12px ${F.en}`; g.fillText(`${right.en} ${right.id}`, w - 34, h - 11);
  }, { key: 'tokyo.name.' + key });
  const signM = (o) => mat.toon('#ffffff', { map: H.tx.sign({ w: 512, h: 96, ...o }), paint: 0.01 });

  // ---- platform doors: static panels (batched) + leaves (one instanced mesh for the whole line)
  const leafList = [];   // { st, side, phi, r, k (-1 / +1: the half that slides toward -tangent / +tangent) }
  const doorsets = [];   // per platform: { st, side, r, phis }
  const boards = [];     // dynamic departure boards
  const benchGeo = new THREE.BoxGeometry(1, 1, 1);
  const stairs = [];     // stair heads (exits) — used by ops.js for the Shinkansen transfer at 東京
  const N = P.STATIONS.length;

  for (const s of P.STATIONS) {
    const prev = P.STATIONS[(s.i - 1 + N) % N], next = P.STATIONS[(s.i + 1) % N];
    for (const side of ['outer', 'inner']) {
      const out = side === 'outer', e = P.EDGE[side], rim = out ? e + P.PLAT_W : e - P.PLAT_W;
      const r0 = Math.min(e, rim), r1 = Math.max(e, rim), rm = (r0 + r1) / 2;
      const half = (P.PLAT_LEN / 2) / rm, p0 = s.phi - half, p1 = s.phi + half;
      const inward = out ? 1 : -1;            // +radial direction from the edge into the platform
      // slab (from under the deck up to the platform surface) + the surface + edge markings
      add(arcBox(r0, r1, p0, p1, Y.deck - 1.1, Y.plat - 0.02, { tile: 4, maxLen: 8 }), concrete);
      add(arcBand(r0, r1, p0, p1, Y.plat, { tile: 1.2, maxLen: 8 }), platM);
      const band = (d0, d1, m, tile) => { const a = e + inward * d0, b = e + inward * d1; add(arcBand(Math.min(a, b), Math.max(a, b), p0, p1, Y.plat + 0.004, { tile, maxLen: 8 }), m, false); };
      band(0, 0.3, M.edge, 1); band(0.95, 1.25, M.dot, 0.3); band(1.25, 1.33, M.line, 0.3);
      // back fence along the rim + end fences
      add(arcBox(Math.min(rim, rim - inward * 0.12), Math.max(rim, rim - inward * 0.12), p0, p1, Y.plat, Y.plat + 1.15, { maxLen: 8 }), white);
      add(arcBar(rim - inward * 0.06, p0, p1, Y.plat + 1.2, 0.16, 0.08, 8), M.steel);
      for (const pe of [p0, p1]) {
        const c = at(rm, pe);
        const g = H.group(c.u, Y.plat, c.v, yawAt(pe)); const k = ctx.kit(g);
        k.box(0.08, 1.2, P.PLAT_W, M.steel, [0, 0.6, 0]);
        for (let z = -P.PLAT_W / 2; z <= P.PLAT_W / 2 + 1e-6; z += 1) k.box(0.06, 1.2, 0.06, M.steelD, [0, 0.6, z]);
        H.box(c.u, c.v, 0.3, P.PLAT_W, yawAt(pe), Y.plat - 0.5, Y.plat + 3);
      }
      // walkable surface (oriented boxes along the arc) + the rim collider
      for (let d = -P.PLAT_LEN / 2; d < P.PLAT_LEN / 2 - 1e-6; d += 8) {
        const phi = s.phi + (d + 4) / rm, c = at(rm, phi), cr = at(rim - inward * 0.06, phi);
        H.walk(c.u, c.v, 8.2, P.PLAT_W, yawAt(phi), Y.plat, Y.deck - 1);
        H.box(cr.u, cr.v, 8.2, 0.3, yawAt(phi), Y.plat - 0.5, Y.plat + 3);
      }
      // ---- platform doors (1.3 m) along the edge, openings at the train's door positions
      const rd = e + inward * 0.4, opening = 2.1;
      const phis = TRAIN_DOORS.map(u => s.phi + u / P.TRACK[side]).sort((a, b) => a - b);
      const edges = [p0 + 0.6 / rd, ...phis.flatMap(p => [p - (opening / 2) / rd, p + (opening / 2) / rd]), p1 - 0.6 / rd];
      for (let j = 0; j < edges.length; j += 2) {
        const a = edges[j], b = edges[j + 1]; if (b - a < 0.05 / rd) continue;
        add(arcBox(rd - 0.12, rd + 0.12, a, b, Y.plat, Y.plat + 1.25, { maxLen: 6 }), white);
        add(arcBar(rd, a, b, Y.plat + 1.28, 0.3, 0.06, 6), grey);
        add(arcBar(rd - inward * 0.125, a, b, Y.plat + 1.1, 0.012, 0.1, 6), green, false);
        const mid = (a + b) / 2, c = at(rd, mid);
        H.box(c.u, c.v, (b - a) * rd, 0.3, yawAt(mid), Y.plat - 0.5, Y.plat + 1.3);
      }
      for (const p of phis) for (const k of [-1, 1]) leafList.push({ st: s.i, side, phi: p, r: rd, k });
      doorsets.push({ st: s.i, side, r: rd, phis });
      // ---- canopy: columns on the platform centre line, the roof with light lines, fascia on the track side
      const rc = rm + inward * 0.6;
      const cols = [];
      for (let d = -P.PLAT_LEN / 2 + 10; d <= P.PLAT_LEN / 2 - 9; d += 16) cols.push(s.phi + d / rc);
      for (const phi of cols) {
        const c = at(rc, phi);
        const g = H.group(c.u, Y.plat, c.v, yawAt(phi)); const k = ctx.kit(g);
        k.box(0.28, 3.9, 0.28, M.steelD, [0, 1.95, 0]);
        k.box(0.2, 0.25, P.PLAT_W + 0.6, M.steelD, [0, 3.9, 0]);
        H.cyl(c.u, c.v, 0.22, Y.plat - 0.5, Y.plat + 3.9);
      }
      add(arcBox(r0 - 0.35, r1 + 0.35, p0 + 2 / rm, p1 - 2 / rm, Y.plat + 3.98, Y.plat + 4.16, { maxLen: 8, bottom: true }), roofM);
      for (const dr of [-1.4, 1.4]) add(arcBar(rm + dr, p0 + 3 / rm, p1 - 3 / rm, Y.plat + 3.93, 0.22, 0.05, 8), lightM, false);
      add(arcWall(out ? r0 - 0.35 : r1 + 0.35, p0 + 2 / rm, p1 - 2 / rm, Y.plat + 3.75, Y.plat + 4.2, { out: !out, maxLen: 8 }), green, false);
      // ---- 駅名標 (hanging from the canopy, facing the track, readable from the platform too)
      const lr = out ? [next, prev] : [prev, next];
      const nm = mat.toon('#ffffff', { map: nameTex(s, lr[0], lr[1], s.id + side), paint: 0.01 });
      for (const d of [-62, 58]) {
        const phi = s.phi + d / rm, c = at(e + inward * 1.6, phi);
        const g = H.group(c.u, Y.plat + 2.55, c.v, yawAt(phi) + (out ? 0 : Math.PI)); const k = ctx.kit(g);
        k.box(2.3, 0.88, 0.1, white, [0, 0, 0]);
        k.plane(2.2, 0.82, nm, [0, 0, 0.052]); k.plane(2.2, 0.82, nm, [0, 0, -0.052], [0, Math.PI, 0]);
        for (const x of [-0.8, 0.8]) k.box(0.04, 1.0, 0.04, M.steelD, [x, 0.9, 0]);
      }
      // ---- direction sign (hanging, across the platform) + exit sign
      const dir = out ? 1 : -1, tw = towards(s.i, dir);
      const dsign = signM({ text: `山手線 ${out ? '外回り' : '内回り'}  ${tw.map(x => x.kanji).join('・')}方面`, sub: `Yamanote Line for ${tw.map(x => x.en).join(' & ')}`, badges: [{ t: 'JY', bg: P.LINE_COLOR, fg: '#1d2430' }], key: 'tokyo.dir.' + s.id + side });
      for (const d of [-30, 30]) {
        const phi = s.phi + d / rm, c = at(rm, phi);
        const g = H.group(c.u, Y.plat + 3.3, c.v, yawAt(phi) + Math.PI / 2); const k = ctx.kit(g);
        k.box(3.1, 0.6, 0.08, M.steelD, [0, 0, 0]);
        k.plane(3.0, 0.56, dsign, [0, 0, 0.045]); k.plane(3.0, 0.56, dsign, [0, 0, -0.045], [0, Math.PI, 0]);
        for (const x of [-1.1, 1.1]) k.box(0.035, 0.4, 0.035, M.steelD, [x, 0.5, 0]);
      }
      // ---- stairs down (出口): an enclosure over the stairwell near the platform middle, on the rim side
      {
        const d0 = 14, phi = s.phi + d0 / rm, rr = rim - inward * 1.9, c = at(rr, phi);
        const g = H.group(c.u, Y.plat, c.v, yawAt(phi)); const k = ctx.kit(g);
        const L = 11, W = 3.0;
        for (const z of [-W / 2, W / 2]) k.box(L, 1.1, 0.1, glassM, [0, 0.55, z]);
        k.box(0.1, 1.1, W, glassM, [L / 2, 0.55, 0]);
        for (let i = 0; i < 10; i++) k.box(0.3, 0.05, W - 0.2, M.tread, [-L / 2 + 0.6 + i * 0.3, -0.16 * i - 0.02, 0]);
        k.box(L - 0.4, 0.02, W - 0.1, mat.toon('#2a2a30', { paint: 0 }), [0.2, -1.62, 0]);
        const ex = signM({ text: '出口  Exit', bg: '#f2c230', fg: '#2d3038', arrow: 'up', key: 'tokyo.exit' });
        k.box(2.2, 0.5, 0.08, M.steelD, [-L / 2 - 0.2, 2.8, 0], [0, Math.PI / 2, 0]);
        k.plane(2.1, 0.46, ex, [-L / 2 - 0.25, 2.8, 0], [0, -Math.PI / 2, 0]);
        H.box(c.u, c.v, L + 0.2, W + 0.2, yawAt(phi), Y.plat - 0.5, Y.plat + 1.2);
        stairs.push({ st: s.i, side, u: c.u, v: c.v, phi, r: rr, L, W, yaw: yawAt(phi) });
      }
      // ---- benches, a bin, a vending machine (every other station, outer platforms), the departure board
      for (const d of [-40, 42, 80]) {
        const phi = s.phi + d / rm, c = at(rm + inward * 0.8, phi);
        const g = H.group(c.u, Y.plat, c.v, yawAt(phi)); const k = ctx.kit(g);
        k.box(2.4, 0.08, 0.45, mat.toon('#4a78c4', { paint: 0.02 }), [0, 0.44, 0]); k.box(2.4, 0.42, 0.06, mat.toon('#4a78c4', { paint: 0.02 }), [0, 0.7, -0.21 * inward]);
        for (const x of [-1, 1]) k.box(0.06, 0.44, 0.4, M.steelD, [x, 0.22, 0]);
        H.box(c.u, c.v, 2.4, 0.5, yawAt(phi), Y.plat - 0.5, Y.plat + 0.5);
      }
      { const phi = s.phi - 22 / rm, c = at(rim - inward * 0.7, phi); const g = H.group(c.u, Y.plat, c.v, yawAt(phi)); const k = ctx.kit(g); k.box(1.4, 0.95, 0.5, mat.toon('#e9ecee', { paint: 0.03 }), [0, 0.475, 0]); for (let i = 0; i < 3; i++) k.box(0.36, 0.2, 0.02, mat.toon(['#2f7fc0', '#3fa36b', '#8c939c'][i], { paint: 0.02 }), [-0.45 + i * 0.45, 0.78, 0.26 * inward]); H.box(c.u, c.v, 1.4, 0.5, yawAt(phi), Y.plat - 0.5, Y.plat + 1); }
      if (out && s.i % 2 === 0) {
        const phi = s.phi - 48 / rm, c = at(rim - inward * 0.55, phi), w = P.toWorld(c.u, c.v);
        const top = root.parent;
        const PH = { place: (x, yy, z, rotY = 0) => { const g = new THREE.Group(); g.position.set(x, yy, z); g.rotation.y = rotY; top.add(g); return g; }, footprint: () => ({ min: Y.plat, max: Y.plat }) };
        vendingMachine(ctx, PH, { id: ['V1a', 'V2', 'V3a', 'V5', 'V1b'][s.i % 5], x: w.x, z: w.z, rotY: yawAt(phi), y: Y.plat });   // local +z (its front) points in toward the track
      }
      boards.push({ st: s.i, side, dir, phi: s.phi - 8 / rm, r: rm + inward * 0.3 });
    }
  }
  // leaves: one instanced mesh
  const leafGeo = new THREE.BoxGeometry(1.02, 1.2, 0.06);
  const leaves = new THREE.InstancedMesh(leafGeo, mat.toon('#f4f4f1', { paint: 0.02 }), leafList.length);
  leaves.castShadow = true; leaves.receiveShadow = true; leaves.frustumCulled = false;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), pos = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
  const setLeaf = (i, open) => {
    const L = leafList[i], slide = L.k * (0.52 + 0.98 * open), phi = L.phi + slide / L.r;
    q.setFromAxisAngle(up, yawAt(phi)); pos.set(L.r * Math.cos(phi), Y.plat + 0.62, L.r * Math.sin(phi));
    m4.compose(pos, q, one); leaves.setMatrixAt(i, m4);
  };
  for (let i = 0; i < leafList.length; i++) setLeaf(i, 0);
  H.dyn.add(leaves);

  // ---- departure boards (dynamic canvas, only redrawn near the player)
  for (const B of boards) {
    const c = document.createElement('canvas'); c.width = 512; c.height = 128;
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const p = at(B.r, B.phi);
    const g = H.group(p.u, Y.plat + 3.0, p.v, yawAt(B.phi) + Math.PI / 2, H.dyn); const k = ctx.kit(g);
    k.box(2.3, 0.62, 0.14, M.black, [0, 0, 0]);
    const em = mat.emissive('#ffffff', 1.0, { map: tex });
    k.plane(2.2, 0.55, em, [0, 0, 0.072]); k.plane(2.2, 0.55, em, [0, 0, -0.072], [0, Math.PI, 0]);
    for (const x of [-0.9, 0.9]) k.box(0.035, 0.7, 0.035, M.steelD, [x, 0.66, 0]);
    Object.assign(B, { c, g2: c.getContext('2d'), tex, u: p.u, v: p.v, drawn: -1 });
  }
  /** next departures of a direction at station i after time t (two), from the timetable */
  const nextDeps = (dirName, i, t) => {
    const Lg = P.LEGS[dirName], leg = Lg.legs.find(l => l.from === i), out = [];
    for (let k = 0; k < P.TRAINS_PER_DIR; k++) {
      const off = (k / P.TRAINS_PER_DIR) * Lg.period;
      let dep = leg.dwellEnd - off; dep += Math.ceil((t - dep) / Lg.period) * Lg.period;
      out.push(dep);
    }
    return out.sort((a, b) => a - b).slice(0, 2);
  };
  const clock = (t) => { const m = 2 + Math.floor(t / 60); const h = 16 + Math.floor(m / 60); return `${h}:${String(m % 60).padStart(2, '0')}`; };
  let nextDraw = 0;
  H.update((dt, t) => {
    if (!H.visible()) return;
    const pl = H.player(); if (!pl) return;
    // platform door leaves: follow the train of their direction standing at the station
    const open = new Map();
    for (const dirName of ['outer', 'inner']) for (let k = 0; k < P.TRAINS_PER_DIR; k++) { const s = P.trainState(dirName, k, t); if (s.atStation >= 0 && s.doors > 0) open.set(s.atStation + dirName, s.doors); }
    for (let i = 0; i < leafList.length; i++) {
      const L = leafList[i], s = P.STATIONS[L.st];
      if (Math.abs(pl.u - P.R * Math.cos(s.phi)) > 450 || Math.abs(pl.v - P.R * Math.sin(s.phi)) > 450) continue;
      setLeaf(i, open.get(L.st + L.side) || 0);
    }
    leaves.instanceMatrix.needsUpdate = true;
    if (t < nextDraw) return;
    nextDraw = t + 2;
    const en = Math.floor(t / 8) % 2 === 1;
    for (const B of boards) {
      if (Math.abs(pl.u - B.u) > 300 || Math.abs(pl.v - B.v) > 300) continue;
      const g = B.g2, w = 512, h = 128, dirName = B.side;
      g.fillStyle = '#0a0c10'; g.fillRect(0, 0, w, h);
      const tw = towards(B.st, B.dir);
      nextDeps(dirName, B.st, t).forEach((dep, r) => {
        const y = 32 + r * 62;
        g.fillStyle = r ? '#0e1117' : '#0a0c10'; g.fillRect(0, y - 30, w, 60);
        g.fillStyle = P.LINE_COLOR; T.roundRect(g, 10, y - 20, 40, 40, 6); g.fill(); g.fillStyle = '#1d2430'; g.font = `900 18px ${F.en}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('JY', 30, y + 1);
        g.fillStyle = '#ffb347'; g.font = `700 30px ${F.sans}`; g.textAlign = 'left'; g.fillText(clock(dep), 60, y + 1);
        g.fillStyle = '#f4f2ea'; T.fitText(g, en ? `for ${tw.map(x => x.en).join(' & ')}` : `${tw.map(x => x.kanji).join('・')}方面`, 150, y + 1, 250, 28, en ? F.en : F.sans, 700);
        g.fillStyle = '#9fe0ff'; g.font = `700 22px ${F.sans}`; g.textAlign = 'right'; g.fillText(en ? '11 cars' : '11両', w - 12, y + 1);
      });
      B.tex.needsUpdate = true;
    }
  });
  // closed platform-door leaves block the openings (only near the player)
  ctx.physics.addDynamic(() => {
    if (!H.visible()) return [];
    const pl = H.player(); if (!pl) return [];
    const out = [];
    for (const D of doorsets) {
      const s = P.STATIONS[D.st];
      if (Math.abs(pl.u - P.R * Math.cos(s.phi)) > 160 || Math.abs(pl.v - P.R * Math.sin(s.phi)) > 160) continue;
      let open = 0;
      for (let k = 0; k < P.TRAINS_PER_DIR; k++) { const ts = P.trainState(D.side, k, ctx.time || 0); if (ts.atStation === D.st) open = Math.max(open, ts.doors); }
      if (open > 0.7) continue;
      for (const phi of D.phis) { const c = at(D.r, phi), w = P.toWorld(c.u, c.v); out.push({ cx: w.x, cz: w.z, w: 2.2, d: 0.3, rotY: yawAt(phi), y0: Y.plat - 0.5, y1: Y.plat + 1.3 }); }
    }
    return out;
  });
  return { stairs, doorsets, towards };
}
