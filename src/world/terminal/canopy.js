// Platform structures of 大阪駅: the steel frame along every platform (a row of columns carrying a spine beam, cross
// arms and the light housings — everything that hangs over a platform hangs from this), full canopies (上屋) where the
// platforms run out from under the dome, and the overhead catenary (架線) over every track: lattice portal beams on
// masts, messenger + contact wires with droppers, registration arms. Also the fittings that live on the frames:
// track-number plates on the columns, clocks, speakers, CCTV, the conductor's ITV monitors at the platform ends.
import * as THREE from 'three';
import * as P from './plan.js';

const { Y } = P;
/** island frame column positions (u): clear of the stair wells, benches, name boards and the dome's tree columns */
export const ISLAND_COLS = [-101, -80, -62, -45, -28, 2, 20, 36, 56, 74, 100];
export const S_COLS = (() => { const a = []; for (let u = -205; u <= 205; u += 20) if (u < -18 || u > -1) a.push(u); return a; })();
/** v of a Shinkansen platform's frame column row, and the inward direction (toward the track) */
export const sFrame = (S) => { const back = S.edge === S.v0 ? S.v1 : S.v0, s = Math.sign(S.edge - back); return { back, s, v: back + s * 0.9 }; };

export function buildCanopy(ctx, H) {
  const { M, root } = H;
  const { mat } = ctx;
  const T = ctx.tex, F = T.FONTS;
  const K = H.kit();
  const frameM = mat.toon('#dfe3e7', { paint: 0.02 }), frameD = mat.toon('#aeb5bd', { paint: 0.02 });
  const houseM = mat.toon('#f3f4f5', { paint: 0.01 }), roofM = mat.toon('#e9ebec', { paint: 0.02, side: 'double' });
  const fasciaM = mat.toon('#c9cfd6', { paint: 0.02 }), padM = mat.toon('#e9e1cf', { paint: 0.03 });
  const box = (u0, u1, y0, y1, v0, v1, m) => K.box(u1 - u0, y1 - y0, v1 - v0, m, [(u0 + u1) / 2, (y0 + y1) / 2, (v0 + v1) / 2]);
  /** long boxes split into ≤ 60 m pieces (keeps batching / culling sane) */
  const longBox = (u0, u1, y0, y1, v0, v1, m) => { for (let u = u0; u < u1 - 1e-6; u += 60) box(u, Math.min(u1, u + 60), y0, y1, v0, v1, m); };

  // number plate texture for a track (the cube signs on the columns: big number in the line colour)
  const numTex = (trk, bg) => T.draw(128, 128, (g, w, h) => {
    g.fillStyle = '#f7f7f4'; g.fillRect(0, 0, w, h);
    g.fillStyle = bg; T.roundRect(g, 10, 10, w - 20, h - 20, 14); g.fill();
    g.fillStyle = '#fff'; g.font = `900 ${String(trk).length > 1 ? 64 : 84}px ${F.en}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(trk), w / 2, h / 2 + 4);
  }, { key: 'term.num' + trk + bg });
  const numM = (trk, bg) => mat.toon('#ffffff', { map: numTex(trk, bg), paint: 0.01 });

  // clocks (dynamic hands) collected here, updated below
  const clocks = [];
  const clock = (u, y, v, rotY) => {
    const g = H.group(u, y, v, rotY, H.dyn); const k = ctx.kit(g);
    k.box(0.06, 0.5, 0.06, frameD, [0, 0.45, 0]);
    k.cyl(0.36, 0.36, 0.14, frameD, [0, 0, 0], [Math.PI / 2, 0, 0], 24);
    const face = mat.toon('#fbfbf8', { paint: 0.01 });
    const hands = [];
    for (const s of [1, -1]) {
      k.cyl(0.32, 0.32, 0.01, face, [0, 0, s * 0.071], [Math.PI / 2, 0, 0], 24);
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; k.box(0.02, i % 3 ? 0.04 : 0.07, 0.005, M.black, [Math.sin(a) * 0.27, Math.cos(a) * 0.27, s * 0.078], [0, 0, -a]); }
      const hh = new THREE.Group(), mm = new THREE.Group(), ss = new THREE.Group();
      for (const [grp, len, wd, m] of [[hh, 0.16, 0.035, M.black], [mm, 0.25, 0.025, M.black], [ss, 0.26, 0.01, M.red]]) {
        const hm = new THREE.Mesh(new THREE.BoxGeometry(wd, len, 0.006), m); hm.position.y = len / 2 - 0.03; grp.add(hm); grp.position.z = s * (0.082 + hands.length * 0.002); g.add(grp);
      }
      hands.push({ hh, mm, ss, s });
    }
    clocks.push(hands);
  };

  // ============================================================== island platforms
  for (const I of P.ISLANDS) {
    const y = Y.plat, top = y + P.FRAME_H, vc = I.v, half = P.PLAT_LEN / 2;
    // columns (steel, with a cream padded skirt and the track-number plates facing each track)
    for (const u of ISLAND_COLS) {
      box(u - 0.17, u + 0.17, y, top + 0.25, vc - 0.17, vc + 0.17, frameM);
      box(u - 0.3, u + 0.3, y, y + 0.08, vc - 0.3, vc + 0.3, frameD);
      box(u - 0.24, u + 0.24, y + 0.08, y + 1.9, vc - 0.24, vc + 0.24, padM);
      box(u - 0.25, u + 0.25, y + 1.9, y + 1.96, vc - 0.25, vc + 0.25, frameD);
      H.box(u, vc, 0.5, 0.5, 0, y - 0.3, top);
      // Y-bracket: the cross arm + two braces
      box(u - 0.12, u + 0.12, top + 0.02, top + 0.28, vc - 3.9, vc + 3.9, frameM);
      for (const s of [-1, 1]) K.box(0.12, 0.14, 2.9, frameM, [u, top - 0.55, vc + s * 1.25], [s * 0.62, 0, 0]);
      // track-number plates on two faces, above the padding
      if (u % 2 === 0 || Math.abs(u) > 90) for (const trk of I.tracks) {
        const s = Math.sign(P.TRACKS[trk] - vc), S = P.SERVICES[trk];
        K.box(0.56, 0.56, 0.04, frameD, [u, y + 2.45, vc + s * 0.19]);
        K.plane(0.52, 0.52, numM(trk, P.LINES[S.line].color), [u, y + 2.45, vc + s * 0.212], [0, s > 0 ? 0 : Math.PI, 0]);
      }
      // extinguisher box on every other column
      if (u % 4 === 0) { box(u - 0.2, u + 0.2, y + 0.3, y + 0.95, vc + 0.24, vc + 0.34, M.red); }
    }
    // spine beam + two light housings (with the lit diffusers) + a cable duct
    longBox(-half, half, top + 0.28, top + 0.78, vc - 0.16, vc + 0.16, frameM);
    for (const s of [-1, 1]) {
      longBox(-half, half, top - 0.1, top + 0.06, vc + s * 3.4 - 0.19, vc + s * 3.4 + 0.19, houseM);
      longBox(-half + 0.3, half - 0.3, top - 0.13, top - 0.1, vc + s * 3.4 - 0.13, vc + s * 3.4 + 0.13, M.light);
      longBox(-half, half, top - 0.06, top + 0.08, vc + s * 1.6 - 0.12, vc + s * 1.6 + 0.12, frameD);
    }
    // speakers + CCTV on the arms
    for (const u of ISLAND_COLS) for (const s of [-1, 1]) {
      K.box(0.22, 0.3, 0.22, M.white, [u + 0.3, top - 0.3, vc + s * 2.3], [0.3 * s, 0, 0]);
      if (u === 20 || u === -62) { K.box(0.14, 0.14, 0.3, M.white, [u - 0.3, top - 0.2, vc + s * 3.0]); K.sphere(0.06, M.black, [u - 0.3, top - 0.2, vc + s * 3.16], 8); }
    }
    // canopies beyond the dome (roof panels on the frame, fascia along both edges)
    for (const [a, b] of [[-half - 1, -P.DOME_U], [P.DOME_U, half + 1]]) {
      for (const s of [-1, 1]) {
        K.box(b - a, 0.14, 5.1, roofM, [(a + b) / 2, top + 0.92 + 0.08, vc + s * 2.45], [s * -0.06, 0, 0]);
        box(a, b, top + 0.72, top + 1.2, vc + s * 5.0 - 0.1, vc + s * 5.0 + 0.1, fasciaM);
      }
      for (let u = a + 2; u < b; u += 4.5) box(u - 0.08, u + 0.08, top + 0.62, top + 0.9, vc - 4.9, vc + 4.9, frameM);
    }
    // clocks hanging from the spine (both faces along the platform)
    for (const u of [-45, 56]) clock(u + 2.2, top - 0.7, vc, Math.PI / 2);
    // ITV monitors for the conductor at both platform ends (on a pole, angled toward the train's rear)
    for (const e of [-1, 1]) for (const trk of I.tracks) {
      const s = Math.sign(P.TRACKS[trk] - vc), u = e * (half - 6), v = vc + s * 3.2;
      box(u - 0.06, u + 0.06, y, y + 2.6, v - 0.06, v + 0.06, frameD);
      const g = H.group(u, y + 2.75, v, e > 0 ? Math.PI / 2 - 0.5 * s : -Math.PI / 2 + 0.5 * s); const k = ctx.kit(g);
      k.box(0.9, 0.6, 0.12, M.black, [0, 0, 0]);
      k.plane(0.8, 0.5, mat.emissive('#7a98b4', 0.55), [0, 0, 0.062]);
      H.box(u, v, 0.3, 0.3, 0, y - 0.3, y + 2.6);
    }
  }

  // ============================================================== Shinkansen platforms (columns along the back, cantilevered arms)
  for (const S of P.S_PLATS) {
    const y = Y.platS, top = y + P.FRAME_H, { back, s, v: vcol } = sFrame(S), half = P.S_PLAT_LEN / 2;
    const vEdge = S.edge;
    for (const u of S_COLS) {
      box(u - 0.2, u + 0.2, y, top + 0.3, vcol - 0.2, vcol + 0.2, frameM);
      box(u - 0.26, u + 0.26, y + 0.05, y + 1.9, vcol - 0.26, vcol + 0.26, padM);
      H.box(u, vcol, 0.55, 0.55, 0, y - 0.3, top);
      const a0 = Math.min(vcol, vEdge + s * -0.3), a1 = Math.max(vcol, vEdge + s * -0.3);
      box(u - 0.12, u + 0.12, top + 0.02, top + 0.34, a0 - 0.2, a1 + 0.2, frameM);
      K.box(0.12, 0.14, 3.2, frameM, [u, top - 0.75, vcol + s * 1.2], [s * -0.75, 0, 0]);
      if (u % 40 === 5 || u % 40 === -35) { K.box(0.6, 0.6, 0.04, frameD, [u, y + 2.45, vcol + s * 0.23]); K.plane(0.56, 0.56, numM(S.track, '#1553a8'), [u, y + 2.45, vcol + s * 0.252], [0, s > 0 ? 0 : Math.PI, 0]); }
    }
    longBox(-half, half, top + 0.34, top + 0.84, vcol - 0.17, vcol + 0.17, frameM);
    for (const d of [2.4, 5.6]) {
      const v = vcol + s * d;
      longBox(-half, half, top - 0.1, top + 0.06, v - 0.19, v + 0.19, houseM);
      longBox(-half + 0.3, half - 0.3, top - 0.13, top - 0.1, v - 0.13, v + 0.13, M.light);
    }
    for (const u of S_COLS) K.box(0.22, 0.3, 0.22, M.white, [u + 0.3, top - 0.3, vcol + s * 3.8], [0.3 * s, 0, 0]);
    // canopy beyond the dome: one sloped roof from the back wall out over the edge
    for (const [a, b] of [[-half - 1, -P.DOME_U], [P.DOME_U, half + 1]]) {
      const w = Math.abs(vEdge - back) + 1.4, vm = (back + vEdge + s * 1.4) / 2;
      K.box(b - a, 0.16, w, roofM, [(a + b) / 2, top + 1.0, vm], [s * 0.05, 0, 0]);
      box(a, b, top + 0.7, top + 1.25, vEdge + s * 1.4 - 0.1, vEdge + s * 1.4 + 0.1, fasciaM);
    }
    for (const u of [-60, 45, 150]) clock(u + 2.2, top - 0.7, vcol + s * 4.0, Math.PI / 2);
  }

  // ============================================================== catenary
  const wires = [];      // [u0, u1, y, v, thickness]
  const droppers = [];   // [u, v, y0, y1]
  const MASTS = [];
  const railY = Y.rail;
  const convV = Object.values(P.TRACKS), shinV = Object.values(P.S_TRACKS);
  const portal = (u, va, vb, yBeam, tracks) => {
    const v0 = Math.min(va, vb), v1 = Math.max(va, vb);
    // masts (H-steel) on foundations on the deck
    for (const v of [va, vb]) { box(u - 0.2, u + 0.2, Y.deck, yBeam + 0.6, v - 0.2, v + 0.2, frameD); box(u - 0.4, u + 0.4, Y.deck, Y.deck + 0.4, v - 0.4, v + 0.4, M.concreteD); MASTS.push([u, v]); H.box(u, v, 0.45, 0.45, 0, Y.deck, yBeam); }
    // lattice beam: two chords + verticals + diagonals
    for (const dy of [0, 0.9]) box(u - 0.1, u + 0.1, yBeam + dy - 0.07, yBeam + dy + 0.07, v0, v1, frameD);
    const n = Math.max(2, Math.round((v1 - v0) / 1.6));
    for (let i = 0; i <= n; i++) {
      const v = v0 + (v1 - v0) * i / n;
      box(u - 0.05, u + 0.05, yBeam, yBeam + 0.9, v - 0.04, v + 0.04, frameD);
      if (i < n) { const vn = v0 + (v1 - v0) * (i + 1) / n, L = Math.hypot(vn - v, 0.9); K.box(0.06, 0.05, L, frameD, [u, yBeam + 0.45, (v + vn) / 2], [(i % 2 ? 1 : -1) * Math.atan2(0.9, vn - v), 0, 0]); }
    }
    // hangers: beam -> messenger, and the registration arm pulling the contact wire (zig-zag stagger)
    for (const tv of tracks) {
      const my = railY + 6.0, cy = railY + 5.05, st = ((Math.round(u / 50) % 2) ? 0.2 : -0.2);
      box(u - 0.03, u + 0.03, my, yBeam, tv - 0.03, tv + 0.03, frameD);
      K.cyl(0.07, 0.07, 0.4, M.white, [u, my + 0.35, tv], null, 8);   // insulator
      K.box(0.04, 0.04, 0.9, frameD, [u, cy + 0.25, tv + st * 0.5], [0.55, 0, 0]);
    }
  };
  for (let u = -400; u <= 400; u += 50) {
    portal(u, 29.35, -25.6, railY + 7.2, convV);
    portal(u + 25, -31.5, -66.6, railY + 7.6, shinV);
  }
  for (const [list, a, b] of [[convV, -420, 420], [shinV, -440, 440]]) for (const tv of list) {
    const my = railY + 6.0, cy = railY + 5.05;
    wires.push([a, b, my, tv, 0.024], [a, b, cy, tv, 0.03]);
    for (let u = a + 2.5; u < b; u += 5) { const sag = 0.35 * Math.pow(Math.sin(Math.PI * (((u - a) % 50 + 50) % 50) / 50), 1); droppers.push([u, tv, cy, my - sag]); }
  }
  {
    // wires: long thin boxes (static, batched)
    const geos = [];
    for (const [a, b, y, v, t] of wires) for (let u = a; u < b; u += 80) { const g = new THREE.BoxGeometry(Math.min(80, b - u), t, t); g.translate((u + Math.min(b, u + 80)) / 2, y, v); geos.push(g); }
    const wm = new THREE.Mesh(ctx.geo.mergeGeometries(geos, false), mat.toon('#5a5560', { paint: 0.01 }));
    wm.castShadow = false; root.add(wm);
    // droppers (one instanced mesh)
    const im = new THREE.InstancedMesh(new THREE.BoxGeometry(0.012, 1, 0.012), mat.toon('#6d6872', { paint: 0.01 }), droppers.length);
    const m4 = new THREE.Matrix4();
    droppers.forEach(([u, v, y0, y1], i) => { m4.makeScale(1, y1 - y0, 1); m4.setPosition(u, (y0 + y1) / 2, v); im.setMatrixAt(i, m4); });
    im.castShadow = false; im.computeBoundingSphere(); root.add(im);
  }

  // ---- clock hands follow the game clock (16:02 at t = 0)
  H.update((dt, t) => {
    if (!H.visible()) return;
    const secs = (16 * 3600 + 2 * 60) + t;
    const hA = (secs / 43200) * Math.PI * 2, mA = ((secs % 3600) / 3600) * Math.PI * 2, sA = Math.floor(secs % 60) / 60 * Math.PI * 2;
    for (const hands of clocks) for (const { hh, mm, ss, s } of hands) { hh.rotation.z = -s * hA; mm.rotation.z = -s * mA; ss.rotation.z = -s * sA; }
  });
  return { masts: MASTS };
}
