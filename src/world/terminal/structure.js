// 大阪駅 structure: the ground-floor concourse (floor, ceiling with light lines, walls, the glass south
// facade, pillars), the track deck with ballast / slab track, rails and sleepers, the three island platforms
// and the two Shinkansen side platforms (edge lines, tactile strips), and the stair + escalator stacks up to
// each platform (animated escalator steps that carry the player).
import * as THREE from 'three';
import * as P from './plan.js';

const { Y } = P;

/** Axis-aligned rectangle minus rectangular holes -> list of rectangles {u0,u1,v0,v1}. */
export function rectMinus(r, holes) {
  const hs = holes.filter(h => h.u1 > r.u0 && h.u0 < r.u1 && h.v1 > r.v0 && h.v0 < r.v1);
  const vs = [...new Set([r.v0, r.v1, ...hs.flatMap(h => [Math.max(r.v0, h.v0), Math.min(r.v1, h.v1)])])].sort((a, b) => a - b);
  const out = [];
  for (let i = 0; i < vs.length - 1; i++) {
    const a = vs[i], b = vs[i + 1]; if (b - a < 1e-4) continue;
    const cut = hs.filter(h => h.v0 < b - 1e-4 && h.v1 > a + 1e-4).map(h => [Math.max(r.u0, h.u0), Math.min(r.u1, h.u1)]).sort((p, q) => p[0] - q[0]);
    let u = r.u0;
    for (const [c0, c1] of cut) { if (c0 > u + 1e-4) out.push({ u0: u, u1: c0, v0: a, v1: b }); u = Math.max(u, c1); }
    if (r.u1 > u + 1e-4) out.push({ u0: u, u1: r.u1, v0: a, v1: b });
  }
  return out;
}

