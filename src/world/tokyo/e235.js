// JR East E235 (山手線) car geometry, per car type, in the car's own frame: +x = forward along the train, -z = the left
// side (the platform side on the whole loop), floor at y 1.15 above the rail.
//   lo: one merged mesh — swept stainless body with the 山手線 green band, green doors, framed windows showing the
//       painted lit interior, roof gear, underfloor gear + bogies, gangway bellows, the black-faced cab.
//   hi: the version you ride in — a shell with real window openings (+ glass), and the interior: 7-seat longitudinal
//       benches, 優先席 at the car ends, 袖仕切り partitions, stanchions (yellow by the priority seats), luggage racks,
//       strap rails, ceiling with light lines, above-door screens (トレインチャンネル), gangway doors, passengers, and
//       the left-side door leaves split into the two halves that slide open.
import * as THREE from 'three';
import * as P from './plan.js';
import { Acc, sweep, cap, withBands, mirrorLoop, R as ATL, seeded, G, mat4, EMU_HALF, ZW, WIN_Y0, WIN_Y1, DOOR_HW, DOOR_Y0, DOOR_Y1 } from '../terminal/trains.js';
import { figureGeometry, OUTFIT_COUNT } from '../terminal/crowd.js';

export const FLOOR = 1.15;
const HL = P.CAR.len / 2;
const SILVER = '#cdd2d8', GREEN = '#7fb83a', GREEN_D = '#5f9a2a', ROOF = '#9ea5ad', MASK = '#1b1f26';
const IN_WALL = '#ebe9e3', IN_FLOOR = '#9d968a', SEAT = '#3f6a86', SEAT_P = '#b04a6a', IN_GREY = '#c7ccd2', POLE = '#cfd4d9', POLE_P = '#e8bf2c';
const ZI = ZW - 0.075;                      // inner wall face
const bands = [[3.28, 3.42, GREEN]];
const colorAt = (y, z) => { if (y > 3.42) return ROOF; if (Math.abs(z) < 0.2 && y < 1.1) return '#50545c'; for (const [a, b, c] of bands) if (y > a && y < b) return c; if (y < 1.24) return '#b3b8bf'; return SILVER; };
/** door centres of one car */
const DOORS = P.DOOR_OFFS;
/** window bays of one car (x ranges of glazing between the doors / car ends); cab cars lose the bay at the cab */
function bays(cabNeg, cabPos) {
  const out = [];
  for (let i = 0; i < 3; i++) out.push([DOORS[i] + DOOR_HW + 0.38, DOORS[i + 1] - DOOR_HW - 0.38]);
  if (!cabNeg) out.push([-HL + 0.45, DOORS[0] - DOOR_HW - 0.42]);
  if (!cabPos) out.push([DOORS[3] + DOOR_HW + 0.42, HL - 0.45]);
  return out;
}
/** seat benches: [x0, x1, priority] */
function benches(cabNeg, cabPos) {
  const out = [];
  for (let i = 0; i < 3; i++) out.push([DOORS[i] + DOOR_HW + 0.12, DOORS[i + 1] - DOOR_HW - 0.12, false]);
  if (!cabNeg) out.push([-HL + 0.35, DOORS[0] - DOOR_HW - 0.12, true]);
  if (!cabPos) out.push([DOORS[3] + DOOR_HW + 0.12, HL - 0.35, true]);
  return out;
}
/** open (non-looping) sweep of the roof part of the body section */
function sweepOpen(pts, x0, x1, color, flipNormals = false) {
  const pos = [], nor = [], col = [], c = new THREE.Color(color);
  for (let i = 0; i < pts.length - 1; i++) {
    const p = pts[i], q = pts[i + 1];
    const dz = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dz, dy) || 1;
    let nz = dy / l, ny = -dz / l; if (flipNormals) { nz = -nz; ny = -ny; }
    const V = [[x0, p[1], p[0]], [x0, q[1], q[0]], [x1, q[1], q[0]], [x1, p[1], p[0]]];
    // winding by the normal
    const e1 = [0, dy, dz], e2 = [x1 - x0, 0, 0], g = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
    const ok = g[1] * ny + g[2] * nz > 0;
    for (const k of ok ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2]) { pos.push(...V[k]); nor.push(0, ny, nz); col.push(c.r, c.g, c.b); }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return geo;
}

