// 稲荷山 lower precinct: 表参道 with 一の鳥居 / 二の鳥居, stone lanterns and cherry trees, the grand stairs,
// 楼門 (two-storey gate) with the key / jewel guardian foxes, 手水舎, 外拝殿 (open hall with golden hanging
// lanterns), 本殿 (流造) on its stone terrace, the back stairs and the 千本鳥居 entrance plaza.
// Buildings face west (rotY = -PI/2: kit +z = west = -u, kit +x = +v).
import * as THREE from 'three';
import * as P from './plan.js';
import { greatTorii, VERM } from './torii.js';
import { irimoya, gableRoof } from './arch.js';
import { materials, lantern, foxOnPedestal, saisen, bell, signpost, shimenawa, emaRack, sub, kitOf, miniTorii } from './props.js';
import { makeTree } from '../sakura/tree.js';
import { createSakuraTextures } from '../sakura/textures.js';
import { sharedSakuraMaterials } from '../sakura/materials.js';
import { createNoise } from '../sakura/util.js';

const W = -Math.PI / 2; // facing west

export function buildShrine(ctx, H) {
  const { mat, L } = ctx;
  const { tx } = H;
  const M = materials(ctx, tx);
  const excl = []; // rectangles (u0,u1,v0,v1) the forest keeps clear of
  const roofM = { top: M.roofBark, under: M.roofUnder, edge: M.roofEdge, gable: M.verm, ridge: M.roofEdge };
  const place = (u, y, v, rotY = 0) => H.group(u, y, v, rotY);
  /** kit collider helpers for a frame (u, v, rotY) */
  const frame = (u, v, rotY) => ({
    box: (x, z, w, d, y0, y1) => { const p = H.at(u, v, rotY, x, z); H.box(p.u, p.v, w, d, rotY, y0, y1); },
    cyl: (x, z, r, y0, y1) => { const p = H.at(u, v, rotY, x, z); H.cyl(p.u, p.v, r, y0, y1); },
    walk: (x, z, w, d, top) => { const p = H.at(u, v, rotY, x, z); H.walk(p.u, p.v, w, d, rotY, top); },
  });

  // ================================================================ approach (表参道)
  // 社号標
  {
    const g = place(1.5, 0, -6.2, W); const k = H.kit(g);
    k.box(0.9, 0.25, 0.9, M.stoneD, [0, 0.125, 0]);
    k.box(0.52, 3.1, 0.52, M.stone, [0, 0.25 + 1.55, 0]);
    k.mesh(new THREE.CylinderGeometry(0.02, 0.37, 0.14, 4).rotateY(Math.PI / 4), M.stone, [0, 3.42, 0]);
    k.plane(0.36, 2.7, mat.decal('#ffffff', { map: tx.engrave('稲荷山大社', 'shagou'), transparent: true }), [0, 1.85, 0.262]);
    H.box(1.5, -6.2, 0.9, 0.9, 0, -1, 3.5);
  }
  // great torii
  for (const [u, o] of [[6, { span: 9.4, h: 10.6, r: 0.52, gaku: tx.gaku('稲荷山', 'ichi', 128, 224) }], [36, { span: 7.4, h: 8.4, r: 0.42, gaku: tx.gaku('稲荷大神', 'ni', 128, 256) }]]) {
    const g = place(u, 0, 0, W); const k = H.kit(g);
    greatTorii(ctx, k, o);
    for (const s of [-1, 1]) H.cyl(u, s * o.span / 2, o.r * 1.2, -1, o.h);
    excl.push({ u0: u - 3, u1: u + 3, v0: -8, v1: 8 });
  }
  // stone lantern pairs + red nobori along the approach
  const nob = [tx.nobori('正一位稲荷大明神', '稲荷講', 'a'), tx.nobori('稲荷大神', '有志一同', 'b'), tx.nobori('正一位稲荷大明神', '門前町会', 'c')];
  for (let u = 12, i = 0; u < 52; u += 6.5, i++) {
    for (const s of [-1, 1]) {
      if (Math.abs(u - 36) < 2.5) continue;
      const g = place(u, 0, s * 5.7, s < 0 ? 0 : Math.PI); lantern(H.kit(g), M, 1.15);
      H.cyl(u, s * 5.7, 0.42, -1, 2.4);
      if (i % 2 === 0) {
        const n = place(u + 3.2, 0, s * 5.2, W); const k = H.kit(n);
        k.cyl(0.02, 0.02, 3.4, M.woodL, [0, 1.7, 0], null, 6); k.cyl(0.012, 0.012, 0.44, M.woodL, [0.2, 3.3, 0], [0, 0, Math.PI / 2], 6);
        const sheet = new THREE.PlaneGeometry(0.42, 1.7);
        const fm = mat.toon('#ffffff', { map: nob[(i / 2 + (s > 0 ? 1 : 0)) % 3], paint: 0.02, side: 'double' });
        k.mesh(sheet, fm, [0.21, 3.28 - 0.85, 0]).castShadow = true;
      }
    }
  }

  // ================================================================ grand stairs + retaining wall (u 55 … 62.6)
  {
    const pr = P.flatById('precinct');
    const g = place(0, 0, 0); const k = H.kit(g);
    for (const s of [-1, 1]) {
      const v0 = s * 4.25, v1 = s * (pr.v1 + 1.2), vc = (v0 + v1) / 2, len = Math.abs(v1 - v0);
      k.box(1.6, 2.9, len, M.stoneD, [61.5, 1.15, vc]);                                   // wall
      k.box(1.7, 0.16, len, M.stone, [61.55, 2.48, vc]);                                  // coping
      H.box(61.5, vc, 1.6, len, 0, -1, 2.35);
      // 玉垣 fence on top
      const n = Math.round(len / 1.2);
      for (let i = 0; i <= n; i++) k.box(0.14, 0.8, 0.14, M.stone, [61.9, 2.55 + 0.4, v0 + (v1 - v0) * i / n]);
      for (const y of [2.85, 3.25]) k.box(0.07, 0.07, len, M.stone, [61.9, y, vc]);
      H.box(61.9, vc, 0.3, len, 0, 2.2, 3.4);
      // stair cheek walls (袖壁), sloped
      const cheek = new THREE.BufferGeometry();
      const x0 = 55.0, x1 = 62.4, zc = s * 4.4, t = 0.36;
      const ptsL = [[x0, -0.3, zc - t / 2], [x1, -0.3, zc - t / 2], [x1, 2.75, zc - t / 2], [x0, 0.35, zc - t / 2]];
      const ext = ctx.geo.extrude(ptsL.map(p => [p[0], p[1]]), t).translate(0, 0, zc);
      k.mesh(ext, M.stoneD, [0, 0, 0]);
      void cheek;
      H.box((x0 + x1) / 2, zc, x1 - x0, t, 0, -1, 2.6);
    }
    excl.push({ u0: 50, u1: 64, v0: -34, v1: 34 });
  }

  // ================================================================ precinct (境内, y = 2.4)
  const Y = P.flatById('precinct').y;
  excl.push({ u0: 60, u1: 133, v0: -31, v1: 31 });

  // ---------------------------------------------------------------- 楼門
  {
    const U = 72, g = place(U, Y, 0, W); const k = H.kit(g); const C = frame(U, 0, W);
    const BW = 13.2, BD = 6.0;
    k.box(BW + 1.6, 0.5, BD + 1.6, M.stoneD, [0, 0.25, 0]);
    C.walk(0, 0, BW + 1.6, BD + 1.6, Y + 0.5);
    for (const s of [-1, 1]) { k.box(5, 0.25, 0.8, M.stone, [0, 0.125, s * (BD / 2 + 1.2)]); C.walk(0, s * (BD / 2 + 1.2), 5, 0.8, Y + 0.25); }
    const xs = [-6.3, -2.1, 2.1, 6.3], zs = [-2.6, 0, 2.6];
    const y0 = 0.5, colH = 4.3;
    for (const x of xs) for (const z of zs) {
      if (z === 0 && Math.abs(x) < 3) continue;
      k.cyl(0.29, 0.31, colH, M.verm, [x, y0 + colH / 2, z], null, 18);
      k.cyl(0.36, 0.38, 0.22, M.stone, [x, y0 + 0.11, z], null, 18);
      C.cyl(x, z, 0.34, Y, Y + 5);
    }
    // side bays: back half plaster wall, front half vermilion lattice with a guardian (随身) behind
    for (const s of [-1, 1]) {
      const xc = s * 4.2;
      k.box(4.0, colH - 0.5, 0.22, M.plaster, [xc, y0 + 0.25 + (colH - 0.5) / 2, 0]);
      k.box(4.0, 0.5, 0.26, M.verm, [xc, y0 + 0.25, 2.6]);
      for (let i = 0; i < 13; i++) k.box(0.07, 2.6, 0.07, M.verm, [xc - 1.9 + i * 0.316, y0 + 0.5 + 1.3, 2.6]);
      for (const yy of [0.5, 3.1]) k.box(4.0, 0.12, 0.12, M.verm, [xc, y0 + yy, 2.6]);
      // seated guardian: robe, face, black cap, bow
      const gg = sub(k, xc, y0, 1.2); const kk = kitOf(gg);
      kk.box(1.3, 0.7, 1.0, M.woodD, [0, 0.35, 0]);
      kk.mesh(new THREE.CylinderGeometry(0.34, 0.62, 1.2, 12), mat.toon(s < 0 ? '#3f5e8c' : '#8c3f3f', { paint: 0.04 }), [0, 1.3, 0]);
      kk.sphere(0.2, M.white, [0, 2.05, 0.02], 12);
      kk.box(0.26, 0.3, 0.3, M.ink, [0, 2.3, -0.02]); kk.box(0.05, 0.5, 0.05, M.ink, [0, 2.45, -0.18], [0.5, 0, 0]);
      kk.cyl(0.02, 0.02, 1.6, M.woodL, [s * 0.35, 1.5, 0.3], [0, 0, 0.2 * s], 6);
      C.box(xc, 0, 4.2, 5.6, Y, Y + 4.8);
    }
    // head ties + bracket band
    const yT = y0 + colH;
    for (const z of [-2.6, 2.6]) { k.box(BW + 0.9, 0.42, 0.34, M.verm, [0, yT - 0.2, z]); k.box(BW + 0.4, 0.2, 0.3, M.white, [0, yT + 0.1, z]); }
    for (const x of [-6.3, 6.3]) k.box(0.34, 0.42, BD + 0.6, M.verm, [x, yT - 0.2, 0]);
    for (let i = 0; i < 18; i++) for (const z of [-2.8, 2.8]) k.box(0.32, 0.36, 0.5, i % 2 ? M.verm : M.copper, [-6.8 + i * 0.8, yT + 0.4, z]);
    // balcony (縁) + railing (高欄)
    const yB = yT + 0.7;
    k.box(BW + 2.2, 0.24, BD + 2.2, M.verm, [0, yB, 0]);
    k.box(BW + 2.1, 0.12, BD + 2.1, M.woodD, [0, yB + 0.17, 0]);
    const rail = (len, cx, cz, rot) => {
      const rg = sub(k, cx, yB + 0.23, cz, rot); const rk = kitOf(rg);
      for (let i = 0; i <= Math.round(len / 1.3); i++) rk.box(0.1, 0.9, 0.1, M.verm, [-len / 2 + i * len / Math.round(len / 1.3), 0.45, 0]);
      rk.box(len, 0.08, 0.1, M.black, [0, 0.9, 0]); rk.box(len, 0.07, 0.07, M.verm, [0, 0.5, 0]); rk.box(len, 0.06, 0.06, M.verm, [0, 0.15, 0]);
    };
    rail(BW + 2.0, 0, (BD + 2.0) / 2, 0); rail(BW + 2.0, 0, -(BD + 2.0) / 2, 0); rail(BD + 2.0, (BW + 2.0) / 2, 0, Math.PI / 2); rail(BD + 2.0, -(BW + 2.0) / 2, 0, Math.PI / 2);
    // upper storey
    const yU = yB + 0.25, uh = 2.7;
    for (const x of xs) for (const z of [-2.4, 2.4]) k.cyl(0.25, 0.26, uh, M.verm, [x, yU + uh / 2, z], null, 16);
    for (const z of [-2.35, 2.35]) for (const xc of [-4.2, 4.2]) k.box(3.9, uh - 0.5, 0.2, M.plaster, [xc, yU + uh / 2, z]);
    for (const z of [-2.35, 2.35]) { k.box(3.9, uh - 0.3, 0.16, M.woodD, [0, yU + (uh - 0.3) / 2, z]); for (let i = 0; i < 9; i++) k.box(0.04, uh - 0.4, 0.2, M.gold, [-1.8 + i * 0.45, yU + (uh - 0.4) / 2, z]); }
    for (const x of [-6.3, 6.3]) k.box(0.2, uh - 0.5, 4.7, M.plaster, [x, yU + uh / 2, 0]);
    for (const z of [-2.4, 2.4]) k.box(BW + 0.7, 0.36, 0.32, M.verm, [0, yU + uh, z]);
    for (let i = 0; i < 20; i++) for (const z of [-2.65, 2.65]) k.box(0.34, 0.4, 0.6, i % 2 ? M.verm : M.copper, [-7.6 + i * 0.8, yU + uh + 0.38, z]);
    // plaque
    k.box(2.6, 0.95, 0.12, M.black, [0, yU + uh - 0.2, 2.95]);
    k.plane(2.4, 0.78, mat.toon('#ffffff', { map: tx.plaqueH('稲荷山', 'romon'), paint: 0.01 }), [0, yU + uh - 0.2, 3.015]);
    // roof
    const yE = yU + uh + 0.6;
    irimoya(k, { w: BW, d: BD - 1.0, y: yE, h: 5.6, o: 2.5, t: 0.42, ridge: 0.52, brk: 0.52, flare: 0.5, mats: roofM });
    H.box(U, 0, BD + 1, BW + 2, W, Y + 5.2, Y + 14);
    // guardian foxes
    for (const s of [-1, 1]) {
      const v = s * 6.6, u = 64.4;
      const fg = place(u, Y, v, Math.atan2(-1, -s * 0.28)); foxOnPedestal(H.kit(fg), M, s < 0 ? 'key' : 'jewel', 1.8, 2.4);
      H.box(u, v, 1.25, 1.25, 0, Y - 1, Y + 4);
    }
    // lanterns inside the precinct along the axis
    for (const u of [80, 86, 102]) for (const s of [-1, 1]) { const lg = place(u, Y, s * 5.4, s < 0 ? 0 : Math.PI); lantern(H.kit(lg), M, 1.05, u > 90); H.cyl(u, s * 5.4, 0.4, Y - 1, Y + 2.2); }
  }

  // ---------------------------------------------------------------- 手水舎 (purification pavilion)
  {
    const U = 81, V = 14.5, g = place(U, Y, V, Math.PI); const k = H.kit(g); const C = frame(U, V, Math.PI);
    k.box(4.4, 0.18, 3.2, M.stoneD, [0, 0.09, 0]);
    for (const x of [-1.8, 1.8]) for (const z of [-1.2, 1.2]) { k.cyl(0.14, 0.15, 2.9, M.verm, [x, 0.18 + 1.45, z], null, 12); C.cyl(x, z, 0.18, Y, Y + 3); }
    k.box(2.6, 0.75, 1.1, M.stone, [0, 0.18 + 0.375, 0]);
    k.box(2.3, 0.02, 0.85, mat.toon('#9cc3cc', { paint: 0.02 }), [0, 0.18 + 0.72, 0]);
    for (let i = 0; i < 5; i++) k.cyl(0.004, 0.004, 0.55, M.woodL, [-0.8 + i * 0.4, 0.98, 0.35], [1.3, 0, 0], 4);
    for (let i = 0; i < 5; i++) k.cyl(0.035, 0.03, 0.07, M.woodL, [-0.8 + i * 0.4, 0.97, 0.12], null, 10);
    // bronze fox spout
    const fg = sub(k, 0, 0.93, -0.35, 0); const fk = kitOf(fg); fk.box(0.3, 0.2, 0.3, M.bronzeD, [0, 0.1, 0]);
    const fx = sub(fk, 0, 0.2, 0); import_fox(fx, M);
    C.box(0, 0, 2.7, 1.2, Y, Y + 0.95);
    for (const z of [-1.2, 1.2]) k.box(4.4, 0.2, 0.2, M.verm, [0, 3.0, z]);
    for (const x of [-1.8, 1.8]) k.box(0.2, 0.2, 2.8, M.verm, [x, 3.0, 0]);
    gableRoof(k, { w: 5.4, zF: 2.4, zB: -2.4, yF: 3.05, yB: 3.05, yR: 4.5, zR: 0, t: 0.25, flare: 0.15, mats: roofM, gable: { x: 1.9, y: 3.1 } });
    excl.push({ u0: U - 4, u1: U + 4, v0: V - 3.5, v1: V + 3.5 });
  }

  // ---------------------------------------------------------------- 外拝殿 (open worship hall)
  {
    const U = 94, g = place(U, Y, 0, W); const k = H.kit(g); const C = frame(U, 0, W);
    const BW = 16, BD = 10;
    k.box(BW + 1.0, 0.35, BD + 1.0, M.stoneD, [0, 0.175, 0]); C.walk(0, 0, BW + 1.0, BD + 1.0, Y + 0.35);
    k.box(BW, 0.25, BD, M.wood, [0, 0.475, 0]); C.walk(0, 0, BW, BD, Y + 0.6);
    const xs = [-7.5, -4.5, -1.5, 1.5, 4.5, 7.5], zs = [-4.6, 4.6];
    for (const x of xs) for (const z of zs) { k.cyl(0.24, 0.25, 4.4, M.verm, [x, 0.6 + 2.2, z], null, 16); C.cyl(x, z, 0.28, Y, Y + 5); }
    for (const x of [-7.5, 7.5]) { k.cyl(0.24, 0.25, 4.4, M.verm, [x, 2.8, 0], null, 16); C.cyl(x, 0, 0.28, Y, Y + 5); }
    for (const z of zs) { k.box(BW + 0.8, 0.4, 0.32, M.verm, [0, 5.0, z]); k.box(BW + 0.3, 0.18, 0.28, M.white, [0, 5.29, z]); }
    for (const x of [-7.5, 7.5]) k.box(0.32, 0.4, BD + 0.6, M.verm, [x, 5.0, 0]);
    for (let i = 0; i < 21; i++) for (const z of [-4.8, 4.8]) k.box(0.32, 0.34, 0.5, i % 2 ? M.verm : M.copper, [-8 + i * 0.8, 5.55, z]);
    // ceiling (coffered look)
    k.box(BW - 0.4, 0.1, BD - 0.4, M.woodD, [0, 5.25, 0]);
    // golden hanging lanterns (釣灯籠) under the eaves
    const hang = (x, z) => {
      const hg = sub(k, x, 5.2, z); const hk = kitOf(hg);
      hk.cyl(0.006, 0.006, 0.9, M.ink, [0, -0.45, 0], null, 4);
      hk.mesh(new THREE.CylinderGeometry(0.06, 0.34, 0.22, 6), M.gold, [0, -1.0, 0]);
      hk.cyl(0.24, 0.24, 0.5, M.lampGlow, [0, -1.35, 0], null, 6);
      for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + Math.PI / 6; hk.box(0.04, 0.5, 0.04, M.gold, [Math.sin(a) * 0.25, -1.35, Math.cos(a) * 0.25], [0, a, 0]); }
      hk.cyl(0.3, 0.2, 0.08, M.gold, [0, -1.64, 0], null, 6);
      hk.cyl(0.03, 0.03, 0.14, M.gold, [0, -1.75, 0], null, 6);
    };
    for (let i = 0; i < 7; i++) hang(-6.75 + i * 2.25, 5.35);
    for (let i = 0; i < 3; i++) for (const x of [-8.25, 8.25]) hang(x, -2.5 + i * 2.5);
    // offering box + bells at the back (facing the honden) and front
    const sb = sub(k, 0, 0.6, 2.2); saisen(ctx, kitOf(sb), M, 3.2, tx.saisen);
    irimoya(k, { w: BW, d: BD, y: 5.8, h: 5.2, o: 2.2, t: 0.4, ridge: 0.58, brk: 0.5, flare: 0.45, mats: roofM });
    excl.push({ u0: U - 8, u1: U + 8, v0: -12, v1: 12 });
  }

  // ---------------------------------------------------------------- 本殿 on its terrace
  {
    const tU0 = 106, tU1 = 129, tV = 13;
    const g0 = place(0, Y, 0); const k0 = H.kit(g0);
    k0.box(tU1 - tU0, 0.24, 2 * tV, M.stoneD, [(tU0 + tU1) / 2, 0.12, 0]);
    k0.box(tU1 - tU0 - 1.2, 0.24, 2 * tV - 1.2, M.stone, [(tU0 + tU1) / 2, 0.36, 0]);
    H.walk((tU0 + tU1) / 2, 0, tU1 - tU0, 2 * tV, 0, Y + 0.24);
    H.walk((tU0 + tU1) / 2, 0, tU1 - tU0 - 1.2, 2 * tV - 1.2, 0, Y + 0.48);
    const T = Y + 0.48;
    const U = 118.5, g = place(U, T, 0, W); const k = H.kit(g); const C = frame(U, 0, W);
    // raised body: 5 bays × 3, floor at +2.0
    const BW = 15, BD = 8, FY = 2.0;
    k.box(BW + 2.4, 0.2, BD + 2.2, M.verm, [0, FY, 0.2]);
    k.box(BW + 2.3, 0.1, BD + 2.1, M.woodD, [0, FY + 0.14, 0.2]);
    const xs = [-7.5, -4.5, -1.5, 1.5, 4.5, 7.5];
    for (const x of xs) for (const z of [-4, 0, 4]) {
      k.cyl(0.26, 0.27, FY + 4.0, M.verm, [x, (FY + 4.0) / 2, z], null, 16);
      if (z === 4) continue;
    }
    for (const x of xs) k.cyl(0.18, 0.18, FY, M.verm, [x, FY / 2, 5.3], null, 10);
    // walls: white panels between the columns (back and sides), gilded doors on the front
    for (let i = 0; i < 5; i++) {
      const xc = -6 + i * 3;
      k.box(2.7, 3.7, 0.2, M.plaster, [xc, FY + 2.0, -4]);
      k.box(2.7, 3.7, 0.2, M.woodD, [xc, FY + 2.0, 4]);
      k.box(0.05, 3.5, 0.24, M.gold, [xc, FY + 2.0, 4]);
      for (const y of [FY + 0.6, FY + 3.3]) k.box(2.6, 0.06, 0.24, M.gold, [xc, y, 4]);
      for (const s of [-1, 1]) k.sphere(0.07, M.gold, [xc + s * 0.25, FY + 1.9, 4.12], 8);
    }
    for (const x of [-7.5, 7.5]) for (const zc of [-2, 2]) k.box(0.2, 3.7, 3.7, M.plaster, [x, FY + 2.0, zc]);
    for (const z of [-4, 4]) { k.box(BW + 0.9, 0.42, 0.36, M.verm, [0, FY + 4.1, z]); k.box(BW + 0.4, 0.2, 0.3, M.white, [0, FY + 4.42, z]); }
    for (let i = 0; i < 20; i++) for (const z of [-4.25, 4.25]) k.box(0.3, 0.34, 0.5, i % 2 ? M.verm : M.copper, [-7.6 + i * 0.8, FY + 4.7, z]);
    // veranda railing + front stairs (walkable up to the veranda)
    for (let i = 0; i <= 12; i++) { const x = -BW / 2 - 1 + i * (BW + 2) / 12; if (Math.abs(x) < 2.6) continue; k.box(0.1, 0.8, 0.1, M.verm, [x, FY + 0.6, 5.2]); }
    for (const s of [-1, 1]) k.box((BW + 2) / 2 - 2.6, 0.08, 0.1, M.black, [s * ((BW + 2) / 4 + 1.3), FY + 1.0, 5.2]);
    const nS = 12, stW = 5.2;
    for (let i = 0; i < nS; i++) k.box(stW, (i + 1) * FY / nS, 0.36, M.wood, [0, (i + 1) * FY / nS / 2, 5.4 + (nS - i) * 0.36 - 0.18]);
    for (const s of [-1, 1]) { const ch = ctx.geo.extrude([[5.4, 0], [5.4 + nS * 0.36, 0], [5.4, FY + 0.9]].map(p => [p[0], p[1]]), 0.14); k.mesh(ch.rotateY(-Math.PI / 2), M.verm, [s * (stW / 2 + 0.07), 0, 0]); }
    { const p = H.at(U, 0, W, 0, 5.4 + nS * 0.36 / 2); ctx.physics.addStairs(P.ORIGIN.x + p.u, P.ORIGIN.z + p.v, stW, nS * 0.36, W + Math.PI, T, T + FY, nS); }
    C.walk(0, 0.6, BW + 2.3, BD + 2.1 + 1.0, T + FY + 0.19);
    C.box(0, -0.1, BW + 0.3, BD + 0.2, T + FY + 0.15, T + 12);
    for (const x of xs) C.cyl(x, 5.3, 0.22, T, T + FY);
    for (const x of [-9.4, 9.4]) C.box(x, 0.2, 0.3, BD + 2.2, T, T + FY + 1.2);
    C.box(0, -5.3, BW + 2.4, 0.3, T, T + FY + 1.2);
    // bells + offering box at the foot of the stairs
    for (const x of [-1.5, 0, 1.5]) { const bg = sub(k, x, FY + 4.0, 5.6); bell(kitOf(bg), M, FY + 4.0 - 0.3); }
    const sb = sub(k, 0, 0, 10.8); saisen(ctx, kitOf(sb), M, 3.6, tx.saisen); C.box(0, 10.8, 3.8, 0.9, T, T + 0.8);
    // 流造 roof: long front slope over the stairs
    gableRoof(k, { w: BW + 3.4, zF: 10.2, zB: -6.2, yF: FY + 3.7, yB: FY + 4.6, yR: FY + 9.2, zR: -0.8, t: 0.45, flare: 0.45, mats: roofM, gable: { x: 7.7, y: FY + 4.3 } });
    // plaque + shimenawa
    k.box(1.6, 0.9, 0.1, M.black, [0, FY + 4.9, 4.55]);
    k.plane(1.45, 0.78, mat.toon('#ffffff', { map: tx.plaqueH('稲荷大神', 'honden'), paint: 0.01 }), [0, FY + 4.9, 4.61]);
    shimenawa(k, M, [-3.2, FY + 3.85, 4.5], [3.2, FY + 3.85, 4.5], 0.35, 0.09, 5);
    // guardian foxes before the terrace
    for (const s of [-1, 1]) { const fg = place(104.2, Y, s * 5.2, Math.atan2(-1, -s * 0.25)); foxOnPedestal(H.kit(fg), M, s < 0 ? 'scroll' : 'rice', 1.5, 1.9); H.box(104.2, s * 5.2, 1.0, 1.0, 0, Y - 1, Y + 3); }
    excl.push({ u0: tU0 - 1, u1: tU1 + 1, v0: -tV - 1, v1: tV + 1 });
  }

  // ---------------------------------------------------------------- back of the precinct: ema rack, benches, back stairs
  {
    const g = place(110, Y, -26.5, 0); emaRack(ctx, H.kit(g), M, 5.0, mat.toon('#ffffff', { map: tx.ema, paint: 0.02 }), tx.EMA);
    H.box(110, -26.5, 5.4, 0.6, 0, Y - 1, Y + 2.2);
    const g2 = place(90, Y, -24.5, 0); emaRack(ctx, H.kit(g2), M, 4.0, mat.toon('#ffffff', { map: tx.ema, paint: 0.02 }), tx.EMA);
    H.box(90, -24.5, 4.4, 0.6, 0, Y - 1, Y + 2.2);
    // torii at the start of the back stairs + lanterns up the stairs
    const bp = P.pathById('back');
    for (const s of [3, 30]) {
      const f = P.pathFrame(bp, s), tg = place(f.u, P.stepY(bp, s), f.v, Math.atan2(-f.tu, -f.tv) + 0);
      greatTorii(ctx, H.kit(tg), { span: 3.6, h: 4.3, r: 0.2, lean: 0.01 });
      for (const sd of [-1, 1]) H.cyl(f.u - f.tv * sd * 1.8, f.v + f.tu * sd * 1.8, 0.25, -5, 60);
    }
    for (let s = 36; s < 47; s += 3.5) for (const sd of [-1, 1]) {
      const f = P.pathFrame(bp, s), u = f.u - f.tv * sd * 2.4, v = f.v + f.tu * sd * 2.4;
      const lg = place(u, H.ground(u, v), v, sd < 0 ? 0 : Math.PI); lantern(H.kit(lg), M, 0.8);
      H.cyl(u, v, 0.3, -5, 60);
    }
  }

  // ---------------------------------------------------------------- 千本鳥居 entrance plaza
  {
    const f = P.flatById('senbonGate'), y = f.y;
    for (const id of ['senbonL', 'senbonR']) {
      const p = P.pathById(id), s = 3.2, fr = P.pathFrame(p, s);
      const tg = place(fr.u, P.stepY(p, s), fr.v, Math.atan2(-fr.tu, -fr.tv));
      greatTorii(ctx, H.kit(tg), { span: 2.3, h: 3.2, r: 0.15, lean: 0.008 });
      for (const sd of [-1, 1]) H.cyl(fr.u - fr.tv * sd * 1.15, fr.v + fr.tu * sd * 1.15, 0.2, -5, 60);
    }
    const sg = place(152.6, y, -21.5, W); signpost(ctx, H.kit(sg), M, tx.board('千本鳥居', 'senbon', '→ 奥社'), 1.9); H.cyl(152.6, -21.5, 0.2, y - 1, y + 2);
    for (const s of [-1, 1]) { const fg = place(147.2, y, -21.5 + s * 5.4, Math.atan2(-1, -s * 0.3)); foxOnPedestal(H.kit(fg), M, s < 0 ? 'key' : 'jewel', 1.2, 1.6); H.box(147.2, -21.5 + s * 5.4, 0.8, 0.8, 0, y - 1, y + 2.5); }
    excl.push({ u0: f.u0 - 1, u1: f.u1 + 1, v0: f.v0 - 1, v1: f.v1 + 1 });
  }

  // ================================================================ cherry trees (same generator as the town)
  const trees = [
    { id: 'appN1', x: 18, z: -9.6, height: 7.6, spread: 4.1 }, { id: 'appS1', x: 25, z: 9.8, height: 7.9, spread: 4.3 },
    { id: 'appN2', x: 44, z: -9.8, height: 7.2, spread: 3.9 }, { id: 'appS2', x: 50, z: 9.5, height: 7.0, spread: 3.8 },
    { id: 'preN', x: 80, z: -21, height: 8.4, spread: 4.6 }, { id: 'preS', x: 100, z: 21, height: 8.8, spread: 4.8 }, { id: 'preS2', x: 72, z: 22, height: 7.6, spread: 4.0 },
  ];
  sakura(ctx, H, trees);
  for (const t of trees) excl.push({ u0: t.x - 2, u1: t.x + 2, v0: t.z - 2, v1: t.z + 2 });

  return { excl };
}