export function buildStructure(ctx, H) {
  const { root, M } = H;
  const K = H.kit();
  /** horizontal textured quad (faces up, or down with down = true), uv tiled every `tile` m, split in ≤ 24 m pieces */
  const quad = (u0, u1, v0, v1, y, m, tile = 2.4, down = false) => {
    const nu = Math.max(1, Math.ceil((u1 - u0) / 24)), nv = Math.max(1, Math.ceil((v1 - v0) / 24));
    for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
      const a0 = u0 + (u1 - u0) * i / nu, a1 = u0 + (u1 - u0) * (i + 1) / nu, b0 = v0 + (v1 - v0) * j / nv, b1 = v0 + (v1 - v0) * (j + 1) / nv;
      const g = new THREE.PlaneGeometry(a1 - a0, b1 - b0); g.rotateX(down ? Math.PI / 2 : -Math.PI / 2);
      const uv = g.attributes.uv, p = g.attributes.position;
      for (let k = 0; k < uv.count; k++) uv.setXY(k, (p.getX(k) + (a0 + a1) / 2) / tile, -(p.getZ(k) + (b0 + b1) / 2) / tile);
      const mesh = new THREE.Mesh(g, m); mesh.position.set((a0 + a1) / 2, y, (b0 + b1) / 2); mesh.receiveShadow = true; root.add(mesh);
    }
  };
  const boxAt = (u0, u1, y0, y1, v0, v1, m) => K.box(u1 - u0, y1 - y0, v1 - v0, m, [(u0 + u1) / 2, (y0 + y1) / 2, (v0 + v1) / 2]);
  const holes = P.LIFTS.map(P.liftHole);

  // ================================================================ concourse (ground floor)
  const C = P.CONC, CEIL = 4.4;
  quad(C.u0, C.u1, C.v0, C.v1, 0.01, M.floor, 2.4);
  // guiding tactile line from the entrance through the gates and along the concourse
  for (const u of [-6.5, 6.5]) quad(u - 0.15, u + 0.15, -58, 46, 0.015, M.line, 0.3);
  quad(-6.65, 6.65, 46.2, 46.5, 0.015, M.dot, 0.3);
  // ceiling (minus the stair holes) + light lines
  for (const r of rectMinus({ u0: C.u0, u1: C.u1, v0: C.v0, v1: C.v1 }, holes)) quad(r.u0, r.u1, r.v0, r.v1, CEIL, M.ceiling, 1.2, true);
  for (let u = -30; u <= 30; u += 6) for (const r of rectMinus({ u0: u - 0.12, u1: u + 0.12, v0: C.v0 + 1, v1: C.v1 - 1 }, holes.map(h => ({ ...h, u0: h.u0 - 0.5, u1: h.u1 + 0.5, v0: h.v0 - 0.5, v1: h.v1 + 0.5 })))) {
    const m = K.box(r.u1 - r.u0, 0.05, r.v1 - r.v0, M.light, [(r.u0 + r.u1) / 2, CEIL - 0.03, (r.v0 + r.v1) / 2]); m.castShadow = false;
  }
  // hole shafts (the stair wells through ceiling + deck + platform)
  for (const [i, h] of holes.entries()) {
    const top = P.LIFTS[i].s ? Y.platS : Y.plat;
    for (const [u0, u1, v0, v1] of [[h.u0, h.u1, h.v0 - 0.1, h.v0], [h.u0, h.u1, h.v1, h.v1 + 0.1], [h.u0 - 0.1, h.u0, h.v0, h.v1]]) boxAt(u0, u1, CEIL, top - 0.02, v0, v1, M.wall);
  }
  // walls (east / west / north), with the colliders
  const wall = (u0, u1, v0, v1) => { boxAt(u0, u1, 0, CEIL, v0, v1, M.wall); H.box((u0 + u1) / 2, (v0 + v1) / 2, u1 - u0, v1 - v0, 0, -1, CEIL + 0.5); };
  wall(C.u0 - 0.4, C.u0, C.v0, C.v1); wall(C.u1, C.u1 + 0.4, C.v0, C.v1); wall(C.u0, C.u1, C.v0 - 0.4, C.v0);
  // skirting + a blue line along the walls
  for (const [u, s] of [[C.u0 + 0.01, 1], [C.u1 - 0.01, -1]]) { boxAt(u - 0.02, u + 0.02, 0, 0.12, C.v0, C.v1, M.steelD); boxAt(u - 0.02 * s, u + 0.02 * s, 2.6, 2.72, C.v0, C.v1, M.band); }
  // south facade: glass curtain wall with two wide entrances (u ±4 … ±13)
  {
    const v = C.v1;
    const seg = (u0, u1, open) => {
      if (!open) { boxAt(u0, u1, 0, CEIL, v - 0.06, v + 0.06, M.glass); H.box((u0 + u1) / 2, v, u1 - u0, 0.3, 0, -1, CEIL); }
      for (let u = u0; u <= u1 + 1e-6; u += open ? (u1 - u0) : 2.4) boxAt(u - 0.06, u + 0.06, 0, CEIL, v - 0.1, v + 0.1, M.steelD);
    };
    seg(C.u0, -13, false); seg(-13, -4, true); seg(-4, 4, false); seg(4, 13, true); seg(13, C.u1, false);
    boxAt(C.u0, C.u1, CEIL - 0.6, CEIL, v - 0.12, v + 0.12, M.steelD);
    // canopy outside the entrance
    boxAt(-18, 18, CEIL - 0.25, CEIL - 0.05, v, v + 5, M.steel);
    const g = K.box(36, 0.02, 5, M.glassDark, [0, CEIL - 0.02, v + 2.5]); g.castShadow = false;
  }
  // big square pillars with the blue band + number plates
  const pillars = [];
  for (const u of [-26, 16]) for (const v of [-54, -42, -20, -4, 12, 40]) pillars.push([u, v]);
  for (const [u, v] of pillars) {
    boxAt(u - 0.6, u + 0.6, 0, CEIL, v - 0.6, v + 0.6, M.pillar);
    boxAt(u - 0.62, u + 0.62, 2.1, 2.3, v - 0.62, v + 0.62, M.band);
    boxAt(u - 0.62, u + 0.62, 0, 0.12, v - 0.62, v + 0.62, M.steelD);
    H.box(u, v, 1.2, 1.2, 0, -1, CEIL);
  }
  H.pillars = pillars;
  // ceiling fittings between the light lines: downlights, PA speakers, smoke detectors, air-conditioning vents
  {
    const inHole = (u, v) => holes.some(h => u > h.u0 - 0.8 && u < h.u1 + 0.8 && v > h.v0 - 0.8 && v < h.v1 + 0.8);
    const dl = ctx.mat.emissive('#fff4e0', 1.05), rim = M.steel, vent = ctx.mat.toon('#b9bdc2', { paint: 0.02 }), spk = M.white;
    for (let u = C.u0 + 3; u < C.u1 - 1; u += 6) for (let v = C.v0 + 2; v < C.v1 - 1; v += 4) {
      if (inHole(u, v)) continue;
      const k = (Math.round(u / 6) + Math.round(v / 4)) % 4;
      if (k === 0) { K.cyl(0.14, 0.14, 0.03, rim, [u, CEIL - 0.015, v], null, 12); K.cyl(0.1, 0.1, 0.01, dl, [u, CEIL - 0.03, v], null, 12); }
      else if (k === 1) { K.box(0.9, 0.03, 0.3, vent, [u, CEIL - 0.015, v]); for (let i = -3; i <= 3; i++) K.box(0.8, 0.012, 0.02, M.steelD, [u, CEIL - 0.032, v + i * 0.035]); }
      else if (k === 2) { K.cyl(0.13, 0.15, 0.08, spk, [u, CEIL - 0.04, v], null, 12); K.cyl(0.09, 0.09, 0.01, M.steelD, [u, CEIL - 0.085, v], null, 12); }
      else { K.cyl(0.06, 0.07, 0.05, spk, [u, CEIL - 0.025, v], null, 8); K.sphere(0.012, ctx.mat.emissive('#ff5a4a', 1.2), [u + 0.03, CEIL - 0.055, v], 6); }
    }
  }
  // digital signage on the in-gate pillars (one lit ad face each)
  {
    const T = ctx.tex, F = T.FONTS;
    const ads = [['大阪ステーションシティ', '春のフェア開催中', '#e9785a'], ['ICOCA', 'タッチでピッ', '#0072bc'], ['新幹線 のぞみ', '東京まで 2時間27分', '#1553a8'], ['駅弁まつり', '全国の味が大集合', '#c9503c']].map(([a, b, c], i) => T.draw(256, 512, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, c); gr.addColorStop(1, '#1b2130'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(255,255,255,0.12)'; for (let k = 0; k < 6; k++) { g.beginPath(); g.arc(40 + k * 40, 160 + (k % 2) * 60, 30 + k * 6, 0, 6.3); g.fill(); }
      g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; T.fitText(g, a, w / 2, 330, w - 30, 40, F.sans, 900);
      g.font = `700 24px ${F.sans}`; T.fitText(g, b, w / 2, 390, w - 40, 26, F.sans, 700);
      g.fillStyle = 'rgba(255,255,255,0.7)'; g.font = `600 16px ${F.en}`; g.fillText('JR WEST', w / 2, 470);
    }, { key: 'term.pad' + i }));
    pillars.filter(([u, v]) => v > -28 && v < 32).forEach(([u, v], i) => {
      for (const [du, dv, ry] of [[0, 0.625, 0], [0, -0.625, Math.PI]]) {
        K.box(0.9, 1.7, 0.05, M.black, [u + du, 1.45, v + dv]);
        K.plane(0.8, 1.6, ctx.mat.emissive('#ffffff', 0.95, { map: ads[(i + (dv > 0 ? 0 : 2)) % ads.length] }), [u + du, 1.45, v + dv + (dv > 0 ? 0.027 : -0.027)], [0, ry, 0]);
      }
    });
  }

  // ================================================================ track deck, tracks, platforms
  const DECK_V = [[-31, 30.2], [-67.5, -31]];
  const DU = 700;
  for (const [v0, v1] of DECK_V) {
    for (let u = -DU; u < DU; u += 100) {
      const r = { u0: u, u1: u + 100, v0, v1 };
      // the slab starts just above the concourse ceiling (a shared plane would z-fight with it)
      for (const q of rectMinus(r, holes)) boxAt(q.u0, q.u1, CEIL + 0.06, Y.deck, q.v0, q.v1, M.concreteD);
    }
    // deck surface, minus the stair wells (a plane over a well reads as a solid wall from the stairs)
    for (let u = -DU; u < DU; u += 100) for (const q of rectMinus({ u0: u, u1: u + 100, v0, v1 }, holes)) quad(q.u0, q.u1, q.v0, q.v1, Y.deck + 0.005, M.concrete, 4);
  }
  // deck walk surface (catches anyone stepping off a platform; does not block the concourse below)
  for (const [v0, v1] of DECK_V) for (let u = -210; u < 210; u += 60) {
    for (const q of rectMinus({ u0: u, u1: u + 60, v0, v1 }, holes)) H.walk((q.u0 + q.u1) / 2, (q.v0 + q.v1) / 2, q.u1 - q.u0, q.v1 - q.v0, 0, Y.deck + 0.1, CEIL + 0.3);
  }
  // parapets / the Shinkansen fence line
  boxAt(-DU, DU, Y.deck, Y.deck + 1.2, 29.9, 30.3, M.concreteD);
  boxAt(-DU, DU, Y.deck, Y.deck + 1.2, -67.6, -67.2, M.concreteD);
  // rails, ballast / slab track, sleepers
  const sleepers = [];
  const track = (v, shin) => {
    const half = (shin ? 1.435 : 1.067) / 2 + 0.035;
    if (shin) boxAt(-DU, DU, Y.deck, Y.rail - 0.16, v - 1.3, v + 1.3, M.slab);
    else { quad(-DU, DU, v - 1.6, v + 1.6, Y.deck + 0.08, M.ballast, 2); for (let u = -420; u < 420; u += 0.62) sleepers.push([u, v]); }
    for (const s of [-1, 1]) for (let u = -DU; u < DU; u += 200) {
      boxAt(u, u + 200, Y.rail - 0.16, Y.rail - 0.02, v + s * half - 0.035, v + s * half + 0.035, M.rail);
      boxAt(u, u + 200, Y.rail - 0.02, Y.rail, v + s * half - 0.035, v + s * half + 0.035, M.railTop);
    }
  };
  for (const v of Object.values(P.TRACKS)) track(v, false);
  for (const v of Object.values(P.S_TRACKS)) track(v, true);
  {
    const g = new THREE.BoxGeometry(2.1, 0.16, 0.24);
    const im = new THREE.InstancedMesh(g, M.sleeper, sleepers.length);
    const m4 = new THREE.Matrix4();
    sleepers.forEach(([u, v], i) => { m4.makeTranslation(u, Y.rail - 0.24, v); im.setMatrixAt(i, m4); });
    im.receiveShadow = true; im.castShadow = false; im.computeBoundingSphere(); root.add(im);
  }
  // platforms
  const platform = (u0, u1, v0, v1, top, edges, hole) => {
    const pieces = hole ? rectMinus({ u0, u1, v0, v1 }, [hole]) : [{ u0, u1, v0, v1 }];
    for (const q of pieces) {
      boxAt(q.u0, q.u1, Y.deck, top - 0.02, q.v0, q.v1, M.concrete);
      quad(q.u0, q.u1, q.v0, q.v1, top, M.plat, 1.2);
      H.walk((q.u0 + q.u1) / 2, (q.v0 + q.v1) / 2, q.u1 - q.u0, q.v1 - q.v0, 0, top, CEIL + 0.3);
    }
    for (const e of edges) { // e = platform edge v, s = direction into the platform
      const s = e === v0 ? 1 : -1;
      const band = (d0, d1, m, tile) => quad(u0, u1, Math.min(e + s * d0, e + s * d1), Math.max(e + s * d0, e + s * d1), top + 0.004, m, tile);
      band(0, 0.3, M.edge, 1);
      band(0.8, 1.1, M.dot, 0.3);
      band(1.1, 1.18, M.line, 0.3);   // 内方線 (the inner line marking the safe side)
      boxAt(u0, u1, top - 0.2, top, Math.min(e, e - s * 0.08), Math.max(e, e - s * 0.08), M.concreteD); // edge lip
      // invisible edge collider (the doors / gates handle boarding)
      H.box((u0 + u1) / 2, e - s * 0.05, u1 - u0, 0.1, 0, top - 0.3, top + 3);
    }
  };
  for (const I of P.ISLANDS) {
    const L = P.LIFTS.find(l => l.plat === I.id);
    platform(-P.PLAT_LEN / 2, P.PLAT_LEN / 2, I.v - P.ISLAND_W / 2, I.v + P.ISLAND_W / 2, Y.plat, [I.v - P.ISLAND_W / 2, I.v + P.ISLAND_W / 2], P.liftHole(L));
    for (const u of [-P.PLAT_LEN / 2, P.PLAT_LEN / 2]) H.box(u, I.v, 0.2, P.ISLAND_W, 0, Y.plat - 0.3, Y.plat + 3);
  }
  for (const S of P.S_PLATS) {
    const L = P.LIFTS.find(l => l.plat === S.id);
    platform(-P.S_PLAT_LEN / 2, P.S_PLAT_LEN / 2, S.v0, S.v1, Y.platS, [S.edge], P.liftHole(L));
    const back = S.edge === S.v0 ? S.v1 : S.v0;
    {
      // back wall: a low solid wall with a handrail, glazing above it on slim mullions
      const w0 = Math.min(back, back + (back > S.edge ? 0.25 : -0.25)), w1 = Math.max(back, back + (back > S.edge ? 0.25 : -0.25)), vm = (w0 + w1) / 2;
      for (let u = -P.S_PLAT_LEN / 2; u < P.S_PLAT_LEN / 2 - 1e-6; u += 60) {
        const ua = u, ub = Math.min(P.S_PLAT_LEN / 2, u + 60);
        boxAt(ua, ub, Y.platS, Y.platS + 1.1, w0, w1, M.white);
        boxAt(ua, ub, Y.platS + 1.1, Y.platS + 1.16, w0 - 0.04, w1 + 0.04, M.steel);
        boxAt(ua, ub, Y.platS + 1.16, Y.platS + 2.6, vm - 0.02, vm + 0.02, M.glass);
        boxAt(ua, ub, Y.platS + 2.6, Y.platS + 2.7, w0, w1, M.steel);
        boxAt(ua, ub, Y.platS + 0.02, Y.platS + 0.14, back > S.edge ? w0 - 0.02 : w1, back > S.edge ? w0 : w1 + 0.02, M.steelD);
      }
      for (let u = -P.S_PLAT_LEN / 2; u <= P.S_PLAT_LEN / 2 + 1e-6; u += 2.4) boxAt(u - 0.04, u + 0.04, Y.platS + 1.1, Y.platS + 2.7, vm - 0.05, vm + 0.05, M.steelD);
    }
    H.box(0, back, P.S_PLAT_LEN, 0.4, 0, Y.platS - 0.3, Y.platS + 3);
    for (const u of [-P.S_PLAT_LEN / 2, P.S_PLAT_LEN / 2]) H.box(u, (S.v0 + S.v1) / 2, 0.2, 8, 0, Y.platS - 0.3, Y.platS + 3);
  }

  // ================================================================ stairs + escalators
  const escalators = [];
  for (const L of P.LIFTS) {
    const top = L.s ? Y.platS : Y.plat, c = L.v, u0 = L.u0, n = 45, run = 0.3, rise = top / n, hole = P.liftHole(L);
    // stairs
    const sv0 = c - 0.6, sv1 = c - 0.6 + L.w;
    for (let i = 0; i < n; i++) {
      const a = u0 + i * run, hy = (i + 1) * rise;
      boxAt(a, a + run, 0, hy, sv0, sv1, M.tread);
      boxAt(a, a + 0.05, hy - 0.02, hy + 0.003, sv0, sv1, M.nosing);
    }
    { const p = P.toWorld(u0 + n * run / 2, (sv0 + sv1) / 2); ctx.physics.addStairs(p.x, p.z, sv1 - sv0, n * run, Math.PI / 2, 0, top, n); }
    // escalator
    const ev0 = c - 2.7, ev1 = c - 1.5, eu0 = u0, inc0 = u0 + 1.2, inc1 = u0 + 12.8, eu1 = u0 + 13.5;
    const ang = Math.atan2(top, inc1 - inc0), len = Math.hypot(top, inc1 - inc0);
    K.box(len, 0.9, ev1 - ev0 + 0.3, M.escBody, [(inc0 + inc1) / 2, top / 2 - 0.5, (ev0 + ev1) / 2], [0, 0, ang]);
    boxAt(eu0, inc0, -0.2, 0.02, ev0, ev1, M.steel); boxAt(inc1, eu1, top - 0.2, top + 0.005, ev0, ev1, M.steel);
    { const p = P.toWorld((inc0 + inc1) / 2, (ev0 + ev1) / 2); ctx.physics.addWalkRamp(p.x, p.z, ev1 - ev0, inc1 - inc0, Math.PI / 2, 0, top); }
    H.walk((inc1 + eu1) / 2, (ev0 + ev1) / 2, eu1 - inc1, ev1 - ev0, 0, top, CEIL + 0.3);
    escalators.push({ c, ev0, ev1, eu0, inc0, inc1, eu1, top, ang });
    // side panels (cladding from the floor to 1 m above the stair line) + handrails, for both sides and the divider
    const panel = (v, thick, m, hr) => {
      const shape = [[u0 - 0.3, 0], [eu1, 0], [eu1, top + 1.0], [inc1, top + 1.0], [inc0, 1.0], [u0 - 0.3, 1.0]];
      const geo = ctx.geo.extrude(shape, thick); geo.translate(0, 0, v);
      K.mesh(geo, m, [0, 0, 0]);
      if (hr) K.box(len + 0.4, 0.08, 0.1, M.handrail, [(inc0 + inc1) / 2, top / 2 + 1.04, v], [0, 0, ang]);
    };
    panel(ev0 - 0.12, 0.2, M.escBody, true); panel(ev1 + 0.15, 0.3, M.escBody, true); panel(sv1 + 0.1, 0.2, M.wall, true);
    for (const v of [ev0 - 0.12, ev1 + 0.15, sv1 + 0.1]) H.box((u0 - 0.3 + eu1) / 2, v, eu1 - u0 + 0.3, 0.25, 0, -1, top + 1.1);
    // lit poster frames on the two outer faces of the stack (seen from the concourse)
    H.tx.posters.forEach((pt, i) => {
      if (i > 2) return;
      const pu = u0 + 5 + i * 2.6, pm = ctx.mat.emissive('#ffffff', 0.9, { map: pt });
      for (const [v, s] of [[ev0 - 0.12, -1], [sv1 + 0.3, 1]]) {
        K.box(1.3, 1.9, 0.06, M.steelD, [pu, 1.95, v + s * 0.03]);
        K.plane(1.16, 1.74, pm, [pu, 1.95, v + s * 0.064], [0, s > 0 ? 0 : Math.PI, 0]);
      }
    });
    // stainless kick band along the foot of the stack
    for (const v of [ev0 - 0.13, sv1 + 0.31]) boxAt(u0 - 0.3, eu1, 0, 0.18, v - 0.01, v + 0.01, M.steel);
    // railing around the opening on the platform (glass + rail), west end + the two long sides
    for (const [a0, a1, b0, b1] of [[hole.u0 - 0.05, hole.u0 + 0.05, hole.v0, hole.v1], [hole.u0, hole.u1, hole.v0 - 0.05, hole.v0 + 0.05], [hole.u0, hole.u1, hole.v1 - 0.05, hole.v1 + 0.05]]) {
      boxAt(a0, a1, top, top + 1.05, b0, b1, M.glass);
      boxAt(a0 - 0.02, a1 + 0.02, top + 1.05, top + 1.12, b0 - 0.02, b1 + 0.02, M.steel);
      H.box((a0 + a1) / 2, (b0 + b1) / 2, a1 - a0 + 0.1, b1 - b0 + 0.1, 0, top - 0.2, top + 1.2);
    }
    // step lights at the escalator mouths (green = up)
    for (const [uu, yy] of [[eu0 - 0.02, 0.9], [eu1 + 0.02, top + 0.9]]) { const m = K.box(0.04, 0.12, 0.3, ctx.mat.emissive('#6fe08a', 1.2), [uu, yy, (ev0 + ev1) / 2]); m.castShadow = false; }
  }
  // animated escalator steps (dynamic; one instanced mesh for all escalators) + the belt that carries you up
  {
    const STEP = 0.4, PATH = (e) => [{ u: e.eu0, y: 0 }, { u: e.inc0, y: 0 }, { u: e.inc1, y: e.top }, { u: e.eu1, y: e.top }];
    const lens = escalators.map(e => { const p = PATH(e); let L = 0; for (let i = 1; i < p.length; i++) L += Math.hypot(p[i].u - p[i - 1].u, p[i].y - p[i - 1].y); return L; });
    const per = lens.map(L => Math.floor(L / STEP));
    const total = per.reduce((a, b) => a + b, 0);
    const geo = new THREE.BoxGeometry(STEP * 0.96, 0.14, 1.0).translate(0, -0.07, 0);
    const im = new THREE.InstancedMesh(geo, M.escStep, total);
    im.castShadow = false; im.receiveShadow = true; im.frustumCulled = false;
    H.dyn.add(im);
    const m4 = new THREE.Matrix4(), SPEED = 0.5;
    const at = (e, s) => { const p = PATH(e); for (let i = 1; i < p.length; i++) { const l = Math.hypot(p[i].u - p[i - 1].u, p[i].y - p[i - 1].y); if (s <= l) { const f = s / l; return { u: p[i - 1].u + (p[i].u - p[i - 1].u) * f, y: p[i - 1].y + (p[i].y - p[i - 1].y) * f }; } s -= l; } return p[p.length - 1]; };
    const place = (t) => {
      let k = 0;
      escalators.forEach((e, ei) => {
        const off = (t * SPEED) % STEP;
        for (let i = 0; i < per[ei]; i++) {
          const s = i * STEP + off, q = at(e, s);
          // steps stay horizontal; on the incline each one sits on the slope
          m4.makeTranslation(q.u, Math.max(0, q.y) + 0.005, (e.ev0 + e.ev1) / 2);
          im.setMatrixAt(k++, m4);
        }
      });
      im.instanceMatrix.needsUpdate = true;
    };
    place(0);
    H.update((dt, t) => {
      if (H.visible()) place(t);
      // the belt: a player standing on an escalator is carried up at the step speed
      const pl = ctx.playerObj; if (!pl || pl.fly || dt <= 0) return;
      const u = pl.pos.x - P.ORIGIN.x, v = pl.pos.z - P.ORIGIN.z;
      for (const e of escalators) {
        if (v < e.ev0 || v > e.ev1 || u < e.eu0 || u > e.eu1) continue;
        const onIncline = u > e.inc0 && u < e.inc1;
        const y = u <= e.inc0 ? 0 : u >= e.inc1 ? e.top : e.top * (u - e.inc0) / (e.inc1 - e.inc0);
        if (Math.abs(pl.pos.y - y) < 0.4) pl.pos.x += SPEED * (onIncline ? Math.cos(e.ang) : 1) * dt;
      }
    });
  }
  return { holes, escalators };
}
