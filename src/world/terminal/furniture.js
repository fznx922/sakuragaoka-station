// Furniture of 大阪駅: ticket machines (券売機) + the ticket office, in-gate shops (convenience store, 駅弁,
// café), coin lockers, benches, vending machines, recycling bins, a Shinkansen waiting room; platform benches,
// bins and vending machines, the platform doors (ホームドア) of 3・4番のりば and the Shinkansen platform fences,
// whose gates slide open with the train doors.
import * as THREE from 'three';
import * as P from './plan.js';

export function buildFurniture(ctx, H) {
  const { root, dyn, M, tx } = H;
  const { mat } = ctx;
  const T = ctx.tex, F = T.FONTS;
  const K = H.kit();
  const r = ctx.rng('terminal.furniture');
  const signM = (o) => mat.toon('#ffffff', { map: tx.sign(o), paint: 0.01 });

  // ---------------------------------------------------------------- small pieces (kit space, front = +z)
  const bench = (k, len = 2.4) => {
    for (const x of [-len / 2 + 0.2, len / 2 - 0.2]) k.box(0.08, 0.42, 0.45, M.steelD, [x, 0.21, 0]);
    for (let i = 0; i < Math.round(len / 0.5); i++) { const x = -len / 2 + 0.25 + i * 0.5; k.box(0.44, 0.05, 0.46, i % 2 ? M.band : mat.toon('#3f7fc8', { paint: 0.02 }), [x, 0.44, 0]); k.box(0.44, 0.4, 0.05, i % 2 ? M.band : mat.toon('#3f7fc8', { paint: 0.02 }), [x, 0.7, -0.22], [-0.12, 0, 0]); }
  };
  const vendTex = T.draw(256, 420, (g, w, h) => {
    g.fillStyle = '#1f6fbf'; g.fillRect(0, 0, w, h); g.fillStyle = '#f7f2e8'; g.fillRect(10, 10, w - 20, h * 0.52);
    const cols = ['#e2a33b', '#6aa5d6', '#7fbf6a', '#d85f5f', '#f0d060', '#9a7ad0', '#e9e4da'];
    for (let rr = 0; rr < 3; rr++) for (let c = 0; c < 6; c++) { g.fillStyle = cols[(rr * 3 + c) % 7]; g.fillRect(20 + c * 37, 22 + rr * 68, 26, 50); g.fillStyle = '#fff'; g.fillRect(20 + c * 37, 76 + rr * 68, 26, 8); }
    g.fillStyle = '#fff'; g.font = `900 30px ${F.round}`; g.textAlign = 'center'; g.fillText('JR DRINK', w / 2, h * 0.68);
    g.font = `700 20px ${F.sans}`; g.fillText('IC カードで買える', w / 2, h * 0.78);
  }, { key: 'term.vend' });
  const vending = (k) => { k.box(1.0, 1.83, 0.75, mat.toon('#e8e6e0', { paint: 0.03 }), [0, 0.915, 0]); k.plane(0.9, 1.5, mat.emissive('#ffffff', 0.95, { map: vendTex }), [0, 1.08, 0.376]); };
  const bins = (k) => {
    const lab = [['かん・びん', '#2f7fc0'], ['ペットボトル', '#3fa36b'], ['新聞・雑誌', '#e9853a'], ['その他のごみ', '#8c939c']];
    lab.forEach(([t, c], i) => {
      k.box(0.46, 1.0, 0.5, mat.toon('#d8dbde', { paint: 0.02 }), [(i - 1.5) * 0.5, 0.5, 0]);
      k.box(0.44, 0.12, 0.02, mat.toon(c, { paint: 0.02 }), [(i - 1.5) * 0.5, 0.92, 0.26]);
      k.box(0.2, 0.05, 0.02, M.black, [(i - 1.5) * 0.5, 0.78, 0.26]);
    });
  };
  const place = (fn, u, y, v, rot, w, d, h = 2) => { const g = H.group(u, y, v, rot); fn(ctx.kit(g)); H.box(u, v, Math.abs(Math.cos(rot)) > 0.5 ? w : d, Math.abs(Math.cos(rot)) > 0.5 ? d : w, 0, y - 0.5, y + h); return g; };

  // ---------------------------------------------------------------- outside the gates: ticket machines, office, lockers
  for (let i = 0; i < 7; i++) place((k) => {
    k.box(0.92, 1.75, 0.7, mat.toon('#dfe3e8', { paint: 0.02 }), [0, 0.875, 0]);
    k.box(0.8, 0.5, 0.05, M.black, [0, 1.25, 0.35], [-0.35, 0, 0]);
    k.plane(0.74, 0.44, mat.emissive('#ffffff', 0.95, { map: tx.tvm }), [0, 1.25, 0.39], [-0.35, 0, 0]);
    k.box(0.3, 0.08, 0.04, M.black, [-0.2, 0.95, 0.36]); k.box(0.2, 0.2, 0.04, mat.toon('#3aa0ff', { paint: 0.01 }), [0.25, 0.95, 0.36]);
    k.box(0.92, 0.15, 0.72, M.band, [0, 1.82, 0]);
  }, -26.5 + i * 1.0, 0, 33.8, 0, 0.95, 0.75);
  {
    const u0 = 15, u1 = 31, v0 = 33, v1 = 38.5;
    K.box(u1 - u0, 3.2, v1 - v0, M.wall, [(u0 + u1) / 2, 1.6, (v0 + v1) / 2]);
    for (let u = u0 + 1.5; u < u1 - 1; u += 3.2) { K.box(2.6, 1.5, 0.05, M.glass, [u + 1.1, 1.5, v1 + 0.03]); K.plane(2.5, 1.4, M.warm, [u + 1.1, 1.5, v1 - 0.05]); }
    K.plane(8, 0.9, signM({ text: 'みどりの窓口', sub: 'JR Ticket Office · Reservations', bg: '#2f9a4a', key: 'office' }), [(u0 + u1) / 2, 2.75, v1 + 0.02]);
    H.box((u0 + u1) / 2, (v0 + v1) / 2, u1 - u0, v1 - v0, 0, -1, 3.3);
  }
  for (let i = 0; i < 5; i++) place((k) => {
    k.box(0.9, 2.0, 0.6, mat.toon('#e3e6ea', { paint: 0.02 }), [0, 1.0, 0]);
    for (let a = 0; a < 3; a++) for (let b = 0; b < 4; b++) { k.box(0.26, 0.42, 0.02, mat.toon('#cfd5dc', { paint: 0.02 }), [(a - 1) * 0.29, 0.3 + b * 0.47, 0.31]); k.box(0.04, 0.04, 0.02, M.steelD, [(a - 1) * 0.29 + 0.08, 0.35 + b * 0.47, 0.325]); }
  }, 33.2, 0, 40 + i * 0.95, -Math.PI / 2, 0.95, 0.65);

  // ---------------------------------------------------------------- in-gate shops (east wall), benches, vending, bins
  const shop = (v0, v1, name, sub, bg, kind) => {
    const u0 = 26.5, u1 = 34;
    K.box(u1 - u0, 0.6, v1 - v0, M.wall, [(u0 + u1) / 2, 4.1, (v0 + v1) / 2]);
    K.box(0.12, 3.8, v1 - v0, M.glass, [u0, 1.9, (v0 + v1) / 2]);
    for (let v = v0; v <= v1 + 1e-6; v += (v1 - v0) / 4) K.box(0.14, 3.8, 0.1, M.steelD, [u0, 1.9, v]);
    K.plane(v1 - v0 - 0.4, 3.3, M.warm, [u1 - 0.3, 1.8, (v0 + v1) / 2], [0, -Math.PI / 2, 0]);
    const cols = kind === 'mart' ? ['#e2a33b', '#6aa5d6', '#7fbf6a', '#d85f5f', '#f0d060', '#f4f2ea'] : kind === 'bento' ? ['#c9503c', '#e9c3a0', '#8fb37a', '#f4e6c8', '#d9a066'] : ['#8a6446', '#e9dcc0', '#f4f2ea', '#5a4032'];
    for (let row = 0; row < 3; row++) for (let i = 0; i < Math.floor((v1 - v0 - 1) / 0.5); i++) K.box(0.4, 0.28, 0.36, mat.toon(cols[(i + row) % cols.length], { paint: 0.03 }), [u1 - 1.2 - row * 1.6, 0.5 + (row % 2) * 0.35, v0 + 0.8 + i * 0.5]);
    for (let row = 0; row < 3; row++) K.box(0.6, 1.0, v1 - v0 - 1.2, M.steel, [u1 - 1.2 - row * 1.6, 0.25, (v0 + v1) / 2]);
    K.plane(v1 - v0 - 0.4, 0.55, signM({ text: name, sub, bg, key: 'shop' + name }), [u0 - 0.07, 4.1, (v0 + v1) / 2], [0, -Math.PI / 2, 0]);
    H.box((u0 + u1) / 2, (v0 + v1) / 2, u1 - u0, v1 - v0, 0, -1, 4.4);
  };
  shop(14, 26, 'ステーションマート', 'Station Mart · open 24h', '#2f8a4f', 'mart');
  shop(2, 11, '駅弁 桜膳', 'Ekiben · Bento', '#b8453a', 'bento');
  shop(-12, -2, 'カフェ 梅田', 'Café Umeda', '#5a4032', 'cafe');
  for (const [u, v] of [[4, 6], [4, -6], [10, 6], [10, -6]]) place((k) => bench(k, 2.4), u, 0, v, (u === 4 ? 1 : -1) * Math.PI / 2, 2.4, 0.6, 1);
  place(vending, -33.3, 0, 26, Math.PI / 2, 1.0, 0.75); place(vending, -33.3, 0, 24.9, Math.PI / 2, 1.0, 0.75);
  place(bins, -33.4, 0, 22.4, Math.PI / 2, 2.0, 0.55, 1.1);
  // posters on the concourse walls
  tx.posters.forEach((pt, i) => { K.plane(1.2, 1.8, mat.toon('#ffffff', { map: pt, paint: 0.01 }), [-33.78, 1.9, -8 + i * 3.6], [0, Math.PI / 2, 0]); });
  // Shinkansen side: waiting room, bento stand, benches
  {
    const u0 = 16, u1 = 30, v0 = -58, v1 = -46;
    K.box(u1 - u0, 0.3, v1 - v0, M.steelD, [(u0 + u1) / 2, 3.1, (v0 + v1) / 2]);
    for (const [a, b, c, d] of [[u0, u1, v1, v1], [u0, u1, v0, v0], [u0, u0, v0, v1], [u1, u1, v0, v1]]) K.box(Math.max(0.06, b - a), 3.0, Math.max(0.06, d - c), M.glass, [(a + b) / 2, 1.5, (c + d) / 2]);
    for (let i = 0; i < 3; i++) { const g = H.group(u0 + 3 + i * 4, 0, (v0 + v1) / 2, 0); bench(ctx.kit(g), 3.2); }
    K.plane(6, 0.7, signM({ text: '新幹線 待合室', sub: 'Shinkansen Waiting Room', bg: '#1a4f96', key: 'wait' }), [(u0 + u1) / 2, 2.7, v1 + 0.05]);
    H.box((u0 + u1) / 2, v1, u1 - u0, 0.1, 0, -1, 3); H.box((u0 + u1) / 2, v0, u1 - u0, 0.1, 0, -1, 3); H.box(u1, (v0 + v1) / 2, 0.1, v1 - v0, 0, -1, 3);
    H.box(u0, v0 + 2, 0.1, 4, 0, -1, 3); H.box(u0, v1 - 2, 0.1, 4, 0, -1, 3);   // door gap in the west wall
  }
  shop(-42, -34, '駅弁 新幹線の旅', 'Ekiben for the Shinkansen', '#1a4f96', 'bento');

  // ---------------------------------------------------------------- platforms
  for (const I of P.ISLANDS) {
    const y = P.Y.plat;
    for (const u of [-85, -40, 25, 70]) place((k) => { bench(k, 2.4); }, u, y, I.v - 0.35, Math.PI, 2.4, 0.6, 1);
    for (const u of [-85, -40, 25, 70]) place((k) => { bench(k, 2.4); }, u, y, I.v + 0.35, 0, 2.4, 0.6, 1);
    place(vending, 38, y, I.v, Math.PI / 2, 1.0, 0.75);
    place(bins, -70, y, I.v, Math.PI / 2, 2.0, 0.55, 1.1);
    // emergency stop buttons on columns at the platform ends
    for (const u of [-95, 95]) { K.box(0.2, 1.6, 0.2, M.steel, [u, y + 0.8, I.v]); K.box(0.3, 0.3, 0.1, M.red, [u, y + 1.45, I.v + 0.12]); K.box(0.3, 0.3, 0.1, M.red, [u, y + 1.45, I.v - 0.12]); }
  }
  for (const S of P.S_PLATS) {
    const y = P.Y.platS, back = S.edge === S.v0 ? S.v1 - 0.8 : S.v0 + 0.8;
    for (const u of [-150, -90, 40, 100, 170]) place((k) => bench(k, 3.2), u, y, back, S.edge === S.v0 ? Math.PI : 0, 3.2, 0.6, 1);
    place(vending, 130, y, back, S.edge === S.v0 ? Math.PI : 0, 1.0, 0.75);
  }

  // ---------------------------------------------------------------- ホームドア (tracks 3 & 4) and the Shinkansen platform fences
  const leafM = mat.toon('#e7eaee', { paint: 0.02 }), postM = mat.toon('#cfd5dc', { paint: 0.02 });
  const doorsets = [];
  const barrier = (edgeV, inward, top, doorUs, openW, h, track, shin) => {
    const v = edgeV + inward * 0.45;
    const sorted = doorUs.slice().sort((a, b) => a - b);
    let u = shin ? -P.S_PLAT_LEN / 2 : -P.PLAT_LEN / 2;
    const end = -u;
    for (const du of [...sorted, end + openW / 2]) {
      const a = u, b = Math.min(end, du - openW / 2 - 0.3);
      if (b > a + 0.2) {
        K.box(b - a, h, 0.12, postM, [(a + b) / 2, top + h / 2, v]);
        K.box(b - a, 0.08, 0.2, M.band, [(a + b) / 2, top + h - 0.1, v]);
        H.box((a + b) / 2, v, b - a, 0.2, 0, top - 0.3, top + h);
      }
      u = du + openW / 2 + 0.3;
    }
    doorsets.push({ v, top, doorUs: sorted, openW, h, track, shin });
  };
  for (const trk of [3, 4]) { const I = P.ISLANDS[1], side = Math.sign(P.TRACKS[trk] - I.v); barrier(I.v + side * P.ISLAND_W / 2, -side, P.Y.plat, P.convDoors(P.SERVICES[trk].cars), 1.8, 1.3, trk, false); }
  for (const S of P.S_PLATS) barrier(S.edge, S.edge === S.v0 ? 1 : -1, P.Y.platS, P.shinDoors(), 1.6, 1.25, S.track, true);
  // sliding leaves (dynamic, one instanced mesh): two per opening
  const nLeaves = doorsets.reduce((a, d) => a + d.doorUs.length * 2, 0);
  const leaves = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 0.08), leafM, nLeaves);
  leaves.castShadow = true; leaves.frustumCulled = false; dyn.add(leaves);
  const m4 = new THREE.Matrix4();
  const state = doorsets.map(() => -1);
  const drawLeaves = (t) => {
    let k = 0, changed = false;
    doorsets.forEach((D, i) => {
      const st = D.shin ? P.shinState(D.track, t) : P.convState(D.track, t);
      const o = st.doors;
      if (Math.abs(o - state[i]) > 1e-3) changed = true;
      state[i] = o;
      const w = D.openW / 2 + 0.3;
      for (const du of D.doorUs) for (const s of [-1, 1]) {
        const cx = du + s * (w / 2 + o * w * 0.95);
        m4.makeScale(w, D.h - 0.15, 1).setPosition(cx, D.top + (D.h - 0.15) / 2, D.v);
        leaves.setMatrixAt(k++, m4);
      }
    });
    if (changed) leaves.instanceMatrix.needsUpdate = true;
  };
  drawLeaves(0);
  // closed leaves block the openings
  ctx.physics.addDynamic(() => {
    const out = [];
    doorsets.forEach((D, i) => { if (state[i] < 0.6) for (const du of D.doorUs) { const p = P.toWorld(du, D.v); out.push({ cx: p.x, cz: p.z, w: D.openW + 0.6, d: 0.2, y0: D.top - 0.3, y1: D.top + D.h }); } });
    return out;
  });
  H.update((dt, t) => { if (H.visible()) drawLeaves(t); });
  void r; void root;
  return { doorsets };
}