// ------------------------------------------------------------------ shared exterior bits (lo + hi shells)
function roofGear(A, panto) {
  const acs = panto ? [4.6] : [-4.8, 4.8];
  for (const ax of acs) {
    A.rbox(2.4, 0.3, 1.75, 0.08, [ax, 3.76, 0], '#b8bdc3');
    for (const fx of [-0.55, 0.55]) A.cyl(0.34, 0.34, 0.02, [ax + fx, 3.915, 0], '#50555d', null, 16);
  }
  if (panto) {
    const px = -4.2;
    A.box(1.3, 0.06, 1.1, [px, 3.98, 0], '#50555d');
    for (const [ix, iz] of [[-0.5, -0.4], [0.5, -0.4], [-0.5, 0.4], [0.5, 0.4]]) A.cyl(0.07, 0.09, 0.26, [px + ix, 3.83, iz], '#ebe8e2', null, 8);
    const hinge = [px - 0.45, 4.03], knee = [px + 0.75, 4.55], head = [px - 0.1, 5.0];
    for (const zz of [-0.25, 0.25]) { const dx = knee[0] - hinge[0], dy = knee[1] - hinge[1]; A.box(Math.hypot(dx, dy), 0.07, 0.07, [(hinge[0] + knee[0]) / 2, (hinge[1] + knee[1]) / 2, zz], '#3a3d44', [0, 0, Math.atan2(dy, dx)]); }
    { const dx = head[0] - knee[0], dy = head[1] - knee[1]; A.box(Math.hypot(dx, dy), 0.06, 0.06, [(knee[0] + head[0]) / 2, (knee[1] + head[1]) / 2, 0], '#3a3d44', [0, 0, Math.atan2(dy, dx)]); }
    A.box(0.09, 0.07, 1.9, [head[0] - 0.1, head[1], 0], '#2f3238'); A.box(0.09, 0.07, 1.9, [head[0] + 0.12, head[1], 0], '#2f3238');
  }
  A.box(P.CAR.len - 1.2, 0.02, 0.5, [0, 3.715, 0], '#8e949b');
  for (const s of [-1, 1]) A.box(P.CAR.len - 0.5, 0.035, 0.035, [0, 3.44, s * 1.39], '#8a9098');
}
function underGear(A, r) {
  let ex = -5.1;
  while (ex < 4.6) { const w = 1.0 + r() * 1.7; if (ex + w > 5.1) break; const h = 0.38 + r() * 0.28, d = 1.2 + r() * 1.1; A.box(w, h, d, [ex + w / 2, 1.0 - h / 2, (r() - 0.5) * 0.3], ['#474c54', '#555b63', '#3e4249'][(r() * 3) | 0]); ex += w + 0.25 + r() * 0.5; }
  for (const b of [-7, 7]) {
    A.box(0.6, 0.28, 2.2, [b, 0.78, 0], '#3a3d44');
    for (const zs of [-1, 1]) {
      A.box(2.6, 0.24, 0.14, [b, 0.6, zs * 1.0], '#40444b');
      for (const wx of [-1.05, 1.05]) { A.cyl(0.43, 0.43, 0.12, [b + wx, 0.43, zs * 0.62], '#2f3136', [Math.PI / 2, 0, 0], 16); A.box(0.3, 0.26, 0.22, [b + wx, 0.45, zs * 1.0], '#35383e'); }
    }
  }
}
function gangway(A, end) {
  const gx = end * (HL + P.CAR.gap / 2);
  A.box(0.56, 2.15, 1.26, [gx, 2.24, 0], '#34373e');
  for (let i = -1; i <= 1; i++) A.box(0.03, 2.18, 1.3, [gx + i * 0.13, 2.24, 0], '#484c54');
}
/** the E235 cab: black face swept back at the top, a green line, LED lights low down, skirt + coupler */
function cabFront(A, e, heads, tails) {
  const x0 = e * (HL - 0.62), rk = (y) => 0.34 * Math.pow(Math.max(0, (y - 1.9) / 1.8), 1.5);
  const half = withBands(EMU_HALF, [1.22, 1.45, 1.6, 3.4]);
  const colF = (y) => (y > 1.6 && y < 3.5 ? MASK : y > 1.45 && y <= 1.6 ? GREEN : y >= 3.5 ? ROOF : y < 1.24 ? '#b3b8bf' : SILVER);
  const slices = [0, 0.3, 0.6, 0.85, 1].map(t => half.map(([z, y]) => { const zz = z * (1 - 0.08 * t * t) * (y > 3.3 ? 1 - 0.12 * t : 1); return [x0 + e * (0.62 * t - rk(y) * t), y, zz]; }));
  const pos = [], col = [], c = new THREE.Color();
  const tri = (a, b, cc, color) => { const o = e > 0 ? [a, b, cc] : [a, cc, b]; for (const p of o) pos.push(...p); c.set(color); for (let i = 0; i < 3; i++) col.push(c.r, c.g, c.b); };
  for (let i = 0; i < slices.length - 1; i++) for (let j = 0; j < half.length - 1; j++) for (const s of [-1, 1]) {
    const m = (p) => [p[0], p[1], s * p[2]];
    const a = m(slices[i][j]), b = m(slices[i][j + 1]), cc = m(slices[i + 1][j + 1]), d = m(slices[i + 1][j]);
    const color = colF((a[1] + b[1]) / 2);
    if (s > 0) { tri(a, cc, b, color); tri(a, d, cc, color); } else { tri(a, b, cc, color); tri(a, cc, d, color); }
  }
  const last = slices[slices.length - 1];
  for (let j = 0; j < half.length - 1; j++) for (const s of [-1, 1]) {
    const p = last[j], q = last[j + 1], c0 = [p[0], p[1], 0], c1 = [q[0], q[1], 0], a = [p[0], p[1], s * p[2]], b = [q[0], q[1], s * q[2]], color = colF((p[1] + q[1]) / 2);
    if (s > 0) { tri(c0, b, a, color); tri(c0, c1, b, color); } else { tri(c0, a, b, color); tri(c0, b, c1, color); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals();
  A.add(g);
  const fx = (y) => x0 + e * (0.62 - rk(y));
  // windscreen (the glass inside the black mask) + the destination LED + the lamps
  const wy0 = 2.2, wy1 = 3.15, wm = (wy0 + wy1) / 2, tilt = Math.atan2(rk(wy1) - rk(wy0), wy1 - wy0);
  const gs = G.plane.clone(); gs.scale(2.3, (wy1 - wy0) / Math.cos(tilt), 1); gs.rotateX(-tilt); gs.rotateY(e > 0 ? Math.PI / 2 : -Math.PI / 2); gs.translate(fx(wm) + e * 0.012, wm, 0);
  A.add(gs, null, '#ffffff', ATL.cabGlass);
  for (const zs of [-1, 1]) {
    A.box(0.06, 0.12, 0.5, [fx(1.32) + e * 0.02, 1.32, zs * 0.95], '#2b2f37');
    heads.push({ x: fx(1.32) + e * 0.055, y: 1.34, z: zs * 1.02, w: 0.36, h: 0.07, e });
    tails.push({ x: fx(1.32) + e * 0.055, y: 1.3, z: zs * 0.72, w: 0.16, h: 0.06, e });
  }
  const sx = x0 + e * 0.62;
  A.box(0.1, 0.5, 2.4, [sx + e * 0.08, 0.7, 0], '#4a4e56');
  for (let i = -3; i <= 3; i++) A.box(0.12, 0.42, 0.03, [sx + e * 0.14, 0.7, i * 0.33], '#5a5e66');
  A.box(0.55, 0.2, 0.3, [sx + e * 0.25, 0.86, 0], '#2f3238');
}

// ------------------------------------------------------------------ the builder
/**
 * @param {'rear'|'mid'|'front'} type  rear = cab at -x (last car), front = cab at +x (leading car)
 * @param {{panto?:boolean, people?:number, seed?:number}} o
 */
export function carGeometry(type, o = {}) {
  const cabNeg = type === 'rear', cabPos = type === 'front', r = seeded(o.seed || 17);
  const x0 = -HL + (cabNeg ? 0.62 : 0.2), x1 = HL - (cabPos ? 0.62 : 0.2);
  const heads = [], tails = [];
  // ================= LO
  const lo = new Acc();
  {
    const half = withBands(EMU_HALF, [1.22, 3.4, ...bands.flatMap(b => [b[0], b[1]])]), prof = mirrorLoop(half);
    lo.add(sweep(prof, x0, x1, colorAt));
    for (const [x, d] of [[x0, -1], [x1, 1]]) { const cp = cap(prof, x, d, '#9aa0a8'); lo.add(cp.g, null, cp.color); }
    for (const s of [-1, 1]) {
      const rot = [0, s > 0 ? 0 : Math.PI, 0], z = s * ZW;
      for (const [a, b] of bays(cabNeg, cabPos)) {
        lo.box(b - a + 0.1, WIN_Y1 - WIN_Y0 + 0.1, 0.012, [(a + b) / 2, (WIN_Y0 + WIN_Y1) / 2, z + s * 0.006], '#2b2f37');
        const split = b - a > 2 ? 2 : 1;
        for (let j = 0; j < split; j++) { const pa = a + j * (b - a) / split, pb = a + (j + 1) * (b - a) / split; lo.plane(pb - pa - 0.05, WIN_Y1 - WIN_Y0 - 0.04, [(pa + pb) / 2, (WIN_Y0 + WIN_Y1) / 2, z + s * 0.0135], rot, ATL.emuWin((r() * 4) | 0)); }
      }
      for (const d of DOORS) {
        lo.box(2 * DOOR_HW + 0.08, DOOR_Y1 - DOOR_Y0 + 0.06, 0.01, [d, (DOOR_Y0 + DOOR_Y1) / 2, z + s * 0.004], '#50565e');
        for (const dx of [-0.33, 0.33]) { lo.box(0.655, DOOR_Y1 - DOOR_Y0, 0.03, [d + dx, (DOOR_Y0 + DOOR_Y1) / 2, z + s * 0.022], GREEN); lo.plane(0.42, 0.84, [d + dx, 2.74, z + s * 0.039], rot, ATL.doorWin((r() * 4) | 0)); }
      }
      lo.plane(0.42, 0.2, [0, 1.62, z + s * 0.012], rot, ATL.jrWest, '#ffffff');
    }
    roofGear(lo, o.panto); underGear(lo, seeded(o.seed || 17));
    if (!cabPos) gangway(lo, 1);
    if (cabNeg) cabFront(lo, -1, heads, tails); if (cabPos) cabFront(lo, 1, heads, tails);
  }
  // ================= HI: shell (exterior), interior, glass, door halves, screens, strap anchors
  const shell = new Acc(), inn = new Acc(), glass = new Acc(), doorNeg = new Acc(), doorPos = new Acc();
  const screens = [], ads = [], straps = [], seats = [];
  const hh = [], tt = [];
  {
    // roof (outside) + ceiling (inside)
    const top = EMU_HALF.filter(([, y]) => y >= 3.4);
    // -z edge -> over the top -> +z edge (a clockwise path in (z, y), hence the flipped normals)
    const full = [...top.map(([z, y]) => [-z, y]), ...top.slice(0, -1).reverse()];
    shell.add(sweepOpen(full, x0, x1, ROOF, true));
    // side skins: outer (stainless + green band) and inner (wall colour), with window + door openings
    const skin = (A, z, t, col, band) => {
      const run = (y0, y1, xs, c) => { for (const [a, b] of xs) if (b - a > 0.01) A.box(b - a, y1 - y0, t, [(a + b) / 2, (y0 + y1) / 2, z], c); };
      const doorCut = (xa, xb) => { const out = []; let x = xa; for (const d of DOORS) { if (d + DOOR_HW < xa || d - DOOR_HW > xb) continue; out.push([x, d - DOOR_HW]); x = d + DOOR_HW; } out.push([x, xb]); return out; };
      run(1.0, WIN_Y0, doorCut(x0, x1), col);
      run(1.0, DOOR_Y0, DOORS.map(d => [d - DOOR_HW, d + DOOR_HW]), col);
      // window level: piers between windows and doors
      const bs = bays(cabNeg, cabPos).map(([a, b]) => [a, b]).sort((p, q) => p[0] - q[0]);
      const openings = [...bs.flatMap(([a, b]) => { const w = b - a, n = w > 2 ? 2 : 1, out = []; for (let j = 0; j < n; j++) out.push([a + j * w / n + (j ? 0.04 : 0), a + (j + 1) * w / n - (j < n - 1 ? 0.04 : 0)]); return out; }), ...DOORS.map(d => [d - DOOR_HW, d + DOOR_HW])].sort((p, q) => p[0] - q[0]);
      const piers = []; let x = x0; for (const [a, b] of openings) { piers.push([x, a]); x = b; } piers.push([x, x1]);
      run(WIN_Y0, WIN_Y1, piers, col);
      run(DOOR_Y1, WIN_Y1, DOORS.map(d => [d - DOOR_HW, d + DOOR_HW]), col);
      run(WIN_Y1, band ? 3.28 : 3.42, [[x0, x1]], col);
      if (band) run(3.28, 3.42, [[x0, x1]], GREEN);
      return openings;
    };
    for (const s of [-1, 1]) {
      skin(shell, s * (ZW - 0.01), 0.02, SILVER, true);
      skin(inn, s * (ZI + 0.01), 0.02, IN_WALL, false);
      // window frames (outside), glass, sill + reveal
      for (const [a, b] of bays(cabNeg, cabPos)) {
        const w = b - a, n = w > 2 ? 2 : 1;
        for (let j = 0; j < n; j++) {
          const pa = a + j * w / n + (j ? 0.04 : 0), pb = a + (j + 1) * w / n - (j < n - 1 ? 0.04 : 0), cx = (pa + pb) / 2;
          for (const [dx, dy, ww, hh2] of [[0, WIN_Y0 - 0.02, pb - pa + 0.06, 0.04], [0, WIN_Y1 + 0.02, pb - pa + 0.06, 0.04], [-(pb - pa) / 2 - 0.01, (WIN_Y0 + WIN_Y1) / 2, 0.04, WIN_Y1 - WIN_Y0], [(pb - pa) / 2 + 0.01, (WIN_Y0 + WIN_Y1) / 2, 0.04, WIN_Y1 - WIN_Y0]]) shell.box(ww, hh2, 0.03, [cx + dx, dy, s * (ZW + 0.006)], '#2b2f37');
          glass.plane(pb - pa, WIN_Y1 - WIN_Y0, [cx, (WIN_Y0 + WIN_Y1) / 2, s * (ZW - 0.04)], [0, s > 0 ? 0 : Math.PI, 0], null, '#ffffff');
          inn.box(pb - pa, 0.03, 0.09, [cx, WIN_Y0 - 0.015, s * (ZI - 0.02)], IN_GREY);
          // window blinds rolled up at the top
          inn.box(pb - pa, 0.07, 0.05, [cx, WIN_Y1 - 0.04, s * (ZI - 0.03)], '#d9d6cc');
        }
      }
      // doors: the left side (-z) splits into the halves that slide; the right side stays shut in the shell
      for (const d of DOORS) {
        for (const [dx, acc] of [[-0.33, s < 0 ? doorNeg : shell], [0.33, s < 0 ? doorPos : shell]]) {
          const lx = d + dx, zo = s * (ZW - 0.02);
          // a leaf: green outside / grey inside, with a window hole (frame pieces)
          const pieces = [[lx, 1.68, 0.62, 1.04], [lx, 3.035, 0.62, 0.17], [lx - 0.265, 2.575, 0.09, 0.75], [lx + 0.265, 2.575, 0.09, 0.75]];   // frame around the window
          for (const [px, py, pw, ph] of pieces) { acc.box(pw, ph, 0.02, [px, py, zo + s * 0.018], GREEN); acc.box(pw, ph, 0.02, [px, py, zo - s * 0.012], IN_GREY); }
          acc.box(0.03, DOOR_Y1 - DOOR_Y0, 0.05, [d + (dx < 0 ? -0.008 : 0.008), (DOOR_Y0 + DOOR_Y1) / 2, zo], '#3a3d44');
        }
        inn.box(2 * DOOR_HW + 0.1, 0.012, 0.3, [d, FLOOR + 0.006, s * (ZI - 0.15)], '#e8bf2c');       // yellow door-edge line
        inn.box(2 * DOOR_HW + 0.2, 0.06, 0.12, [d, DOOR_Y1 + 0.03, s * (ZI - 0.04)], IN_GREY);         // door head
        // above-door screens: info (left) + ad (right)
        inn.box(1.34, 0.4, 0.06, [d, 3.3, s * (ZI - 0.05)], '#2a2d33');
        screens.push({ x: d - 0.33, y: 3.3, z: s * (ZI - 0.083), w: 0.6, h: 0.34, s });
        ads.push({ x: d + 0.33, y: 3.3, z: s * (ZI - 0.083), w: 0.6, h: 0.34, s });
      }
    }
    // floor, under-floor, ceiling, coves, light lines
    inn.box(x1 - x0, 0.06, 2 * ZI, [(x0 + x1) / 2, FLOOR - 0.03, 0], IN_FLOOR);
    shell.box(x1 - x0, 0.18, 2 * ZW - 0.04, [(x0 + x1) / 2, FLOOR - 0.15, 0], '#50545c');
    inn.box(x1 - x0, 0.03, 1.9, [(x0 + x1) / 2, 3.47, 0], '#f3f2ee');
    for (const s of [-1, 1]) {
      inn.box(x1 - x0, 0.03, 0.36, [(x0 + x1) / 2, 3.43, s * 1.08], '#eeede8', [s * 0.35, 0, 0]);
      inn.box(x1 - x0 - 0.6, 0.02, 0.16, [(x0 + x1) / 2, 3.455, s * 0.62], '#fffdf4');
    }
    inn.box(x1 - x0 - 0.4, 0.05, 0.4, [(x0 + x1) / 2, 3.44, 0], '#e2e2dc');
    // benches, partitions, poles, racks, strap rails + straps, priority stickers
    for (const [a, b, pri] of benches(cabNeg, cabPos)) for (const s of [-1, 1]) {
      const L = b - a, cx = (a + b) / 2, zc = s * (ZI - 0.28);
      inn.box(L, 0.1, 0.5, [cx, FLOOR + 0.39, zc], pri ? SEAT_P : SEAT);
      inn.box(L, 0.46, 0.08, [cx, FLOOR + 0.72, s * (ZI - 0.06)], pri ? SEAT_P : SEAT, [s * -0.12, 0, 0]);
      inn.box(L, 0.3, 0.42, [cx, FLOOR + 0.18, zc + s * 0.03], '#5b5e66');
      const n = Math.max(1, Math.round(L / 0.46));
      for (let i = 1; i < n; i++) inn.box(0.012, 0.012, 0.44, [a + i * L / n, FLOOR + 0.445, zc], '#2f4a5e');
      for (let i = 0; i < n; i++) seats.push({ x: a + (i + 0.5) * L / n, z: s * (ZI - 0.34), s });
      // 袖仕切り (end partitions) with a glass upper part, and the poles
      for (const xe of [a - 0.04, b + 0.04]) {
        inn.box(0.05, 1.05, 0.62, [xe, FLOOR + 0.52, s * (ZI - 0.31)], IN_GREY);
        glass.box(0.02, 0.8, 0.5, [xe, FLOOR + 1.45, s * (ZI - 0.3)], '#ffffff');
        inn.cyl(0.018, 0.018, 2.3, [xe, FLOOR + 1.15, s * (ZI - 0.62)], pri ? POLE_P : POLE, null, 8);
      }
      if (L > 2.5) inn.cyl(0.018, 0.018, 2.3, [cx, FLOOR + 1.15, s * (ZI - 0.58)], POLE, null, 8);
      // luggage rack
      inn.box(L, 0.03, 0.32, [cx, FLOOR + 1.74, s * (ZI - 0.16)], '#b5bac0');
      for (let x = a + 0.2; x < b; x += 0.6) inn.box(0.02, 0.1, 0.3, [x, FLOOR + 1.79, s * (ZI - 0.16)], '#9aa0a6');
      // strap rail + strap anchors (straps are instanced by the train, so they can swing)
      inn.cyl(0.015, 0.015, L, [cx, FLOOR + 1.98, s * (ZI - 0.62)], POLE, [0, 0, Math.PI / 2], 8);
      for (let x = a + 0.25; x < b - 0.1; x += 0.42) straps.push({ x, y: FLOOR + 1.97, z: s * (ZI - 0.62), pri });
    }
    // car ends: end walls with the gangway door opening; at the cab ends the cab wall with its window
    for (const e of [-1, 1]) {
      const cab = (e < 0 && cabNeg) || (e > 0 && cabPos);
      const xe = e * (cab ? HL - 1.3 : HL - 0.22);
      const op = cab ? 0.5 : 0.9;
      for (const s of [-1, 1]) inn.box(0.08, 2.3, ZI - op / 2, [xe, FLOOR + 1.15, s * (op / 2 + (ZI - op / 2) / 2)], IN_WALL);
      inn.box(0.08, 0.35, op, [xe, FLOOR + 2.12, 0], IN_WALL);
      if (cab) { inn.box(0.08, 2.0, op, [xe, FLOOR + 1.0, 0], '#b9bec4'); glass.plane(op * 0.8, 0.6, [xe - e * 0.05, FLOOR + 1.5, 0], [0, e > 0 ? -Math.PI / 2 : Math.PI / 2, 0], null, '#ffffff'); inn.box(1.0, 0.9, 2.2, [e * (HL - 0.8), FLOOR + 0.45, 0], '#3a3f48'); }
      else {
        // gangway tunnel to the next car (walk-through)
        const gx = e * (HL + P.CAR.gap / 2);
        for (const s of [-1, 1]) inn.box(0.72, 2.0, 0.06, [gx, FLOOR + 1.0, s * 0.5], '#4a4d55');
        inn.box(0.72, 0.06, 1.06, [gx, FLOOR + 2.0, 0], '#4a4d55');
        inn.box(0.72, 0.04, 1.0, [gx, FLOOR - 0.02, 0], '#6b6e76');
        // the (open) gangway door leaf, slid aside
        inn.box(0.03, 1.8, 0.8, [xe - e * 0.06, FLOOR + 0.95, 0.75], '#c9ced4');
      }
    }
    // passengers: some seated, some standing by the doors / holding straps
    const figs = o.people ?? 6;
    const rr = seeded((o.seed || 17) * 13 + 5);
    const used = new Set();
    for (let i = 0; i < figs; i++) {
      if (rr() < 0.65 && seats.length) {
        let k = (rr() * seats.length) | 0; if (used.has(k)) continue; used.add(k);
        const st = seats[k], geo = figureGeometry((rr() * OUTFIT_COUNT) | 0, 'sit');
        inn.add(geo, mat4([st.x, FLOOR, st.z], [0, st.s > 0 ? Math.PI : 0, 0]));
      } else {
        const d = DOORS[(rr() * 4) | 0] + (rr() - 0.5) * 1.2, z = (rr() - 0.5) * 1.2, geo = figureGeometry((rr() * OUTFIT_COUNT) | 0, 'stand');
        inn.add(geo, mat4([d, FLOOR, z], [0, rr() * Math.PI * 2, 0]));
      }
    }
    roofGear(shell, o.panto); underGear(shell, seeded(o.seed || 17));
    if (!cabPos) gangway(shell, 1);
    if (cabNeg) cabFront(shell, -1, hh, tt); if (cabPos) cabFront(shell, 1, hh, tt);
    // shell end caps above / beside the gangway (the body ends)
    for (const e of [-1, 1]) {
      const xe = e < 0 ? x0 : x1;
      if ((e < 0 && cabNeg) || (e > 0 && cabPos)) continue;
      for (const s of [-1, 1]) shell.box(0.03, 2.4, ZW - 0.5, [xe, 2.2, s * (0.5 + (ZW - 0.5) / 2)], '#9aa0a8');
      shell.box(0.03, 0.4, 1.0, [xe, 3.2, 0], '#9aa0a8');
    }
  }
  return {
    lo: lo.build(), heads, tails,
    hi: { shell: shell.build(), inn: inn.build(), glass: glass.build(), doorNeg: doorNeg.build(), doorPos: doorPos.build(), screens, ads, straps, heads: hh, tails: tt },
  };
}
