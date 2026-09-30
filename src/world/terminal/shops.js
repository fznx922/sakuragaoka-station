// The small shops and stands that make 大阪駅 feel like a real JR station:
//   * the town's detailed vending machines (lit product rows, price rails, IC readers) + recycling bins, on the
//     concourse and every platform
//   * 駅そば — a stand-up soba / udon counter on 5・6番のりば with its noren, ticket machine, steaming pots and
//     customers slurping at the counter
//   * a Heart-in kiosk on 3・4番のりば (newspapers, magazines, a lit drinks fridge, snacks)
//   * 551 蓬莱 in the south hall: steamed pork buns behind glass, steam, a queue of people
//   * 駅弁 display cases in front of the bento shops, and an ekiben cart on the Shinkansen platform
import * as THREE from 'three';
import * as P from './plan.js';
import { vendingMachine, vendingKit, recycleBin } from '../props/vending.js';
import { figureMesh } from './crowd.js';
import { cellUV } from '../props/common.js';

export function buildShops(ctx, H) {
  const { M } = H;
  const { mat } = ctx;
  const T = ctx.tex, F = T.FONTS;
  const top = H.root.parent;                 // identity frame (world coordinates) for the town prop builders
  const W = (u, v) => P.toWorld(u, v);
  /** the town prop builders place groups in world space on a known floor height */
  const PH = (y) => ({
    place: (x, yy, z, rotY = 0) => { const g = new THREE.Group(); g.position.set(x, yy, z); g.rotation.y = rotY; top.add(g); return g; },
    footprint: () => ({ min: y, max: y }),
    toWorld: (cx, cz, rotY, lx, lz) => { const c = Math.cos(rotY), s = Math.sin(rotY); return { x: cx + lx * c + lz * s, z: cz - lx * s + lz * c }; },
  });
  const vend = (u, y, v, rotY, id, bin = null) => {
    const w = W(u, v), ph = PH(y);
    const r = vendingMachine(ctx, ph, { id, x: w.x, z: w.z, rotY, y });
    if (bin) { const K = vendingKit(ctx); recycleBin(ctx, ph, K.M, K.tx, r.put(bin.side * 0.77, 0.02), 'blue', '#e9ecee', bin.lid || '#5b8fd6', y); }
    return r;
  };
  const person = (variant, u, y, v, yaw, pose = 'stand', extra = null) => { const m = figureMesh(ctx, variant, pose, extra); m.position.set(u, y, v); m.rotation.y = yaw; H.root.add(m); return m; };
  const K = H.kit();
  const box = (u0, u1, y0, y1, v0, v1, m) => K.box(u1 - u0, y1 - y0, v1 - v0, m, [(u0 + u1) / 2, (y0 + y1) / 2, (v0 + v1) / 2]);

  // ================================================================ vending machines (the town's) + bins
  vend(-33.3, 0, 26.2, Math.PI / 2, 'V1a', { side: -1 });
  vend(-33.3, 0, 24.9, Math.PI / 2, 'V3b');
  vend(33.3, 0, -20, -Math.PI / 2, 'V2', { side: 1 });
  for (const [i, I] of P.ISLANDS.entries()) vend(38, P.Y.plat, I.v, Math.PI / 2 + (i % 2 ? Math.PI : 0), ['V1b', 'V5', 'V3a'][i], { side: 1, lid: ['#5b8fd6', '#4f9e78', '#5b8fd6'][i] });
  for (const S of P.S_PLATS) { const back = S.edge === S.v0 ? S.v1 - 0.8 : S.v0 + 0.8; vend(130, P.Y.platS, back, S.edge === S.v0 ? Math.PI : 0, 'V2', { side: 1 }); vend(-60, P.Y.platS, back, S.edge === S.v0 ? Math.PI : 0, 'V1a'); }

  // ================================================================ steam (shared by the soba stand and 551)
  const steamTex = T.draw(64, 64, (g, w, h) => { const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(255,255,255,0.8)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }, { key: 'term.steam' });
  const steamM = mat.decal('#ffffff', { map: steamTex, transparent: true, opacity: 0.5, depthWrite: false });
  const puffs = [];
  const steam = (u, y, v, n = 5) => { for (let i = 0; i < n; i++) { const s = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), steamM); s.userData = { u, y, v, ph: i / n }; H.dyn.add(s); ctx.noOutline?.(s); puffs.push(s); } };

  // ================================================================ 駅そば on 5・6番のりば
  {
    const I = P.ISLANDS[2], y = P.Y.plat, u0 = -58, u1 = -49, vc = I.v, hw = 1.1;
    const cream = mat.toon('#efe6d2', { paint: 0.03 }), wood = mat.toon('#a8784e', { paint: 0.05 }), steel = M.steel;
    // the stand: end walls, low counter walls on both long sides with the open serving windows above, roof
    for (const e of [u0, u1]) box(e - 0.08, e + 0.08, y, y + 2.55, vc - hw, vc + hw, cream);
    for (const s of [-1, 1]) {
      box(u0, u1, y, y + 0.98, vc + s * hw - 0.06, vc + s * hw + 0.06, cream);
      box(u0, u1, y + 2.1, y + 2.55, vc + s * hw - 0.06, vc + s * hw + 0.06, cream);
      for (const e of [u0 + 0.1, (u0 + u1) / 2, u1 - 0.1]) box(e - 0.05, e + 0.05, y + 0.98, y + 2.1, vc + s * hw - 0.05, vc + s * hw + 0.05, M.steelD);
    }
    box(u0 - 0.1, u1 + 0.1, y + 2.55, y + 2.75, vc - hw - 0.12, vc + hw + 0.12, mat.toon('#2f3a5e', { paint: 0.02 }));
    box(u0 + 0.1, u1 - 0.1, y + 2.5, y + 2.52, vc - hw + 0.1, vc + hw - 0.1, mat.emissive('#fff4dd', 0.8));
    // inside: the kitchen counter / back shelf down the middle: pots, stacked bowls, tempura trays, ladles
    box(u0 + 0.2, u1 - 0.2, y, y + 0.9, vc - 0.3, vc + 0.3, M.steel);
    box(u0 + 0.2, u1 - 0.2, y + 1.55, y + 1.58, vc - 0.18, vc + 0.18, M.steel);
    const bowlM = mat.toon('#b3302b', { paint: 0.02 }), bowlIn = mat.toon('#2a2426', { paint: 0.02 });
    for (let u = u0 + 0.6; u < u1 - 0.5; u += 0.28) for (let k = 0; k < 3; k++) K.cyl(0.085, 0.06, 0.06, bowlM, [u, y + 1.62 + k * 0.05, vc], null, 10);
    for (const du of [-3.2, -1.8, 1.6, 3.0]) {
      K.cyl(0.26, 0.24, 0.34, M.steel, [(u0 + u1) / 2 + du, y + 1.07, vc], null, 16);
      K.cyl(0.24, 0.24, 0.01, mat.toon('#c9a064', { paint: 0.03 }), [(u0 + u1) / 2 + du, y + 1.235, vc], null, 16);
      steam((u0 + u1) / 2 + du, y + 1.35, vc, 3);
    }
    for (const du of [-0.4, 0.3]) { K.box(0.5, 0.05, 0.34, M.steel, [(u0 + u1) / 2 + du, y + 0.93, vc]); for (let i = 0; i < 4; i++) K.box(0.1, 0.04, 0.07, mat.toon('#e2b04a', { paint: 0.04 }), [(u0 + u1) / 2 + du - 0.17 + i * 0.11, y + 0.97, vc]); }
    for (const s of [-1, 1]) {
      box(u0 + 0.3, u1 - 0.3, y + 0.98, y + 1.03, vc + s * (hw - 0.02), vc + s * (hw + 0.38), wood);   // the standing counter
      // noren: indigo curtains with white lettering, hung over each serving window
      const noren = T.draw(512, 128, (g, w, h) => {
        g.fillStyle = '#2b3566'; g.fillRect(0, 0, w, h); g.strokeStyle = '#1d2448'; g.lineWidth = 4;
        for (let i = 1; i < 5; i++) { g.beginPath(); g.moveTo(i * w / 5, 20); g.lineTo(i * w / 5, h); g.stroke(); }
        g.fillStyle = '#f4f1e8'; g.font = `900 60px ${F.sans}`; g.textAlign = 'center'; g.textBaseline = 'middle';
        ['そ', 'ば', '・', 'う', 'ど'].forEach((c, i) => g.fillText(c, (i + 0.5) * w / 5, h * 0.6));
      }, { key: 'term.noren2' });
      const noren2 = T.draw(256, 128, (g, w, h) => { g.fillStyle = '#2b3566'; g.fillRect(0, 0, w, h); g.strokeStyle = '#1d2448'; g.lineWidth = 4; g.beginPath(); g.moveTo(w / 2, 20); g.lineTo(w / 2, h); g.stroke(); g.fillStyle = '#f4f1e8'; g.font = `900 60px ${F.sans}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('ん', w / 4, h * 0.6); g.font = `700 30px ${F.sans}`; g.fillText('駅そば', w * 0.75, h * 0.6); }, { key: 'term.noren3' });
      const nm = mat.toon('#ffffff', { map: noren, side: 'double', paint: 0.02 }), nm2 = mat.toon('#ffffff', { map: noren2, side: 'double', paint: 0.02 });
      const L1 = (u1 - u0 - 0.4) * 0.7, L2 = (u1 - u0 - 0.4) * 0.3;
      const sgn = s > 0 ? 1 : -1;
      K.plane(L1, 0.5, nm, [u0 + 0.2 + (s > 0 ? L1 / 2 : L2 + L1 / 2), y + 2.28, vc + s * (hw + 0.075)], [0, s > 0 ? 0 : Math.PI, 0]);
      K.plane(L2, 0.5, nm2, [u0 + 0.2 + (s > 0 ? L1 + L2 / 2 : L2 / 2), y + 2.28, vc + s * (hw + 0.075)], [0, s > 0 ? 0 : Math.PI, 0]);
      void sgn;
      // customers eating at the counter (a bowl + chopsticks in front of each)
      for (const [j, du] of [-2.6, 0.2, 2.4].entries()) {
        const pu = (u0 + u1) / 2 + du + s * 0.3;
        person((j * 3 + (s > 0 ? 1 : 4)) % 10, pu, y, vc + s * (hw + 0.62), s > 0 ? Math.PI : 0);
        K.cyl(0.09, 0.06, 0.07, bowlM, [pu, y + 1.065, vc + s * (hw + 0.2)], null, 12);
        K.cyl(0.08, 0.08, 0.01, bowlIn, [pu, y + 1.1, vc + s * (hw + 0.2)], null, 12);
        K.box(0.22, 0.008, 0.008, mat.toon('#c9a064', { paint: 0.02 }), [pu + 0.04, y + 1.12, vc + s * (hw + 0.26)], [0, 0.3, 0]);
      }
      H.box((u0 + u1) / 2, vc + s * (hw + 0.2), u1 - u0 - 0.6, 0.4, 0, y - 0.3, y + 1.05);
    }
    // the two cooks inside (seen through the serving windows)
    person(9, (u0 + u1) / 2 - 1.1, y, vc + 0.62, 0, 'stand', { top: '#f4f2ec', bottom: '#3a3f4c', hair: '#2b2426', scarf: '#2b3566' });
    person(9, (u0 + u1) / 2 + 1.4, y, vc - 0.62, Math.PI, 'stand', { top: '#f4f2ec', bottom: '#3a3f4c', hair: '#5a4436', scarf: '#2b3566' });
    // lit menu board + ticket machine (食券機) at the west end
    const menu = T.draw(512, 256, (g, w, h) => {
      g.fillStyle = '#f6efe0'; g.fillRect(0, 0, w, h); g.fillStyle = '#b3302b'; g.fillRect(0, 0, w, 54);
      g.fillStyle = '#fff'; g.font = `900 34px ${F.sans}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('駅そば  お品書き', w / 2, 28);
      const items = [['かけそば', 360], ['きつねうどん', 430], ['天ぷらそば', 480], ['肉うどん', 560], ['カレーライス', 520], ['いなり 2個', 180]];
      g.textAlign = 'left'; items.forEach(([n, p], i) => { const x = 22 + (i % 2) * 250, yy = 88 + Math.floor(i / 2) * 58; g.fillStyle = '#2d3038'; g.font = `700 26px ${F.sans}`; g.fillText(n, x, yy); g.fillStyle = '#b3302b'; g.fillText(p + '円', x + 160, yy); });
    }, { key: 'term.sobaMenu' });
    K.box(0.12, 1.3, 2.0, M.steelD, [u0 - 0.06, y + 1.95, vc]);
    K.plane(1.9, 0.95, mat.emissive('#ffffff', 0.9, { map: menu }), [u0 - 0.125, y + 1.95, vc], [0, -Math.PI / 2, 0]);
    K.box(0.6, 1.55, 0.7, mat.toon('#dfe3e8', { paint: 0.02 }), [u0 - 0.45, y + 0.78, vc + 1.4]);
    K.plane(0.5, 0.6, mat.emissive('#ffffff', 0.9, { map: T.draw(128, 160, (g, w, h) => { g.fillStyle = '#1f4d8a'; g.fillRect(0, 0, w, h); const c = ['#f2a33a', '#5fb4e6', '#7bc47f', '#e86e6e', '#f0d060', '#c9a0e0']; for (let i = 0; i < 12; i++) { g.fillStyle = c[i % 6]; g.fillRect(8 + (i % 3) * 40, 10 + Math.floor(i / 3) * 36, 32, 28); } }, { key: 'term.sobaTvm' }) }), [u0 - 0.755, y + 1.1, vc + 1.4], [0, -Math.PI / 2, 0]);
    H.box((u0 + u1) / 2, vc, u1 - u0, 2 * hw, 0, y - 0.3, y + 2.8); H.box(u0 - 0.45, vc + 1.4, 0.6, 0.7, 0, y - 0.3, y + 1.6);
  }

  // ================================================================ Heart-in kiosk on 3・4番のりば
  {
    const I = P.ISLANDS[1], y = P.Y.plat, u0 = -54, u1 = -47.5, vc = I.v, hw = 1.0;
    const green = mat.toon('#2f8a4f', { paint: 0.02 }), white = mat.toon('#f2f1ec', { paint: 0.02 });
    box(u0, u1, y, y + 2.35, vc - hw, vc + hw, white);
    box(u0 - 0.08, u1 + 0.08, y + 2.35, y + 2.7, vc - hw - 0.08, vc + hw + 0.08, green);
    const sign = T.draw(512, 96, (g, w, h) => { g.fillStyle = '#2f8a4f'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.font = `900 52px ${F.round}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('Heart in', w / 2 - 40, h / 2 + 2); g.fillStyle = '#f2c230'; g.beginPath(); g.arc(w / 2 + 110, h / 2, 18, 0, 6.3); g.fill(); }, { key: 'term.heartin' });
    const mags = T.draw(512, 256, (g, w, h) => {
      g.fillStyle = '#e9e6de'; g.fillRect(0, 0, w, h);
      const cols = ['#d9463b', '#2f7fc0', '#f2c230', '#3fa36b', '#e9785a', '#7a5ab0', '#1b2130', '#f7d3de'];
      for (let r = 0; r < 3; r++) for (let i = 0; i < 9; i++) { const x = 6 + i * 56, yy = 8 + r * 82; g.fillStyle = cols[(i + r * 3) % 8]; g.fillRect(x, yy, 50, 72); g.fillStyle = '#fff'; g.fillRect(x + 4, yy + 6, 42, 12); g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(x + 6, yy + 30, 30, 4); g.fillRect(x + 6, yy + 38, 36, 4); }
    }, { key: 'term.mags' });
    const fridge = T.draw(256, 256, (g, w, h) => {
      g.fillStyle = '#f6f8fa'; g.fillRect(0, 0, w, h);
      const cols = ['#e2a33b', '#6aa5d6', '#7fbf6a', '#d85f5f', '#f0d060', '#f4f2ea', '#8a5a3a'];
      for (let r = 0; r < 4; r++) { g.fillStyle = '#c9ced4'; g.fillRect(0, 58 + r * 62, w, 4); for (let i = 0; i < 9; i++) { g.fillStyle = cols[(i * 3 + r) % 7]; g.fillRect(8 + i * 27, 14 + r * 62, 18, 44); g.fillStyle = '#fff'; g.fillRect(10 + i * 27, 30 + r * 62, 14, 10); } }
    }, { key: 'term.fridge' });
    for (const s of [-1, 1]) {
      K.plane(3.0, 0.5, mat.emissive('#ffffff', 0.95, { map: sign }), [(u0 + u1) / 2, y + 2.52, vc + s * (hw + 0.085)], [0, s > 0 ? 0 : Math.PI, 0]);
      // magazine / newspaper rack (sloped) + snack shelf + the drinks fridge
      const rack = K.plane(3.2, 1.25, mat.toon('#ffffff', { map: mags, paint: 0.01 }), [u0 + 1.9, y + 1.0, vc + s * (hw + 0.2)], [-0.28 * s, s > 0 ? 0 : Math.PI, 0]); void rack;
      box(u0 + 0.3, u0 + 3.5, y, y + 0.45, vc + s * hw, vc + s * (hw + 0.35), white);
      K.box(1.3, 1.9, 0.1, M.steelD, [u1 - 1.0, y + 0.95, vc + s * (hw + 0.05)]);
      K.plane(1.2, 1.8, mat.emissive('#ffffff', 0.95, { map: fridge }), [u1 - 1.0, y + 0.95, vc + s * (hw + 0.105)], [0, s > 0 ? 0 : Math.PI, 0]);
    }
    person(8, u0 + 3.2, y, vc, -Math.PI / 2, 'stand', { top: '#2f8a4f', bottom: '#3a3f4c', hair: '#3a2e2c' });
    person(1, u0 + 1.4, y, vc + hw + 0.75, Math.PI);
    H.box((u0 + u1) / 2, vc, u1 - u0, 2 * hw + 0.6, 0, y - 0.3, y + 2.7);
  }

  // ================================================================ 551 蓬莱 in the south hall
  {
    const u0 = -34, u1 = -29.5, v0 = 38.5, v1 = 46, y = 0;
    const red = mat.toon('#c8242b', { paint: 0.02 }), white = mat.toon('#f4f2ec', { paint: 0.02 });
    box(u0, u1, y, y + 3.2, v0, v1, white);
    box(u1 - 0.05, u1 + 0.3, y + 3.0, y + 3.8, v0, v1, red);
    const sign = T.draw(1024, 160, (g, w, h) => { g.fillStyle = '#c8242b'; g.fillRect(0, 0, w, h); g.fillStyle = '#f7d24a'; g.font = `900 110px ${F.en}`; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText('551', 40, 86); g.fillStyle = '#fff'; g.font = `900 96px ${F.sans}`; g.fillText('蓬莱', 290, 86); g.font = `700 44px ${F.sans}`; g.fillText('豚まん・焼売', 560, 90); }, { key: 'term.551' });
    K.plane(v1 - v0 - 0.2, 0.75, mat.emissive('#ffffff', 0.95, { map: sign }), [u1 + 0.31, y + 3.4, (v0 + v1) / 2], [0, Math.PI / 2, 0]);
    // glass display counter with trays of buns + the steamers behind
    box(u1, u1 + 0.8, y, y + 0.95, v0 + 0.4, v1 - 0.4, white);
    K.box(0.78, 0.35, v1 - v0 - 0.9, M.glass, [u1 + 0.4, y + 1.13, (v0 + v1) / 2]);
    const bunM = mat.toon('#f6f1e4', { paint: 0.02 });
    for (let v = v0 + 0.8; v < v1 - 0.6; v += 0.22) for (const du of [0.2, 0.45]) K.sphere(0.075, bunM, [u1 + du, y + 1.0, v], 10);
    for (const v of [v0 + 1.5, (v0 + v1) / 2, v1 - 1.5]) { K.cyl(0.35, 0.35, 0.5, mat.toon('#b89668', { paint: 0.04 }), [u1 - 0.5, y + 1.2, v], null, 16); steam(u1 - 0.5, y + 1.5, v, 4); }
    for (const [i, v] of [v0 + 1.2, (v0 + v1) / 2 + 0.6, v1 - 1.4].entries()) person(9, u1 - 0.3, y, v, Math.PI / 2, 'stand', { top: '#f4f2ec', bottom: '#3a3f4c', hair: i % 2 ? '#2b2426' : '#5a4436', scarf: '#c8242b' });
    // the queue (it's always there)
    // the queue (it's always there): the first customer at the counter, the rest lined up along the wall
    person(3, u1 + 1.15, y, 41.4, -Math.PI / 2);
    for (let i = 0; i < 6; i++) person((i * 7 + 2) % 10, u1 + 1.5 + (i % 2) * 0.1, y, 42.3 + i * 0.7, Math.PI);
    H.box((u0 + u1) / 2 + 0.4, (v0 + v1) / 2, u1 - u0 + 0.8, v1 - v0, 0, -1, 3.3);
    H.box(u1 + 1.45, 44.1, 0.6, 4.4, 0, -0.5, 1.7);
  }

  // ================================================================ 駅弁 display cases (bento atlas) + the platform cart
  const bento = T.draw(512, 256, (g, w, h) => {
    const r = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
    for (let i = 0; i < 8; i++) {
      const x = (i % 4) * 128, y0 = Math.floor(i / 4) * 128;
      g.fillStyle = ['#2d2a2e', '#7a2e2a', '#f2ede2', '#2f4a36'][i % 4]; g.fillRect(x + 2, y0 + 2, 124, 124);
      g.fillStyle = '#f7f4ec'; g.fillRect(x + 10, y0 + 10, 56, 108);                       // rice
      g.fillStyle = '#b3302b'; g.beginPath(); g.arc(x + 38, y0 + 60, 8, 0, 6.3); g.fill();      // umeboshi
      g.fillStyle = '#1b1b1b'; for (let k = 0; k < 14; k++) g.fillRect(x + 14 + r() * 48, y0 + 14 + r() * 100, 2, 2);
      const side = [['#f0a58a', 26], ['#f3cf4a', 22], ['#7fb35a', 20], ['#c46a3a', 22], ['#f7f0e0', 18]];
      let yy = y0 + 10;
      for (const [c, hh] of side) { g.fillStyle = c; g.fillRect(x + 70, yy, 48, hh - 2); yy += hh; }
      g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 2; g.strokeRect(x + 9, y0 + 9, 110, 110); g.beginPath(); g.moveTo(x + 68, y0 + 9); g.lineTo(x + 68, y0 + 119); g.stroke();
    }
  }, { key: 'term.bento' });
  const bentoM = mat.toon('#ffffff', { map: bento, paint: 0.01 });
  const bentoTop = (i) => { const g = new THREE.PlaneGeometry(0.26, 0.2).rotateX(-Math.PI / 2); cellUV(g, (i % 4) * 128, Math.floor(i / 4) * 128, 128, 128, 512, 256); return g; };
  const priceTex = T.draw(256, 64, (g, w, h) => { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.fillStyle = '#b3302b'; g.font = `900 34px ${F.sans}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('幕の内 1,280円', w / 2, h / 2 + 2); }, { key: 'term.bentoPrice' });
  const bentoCase = (u, y, v, rotY, len) => {
    const g = H.group(u, y, v, rotY); const k = ctx.kit(g);
    k.box(len, 0.9, 0.7, mat.toon('#e9e4d8', { paint: 0.02 }), [0, 0.45, 0]);
    k.box(len - 0.06, 0.02, 0.64, mat.emissive('#fff4dd', 0.6), [0, 0.905, 0]);
    for (let i = 0; i < Math.floor(len / 0.32); i++) for (let row = 0; row < 2; row++) {
      const x = -len / 2 + 0.2 + i * 0.32, z = -0.15 + row * 0.28;
      k.box(0.27, 0.06, 0.21, mat.toon(['#2d2a2e', '#7a2e2a', '#f2ede2', '#2f4a36'][(i + row) % 4], { paint: 0.02 }), [x, 0.94, z]);
      k.mesh(bentoTop((i * 3 + row * 5) % 8), bentoM, [x, 0.972, z]);
    }
    k.box(len, 0.35, 0.02, M.glass, [0, 1.1, 0.34]); k.box(len, 0.02, 0.7, M.glass, [0, 1.28, 0]);
    for (let i = 0; i < 3; i++) k.plane(0.4, 0.1, mat.toon('#ffffff', { map: priceTex, paint: 0 }), [-len / 2 + 0.5 + i * (len - 1) / 2, 0.8, 0.352]);
    return g;
  };
  // in front of the two bento shops (east wall, facing -u) and the Shinkansen-side ekiben shop
  bentoCase(25.9, 0, 6.5, -Math.PI / 2, 6.5); H.box(25.9, 6.5, 0.7, 6.5, 0, -1, 1.3);
  bentoCase(25.9, 0, -38, -Math.PI / 2, 6); H.box(25.9, -38, 0.7, 6, 0, -1, 1.3);
  // a wooden ekiben cart on 13番線 (with its seller)
  {
    const S = P.S_PLATS[0], y = P.Y.platS, back = S.edge === S.v0 ? S.v1 : S.v0, v = back + (S.edge < back ? -2.2 : 2.2), u = 22;
    const cart = bentoCase(u, y, v, S.edge < back ? Math.PI : 0, 2.6);
    const k = ctx.kit(cart);
    for (const s of [-1, 1]) k.cyl(0.16, 0.16, 0.06, M.black, [s * 1.1, 0.16, 0.32], [Math.PI / 2, 0, 0], 12);
    k.box(2.7, 0.08, 0.8, mat.toon('#a8784e', { paint: 0.05 }), [0, 1.62, 0]); for (const s of [-1, 1]) k.box(0.05, 0.4, 0.05, M.steelD, [s * 1.3, 1.4, 0]);
    k.plane(2.4, 0.3, mat.toon('#ffffff', { map: T.draw(512, 64, (g, w, h) => { g.fillStyle = '#7a2e2a'; g.fillRect(0, 0, w, h); g.fillStyle = '#f4efe2'; g.font = `900 40px ${F.sans}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('駅弁  お茶  ビール', w / 2, h / 2 + 2); }, { key: 'term.cartSign' }), paint: 0 }), [0, 1.8, 0.41]);
    person(2, u, y, v + (S.edge < back ? 0.9 : -0.9), S.edge < back ? 0 : Math.PI, 'stand', { top: '#7a2e2a', scarf: '#f4efe2' });
    H.box(u, v, 2.8, 1.4, 0, y - 0.3, y + 1.4);
  }

  // ---- steam animation
  H.update((dt, t) => {
    if (!H.visible()) return;
    const cam = ctx.camera.position;
    for (const s of puffs) {
      const d = s.userData, f = ((t * 0.35 + d.ph) % 1);
      s.position.set(d.u + Math.sin(t * 0.7 + d.ph * 9) * 0.08, d.y + f * 0.9, d.v);
      s.scale.setScalar(0.4 + f * 1.1);
      s.material.opacity = 0.5;
      s.visible = f < 0.95;
      s.quaternion.copy(ctx.camera.quaternion);
      void cam;
    }
  });
  return {};
}
