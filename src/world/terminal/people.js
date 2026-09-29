// People of 桜都駅 (same characters system as the town): passengers waiting on the platforms (phones, watching the
// trains), platform staff doing the pointing check (指差確認) as trains leave, the gate attendant, and commuters
// walking through the concourse. Deterministic idles; walkers follow straight back-and-forth paths.
import * as THREE from 'three';
import * as P from './plan.js';
import { Human } from '../characters/human.js';
import { Driver, rot, rotMul } from '../characters/anim.js';
import * as gear from '../characters/gear.js';
import { clamp, lerp, smooth, wave } from '../characters/skin.js';

const HAIR = {
  dark: { top: '#5d4743', base: '#4f3c3e', tip: '#47383c', hi: '#8c706a', hi2: '#b3978c' },
  chestnut: { top: '#8d6552', base: '#785642', tip: '#6a4b3d', hi: '#b89076', hi2: '#d6b59a' },
  black: { top: '#49404a', base: '#403840', tip: '#3c343e', hi: '#6f6470', hi2: '#948896' },
  blue: { top: '#4a4660', base: '#3f3c52', tip: '#3b374b', hi: '#716f90', hi2: '#9a98b8' },
  gray: { top: '#bdb9c3', base: '#aca8b4', tip: '#a19dab', hi: '#dbd8e0', hi2: '#e6e3ea' },
};
const SKIN = { fair: '#f6dccb', warm: '#f3d5c1' };
const faceF = (o = {}) => ({ skin: SKIN.fair, ink: '#3b3144', eyeP: 24, eyeT: -12, eyeW: 20, eyeH: 22, irisDark: '#4a3346', irisMid: '#7d5b62', irisLight: '#c69f8f', lash: 1, lidTop: -0.5, iris: 0.37, irisH: 0.46, brow: '#5c4448', browW: 1.7, browGap: 3.5, browArch: 2.4, noseT: -32, mouthT: -52, mouthW: 9, smile: 0.3, blush: 0.75, blushLines: true, ...o });
const faceM = (o = {}) => faceF({ eyeW: 19, eyeH: 15, lash: 0.5, lidTop: -0.48, iris: 0.36, irisH: 0.5, browW: 2.6, browArch: 1.2, browGap: 3, blush: 0.25, blushLines: false, mouthW: 10, smile: 0.1, ...o });
const MAN_HAIR = { fringe: { n: 5, span: 50, tip: 18, skew: 16, w: 0.06, part: 6, partAt: -14, edgeDrop: 10 }, hairlineSide: -8, hairlineBack: -64, volume: 1.07 };

