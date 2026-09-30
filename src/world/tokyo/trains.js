// The 山手線 trains: 12 E235 11-car sets each way (外回り on the outer track, 内回り on the inner), placed every frame
// from the timetable (plan.trainState), each car on its own point of the ring. Far trains draw one mesh per car; near
// ones (you could board them) switch to the detailed cars with interiors. And you can ride:
//   * the cars carry you (and your view) along while you stand inside,
//   * moving colliders: the floor you stand on, the walls (with the door openings while the doors are open), seats,
//   * straps that swing with the braking / acceleration, the above-door screens (次は / まもなく / ただいま, JP ↔ EN),
//   * the E235 door chime, the running sound around you, and the automated announcements in Japanese and English.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as P from './plan.js';
import { carGeometry, FLOOR } from './e235.js';
import { paintAtlas } from '../terminal/trains.js';
import { towards } from './stations.js';

const HL = P.CAR.len / 2, STEP = P.CAR.len + P.CAR.gap, HI_DIST = 190, VIS_DIST = 1300;

export function buildTrains(ctx, H) {
  const { dyn } = H;
  const { mat } = ctx;
  const T = ctx.tex, F = T.FONTS;
  const au = ctx.audio;
  const atlas = paintAtlas(ctx);
  const bodyM = mat.toon('#ffffff', { vertexColors: true, map: atlas, paint: 0.01 });
  const innM = mat.toon('#ffffff', { vertexColors: true, map: atlas, paint: 0.01, emissive: '#4c4b48', emissiveIntensity: 1 });
  const glassM = mat.glass({ tint: '#b9cfe0', opacity: 0.14 });
  const headM = mat.emissive('#fff8ee', 2.4), tailM = mat.emissive('#ff4a3d', 1.9);
  // ---- car types (geometry shared by every train)
  const TYPES = {
    rear: carGeometry('rear', { seed: 3, people: 5 }), front: carGeometry('front', { seed: 7, people: 4 }),
    midA: carGeometry('mid', { seed: 11, people: 7 }), midB: carGeometry('mid', { seed: 23, people: 9 }), midP: carGeometry('mid', { seed: 31, panto: true, people: 6 }),
  };
  const typeOf = (k) => (k === 0 ? 'rear' : k === P.CAR.cars - 1 ? 'front' : k === 3 || k === 8 ? 'midP' : k % 2 ? 'midA' : 'midB');
  // above-door screens: info planes (the train's canvas) + ad planes (a static ad sheet); strap geometry
  const planesGeo = (list, uvq = null) => mergeGeometries(list.map((o, i) => {
    const g = new THREE.PlaneGeometry(o.w, o.h); g.rotateY(o.s > 0 ? Math.PI : 0); g.translate(o.x, o.y, o.z);
    if (uvq) { const q = uvq(i), uv = g.attributes.uv; for (let k = 0; k < uv.count; k++) uv.setXY(k, q[0] + uv.getX(k) * 0.5, q[1] + uv.getY(k) * 0.5); }
    return g;
  }), false);
  for (const t of Object.values(TYPES)) { t.hi.screenGeo = planesGeo(t.hi.screens); t.hi.adGeo = planesGeo(t.hi.ads, (i) => [(i % 2) * 0.5, ((i >> 1) % 2) * 0.5]); }
  const adTex = T.draw(512, 288, (g, w, h) => {
    const ads = [['渋谷 春の新作', '#e9366b', '#3a2a8a'], ['Suica で ピッ', '#2f9a4a', '#1b4a30'], ['東京 駅弁 まつり', '#f29a2e', '#b3302b'], ['スマホは マナーモードに', '#1fb5c9', '#20306a']];
    ads.forEach(([txt, c1, c2], i) => { const x = (i % 2) * w / 2, y = Math.floor(i / 2) * h / 2; const gr = g.createLinearGradient(x, y, x + w / 2, y + h / 2); gr.addColorStop(0, c1); gr.addColorStop(1, c2); g.fillStyle = gr; g.fillRect(x, y, w / 2, h / 2); g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; T.fitText(g, txt, x + w / 4, y + h / 4, w / 2 - 20, 30, F.sans, 900); });
  }, { key: 'tokyo.ads' });
  const adM = mat.emissive('#ffffff', 1.0, { map: adTex });
  const strapGeo = (() => {
    const belt = new THREE.BoxGeometry(0.025, 0.24, 0.008).translate(0, -0.12, 0);
    const ring = new THREE.TorusGeometry(0.06, 0.012, 6, 14).translate(0, -0.3, 0);
    const clip = new THREE.BoxGeometry(0.03, 0.04, 0.03);
    return mergeGeometries([belt, ring, clip].map(g => { g = g.index ? g.toNonIndexed() : g; g.deleteAttribute('uv'); return g; }), false);
  })();
  const strapM = mat.toon('#e9e6de', { paint: 0.01 });

  // ---- the next-station screen (one canvas per train)
  const drawScreen = (tr, st, en) => {
    const g = tr.g2, w = 512, h = 288;
    const dirName = tr.dir > 0 ? '外回り' : '内回り', tw = towards(st.next, tr.dir);
    g.fillStyle = '#f4f5f2'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#2b2f36'; g.fillRect(0, 0, w, 52);
    g.fillStyle = P.LINE_COLOR; g.fillRect(0, 48, w, 6);
    g.fillStyle = '#fff'; g.textBaseline = 'middle'; g.textAlign = 'left';
    T.fitText(g, en ? `Yamanote Line  for ${tw.map(x => x.en).join(' & ')}` : `山手線 ${dirName}  ${tw.map(x => x.kanji).join('・')}方面`, 16, 27, w - 32, 26, en ? F.en : F.sans, 700);
    const S = P.STATIONS[st.phase === 'dwell' ? st.atStation : st.next];
    const label = st.phase === 'dwell' ? (en ? 'Now stopping at' : 'ただいま') : st.runLeft < 26 ? (en ? 'Arriving at' : 'まもなく') : (en ? 'Next' : '次は');
    g.fillStyle = '#2b2f36'; g.font = `700 26px ${en ? F.en : F.sans}`; g.fillText(label, 20, 92);
    // station number badge + the name
    g.fillStyle = '#fff'; g.strokeStyle = P.LINE_COLOR; g.lineWidth = 5; T.roundRect(g, 20, 118, 64, 76, 8); g.fill(); g.stroke();
    g.fillStyle = '#2b2f36'; g.textAlign = 'center'; g.font = `900 20px ${F.en}`; g.fillText('JY', 52, 140); g.font = `900 26px ${F.en}`; g.fillText(S.id.slice(2), 52, 172);
    g.textAlign = 'left'; T.fitText(g, en ? S.en : S.kanji, 100, 158, w - 120, 70, en ? F.en : F.sans, 900);
    g.font = `500 20px ${en ? F.sans : F.en}`; g.fillStyle = '#555'; g.fillText(en ? S.kanji : S.en, 104, 206);
    // doors + the next stops strip
    g.fillStyle = '#b3302b'; g.font = `700 20px ${en ? F.en : F.sans}`; g.fillText(en ? 'Doors on the left side will open' : 'お出口は 左側です', 20, 236);
    g.strokeStyle = P.LINE_COLOR; g.lineWidth = 8; g.beginPath(); g.moveTo(20, 266); g.lineTo(w - 20, 266); g.stroke();
    const n = P.STATIONS.length;
    for (let i = 0; i < 5; i++) {
      const s2 = P.STATIONS[((S.i + tr.dir * i) % n + n) % n], x = 30 + i * (w - 60) / 4;
      g.fillStyle = i === 0 ? '#e8bf2c' : '#fff'; g.strokeStyle = '#2b2f36'; g.lineWidth = 3; g.beginPath(); g.arc(x, 266, 8, 0, 6.3); g.fill(); g.stroke();
      g.fillStyle = '#2b2f36'; g.font = `700 15px ${en ? F.en : F.sans}`; g.textAlign = 'center'; g.fillText(en ? s2.en : s2.kanji, x, 250);
    }
    tr.tex.needsUpdate = true;
  };

  // ---- build the trains
  const trains = [];
  for (const dirName of ['outer', 'inner']) for (let k = 0; k < P.TRAINS_PER_DIR; k++) {
    const dir = dirName === 'outer' ? 1 : -1, r = P.TRACK[dirName];
    const c = document.createElement('canvas'); c.width = 512; c.height = 288;
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    const scrM = mat.emissive('#ffffff', 1.0, { map: tex });
    const tr = { dirName, dir, k, r, cars: [], c, g2: c.getContext('2d'), tex, drawKey: '', hi: false, vis: false, doors: 0, speed: 0, prevSpeed: 0, acc: 0, st: null };
    let nStraps = 0;
    for (let i = 0; i < P.CAR.cars; i++) {
      const ty = TYPES[typeOf(i)], grp = new THREE.Group(); grp.visible = false; dyn.add(grp);
      const lo = new THREE.Mesh(ty.lo, bodyM); lo.castShadow = true; lo.receiveShadow = true; grp.add(lo);
      const hi = new THREE.Group(); hi.visible = false; grp.add(hi);
      const shell = new THREE.Mesh(ty.hi.shell, bodyM); shell.castShadow = true; shell.receiveShadow = true;
      const inn = new THREE.Mesh(ty.hi.inn, innM); inn.receiveShadow = false; inn.castShadow = false;
      const glass = new THREE.Mesh(ty.hi.glass, glassM); glass.castShadow = false; ctx.noOutline?.(glass);
      const dn = new THREE.Mesh(ty.hi.doorNeg, bodyM), dp = new THREE.Mesh(ty.hi.doorPos, bodyM);
      const scr = new THREE.Mesh(ty.hi.screenGeo, scrM), ad = new THREE.Mesh(ty.hi.adGeo, adM);
      for (const m of [scr, ad]) m.castShadow = false;
      hi.add(shell, inn, glass, dn, dp, scr, ad);
      // head / tail lights (on the cab cars; the train never reverses on the loop)
      const lights = (list, m) => { if (!list.length) return; const geos = list.map(o => { const g = new THREE.PlaneGeometry(o.w, o.h); g.rotateY(o.e > 0 ? Math.PI / 2 : -Math.PI / 2); g.translate(o.x, o.y, o.z); return g; }); const mesh = new THREE.Mesh(mergeGeometries(geos, false), m); mesh.castShadow = false; grp.add(mesh); };
      lights(ty.heads, headM); lights(ty.tails, tailM);
      const off = (i - (P.CAR.cars - 1) / 2) * STEP;
      tr.cars.push({ i, grp, lo, hi, dn, dp, ty, off, M: new THREE.Matrix4(), prevM: new THREE.Matrix4(), yaw: 0, prevYaw: 0, strap0: nStraps });
      nStraps += ty.hi.straps.length;
    }
    tr.strapIM = new THREE.InstancedMesh(strapGeo, strapM, nStraps); tr.strapIM.visible = false; tr.strapIM.frustumCulled = false; tr.strapIM.castShadow = false; dyn.add(tr.strapIM);
    trains.push(tr);
  }

  // ---- sound: a small pool of running-sound loops given to the nearest trains
  const pool = [0, 1, 2].map(() => ({ pos: { x: 0, y: 0, z: 0 }, h: null, tr: null }));
  for (const p of pool) p.h = au?.loop?.('trainRun', { position: () => p.pos, volume: 0, params: { speed: 0 } }) || null;

  // ---- per frame
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), v3 = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
  const inv = new THREE.Matrix4(), local = new THREE.Vector3();
  const riding = { tr: null, car: null, since: 0 };
  const carPose = (tr, car, phiC) => {
    const pu = tr.r * Math.cos(phiC), pv = tr.r * Math.sin(phiC), yaw = P.tangentYaw(phiC) + (tr.dir < 0 ? Math.PI : 0);
    q.setFromAxisAngle(up, yaw); v3.set(pu, P.Y.rail, pv); car.M.compose(v3, q, one); car.yaw = yaw;
  };
  let lastT = null;
  H.update((dt, t) => {
    const vis = H.visible(), pl = H.player();
    const camU = ctx.camera.position.x - P.ORIGIN.x, camV = ctx.camera.position.z - P.ORIGIN.z;
    // where the player stands inside a detailed car (before this frame's motion)
    let carry = null;
    if (pl && dt > 0) for (const tr of trains) if (tr.hi) for (const car of tr.cars) {
      inv.copy(car.M).invert(); local.set(pl.u, pl.y, pl.v).applyMatrix4(inv);
      if (Math.abs(local.x) < HL + P.CAR.gap / 2 + 0.02 && Math.abs(local.z) < 1.45 && local.y > FLOOR - 0.5 && local.y < FLOOR + 2.4) { carry = { tr, car, local: local.clone() }; break; }
    }
    for (const tr of trains) {
      const st = P.trainState(tr.dirName, tr.k, t);
      tr.prevSpeed = tr.speed; tr.speed = st.speed; tr.acc = dt > 0 ? (tr.speed - tr.prevSpeed) / dt : 0;
      const du = tr.r * Math.cos(st.phi) - camU, dv = tr.r * Math.sin(st.phi) - camV, dist = Math.hypot(du, dv);
      tr.vis = vis && dist < VIS_DIST; tr.dist = dist;
      const wantHi = tr.vis && dist < HI_DIST;
      for (const car of tr.cars) {
        car.prevM.copy(car.M); car.prevYaw = car.yaw;
        carPose(tr, car, st.phi + tr.dir * car.off / tr.r);
        car.grp.visible = tr.vis;
        if (!tr.vis) continue;
        car.M.decompose(car.grp.position, car.grp.quaternion, car.grp.scale);
        car.lo.visible = !wantHi; car.hi.visible = wantHi;
        if (wantHi) { car.dn.position.x = -0.64 * st.doors; car.dp.position.x = 0.64 * st.doors; }
      }
      // door chimes (E235) + the closing announcement, near the player
      if (tr.vis && dist < 120) {
        if (st.doors > 0.2 && tr.doors <= 0.2) au?.play('eastDoor', { position: nearPos(tr, camU, camV) });
        if (st.doors < 0.95 && tr.doors >= 0.95) au?.play('eastDoor', { position: nearPos(tr, camU, camV) });
      }
      tr.doors = st.doors;
      tr.hi = wantHi; tr.st = st;
      // straps: swing with the acceleration along the car (and a little sideways sway)
      tr.strapIM.visible = wantHi;
      if (wantHi) {
        const pitch = THREE.MathUtils.clamp(-tr.acc * 0.09, -0.22, 0.22);   // straps lag behind when accelerating, swing on when braking
        let n = 0;
        for (const car of tr.cars) for (const s of car.ty.hi.straps) {
          const sway = Math.sin(t * 1.7 + s.x * 0.7 + car.i) * 0.04 * Math.min(1, tr.speed / 10);
          m4.makeRotationZ(pitch + sway); m4.setPosition(s.x, s.y, s.z);
          tr.strapIM.setMatrixAt(n++, car.M.clone().multiply(m4));
        }
        tr.strapIM.instanceMatrix.needsUpdate = true;
        // the screens: redraw when the text changes (and flip JP / EN every 6 s)
        const en = Math.floor(t / 6) % 2 === 1;
        const key = `${st.phase}|${st.next}|${st.atStation}|${st.runLeft < 26}|${en}`;
        if (key !== tr.drawKey) { tr.drawKey = key; drawScreen(tr, st, en); }
      }
    }
    // carry the rider: re-place the player by the car's motion this frame (position + heading), then refresh colliders
    if (carry) {
      const po = ctx.playerObj, w = carry.local.clone().applyMatrix4(carry.car.M);
      po.pos.x = w.x + P.ORIGIN.x; po.pos.z = w.z + P.ORIGIN.z;
      let dy = carry.car.yaw - carry.car.prevYaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      po.yaw += dy;
      ctx.player.position.copy(po.pos);
      po.applyCamera?.(0);
      ctx.physics.refreshDynamic();
      if (riding.tr !== carry.tr) { riding.tr = carry.tr; riding.since = t; }
      riding.car = carry.car;
    } else { riding.tr = null; riding.car = null; }
    // running sound: the nearest trains get the pool's loops
    const near = trains.filter(tr => tr.vis && tr.dist < 450).sort((a, b) => a.dist - b.dist).slice(0, pool.length);
    pool.forEach((p, i) => {
      const tr = near[i]; if (!p.h) return;
      if (!tr) { p.h.setVolume(0, 0.3); return; }
      const np = nearPos(tr, camU, camV); p.pos.x = np.x; p.pos.y = np.y; p.pos.z = np.z;
      p.h.setVolume(vis ? (riding.tr === tr ? 0.75 : 1.0) : 0, 0.3); p.h.setParam('speed', tr.speed);
    });
    lastT = t;
  });
  void lastT;
  /** world point of the train nearest to (u, v) (for sounds) */
  function nearPos(tr, u, v) {
    let best = null, bd = Infinity;
    for (const car of tr.cars) { const x = car.M.elements[12], z = car.M.elements[14], d = (x - u) ** 2 + (z - v) ** 2; if (d < bd) { bd = d; best = [x, z]; } }
    return { x: best[0] + P.ORIGIN.x, y: P.Y.rail + 1.8, z: best[1] + P.ORIGIN.z };
  }

  // ---- moving colliders of the detailed cars near the player: floor, walls (door gaps while open), ends, seats
  const pieces = (ty, doorsOpen) => {
    const out = [];   // [x, z, w, d, y0, y1] in car frame (y relative to the rail), or walk: [x, z, w, d, top]
    out.push({ walk: true, x: 0, z: 0, w: P.CAR.len + P.CAR.gap + 0.1, d: 2.6, top: FLOOR });
    for (const s of [-1, 1]) {
      const z = s * 1.47;
      if (s < 0 && doorsOpen) { let x = -HL; for (const d of P.DOOR_OFFS) { out.push({ x: (x + d - 0.66) / 2, z, w: d - 0.66 - x, d: 0.14, y0: FLOOR - 0.3, y1: FLOOR + 2.4 }); x = d + 0.66; } out.push({ x: (x + HL) / 2, z, w: HL - x, d: 0.14, y0: FLOOR - 0.3, y1: FLOOR + 2.4 }); }
      else out.push({ x: 0, z, w: P.CAR.len, d: 0.14, y0: FLOOR - 0.3, y1: FLOOR + 2.4 });
      // gangway tunnel walls (to the next car)
      out.push({ x: HL + P.CAR.gap / 2, z: s * 0.52, w: 0.8, d: 0.06, y0: FLOOR - 0.3, y1: FLOOR + 2.4 });
    }
    for (const e of [-1, 1]) {
      const cab = (e < 0 && ty === 'rear') || (e > 0 && ty === 'front');
      if (cab) out.push({ x: e * (HL - 0.6), z: 0, w: 1.4, d: 2.9, y0: FLOOR - 0.3, y1: FLOOR + 2.4 });
      else for (const s of [-1, 1]) out.push({ x: e * (HL - 0.22), z: s * 0.97, w: 0.12, d: 1.0, y0: FLOOR - 0.3, y1: FLOOR + 2.4 });
    }
    return out;
  };
  const seatPieces = {};
  for (const [name, ty] of Object.entries(TYPES)) {
    const out = [];
    const xs = ty.hi.straps; void xs;
    const b = name === 'rear' ? [false, true] : name === 'front' ? [true, false] : [true, true];
    const benches = [];
    for (let i = 0; i < 3; i++) benches.push([P.DOOR_OFFS[i] + 0.78, P.DOOR_OFFS[i + 1] - 0.78]);
    if (b[0]) benches.push([-HL + 0.35, P.DOOR_OFFS[0] - 0.78]); if (b[1]) benches.push([P.DOOR_OFFS[3] + 0.78, HL - 0.35]);
    for (const [a, c] of benches) for (const s of [-1, 1]) out.push({ x: (a + c) / 2, z: s * 1.12, w: c - a, d: 0.55, y0: FLOOR - 0.3, y1: FLOOR + 0.48 });
    seatPieces[name] = out;
  }
  ctx.physics.addDynamic(() => {
    if (!H.visible()) return [];
    const pl = H.player(); if (!pl) return [];
    const out = [], p3 = new THREE.Vector3();
    for (const tr of trains) {
      if (!tr.hi || tr.dist > 150) continue;
      for (const car of tr.cars) {
        const cx = car.M.elements[12], cz = car.M.elements[14];
        if ((cx - pl.u) ** 2 + (cz - pl.v) ** 2 > 32 * 32) continue;
        const tyName = typeOf(car.i);
        for (const pc of [...pieces(tyName, tr.doors > 0.6), ...seatPieces[tyName]]) {
          p3.set(pc.x, 0, pc.z).applyMatrix4(car.M);
          const w = P.toWorld(p3.x, p3.z);
          if (pc.walk) out.push({ cx: w.x, cz: w.z, w: pc.w, d: pc.d, rotY: car.yaw, top: P.Y.rail + pc.top, y0: P.Y.rail + pc.top - 0.6 });
          else out.push({ cx: w.x, cz: w.z, w: pc.w, d: pc.d, rotY: car.yaw, y0: P.Y.rail + pc.y0, y1: P.Y.rail + pc.y1 });
        }
      }
    }
    return out;
  });
  return { list: trains, riding };
}