// bronze fox head for the 手水 spout (small, simple)
function import_fox(g, M) {
  const k = kitOf(g);
  k.sphere(0.09, M.bronze, [0, 0.12, 0], 10);
  k.mesh(new THREE.CylinderGeometry(0.01, 0.045, 0.14, 8), M.bronze, [0, 0.1, 0.1], [Math.PI / 2 + 0.3, 0, 0]);
  for (const s of [-1, 1]) k.mesh(new THREE.CylinderGeometry(0.003, 0.03, 0.1, 6), M.bronze, [s * 0.05, 0.22, 0], [0, 0, -s * 0.3]);
}

/** Cherry trees via the town's sakura generator, in world space, added to the area's batched top group. */
function sakura(ctx, H, list) {
  const { L } = ctx;
  const M = sharedSakuraMaterials(ctx, createSakuraTextures);
  const env = { rng: ctx.rng, noise: createNoise(ctx.rng('inari-sakura-noise')), heightAt: L.heightAt };
  const top = H.root.parent;
  const blobs = [];
  for (const t of list) {
    const spec = {
      id: 'inari-' + t.id, kind: 'medium', seed: 'inari-sakura-' + t.id, lod: 1, bark: 'old',
      x: P.ORIGIN.x + t.x, z: P.ORIGIN.z + t.z, height: t.height, spread: t.spread, spreadZ: t.spread * 0.92, vr: 0.54, trunkR: 0.3, forkH: 2.3,
      lean: [0.1, 0.1], offset: [0.2, 0.1], limbs: 4, padR: 1.2, rootReach: 0.7, floorAt: L.heightAt, base: { type: 'none' },
    };
    let r; try { r = makeTree(spec, env); } catch (e) { console.warn('[inari] sakura failed', t.id, e); continue; }
    const bark = r.bark.build(false);
    if (bark) { const m = new THREE.Mesh(bark, M.barkOld); m.castShadow = true; m.receiveShadow = true; top.add(m); }
    const blob = r.blob.build(true); if (blob) blobs.push(blob);
    const cards = r.cards.build(true);
    if (cards) { const m = new THREE.Mesh(cards, M.cards); m.castShadow = true; ctx.noOutline(m); top.add(m); }
    for (const c of r.colliders) ctx.physics.addCylinder(c.x, c.z, c.r, c.y0, c.y1);
  }
  if (blobs.length) {
    const geo = blobs.length > 1 ? ctx.geo.mergeGeometries(blobs, false) : blobs[0];
    geo.computeBoundingSphere(); geo.computeBoundingBox();
    const m = new THREE.Mesh(geo, M.blob); m.castShadow = true; m.customDepthMaterial = M.blobDepth; ctx.noBatch(m); top.add(m);
  }
  void VERM; void miniTorii;
}