const SPECS = {
  salaryman: (k, c) => ({ key: k, sex: 'm', height: 1.74, seed: 301 + c.length, skin: SKIN.warm, ears: true, face: faceM({ irisMid: '#5d4a44', irisLight: '#8f7564' }), hair: MAN_HAIR, hairTex: HAIR.dark,
    outfit: { top: 'jacket', topColor: c, lapel: c, shirt: '#eceae6', tie: '#5b6e90', buttons: '#6f737b', vAng: 30, vY: 0.72, bottom: 'trousers', bottomColor: c, belt: '#4e4a4c', pockets: true, shoes: { color: '#4f4444', sole: '#3f3838' } },
    hands: { L: 'hold', R: 'hold' }, props: [(hh) => gear.handBag(hh, 'L', { w: 0.4, h: 0.29, d: 0.08, color: '#4a4046', handle: '#3f363c', drop: 0.02, handleW: 0.016 }), (hh) => gear.phone(hh, 'R')] }),
  officeLady: (k, c) => ({ key: k, sex: 'f', height: 1.6, seed: 331 + c.length, skin: SKIN.warm, face: faceF({ eyeH: 19, lidTop: -0.46, irisMid: '#7a5a50', irisLight: '#b8957c', blush: 0.5, smile: 0.2 }),
    hair: { fringe: { n: 6, span: 58, tip: 8, skew: 14, w: 0.056, part: 4, partAt: -10 }, hairlineSide: -60, hairlineBack: -74, flare: 0.14, side: { w: 0.04 } }, hairTex: HAIR.chestnut,
    outfit: { top: 'cardigan', topColor: c, band: c, shirt: '#f0ebdf', vAng: 30, vY: 0.95, bottom: 'skirt', bottomColor: '#6f6a78', hem: 0.24, flare: 0.13, legs: '#ecd0bc', shoes: { color: '#5a4a48', sole: '#4a3c3a' } },
    hands: { R: 'hold' }, props: [(hh) => gear.handBag(hh, 'R', { w: 0.34, h: 0.3, d: 0.1, color: '#b9a88f', handle: '#a7967e', drop: 0.05, logo: '#d9dccb' })] }),
  student: (k, c) => ({ key: k, sex: 'f', height: 1.56, seed: 361 + c.length, skin: SKIN.fair, face: faceF({ irisDark: '#3e3a58', irisMid: '#5f6488', irisLight: '#a9b0cc' }),
    hair: { style: 'pony', fringe: { n: 7, span: 60, tip: 3, skew: 7, w: 0.052 }, side: { long: 0.07, w: 0.03 }, ponytail: { len: 0.32, th: 30, w: 0.07, tie: c }, hairlineBack: -62 }, hairTex: HAIR.blue,
    stripes: { base: '#44507a', line: '#eeebe6', bands: [[0.74, 0.8], [0.86, 0.91]] },
    outfit: { top: 'sailor', topColor: '#eeebe6', scarf: c, bottom: 'pleats', bottomColor: '#4b5576', hem: 0.53, pleats: 18, socks: { color: '#454d6a', top: 0.78 }, shoes: { color: '#5b4336', sole: '#4a3a36' } },
    hands: { L: 'relax', R: 'hold' }, props: [(hh) => gear.shoulderBag(hh, { color: '#475072', charm: '#f2b5c8' }), (hh) => gear.phone(hh, 'R')] }),
  backpacker: (k, c) => ({ key: k, sex: 'm', height: 1.7, seed: 391 + c.length, skin: SKIN.fair, ears: true, face: faceM({ eyeH: 16, irisMid: '#5a4a46', irisLight: '#937a6a' }),
    hair: { fringe: { n: 6, span: 58, tip: 10, skew: -10, w: 0.058, edgeDrop: 12 }, hairlineSide: -16, hairlineBack: -66, volume: 1.1 }, hairTex: HAIR.black,
    outfit: { top: 'hoodie', topColor: c, band: c, bottom: 'trousers', bottomColor: '#4f5a70', shoes: { color: '#e9e6e0', sole: '#cfcac2' } },
    hands: { L: 'relax', R: 'hold' }, props: [(hh) => gear.backpack(hh, { color: '#3f4a5e' }), (hh) => gear.phone(hh, 'R')] }),
  elder: (k, c) => ({ key: k, sex: 'm', height: 1.66, seed: 421 + c.length, skin: SKIN.warm, ears: true, face: faceM({ eyeH: 12, irisMid: '#5a4c48', irisLight: '#8a766a', lidTop: -0.42 }),
    hair: { ...MAN_HAIR, volume: 1.0 }, hairTex: HAIR.gray,
    outfit: { top: 'jacket', topColor: c, lapel: c, shirt: '#e6e2d6', vAng: 26, vY: 0.8, bottom: 'trousers', bottomColor: '#6d6760', belt: '#4e4a4c', shoes: { color: '#5a4a42', sole: '#4a3c36' } },
    hands: { L: 'relax', R: 'relax' }, props: [] }),
  staff: (k) => ({ key: k, sex: 'm', height: 1.72, seed: 451 + k.length, skin: SKIN.warm, ears: true, face: faceM({ irisMid: '#5a4c48', irisLight: '#8a766a', eyeH: 14, lidTop: -0.45 }),
    hair: { fringe: { n: 5, span: 52, tip: 14, skew: 10, w: 0.05, edgeDrop: 6 }, hairlineSide: -14, hairlineBack: -62, volume: 1.035 }, hairTex: HAIR.black,
    outfit: { top: 'staff', topColor: '#2f4a78', lapel: '#26406a', shirt: '#eceae5', tie: '#23395e', buttons: '#d3b268', vAng: 26, vY: 0.8, emblem: '#4fa3e6', nameTag: '#efece6', bottom: 'trousers', bottomColor: '#26406a', belt: '#353046', gloves: '#eceae6', shoes: { color: '#443c42', sole: '#39333a' } },
    hands: { L: 'relax', R: 'point' }, props: [(hh) => gear.staffCap(hh, { color: '#2f4a78', band: '#26406a', visor: '#23395e' })] }),
};

