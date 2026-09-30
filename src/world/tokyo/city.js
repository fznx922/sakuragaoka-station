// The city around the 山手線: blocks of buildings on a polar grid either side of the viaduct (instanced per sector and
// archetype so culling works), taller in the business districts (丸の内, 品川, 渋谷, 新宿, 池袋), and the landmarks:
// 東京タワー near 浜松町, the 新宿 skyscrapers with the twin-towered 都庁, the red-brick 丸の内 station building at 東京,
// the giant screens of 渋谷 and the neon of 秋葉原.
import * as THREE from 'three';
import * as P from './plan.js';
import { arcBox } from './geo.js';

export function buildCity(ctx, H) {
  const { root, M } = H;
  const { mat } = ctx;
  const T = ctx.tex, F = T.FONTS;
  const R = P.R, TAU = Math.PI * 2;
  const rnd = (() => { let s = 9173; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
  const S = (id) => P.STATIONS.find(s => s.id === id);

  // ---- building archetypes: [width, storeys, depth, texture]; storey 4 m, window bay 3.6 m
  const win = H.tx.win;
  const ARCH = [
    { w: 9, n: 2, d: 9 }, { w: 14, n: 5, d: 12 }, { w: 20, n: 9, d: 16 }, { w: 24, n: 18, d: 22 }, { w: 30, n: 34, d: 30 },
  ];
  const archGeo = (a) => {
    const w = a.w, h = a.n * 4, d = a.d, g = new THREE.BoxGeometry(w, h, d).translate(0, h / 2, 0);
    const uv = g.attributes.uv, p = g.attributes.position, n = g.attributes.normal;
    for (let i = 0; i < uv.count; i++) {
      if (Math.abs(n.getY(i)) > 0.5) { uv.setXY(i, 0.5, 0.96); continue; }        // roof: the plain spandrel colour
      const along = Math.abs(n.getX(i)) > 0.5 ? p.getZ(i) : p.getX(i);
      uv.setXY(i, along / 3.6, p.getY(i) / 4);
    }
    return g;
  };
  const geos = ARCH.map(archGeo);
  const mats = win.map(t => mat.toon('#ffffff', { map: t, paint: 0.04 }));
  // district height: gaussian peaks around the business districts (angle), strongest near the line
  const peaks = [['JY01', 3.2], ['JY03', 1.6], ['JY07', 2.0], ['JY12', 2.4], ['JY15', 3.6], ['JY19', 2.3], ['JY27', 1.3], ['JY29', 1.6]].map(([id, a]) => ({ phi: S(id).phi, a }));
  const heightF = (phi, dr) => { let f = 0.6; for (const p of peaks) { let d = Math.abs(phi - p.phi); d = Math.min(d, TAU - d); f += p.a * Math.exp(-(d * d) / (2 * 0.07 * 0.07)); } return f * (1 - Math.min(0.5, Math.abs(dr) / 900)); };
  const SECT = 24;
  const lists = Array.from({ length: SECT }, () => ARCH.map(() => []));
  const PALETTE = ['#ffffff', '#f1ece2', '#e2e6ea', '#d9d4c8', '#cfd8e2', '#efe6dc', '#c8ccd0', '#e8e0d2'].map(c => new THREE.Color(c));
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
  for (const side of [1, -1]) {
    for (let band = 0; band < 16; band++) {
      const r = R + side * (18 + band * 30);
      if (r < 200) continue;
      const cell = 32 / r;
      for (let phi = 0; phi < TAU; phi += cell) {
        if (rnd() > 0.86) continue;
        const f = heightF(phi, r - R), hv = f * (0.35 + rnd() * 0.9);
        const ai = hv > 2.3 ? 4 : hv > 1.4 ? 3 : hv > 0.8 ? 2 : hv > 0.45 ? 1 : 0;
        const a = ARCH[ai];
        const sx = 0.85 + rnd() * 0.3, sz = 0.85 + rnd() * 0.3;
        if (a.d * sz / 2 + (ai >= 3 ? 6 : 3) > 30 / 2 + 6) continue;
        const rr = r + side * (a.d * sz) / 2;
        const ph = phi + (rnd() - 0.5) * 0.3 * cell;
        q.setFromAxisAngle(up, -ph - Math.PI / 2);
        m4.compose(new THREE.Vector3(rr * Math.cos(ph), 0, rr * Math.sin(ph)), q, new THREE.Vector3(sx, 0.9 + rnd() * 0.2, sz));
        const si = Math.floor(((ph % TAU) + TAU) % TAU / TAU * SECT) % SECT;
        lists[si][ai].push({ m: m4.clone(), c: PALETTE[Math.floor(rnd() * PALETTE.length)], t: Math.floor(rnd() * mats.length) });
      }
    }
  }
  for (let si = 0; si < SECT; si++) for (let ai = 0; ai < ARCH.length; ai++) {
    const L = lists[si][ai]; if (!L.length) continue;
    for (let ti = 0; ti < mats.length; ti++) {
      const sub = L.filter(e => e.t === ti); if (!sub.length) continue;
      const im = new THREE.InstancedMesh(geos[ai], mats[ti], sub.length);
      sub.forEach((e, i) => { im.setMatrixAt(i, e.m); im.setColorAt(i, e.c); });
      im.castShadow = ai >= 2; im.receiveShadow = true; im.computeBoundingSphere(); root.add(im);
    }
  }

  // ================================================================ landmarks
  const K = H.kit();
  // ---- 東京タワー (inside the ring, west of 浜松町): four splayed lattice legs, orange / white bands, two decks
  {
    const s = S('JY04'), phi = s.phi + 0.03, rr = R - 620, c = { u: rr * Math.cos(phi), v: rr * Math.sin(phi) };
    const g = H.group(c.u, 0, c.v, 0); const k = ctx.kit(g);
    const orange = mat.toon('#f0561f', { paint: 0.02 }), wht = mat.toon('#f4f2ee', { paint: 0.02 });
    const Ht = 250, base = 40, w = (y) => base * Math.pow(1 - y / Ht, 1.6) + 2;
    for (let y = 0; y < Ht - 20; y += 12) {
      const w0 = w(y), w1 = w(y + 12), m = Math.floor(y / 12) % 2 ? wht : orange;
      for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        const a = new THREE.Vector3(sx * w0 / 2, y, sz * w0 / 2), b = new THREE.Vector3(sx * w1 / 2, y + 12, sz * w1 / 2), d = b.clone().sub(a);
        const leg = k.box(1.4, d.length(), 1.4, m, a.clone().add(b).multiplyScalar(0.5).toArray());
        leg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
      }
      for (const [x0, z0, x1, z1] of [[-1, -1, 1, -1], [1, -1, 1, 1], [1, 1, -1, 1], [-1, 1, -1, -1]]) {
        const ww = w(y + 12) / 2, a = new THREE.Vector3(x0 * ww, y + 12, z0 * ww), b = new THREE.Vector3(x1 * ww, y + 12, z1 * ww);
        const br = k.box(a.distanceTo(b), 0.6, 0.6, m, a.clone().add(b).multiplyScalar(0.5).toArray()); br.rotation.set(0, Math.atan2(-(b.z - a.z), b.x - a.x), 0);
        const ww0 = w(y) / 2, a0 = new THREE.Vector3(x0 * ww0, y, z0 * ww0), b1 = new THREE.Vector3(x1 * ww, y + 12, z1 * ww), dd = b1.clone().sub(a0);
        const di = k.box(0.4, dd.length(), 0.4, m, a0.clone().add(b1).multiplyScalar(0.5).toArray()); di.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dd.normalize());
      }
    }
    k.box(w(75) + 6, 9, w(75) + 6, wht, [0, 79, 0]); k.box(w(75) + 7, 1.2, w(75) + 7, orange, [0, 84, 0]);
    k.box(w(125) + 4, 5, w(125) + 4, wht, [0, 125, 0]);
    k.cyl(0.6, 1.4, 40, orange, [0, Ht - 10, 0], null, 8);
    for (let i = 0; i < 4; i++) k.box(w(0) * 0.4, 18, 1.2, orange, [0, 9, 0], [0, i * Math.PI / 2, 0]);
  }
  // ---- 新宿: skyscrapers outside the ring west of 新宿, with the twin-towered 都庁
  {
    const s = S('JY15');
    const tower = (phi, rr, w, h, d, tint, crown = false) => {
      const g = new THREE.BoxGeometry(w, h, d).translate(0, h / 2, 0);
      const uv = g.attributes.uv, p = g.attributes.position, n = g.attributes.normal;
      for (let i = 0; i < uv.count; i++) { if (Math.abs(n.getY(i)) > 0.5) { uv.setXY(i, 0.5, 0.96); continue; } const along = Math.abs(n.getX(i)) > 0.5 ? p.getZ(i) : p.getX(i); uv.setXY(i, along / 3.6, p.getY(i) / 4); }
      const m = new THREE.Mesh(g, mat.toon(tint, { map: win[1], paint: 0.03 }));
      m.position.set(rr * Math.cos(phi), 0, rr * Math.sin(phi)); m.rotation.y = -phi - Math.PI / 2; m.castShadow = true; m.receiveShadow = true; root.add(m);
      if (crown) { const c = new THREE.Mesh(new THREE.BoxGeometry(w * 0.7, 14, d * 0.7), mat.toon('#c9ced4', { paint: 0.02 })); c.position.set(0, h + 7, 0); m.add(c); }
      return m;
    };
    const base = s.phi, rr0 = R + 260;
    [[-0.05, 0, 44, 210, 36, '#e6e8ea', true], [-0.02, 40, 38, 180, 38, '#dfe6ee'], [0.015, 20, 40, 230, 40, '#e9e4dc', true], [0.05, 60, 36, 160, 36, '#d8dde3'],
      [-0.03, 150, 30, 140, 30, '#eef0f2'], [0.03, 170, 34, 190, 34, '#e2e8ee'], [0.07, 110, 30, 120, 30, '#e6e1d8']].forEach(([dp, dr, w, h, d, c, cr]) => tower(base + dp, rr0 + dr, w, h, d, c, cr));
    // 都庁: two towers on a common base, the twin crowns
    const tphi = base - 0.085, trr = rr0 + 140;
    const g = H.group(trr * Math.cos(tphi), 0, trr * Math.sin(tphi), -tphi - Math.PI / 2); const k = ctx.kit(g);
    const stone = mat.toon('#cfcbc2', { paint: 0.04 });
    k.box(110, 130, 42, stone, [0, 65, 0]);
    for (const x of [-26, 26]) { k.box(30, 110, 30, stone, [x, 185, 0]); k.box(22, 20, 22, stone, [x, 250, 0], [0, Math.PI / 4, 0]); }
    for (let y = 8; y < 240; y += 8) for (const x of [-26, 26]) if (y > 130) k.box(30.3, 1.2, 30.3, mat.toon('#8e98a6', { paint: 0.02 }), [x, y, 0]);
    for (let y = 8; y < 130; y += 8) k.box(110.3, 1.2, 42.3, mat.toon('#8e98a6', { paint: 0.02 }), [0, y, 0]);
  }
  // ---- 丸の内 station building (red brick, white bands, the two domes) along the inside of the ring at 東京
  {
    const s = S('JY01'), r0 = R - 70, r1 = R - 48, half = 170 / R;
    const brick = mat.toon('#b5553f', { paint: 0.06 }), stone = mat.toon('#efe9dc', { paint: 0.03 }), slate = mat.toon('#4a4e58', { paint: 0.03 });
    root.add(Object.assign(new THREE.Mesh(arcBox(r0, r1, s.phi - half, s.phi + half, 0, 14, { maxLen: 8 }), brick), { castShadow: true, receiveShadow: true }));
    for (const y of [4.2, 8.6, 13.2]) root.add(Object.assign(new THREE.Mesh(arcBox(r0 - 0.15, r1 + 0.15, s.phi - half, s.phi + half, y, y + 0.5, { maxLen: 8 }), stone), { receiveShadow: true }));
    root.add(Object.assign(new THREE.Mesh(arcBox(r0 + 2, r1 - 2, s.phi - half, s.phi + half, 14, 17.5, { maxLen: 8 }), slate), { castShadow: true }));
    for (const dp of [-half * 0.82, half * 0.82, 0]) {
      const phi = s.phi + dp, rr = (r0 + r1) / 2, c = { u: rr * Math.cos(phi), v: rr * Math.sin(phi) };
      const g = H.group(c.u, 0, c.v, -phi - Math.PI / 2); const k = ctx.kit(g);
      k.box(26, 22, 26, brick, [0, 11, 0]); for (const y of [7, 14, 21]) k.box(26.4, 0.6, 26.4, stone, [0, y, 0]);
      if (dp) { k.cyl(10, 12, 6, slate, [0, 25, 0], null, 8); const dome = new THREE.Mesh(new THREE.SphereGeometry(10.5, 16, 8, 0, TAU, 0, Math.PI / 2), slate); dome.position.set(0, 28, 0); dome.scale.set(1, 0.8, 1); g.add(dome); }
      else k.box(18, 8, 18, slate, [0, 26, 0]);
    }
    // windows: a lit strip texture along both facades
    const wtex = T.draw(128, 64, (g, w, h) => { g.fillStyle = '#b5553f'; g.fillRect(0, 0, w, h); g.fillStyle = '#efe9dc'; for (const x of [16, 72]) { g.fillRect(x - 3, 10, 42, 46); } g.fillStyle = '#3a4a5c'; for (const x of [16, 72]) g.fillRect(x, 13, 36, 40); }, { key: 'tokyo.brickwin', repeat: [1, 1] });
    for (const rr of [r0 - 0.02, r1 + 0.02]) for (const y0 of [5, 9.5]) {
      const geo = arcBox(rr - 0.01, rr + 0.01, s.phi - half + 0.004, s.phi + half - 0.004, y0, y0 + 3.2, { tile: 5, maxLen: 8 });
      const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) > y0 / 5 + 0.3 ? 1 : 0);
      root.add(new THREE.Mesh(geo, mat.toon('#ffffff', { map: wtex, paint: 0.03 })));
    }
  }
  // ---- 渋谷: giant screens on the buildings facing the line; 秋葉原: vertical neon signs
  {
    const screen = (i, txt, sub, c1, c2) => T.draw(512, 288, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, c1); gr.addColorStop(1, c2); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(255,255,255,0.15)'; for (let k = 0; k < 8; k++) { g.beginPath(); g.arc(60 + k * 60, 80 + (k % 3) * 60, 30 + k * 4, 0, 6.3); g.fill(); } g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; T.fitText(g, txt, w / 2, h * 0.5, w - 40, 72, F.sans, 900); g.font = `700 28px ${F.en}`; g.fillText(sub, w / 2, h * 0.78); }, { key: 'tokyo.screen' + i });
    const s = S('JY12');
    [['SHIBUYA', 'スクランブル交差点', '#e9366b', '#3a2a8a'], ['春の新作', 'NEW MUSIC · 4.1', '#1fb5c9', '#20306a'], ['渋谷 109', 'FASHION', '#f29a2e', '#b3302b']].forEach(([a, b, c1, c2], i) => {
      const phi = s.phi + (i - 1) * 0.022, rr = R + 34 + i * 6;
      const g = H.group(rr * Math.cos(phi), 0, rr * Math.sin(phi), -phi - Math.PI / 2); const k = ctx.kit(g);
      k.box(26, 36, 20, mat.toon('#dcdfe3', { map: win[2], paint: 0.03 }), [0, 18, -10]);   // the building sits away from the line …
      k.box(18.5, 10.8, 0.4, M.black, [0, 26, 0.2]);
      k.plane(18, 10.1, mat.emissive('#ffffff', 1.2, { map: screen(i, a, b, c1, c2) }), [0, 26, 0.41]);   // … its screen faces the line
    });
    const ak = S('JY29');
    const neon = (txt, c) => T.draw(96, 384, (g, w, h) => { g.fillStyle = '#12141a'; g.fillRect(0, 0, w, h); g.strokeStyle = c; g.lineWidth = 6; g.strokeRect(6, 6, w - 12, h - 12); g.fillStyle = c; g.font = `900 60px ${F.sans}`; g.textAlign = 'center'; g.textBaseline = 'middle'; [...txt].forEach((ch, j) => g.fillText(ch, w / 2, 54 + j * 70)); }, { key: 'tokyo.neon' + txt });
    [['アニメ', '#ff4fa0'], ['ゲーム', '#4fd8ff'], ['電気街', '#ffe04f'], ['メイド', '#ff9a3a'], ['ホビー', '#8cff6a']].forEach(([t, c], i) => {
      const phi = ak.phi + (i - 2) * 0.011, rr = R + (i % 2 ? -1 : 1) * (28 + i * 3), out = rr > R;
      const g = H.group(rr * Math.cos(phi), 0, rr * Math.sin(phi), -phi - Math.PI / 2 + (out ? 0 : Math.PI)); const k = ctx.kit(g);
      k.box(14, 28, 14, mat.toon('#d6d2cc', { map: win[0], paint: 0.03 }), [0, 14, -7]);
      k.plane(2.4, 9.6, mat.emissive('#ffffff', 1.3, { map: neon(t, c) }), [4, 18, 0.05]);
    });
  }
  return {};
}
