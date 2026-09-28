// 稲荷山 upper mountain: 奥社奉拝所 (fox ema, おもかる石), 新池 + 熊鷹社 with candle racks, 三ツ辻 and 四ツ辻
// tea houses (red benches, parasols, vending machines, the view railing), the 一ノ峰 summit enclosure
// with its お塚 (stone mounds thick with small offered torii), trail-head torii, and trailside lanterns,
// お塚 and signposts where the tunnels break.
import * as THREE from 'three';
import * as P from './plan.js';
import { greatTorii } from './torii.js';
import { irimoya, gableRoof } from './arch.js';
import { materials, lantern, fox, foxOnPedestal, saisen, bell, signpost, bench, vending, otsuka, emaRack, miniTorii, sub, kitOf, shimenawa } from './props.js';

const W = -Math.PI / 2;

export function buildMountain(ctx, H) {
  const { mat } = ctx;
  const { tx } = H;
  const M = materials(ctx, tx);
  const excl = [];
  const roofM = { top: M.roofBark, under: M.roofUnder, edge: M.roofEdge, gable: M.verm, ridge: M.roofEdge };
  const woodRoof = { top: M.roofBark, under: M.woodL, edge: M.roofEdge, gable: M.woodL, ridge: M.roofEdge };
  const place = (u, y, v, rotY = 0) => H.group(u, y, v, rotY);
  const flat = (id) => P.flatById(id);
  const rnd = ctx.rng('inari.mountain');
  const GODS = ['白菊大神', '末広大神', '石清水大神', '玉姫大神', '千代松大神', '福徳大神', '白龍大神', '大山大神', '豊川大神', '清瀧大神', '高砂大神', '稲荷大神'];
  const godTex = GODS.map((g, i) => tx.engrave(g, 'god' + i, 96, 384));
  let gi = 0;
  const nextGod = () => godTex[(gi++) % godTex.length];
  const emaM = mat.toon('#ffffff', { map: tx.ema, paint: 0.02 });
  const vendTex = H.vendTex;
  /** kit + collider for a group placed on the ground at (u, v) */
  const onGround = (u, v, rotY = 0) => place(u, H.ground(u, v), v, rotY);

  // ---------------------------------------------------------------- 奥社奉拝所
  {
    const f = flat('okusha'), y = f.y;
    const U = 252.5, V = -27.5, g = place(U, y, V, W); const k = H.kit(g);
    const BW = 9, BD = 5.4;
    k.box(BW + 0.8, 0.3, BD + 0.8, M.stoneD, [0, 0.15, 0]); H.walk(U, V, BD + 0.8, BW + 0.8, 0, y + 0.3);
    for (const x of [-4.5, -1.5, 1.5, 4.5]) for (const z of [-2.6, 2.6]) { k.cyl(0.18, 0.19, 3.4, M.verm, [x, 0.3 + 1.7, z], null, 14); const p = H.at(U, V, W, x, z); H.cyl(p.u, p.v, 0.22, y, y + 4); }
    k.box(BW, 3.2, 0.2, M.plaster, [0, 0.3 + 1.6, -2.6]);
    for (const x of [-4.5, 4.5]) k.box(0.2, 3.2, 5.2, M.plaster, [x, 1.9, 0]);
    k.box(BW - 0.2, 0.12, BD - 0.3, M.wood, [0, 0.36, 0]);
    for (const z of [-2.6, 2.6]) k.box(BW + 0.6, 0.34, 0.28, M.verm, [0, 3.7, z]);
    for (let i = 0; i < 12; i++) k.box(0.28, 0.3, 0.44, i % 2 ? M.verm : M.copper, [-4.4 + i * 0.8, 4.05, 2.8]);
    H.box(U + 1.3, V, 2.4, BW + 0.4, 0, y, y + 6);
    const sb = sub(k, 0, 0.3, 1.6); saisen(ctx, kitOf(sb), M, 2.6, tx.saisen); H.box(U - 1.6, V, 0.8, 2.8, 0, y, y + 1.1);
    for (const x of [-1.2, 1.2]) { const bg = sub(k, x, 0.3, 2.4); bell(kitOf(bg), M, 3.1); }
    k.box(2.0, 0.7, 0.1, M.black, [0, 3.2, 2.72]);
    k.plane(1.85, 0.6, mat.toon('#ffffff', { map: tx.plaqueH('奥社奉拝所', 'okusha'), paint: 0.01 }), [0, 3.2, 2.78]);
    irimoya(k, { w: BW, d: BD, y: 4.3, h: 3.6, o: 1.6, t: 0.3, ridge: 0.56, brk: 0.5, flare: 0.3, mats: roofM });
    // famous white-fox ema rack
    const eg = place(243, y, -33.4, 0); emaRack(ctx, H.kit(eg), M, 6.5, emaM, tx.EMA); H.box(243, -33.4, 7, 0.6, 0, y - 1, y + 2.3);
    // おもかる石 (lift-the-stone lanterns)
    for (const du of [0, 1.4]) { const lg = place(247.4 + du, y, -13.2, Math.PI); lantern(H.kit(lg), M, 0.72); H.cyl(247.4 + du, -13.2, 0.3, y - 1, y + 1.6); }
    const sg = place(245.2, y, -13.4, Math.PI); signpost(ctx, H.kit(sg), M, tx.board('おもかる石', 'omokaru'), 1.4); H.cyl(245.2, -13.4, 0.15, y - 1, y + 1.5);
    // fox pair + signpost to the upper trail
    for (const s of [-1, 1]) { const fg = place(248.5, y, V + s * 5.6, Math.atan2(-1, -s * 0.2)); foxOnPedestal(H.kit(fg), M, s < 0 ? 'key' : 'jewel', 1.3, 1.5); H.box(248.5, V + s * 5.6, 0.8, 0.8, 0, y - 1, y + 2.6); }
    const s2 = place(251.2, y, -12.8, -2.2); signpost(ctx, H.kit(s2), M, tx.board('お山めぐり', 'oyama', '→ 四ツ辻'), 1.8); H.cyl(251.2, -12.8, 0.15, y - 1, y + 2);
    excl.push({ u0: f.u0 - 1, u1: f.u1 + 2, v0: f.v0 - 1, v1: f.v1 + 1 });
  }

  // ---------------------------------------------------------------- trail-head torii
  for (const id of ['upper', 'summitA', 'summitB']) {
    const p = P.pathById(id), s = 1.6, fr = P.pathFrame(p, s);
    const tg = place(fr.u, P.stepY(p, s), fr.v, Math.atan2(-fr.tu, -fr.tv));
    greatTorii(ctx, H.kit(tg), { span: 2.7, h: 3.5, r: 0.16, lean: 0.008 });
    for (const sd of [-1, 1]) H.cyl(fr.u - fr.tv * sd * 1.35, fr.v + fr.tu * sd * 1.35, 0.2, -5, 200);
  }

  // ---------------------------------------------------------------- 新池 + 熊鷹社
  {
    const f = flat('shinike'), y = f.y, O = P.POND;
    // water + stone rim
    const water = new THREE.Mesh(new THREE.CircleGeometry(1, 40), mat.toon('#7eaab2', { paint: 0.03 }));
    water.rotation.x = -Math.PI / 2; water.scale.set(O.ru * 0.98, O.rv * 0.98, 1); water.position.set(O.u, y - 0.32, O.v); water.receiveShadow = true; H.root.add(water);
    const shine = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.62, 40, 1, 0.3, 1.6), mat.emissive('#e6f2f6', 0.9, { transparent: true, opacity: 0.55 }));
    shine.rotation.x = -Math.PI / 2; shine.scale.set(O.ru, O.rv, 1); shine.position.set(O.u, y - 0.31, O.v); H.root.add(shine);
    const n = 46;
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2, u = O.u + Math.cos(a) * O.ru * 1.02, v = O.v + Math.sin(a) * O.rv * 1.02;
      const rs = 0.32 + rnd() * 0.22;
      const m = new THREE.Mesh(new THREE.DodecahedronGeometry(rs, 0), M.stoneMoss); m.position.set(u, y - 0.12, v); m.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3); m.scale.y = 0.6; m.castShadow = true; m.receiveShadow = true; H.root.add(m);
      if (i % 2 === 0) H.cyl(u, v, 0.5, y - 2, y + 0.9);
    }
    // 熊鷹社: small hall on the east bank + candle racks with lit candles
    const U = 302.5, V = 6.2, g = place(U, y, V, W); const k = H.kit(g);
    k.box(4.6, 0.3, 3.6, M.stoneD, [0, 0.15, 0]); H.walk(U, V, 3.6, 4.6, 0, y + 0.3);
    for (const x of [-2, 2]) for (const z of [-1.5, 1.5]) k.cyl(0.13, 0.13, 2.6, M.verm, [x, 1.6, z], null, 12);
    k.box(4.0, 2.4, 0.15, M.plaster, [0, 1.5, -1.5]);
    const sb = sub(k, 0, 0.3, 0.9); saisen(ctx, kitOf(sb), M, 1.6, tx.saisen);
    const bg = sub(k, 0, 0.3, 1.3); bell(kitOf(bg), M, 2.5);
    shimenawa(k, M, [-1.9, 2.75, 1.55], [1.9, 2.75, 1.55], 0.2, 0.06, 3);
    gableRoof(k, { w: 5.4, zF: 2.8, zB: -2.4, yF: 2.9, yB: 3.1, yR: 4.4, zR: -0.4, t: 0.24, flare: 0.2, mats: roofM, gable: { x: 2.05, y: 3.0 } });
    H.box(U + 0.6, V, 3.0, 4.4, 0, y, y + 4);
    const candle = mat.emissive('#ffe2a8', 1.35);
    for (const [cu, cv, rot] of [[299.2, 11.8, Math.PI], [296.8, 12.2, Math.PI], [301.5, 0.6, 0]]) {
      const cg = place(cu, y, cv, rot); const ck = H.kit(cg);
      for (const x of [-0.9, 0.9]) ck.box(0.07, 0.9, 0.07, M.black, [x, 0.45, 0]);
      for (const yy of [0.62, 0.92]) {
        ck.box(2.0, 0.05, 0.28, M.black, [0, yy, 0]);
        for (let i = 0; i < 12; i++) { if (rnd() < 0.25) continue; const h = 0.05 + rnd() * 0.08; ck.cyl(0.012, 0.012, h, M.white, [-0.9 + i * 0.165, yy + 0.025 + h / 2, (rnd() - 0.5) * 0.12], null, 6); ck.sphere(0.012, candle, [-0.9 + i * 0.165, yy + 0.05 + h + 0.01, 0], 5); }
      }
      ck.box(2.1, 0.03, 0.4, M.roofEdge, [0, 1.2, 0], [0.2, 0, 0]);
      for (const x of [-1, 1]) ck.box(0.05, 0.35, 0.05, M.black, [x, 1.05, -0.1]);
      H.box(cu, cv, 2.1, 0.4, rot, y - 1, y + 1.2);
    }
    for (let i = 0; i < 3; i++) { const og = place(299 + i * 2.2, y, -1.8, 0.1 * (i - 1)); otsuka(ctx, H.kit(og), M, rnd, nextGod()); H.box(299 + i * 2.2, -1.9, 2.4, 1.7, 0, y - 1, y + 1.8); }
    excl.push({ u0: f.u0 - 1, u1: f.u1 + 2, v0: f.v0 - 1, v1: f.v1 + 2 });
  }

  // ---------------------------------------------------------------- tea houses
  function teahouse(U, V, rot, w, d, name, yGround) {
    const g = place(U, yGround, V, rot); const k = H.kit(g);
    k.box(w, 0.2, d, M.stoneD, [0, 0.1, 0]);
    k.box(w, 2.7, 0.2, M.woodD, [0, 1.55, -d / 2 + 0.1]);
    for (const x of [-1, 1]) k.box(0.2, 2.7, d, M.plaster, [x * (w / 2 - 0.1), 1.55, 0]);
    for (const x of [-w / 2 + 0.12, w / 2 - 0.12]) k.box(0.16, 2.8, 0.16, M.woodD, [x, 1.4, d / 2 - 0.1]);
    k.plane(w - 0.6, 2.2, mat.emissive('#ffd9a0', 0.55), [0, 1.3, -d / 2 + 0.22]);
    k.box(w - 1.2, 0.9, 0.6, M.woodL, [0, 0.45 + 0.2, -d / 2 + 0.8]);
    const noren = ctx.tex.draw(256, 128, (gg, W_, H_) => { gg.fillStyle = '#c9503c'; gg.fillRect(0, 0, W_, H_); gg.fillStyle = '#fbf2e6'; gg.textAlign = 'center'; gg.textBaseline = 'middle'; ctx.tex.fitText(gg, name, W_ / 2, H_ / 2, W_ * 0.86, 64, ctx.tex.FONTS.brush, 700); }, { key: 'inari.tea.' + name });
    k.plane(Math.min(3, w - 1), 0.7, mat.toon('#ffffff', { map: noren, paint: 0.02, side: 'double' }), [0, 2.5, d / 2 - 0.05]);
    gableRoof(k, { w: w + 0.8, zF: d / 2 + 1.2, zB: -d / 2 - 0.5, yF: 2.9, yB: 3.1, yR: 4.2, zR: -0.3, t: 0.22, flare: 0.1, mats: woodRoof, gable: { x: w / 2 - 0.02, y: 2.95 } });
    for (let i = 0; i < 2; i++) { const bg = sub(k, -w / 2 + 1.3 + i * 2.4, 0.2, d / 2 + 1.0, 0); bench(kitOf(bg), M, 1.8, i === 1); }
    const vg = sub(k, w / 2 + 0.7, 0.2, d / 2 - 0.5, 0); vending(ctx, kitOf(vg), M, vendTex);
    const p = H.at(U, V, rot, 0, 0); H.box(p.u, p.v, w, d, rot, yGround - 1, yGround + 4.2);
    const pv = H.at(U, V, rot, w / 2 + 0.7, d / 2 - 0.5); H.box(pv.u, pv.v, 1.0, 0.8, rot, yGround - 1, yGround + 2);
    for (let i = 0; i < 2; i++) { const pb = H.at(U, V, rot, -w / 2 + 1.3 + i * 2.4, d / 2 + 1.0); H.box(pb.u, pb.v, 1.8, 0.7, rot, yGround - 1, yGround + 0.7); }
  }
  {
    const f = flat('mitsu');
    teahouse(293.2, -47, Math.PI / 2, 6.5, 3.4, '三ツ辻茶屋', f.y);
    const sg = place(303.6, f.y, -43.4, -2.4); signpost(ctx, H.kit(sg), M, tx.board('三ツ辻', 'mitsu', '↑ 四ツ辻'), 1.8); H.cyl(303.6, -43.4, 0.15, f.y - 1, f.y + 2);
    excl.push({ u0: f.u0 - 2, u1: f.u1 + 1, v0: f.v0 - 1, v1: f.v1 + 1 });
  }
  {
    const f = flat('yotsu'), y = f.y;
    teahouse(323.5, -93.5, -Math.PI / 2, 8, 4, '四ツ辻 仁志むら', y);
    // view railing + benches facing west over the basin
    const rg = place(306.2, y, -91, 0); const rk = H.kit(rg);
    for (let i = 0; i <= 8; i++) rk.box(0.1, 1.0, 0.1, M.woodD, [0, 0.5, -8 + i * 2]);
    for (const yy of [0.5, 0.95]) rk.box(0.08, 0.08, 16, M.woodL, [0, yy, 0]);
    H.box(306.2, -91, 0.3, 16, 0, y - 3, y + 1.1);
    for (const v of [-96, -91, -86]) { const bg = place(308.2, y, v, W); bench(H.kit(bg), M, 1.8, v === -96); H.box(308.2, v, 0.7, 1.8, 0, y - 1, y + 0.6); }
    const sg = place(315.5, y, -83.4, Math.PI); signpost(ctx, H.kit(sg), M, tx.board('四ツ辻', 'yotsu', '→ 一ノ峰'), 1.9); H.cyl(315.5, -83.4, 0.15, y - 1, y + 2);
    const lg = place(312, y, -98.6, 0); lantern(H.kit(lg), M, 0.95); H.cyl(312, -98.6, 0.35, y - 1, y + 2);
    const og = place(318, y, -99, 0); otsuka(ctx, H.kit(og), M, rnd, nextGod()); H.box(318, -99.2, 2.4, 1.7, 0, y - 1, y + 1.8);
    excl.push({ u0: f.u0 - 1, u1: f.u1 + 1, v0: f.v0 - 1, v1: f.v1 + 1 });
  }

  // ---------------------------------------------------------------- 一ノ峰 (summit)
  {
    const f = flat('summit'), y = f.y;
    const U = 395.5, V = -46.5, g = place(U, y, V, W); const k = H.kit(g);
    // raised stone altar area with a small open worship stand
    k.box(8, 0.5, 5, M.stoneMoss, [0, 0.25, -2.2]); H.box(U + 2.2, V, 5, 8, 0, y - 1, y + 0.5);
    for (const x of [-2.4, 2.4]) for (const z of [-3.8, -0.8]) k.cyl(0.14, 0.14, 2.8, M.verm, [x, 0.5 + 1.4, z], null, 12);
    gableRoof(k, { w: 6.4, zF: 0.6, zB: -5.2, yF: 3.3, yB: 3.3, yR: 4.8, zR: -2.3, t: 0.25, flare: 0.25, mats: roofM, gable: { x: 2.45, y: 3.3 } });
    const mg = sub(k, 0, 0.5, -3.4); otsuka(ctx, kitOf(mg), M, rnd, tx.engrave('末廣大神', 'suehiro', 96, 384));
    const sb = sub(k, 0, 0, 1.0); saisen(ctx, kitOf(sb), M, 2.0, tx.saisen);
    H.box(U - 1.0, V, 0.8, 2.2, 0, y - 1, y + 0.8);
    for (const x of [-1, 1]) { const bg = sub(k, x * 0.9, 0.5, 0.4); bell(kitOf(bg), M, 2.7); }
    // ring of お塚 around the enclosure
    const ring = [[386.5, -53.5, 0.6], [389.5, -55.2, 0.2], [393.5, -55.6, 0], [399.8, -52.5, -0.6], [400.2, -41.5, -2.4], [386, -39.6, 2.6], [385.5, -44.8, 1.6], [398.8, -38.6, -2.9]];
    for (const [u, v, rot] of ring) { const og = place(u, y, v, rot); otsuka(ctx, H.kit(og), M, rnd, nextGod()); const p = H.at(u, v, rot, 0, -0.2); H.box(p.u, p.v, 2.4, 1.7, rot, y - 1, y + 1.8); }
    // piles of small torii along the summit edge
    for (let i = 0; i < 26; i++) {
      const a = i / 26 * Math.PI * 2, u = 392 + Math.cos(a) * 8.8, v = -46.5 + Math.sin(a) * 9.4;
      if (Math.abs(Math.sin(a)) > 0.9) continue;
      const tg = place(u, H.ground(u, v), v, -a + Math.PI / 2); const w = 0.3 + rnd() * 0.35; miniTorii(H.kit(tg), M, w, w * 1.2);
    }
    const sg = place(389, y, -38.6, Math.PI - 0.3); signpost(ctx, H.kit(sg), M, tx.board('一ノ峰 上社神蹟', 'ichinomine', '標高 233m'), 2.0); H.cyl(389, -38.6, 0.15, y - 1, y + 2);
    for (const s of [-1, 1]) { const fg = place(391, y, V + s * 2.6, Math.atan2(-1, -s * 0.3)); foxOnPedestal(H.kit(fg), M, s < 0 ? 'key' : 'jewel', 1.0, 1.3); H.box(391, V + s * 2.6, 0.7, 0.7, 0, y - 1, y + 2.2); }
    excl.push({ u0: f.u0 - 1, u1: f.u1 + 1, v0: f.v0 - 1, v1: f.v1 + 1 });
  }

  // ---------------------------------------------------------------- trailside: lanterns, お塚 and small shrines where the tunnels break
  for (const p of P.PATHS) {
    if (!p.torii) continue;
    for (const [a, b] of p.torii.gaps) {
      const s = (a + b) / 2, f = P.pathFrame(p, s);
      const off = p.hw + 2.2;
      // put the お塚 on the side away from any plaza / pond the gap gives access to
      const nearFlat = (sd) => P.FLATS.some(fl => fl.id !== 'town' && P.flatDist(fl, f.u - f.tv * sd * off, f.v + f.tu * sd * off) < 5);
      let side = rnd() < 0.5 ? -1 : 1; if (nearFlat(side)) side = -side;
      if (nearFlat(side)) continue;
      const u = f.u - f.tv * side * off, v = f.v + f.tu * side * off;
      const rot = Math.atan2(f.tv * side, -f.tu * side);
      const og = onGround(u, v, rot); otsuka(ctx, H.kit(og), M, rnd, nextGod());
      H.box(u, v, 2.4, 1.8, rot, -5, 200);
      for (const s2 of [a + 1, b - 1]) { const f2 = P.pathFrame(p, s2); const lu = f2.u + f2.tv * side * (p.hw + 0.7), lv = f2.v - f2.tu * side * (p.hw + 0.7); const lg = onGround(lu, lv, rot + Math.PI); lantern(H.kit(lg), M, 0.75); H.cyl(lu, lv, 0.3, -5, 200); }
      excl.push({ u0: u - 2.5, u1: u + 2.5, v0: v - 2.5, v1: v + 2.5 });
    }
  }
  // a few small foxes guarding tunnel mouths
  for (const id of ['senbonL', 'senbonR']) {
    const p = P.pathById(id), s = p.length - 3, f = P.pathFrame(p, s);
    for (const sd of [-1, 1]) {
      const u = f.u - f.tv * sd * 1.55, v = f.v + f.tu * sd * 1.55;
      const g = place(u, P.stepY(p, s), v, Math.atan2(-f.tu, -f.tv)); const k = H.kit(g);
      k.box(0.4, 0.5, 0.4, M.stone, [0, 0.25, 0]); const fg = sub(k, 0, 0.5, 0); fox(kitOf(fg), M, sd < 0 ? 'key' : 'jewel', 0.75);
    }
  }
  return { excl };
}