export function buildPeople(ctx, H) {
  const { dyn } = H;
  const actors = [];
  const add = (spec) => { const h = new Human(ctx, spec); dyn.add(h.group); return h; };
  const col = (u, v, y) => H.cyl(u, v, 0.26, y, y + 1.7);
  const look = new THREE.Vector3();
  const trainNear = (trk, u) => { const s = P.convState(trk, ctx.time || 0); return s.phase !== 'gone' && Math.abs(s.center - u) < 90 ? s : null; };

  // ---- waiting passengers (phones, watching their train come in)
  const waiters = [
    ['salaryman', 'wSal1', '#5b6272', 18, P.ISLANDS[0].v + 3.3, 1],
    ['officeLady', 'wOL1', '#e6c9c6', -12, P.ISLANDS[0].v - 3.2, 2],
    ['student', 'wStu1', '#c9707c', 14, P.ISLANDS[1].v + 3.0, 3],
    ['backpacker', 'wBp1', '#8fb3a0', -42, P.ISLANDS[1].v - 3.0, 4],
    ['officeLady', 'wOL2', '#c9d6e6', 32, P.ISLANDS[2].v - 3.3, 6],
    ['elder', 'wEld1', '#8a7a68', -28, P.ISLANDS[2].v + 3.2, 5],
    ['salaryman', 'wSal2', '#44507a', 46, -36.4, 13],
    ['student', 'wStu2', '#5a7fc0', 52, -36.6, 13],
    ['backpacker', 'wBp2', '#c9a06a', -60, -60.8, 14],
  ];
  waiters.forEach(([kind, key, c, u, v, trk], i) => {
    const shin = trk > 10, y = shin ? P.Y.platS : P.Y.plat;
    const tv = shin ? P.S_TRACKS[trk] : P.TRACKS[trk];
    const h = add(SPECS[kind](key, c)), d = new Driver(ctx, h, { seed: 500 + i });
    const yaw = Math.atan2(0, tv - v) + (i % 2 ? 0.25 : -0.2);
    col(u, v, y);
    const phone = kind !== 'elder' && i % 3 !== 1;
    actors.push((t, dt) => {
      d.place(u, y, v, yaw); d.reset();
      const sh = Math.sin(t * 0.27 + i);
      d.stand({ hx: 0.018 * sh, hrz: 0.02 * sh, stance: kind === 'salaryman' ? 1.15 : 1 });
      d.breathe(t);
      const st = shin ? P.shinState(trk, t) : P.convState(trk, t);
      const coming = st.phase === 'approach' && Math.abs(st.center) < 250;
      const up = phone ? 1 - Math.max(coming ? 1 : 0, smooth(9, 10, (t + i * 5) % 17) * (1 - smooth(13, 14, (t + i * 5) % 17))) : 0;
      if (kind === 'officeLady') { d.arm('R', 0.02, 0.1, 0, 0.12, [0, 0, 0]); d.arm('L', 0.16, 0.04, -0.75, 1.45, [0.1, 0.3, 0]); }
      else { d.arm('L', 0.02, 0.06, 0, 0.1, [0, 0, 0]); d.arm('R', 0.55 * up + 0.05, 0.05, -0.2, 1.7 * up + 0.1, [0.3 * up, 0, 0]); }
      if (up > 0.5) d.lookYP(0.05, lerp(-0.08, 0.72, up), dt, { speed: 2.5 });
      else { const tu = st.phase !== 'gone' ? clamp(st.front, -100, 100) : u + 30 * Math.sin(t * 0.1 + i); const tw = P.toWorld(tu, tv); look.set(tw.x, P.Y.rail + 2.2, tw.z); d.lookAt(look, dt, { speed: 2, maxYaw: 1.2, maxUp: 0.3 }); }
      d.wind(t, dt, { amt: 0.3 }); d.blink(t);
    });
  });

  // ---- platform staff: 指差確認 when the train on their side departs
  [[P.ISLANDS[1].v, 3, -3.6, 46], [P.ISLANDS[0].v, 1, 3.4, 40], [-34.6, 13, -1.6, -40]].forEach(([vc, trk, off, u], i) => {
    const shin = trk > 10, y = shin ? P.Y.platS : P.Y.plat, v = vc + off, tv = shin ? P.S_TRACKS[trk] : P.TRACKS[trk];
    const h = add(SPECS.staff('staff' + i)), d = new Driver(ctx, h, { seed: 600 + i });
    col(u, v, y);
    actors.push((t, dt) => {
      const st = shin ? P.shinState(trk, t) : P.convState(trk, t);
      const T = shin ? P.T_SHIN : P.T_CONV, e = st.tIn - T.approach;
      const point = st.phase === 'dwell' ? smooth(T.doorsOpen[1] - 1, T.doorsOpen[1] - 0.4, e) * (1 - smooth(T.dwell - 3, T.dwell - 2, e)) : 0;
      const raise = st.phase === 'depart' ? 1 - smooth(4, 5, st.tIn - T.approach - T.dwell) : 0;
      const yaw = Math.atan2(-1, (tv - v) * 0.4);   // toward the train's rear (west), turned to the track
      d.place(u, y, v, yaw); d.reset();
      d.stand({ hx: 0.012 * Math.sin(t * 0.37 + i), stance: 1.25 });
      d.breathe(t);
      d.arm('L', -0.32, 0.14, -1.2, 1.4, [0.2, 0, 0]);
      const f = lerp(0.1, 1.45, point) + raise * 2.4;
      d.arm('R', Math.min(f, 2.7), lerp(0.12, 0.35, point) + raise * 0.15, 0, lerp(0.2, 0.05, Math.max(point, raise)), [0, 0, 0]);
      const tw = P.toWorld(st.phase !== 'gone' ? clamp(st.center - st.dir * st.len * 0.45, -100, 100) : u - 20, tv);
      look.set(tw.x, P.Y.rail + 2, tw.z); d.lookAt(look, dt, { speed: 1.5, maxYaw: 1.3 });
      d.blink(t);
    });
  });

  // ---- gate attendant in the booth
  {
    const u = P.GATES.u0 + P.GATES.n * P.GATES.pitch + 1.8, v = P.GATES.v + 0.2;
    const h = add(SPECS.staff('gateStaff')), d = new Driver(ctx, h, { seed: 700 });
    actors.push((t, dt) => {
      d.place(u, 0, v, 0); d.reset();
      const c = t % 19, bow = smooth(6, 6.6, c) * (1 - smooth(7.4, 8.2, c));
      d.stand({ hrx: 0.1 * bow }); rotMul(h.b.spine, 0.12 * bow, 0, 0); d.breathe(t);
      d.arm('L', 0.3, 0.1, 0, 0.9, [0, 0, 0]); d.arm('R', 0.3, 0.1, 0, 0.9, [0, 0, 0]);
      d.lookYP(0.5 * Math.sin(t * 0.21), 0.05, dt, { speed: 2 }); d.blink(t);
    });
  }

  // ---- commuters walking back and forth through the concourse
  const walkers = [
    ['salaryman', 'walk1', '#3f4758', [[2.5, 28], [2.5, -24]], 1.35],
    ['officeLady', 'walk2', '#d6c8b4', [[-2, -24], [-2, 27]], 1.2],
    ['backpacker', 'walk3', '#b35d4d', [[-24, 43], [22, 43]], 1.3],
    ['student', 'walk4', '#3f8f5b', [[20, 45], [-22, 45]], 1.15],
    ['salaryman', 'walk5', '#6d6a60', [[-10, -44], [12, -44]], 1.3],
  ];
  const stride = 0.66, lift = 0.1;
  walkers.forEach(([kind, key, c, path, v], i) => {
    const h = add(SPECS[kind](key, c)), d = new Driver(ctx, h, { seed: 800 + i });
    const [A, B] = path, len = Math.hypot(B[0] - A[0], B[1] - A[1]), legT = len / v, restT = 2.5, turnT = 1.2, cyc = 2 * (legT + restT + turnT);
    const head = Math.atan2(B[0] - A[0], B[1] - A[1]);
    const st = { u: A[0], v: A[1] };
    ctx.physics.addDynamic(() => { const w = P.toWorld(st.u, st.v); return H.visible() ? [{ cx: w.x, cz: w.z, w: 0.5, d: 0.5, y0: -0.5, y1: 1.7 }] : []; });
    actors.push((t, dt) => {
      const cc = (t + i * 13) % cyc;
      let s, walking = 0, yaw;
      if (cc < legT) { s = cc * v; walking = 1; yaw = head; }
      else if (cc < legT + restT) { s = len; yaw = head; }
      else if (cc < legT + restT + turnT) { s = len; yaw = head + Math.PI * smooth(0, 1, (cc - legT - restT) / turnT); }
      else if (cc < 2 * legT + restT + turnT) { s = len - (cc - legT - restT - turnT) * v; walking = 1; yaw = head + Math.PI; }
      else if (cc < 2 * legT + 2 * restT + turnT) { s = 0; yaw = head + Math.PI; }
      else { s = 0; yaw = head + Math.PI + Math.PI * smooth(0, 1, (cc - 2 * legT - 2 * restT - turnT) / turnT); }
      st.u = A[0] + (B[0] - A[0]) * s / len; st.v = A[1] + (B[1] - A[1]) * s / len;
      d.place(st.u, 0, st.v, yaw); d.reset();
      const Pp = h.P, b = h.b, ph = walking ? cc * v / stride : 0;
      const bob = walking ? Math.abs(Math.sin(ph * Math.PI)) : 0;
      b.hips.position.y += -0.01 + 0.012 * bob;
      rotMul(b.hips, 0.04, 0.05 * Math.sin(ph * Math.PI) * walking, 0.02 * Math.sin(ph * Math.PI) * walking);
      h.group.updateMatrixWorld(true);
      const foot = (n, off) => {
        const sg = n === 'L' ? 1 : -1; const p = ((ph + off) % 2 + 2) % 2; let zf, yf = Pp.ankle;
        if (!walking) zf = sg * 0.02; else if (p < 1.2) zf = lerp(stride * 0.3, -stride * 0.3, p / 1.2); else { const q = (p - 1.2) / 0.8; zf = lerp(-stride * 0.3, stride * 0.3, smooth(0, 1, q)); yf += lift * Math.sin(q * Math.PI); }
        return [sg * Pp.hipJx * 1.1, yf, zf];
      };
      d.leg('L', foot('L', 0), 0.1, [0.1, 1]); d.leg('R', foot('R', 1), -0.1, [0.1, 1]);
      rotMul(b.spine, 0.06, 0, 0);
      d.breathe(t, 1.2);
      const sw = walking ? 0.28 * Math.sin(ph * Math.PI) : 0;
      d.arm('L', -0.05 + sw, 0.1, 0.1, 0.2, [0, 0, 0]); d.arm('R', -0.05 - sw, 0.1, -0.1, 0.2, [0, 0, 0]);
      d.lookYP(0.2 * wave(t * 0.2, 6 + i), -0.05, dt, { speed: 2 });
      d.wind(t, dt, { amt: 0.2 }); d.blink(t);
    });
  });

  H.update((dt, t) => { if (!H.visible()) return; for (const a of actors) a(t, dt); });
  void rot; void trainNear;
  return { count: actors.length };
}
