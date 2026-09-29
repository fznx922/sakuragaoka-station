// Around 大阪駅: the south station building (department store over the 中央口, the big station sign), the
// north tower, the enclosed viaduct sides, the station-front plaza + road, trees, and a skyline of towers.
import * as THREE from 'three';
import * as P from './plan.js';
import { makeCloudTree } from '../lib/foliage.js';

export function buildCity(ctx, H) {
  const { root, M, tx } = H;
  const { mat } = ctx;
  const K = H.kit();
  const r = ctx.rng('terminal.city');
  const winM = tx.win.map(t => mat.toon('#ffffff', { map: t, paint: 0.03 }));
  /** vertical face from (u0,v0) to (u1,v1), y0..y1, facing the side of `out` ([du,dv]), window tile 3.6 × 4 m */
  const face = (u0, v0, u1, v1, y0, y1, m, tile = [3.6, 4]) => {
    const L = Math.hypot(u1 - u0, v1 - v0), g = new THREE.PlaneGeometry(L, y1 - y0);
    const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * L / tile[0], uv.getY(i) * (y1 - y0) / tile[1]);
    const mesh = new THREE.Mesh(g, m);
    mesh.position.set((u0 + u1) / 2, (y0 + y1) / 2, (v0 + v1) / 2);
    mesh.rotation.y = Math.atan2(v0 - v1, u1 - u0) + 0; // plane +z = right-hand normal of (u0,v0)->(u1,v1) (pass edges counter-clockwise seen from above)
    mesh.receiveShadow = true; mesh.castShadow = true; root.add(mesh); return mesh;
  };
  /** box building with window faces + a flat roof (cw from above: faces point outward) */
  const block = (u0, u1, v0, v1, y0, y1, m, roofM = M.concreteD) => {
    face(u0, v1, u1, v1, y0, y1, m); face(u1, v0, u0, v0, y0, y1, m); face(u1, v1, u1, v0, y0, y1, m); face(u0, v0, u0, v1, y0, y1, m);
    const g = new THREE.PlaneGeometry(u1 - u0, v1 - v0); g.rotateX(-Math.PI / 2);
    const rf = new THREE.Mesh(g, roofM); rf.position.set((u0 + u1) / 2, y1, (v0 + v1) / 2); rf.receiveShadow = true; root.add(rf);
    K.box(u1 - u0 + 0.4, 1.0, 0.4, M.white, [(u0 + u1) / 2, y1 + 0.5, v1]); K.box(u1 - u0 + 0.4, 1.0, 0.4, M.white, [(u0 + u1) / 2, y1 + 0.5, v0]);
  };

  // ---------------------------------------------------------------- ground, plaza, road
  const flat = (u0, u1, v0, v1, y, m, tile) => {
    const g = new THREE.PlaneGeometry(u1 - u0, v1 - v0); g.rotateX(-Math.PI / 2);
    const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (u1 - u0) / tile, uv.getY(i) * (v1 - v0) / tile);
    const mesh = new THREE.Mesh(g, m); mesh.position.set((u0 + u1) / 2, y, (v0 + v1) / 2); mesh.receiveShadow = true; root.add(mesh); return mesh;
  };
  const asphalt = mat.toon('#77797e', { paint: 0.05 });
  flat(-1600, 1600, -1600, 1600, -0.02, asphalt, 50);
  flat(-140, 140, 50, 66, 0.012, M.floor, 2.4);
  flat(-140, 140, 76, 90, 0.012, M.floor, 2.4);
  for (let u = -140; u < 140; u += 6) K.box(3, 0.01, 0.15, M.white, [u, 0.02, 71]);
  for (const v of [66.3, 75.7]) K.box(280, 0.01, 0.15, M.white, [0, 0.02, v]);
  for (const v of [66, 76]) K.box(280, 0.15, 0.3, M.concreteD, [0, 0.075, v]);
  // plaza: trees in round planters, benches, bus shelter, taxi sign
  for (const u of [-110, -86, -62, -40, 40, 62, 86, 110]) {
    K.cyl(1.6, 1.7, 0.5, M.concrete, [u, 0.25, 58], null, 20);
    const t = makeCloudTree(ctx, { h: 7 + r() * 1.5, r: 2.6, lean: 0.03, kind: 'young', seed: (u * 7) | 0 }); t.position.set(u, 0.5, 58); root.add(t);
    H.cyl(u, 58, 1.7, -1, 3);
  }
  for (const u of [-74, -50, 50, 74]) { K.box(1.8, 0.08, 0.5, M.wood, [u, 0.45, 55]); for (const s of [-1, 1]) K.box(0.08, 0.45, 0.5, M.steelD, [u + s * 0.8, 0.22, 55]); H.box(u, 55, 1.8, 0.5, 0, -1, 0.5); }
  {
    const g = H.group(24, 0, 64.5, Math.PI); const k = ctx.kit(g);
    for (const x of [-2, 2]) k.box(0.1, 2.6, 0.1, M.steelD, [x, 1.3, -0.6]);
    k.box(4.6, 0.12, 1.6, M.steel, [0, 2.65, 0]); k.box(4.2, 2.2, 0.05, M.glass, [0, 1.35, -0.7]);
    k.box(0.12, 2.8, 0.12, M.steelD, [3, 1.4, 0.6]); k.box(0.6, 0.6, 0.05, mat.toon('#ffffff', { map: tx.sign({ w: 256, h: 256, text: 'バス', bg: '#1a6fb8', key: 'bus' }), paint: 0.01 }), [3, 2.8, 0.67]);
    H.box(24, 64.5, 4.6, 1.6, 0, -1, 3);
  }

  // ---------------------------------------------------------------- the south station building (over the 中央口)
  const SB = { u0: -130, u1: 130, v0: 30.5, v1: 50, h: 31 };
  // plaza face: glass curtain above a band of shop windows; the station entrance under the canopy
  face(SB.u0, SB.v1, -34, SB.v1, 4.4, SB.h, winM[0]); face(34, SB.v1, SB.u1, SB.v1, 4.4, SB.h, winM[0]); face(-34, SB.v1 + 0.02, 34, SB.v1 + 0.02, 4.4, SB.h, winM[0]);
  face(SB.u1, SB.v0, SB.u0, SB.v0, 4.4, SB.h, winM[2]);                                     // track side
  face(SB.u1, SB.v1, SB.u1, SB.v0, 0, SB.h, winM[1]); face(SB.u0, SB.v0, SB.u0, SB.v1, 0, SB.h, winM[1]);
  { const g = new THREE.PlaneGeometry(SB.u1 - SB.u0, SB.v1 - SB.v0); g.rotateX(-Math.PI / 2); const rf = new THREE.Mesh(g, M.concreteD); rf.position.set(0, SB.h, (SB.v0 + SB.v1) / 2); root.add(rf); }
  const shop = mat.emissive('#ffe3b8', 0.75);
  for (const [a, b] of [[SB.u0, -34], [34, SB.u1]]) {
    face(a, SB.v1, b, SB.v1, 0, 4.4, M.wall, [2.4, 1.2]);
    for (let u = a + 3; u < b - 5; u += 9) { const m = K.box(7, 3.2, 0.05, shop, [u + 3.5, 1.9, SB.v1 + 0.03]); m.castShadow = false; K.box(7.4, 0.5, 1.2, M.band, [u + 3.5, 3.8, SB.v1 + 0.6]); }
    H.box((a + b) / 2, (SB.v0 + SB.v1) / 2, b - a, SB.v1 - SB.v0, 0, -1, SB.h);
  }
  K.box(SB.u1 - SB.u0, 1.2, 1.4, M.white, [0, 4.4 + 0.6, SB.v1 + 0.2]);
  // the station name over the entrance + a big clock
  {
    const T = ctx.tex, F = T.FONTS;
    const nameTex = T.draw(1024, 256, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      g.fillStyle = '#0072bc'; T.roundRect(g, 10, 60, 136, 136, 18); g.fill(); g.fillStyle = '#fff'; g.font = `italic 900 76px ${F.en}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('JR', 78, 130);
      g.fillStyle = '#f6f6f2'; g.textAlign = 'left'; g.font = `900 150px ${F.sans}`; g.fillText('大阪駅', 190, 120);
      g.font = `700 50px ${F.en}`; g.fillText('OSAKA STATION', 196, 218);
    }, { key: 'term.bigname' });
    K.box(40, 10, 0.4, M.band, [0, 21, SB.v1 + 0.25]);
    const n = K.plane(38, 9.5, mat.toon('#ffffff', { map: nameTex, transparent: true, paint: 0 }), [0, 21, SB.v1 + 0.47]); n.castShadow = false;
    const clock = T.draw(256, 256, (g, w, h) => {
      g.fillStyle = '#f6f6f2'; g.beginPath(); g.arc(w / 2, h / 2, 120, 0, 6.3); g.fill(); g.strokeStyle = '#2d3038'; g.lineWidth = 8; g.stroke();
      g.fillStyle = '#2d3038'; for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; g.fillRect(w / 2 + Math.sin(a) * 96 - 3, h / 2 - Math.cos(a) * 96 - 10, 6, 20); }
      g.lineCap = 'round'; g.lineWidth = 10; g.beginPath(); g.moveTo(w / 2, h / 2); g.lineTo(w / 2 + Math.sin(4.03 * Math.PI / 6) * 60, h / 2 - Math.cos(4.03 * Math.PI / 6) * 60); g.stroke();
      g.lineWidth = 6; g.beginPath(); g.moveTo(w / 2, h / 2); g.lineTo(w / 2 + Math.sin(0.2 * Math.PI * 2 / 6) * 92, h / 2 - Math.cos(0.2 * Math.PI * 2 / 6) * 92); g.stroke();
    }, { key: 'term.clock' });
    K.cyl(3.4, 3.4, 0.4, M.band, [30, 21, SB.v1 + 0.25], [Math.PI / 2, 0, 0], 32);
    K.plane(6.2, 6.2, mat.toon('#ffffff', { map: clock, transparent: true, paint: 0 }), [30, 21, SB.v1 + 0.47]);
  }
  // ---------------------------------------------------------------- north tower + viaduct sides
  block(-150, 150, -92, -67.8, 0, 58, winM[0]);
  for (const [v0, v1] of [[30.2, 30.6], [-67.8, -67.4]]) for (const [a, b] of [[-700, v0 > 0 ? -130 : -150], [v0 > 0 ? 130 : 150, 700]]) {
    K.box(b - a, P.Y.deck, v1 - v0, M.concreteD, [(a + b) / 2, P.Y.deck / 2, (v0 + v1) / 2]);
  }
  // ---------------------------------------------------------------- skyline
  const spots = [];
  for (let k = 0; k < 90; k++) {
    const ang = r() * Math.PI * 2, rad = 170 + r() * 650;
    const u = Math.cos(ang) * rad * 1.3, v = Math.sin(ang) * rad;
    if (v > -100 && v < 40 && Math.abs(u) < 760) continue;              // keep the rail corridor clear
    if (v > 40 && v < 100 && Math.abs(u) < 170) continue;                // and the plaza / road
    const w = 24 + r() * 26, d = 20 + r() * 24;
    if (spots.some(s => Math.abs(s.u - u) < (s.w + w) / 2 + 8 && Math.abs(s.v - v) < (s.d + d) / 2 + 8)) continue;
    spots.push({ u, v, w, d });
    const h = 35 + r() * r() * 170;
    block(u - w / 2, u + w / 2, v - d / 2, v + d / 2, 0, h, winM[(r() * 3) | 0]);
  }
}
