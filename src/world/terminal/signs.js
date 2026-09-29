// Signage of 大阪駅: 駅名標 on every platform, hanging platform / exit / transfer signs, car-stop markers at every
// door position, and the live LCD departure boards (発車標) — the concourse board over the 中央改札, the
// Shinkansen board over the transfer gates, and one per platform — redrawn from the timetable (JP / EN).
import * as THREE from 'three';
import * as P from './plan.js';
import { sFrame } from './canopy.js';

const TYPE_COL = { 新快速: '#3f8fe0', 快速: '#f08a2a', 普通: '#d8d8d8', 環状: '#f08a2a', 直通: '#3fb56b' };
const LINE_BADGE = (trk) => { const S = P.SERVICES[trk]; return { t: String(trk), bg: P.LINES[S.line].color, fg: S.line === 'sakuragawa' ? '#3a3346' : '#fff' }; };
/** JR West style: the track number in a white ring + the line symbol square */
const TRACK_BADGES = (trk) => { const S = P.SERVICES[trk], Ln = P.LINES[S.line]; return [{ t: String(trk), bg: '#ffffff', fg: '#27324a', round: true }, { t: Ln.sym, bg: Ln.color, fg: '#fff' }]; };
const dirText = (S) => `${S.via ? S.via + '・' : ''}${S.dest}方面`;

export function buildSigns(ctx, H) {
  const { root, dyn, M, tx } = H;
  const { mat } = ctx;
  const T = ctx.tex, F = T.FONTS;
  const K = H.kit();
  const signM = (o) => mat.toon('#ffffff', { map: tx.sign(o), paint: 0.01 });
  /** double-sided hanging sign centred at (u, y, v); faces ±u (rot 'u') or ±v (rot 'v'); rods to the ceiling */
  /** rods: [[offset along the sign's width (world v for axis 'u', world u for 'v'), top y], ...] — hangers up to a beam */
  const hang = (u, y, v, w, h, front, back, axis = 'u', ceil = null, rods = null) => {
    const rot = axis === 'u' ? Math.PI / 2 : 0;
    const g = H.group(u, y, v, rot); const k = ctx.kit(g);
    k.box(w + 0.12, h + 0.12, 0.1, M.steelD, [0, 0, 0]);
    k.box(w + 0.16, 0.05, 0.14, M.steelD, [0, h / 2 + 0.085, 0]);
    k.plane(w, h, front, [0, 0, 0.051]);
    if (back) k.plane(w, h, back, [0, 0, -0.051], [0, Math.PI, 0]);
    const list = rods || (ceil ? [[-w * 0.35, ceil], [w * 0.35, ceil]] : []);
    for (const [off, top] of list) {
      const x = axis === 'u' ? -off : off;
      k.box(0.035, top - y - h / 2, 0.035, M.steelD, [x, (top - y + h / 2) / 2, 0]);
      k.box(0.12, 0.05, 0.12, M.steelD, [x, top - y - 0.03, 0]);
    }
    return g;
  };

  // ================================================================ platforms (conventional)
  for (const I of P.ISLANDS) {
    const y = P.Y.plat, top = y + P.FRAME_H, [west, east] = P.NEIGHBOURS[I.id];
    const Ln = P.LINES[P.SERVICES[I.tracks[1]].line];
    const num = I.id === 'P3' ? 'O11' : 'A47';
    const nb = tx.nameBoard(west, east, 'we' + I.id, { color: Ln.color, num }), nbR = tx.nameBoard(east, west, 'ew' + I.id, { color: Ln.color, num });
    const nameM = mat.toon('#ffffff', { map: nb, paint: 0.01 }), nameRM = mat.toon('#ffffff', { map: nbR, paint: 0.01 });
    for (const u of [-58, 52]) {
      // 駅名標 on two posts, readable from both tracks (with a lit top cap)
      const g = H.group(u, y, I.v); const k = ctx.kit(g);
      for (const s of [-1, 1]) k.box(0.1, 2.6, 0.1, M.steelD, [s * 1.35, 1.3, 0]);
      k.box(2.9, 1.14, 0.12, M.white, [0, 2.0, 0]);
      k.box(3.0, 0.1, 0.26, M.steelD, [0, 2.62, 0]);
      k.plane(2.8, 1.05, nameM, [0, 2.0, 0.061]); k.plane(2.8, 1.05, nameRM, [0, 2.0, -0.061], [0, Math.PI, 0]);
      H.box(u, I.v, 2.9, 0.3, 0, y - 0.3, y + 2.6);
    }
    // track signs (のりば案内), hanging from the cable duct + the light housing, facing along the platform
    for (const u of [-33, 30]) for (const trk of I.tracks) {
      const S = P.SERVICES[trk], side = Math.sign(P.TRACKS[trk] - I.v), Lx = P.LINES[S.line];
      const o = { text: `${Lx.name}  ${dirText(S)}`, sub: `${Lx.en} for ${S.destEn}`, badges: TRACK_BADGES(trk), key: 'plat' + trk };
      hang(u, y + 3.25, I.v + side * 2.5, 3.6, 0.62, signM(o), signM(o), 'u', null, [[-side * 0.9, top - 0.06], [side * 0.9, top - 0.1]]);
    }
    // exit sign over the stair top (yellow = exits), hanging from both cable ducts
    const L = P.LIFTS.find(l => l.plat === I.id);
    const ex = signM({ text: '出口  中央口・新幹線', sub: 'Exit · Central Gate · Shinkansen', bg: '#f2c230', fg: '#2d3038', arrow: 'left', key: 'exitP' });
    hang(L.u0 + 15.5, y + 3.2, I.v, 4.0, 0.62, ex, ex, 'u', null, [[-1.6, top - 0.06], [1.6, top - 0.06]]);
  }
  // Shinkansen platforms: name boards + track signs (hanging between the two light housings)
  const snbO = tx.nameBoard(P.NEIGHBOURS.S[0], P.NEIGHBOURS.S[1], 'shinO', { color: '#2a4d8f', noNum: true }), snbOR = tx.nameBoard(P.NEIGHBOURS.S[1], P.NEIGHBOURS.S[0], 'shinOR', { color: '#2a4d8f', noNum: true });
  for (const S of P.S_PLATS) {
    const y = P.Y.platS, top = y + P.FRAME_H, vm = (S.v0 + S.v1) / 2, face = S.edge === S.v0 ? -1 : 1;  // side facing the track
    const fr = sFrame(S), vs = fr.v + fr.s * 4.0;   // midway between the light housings
    for (const u of [-120, -40, 60, 150]) {
      const g = H.group(u, y, vm + face * 1.2, face < 0 ? Math.PI : 0); const k = ctx.kit(g);
      for (const s of [-1, 1]) k.box(0.1, 2.6, 0.1, M.steelD, [s * 1.35, 1.3, 0]);
      k.box(2.9, 1.14, 0.12, M.white, [0, 2.0, 0]);
      k.box(3.0, 0.1, 0.26, M.steelD, [0, 2.62, 0]);
      k.plane(2.8, 1.05, mat.toon('#ffffff', { map: face < 0 ? snbO : snbOR, paint: 0.01 }), [0, 2.0, 0.061]);
      H.box(u, vm + face * 1.2, 2.9, 0.3, 0, y - 0.3, y + 2.6);
    }
    const trk = S.track, sv = P.S_SERVICES[trk];
    const o = { text: `${trk}番線  東海道・山陽新幹線  ${sv.dest}方面`, sub: `Track ${trk} · Tōkaidō-San'yō Shinkansen for ${sv.destEn}`, badges: [{ t: String(trk), bg: '#ffffff', fg: '#1d3564', round: true }], key: 'shin' + trk, bg: '#1d3564' };
    for (const u of [-80, 0, 80]) hang(u, y + 3.25, vs, 3.8, 0.62, signM(o), signM(o), 'u', null, [[-1.6, top - 0.1], [1.6, top - 0.1]]);
  }
  // car-stop markers (乗車位置) painted at every door
  const markTex = (n, c) => T.draw(128, 128, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = c; g.beginPath(); g.moveTo(w / 2, 10); g.lineTo(w - 10, h - 10); g.lineTo(10, h - 10); g.closePath(); g.fill(); g.fillStyle = '#fff'; g.font = `900 46px ${F.en}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(n), w / 2, h * 0.64); }, { key: 'term.mark' + n + c });
  for (const I of P.ISLANDS) for (const trk of I.tracks) {
    const S = P.SERVICES[trk], edgeV = I.v + Math.sign(P.TRACKS[trk] - I.v) * (P.ISLAND_W / 2), inward = -Math.sign(P.TRACKS[trk] - I.v);
    const lc = P.LINES[S.line].color;
    P.convDoors(S.cars).forEach((u, i) => {
      const m = mat.decal('#ffffff', { map: markTex(1 + (i >> 2), lc), transparent: true });
      K.plane(0.5, 0.5, m, [u, P.Y.plat + 0.006, edgeV + inward * 1.6], [-Math.PI / 2, 0, inward > 0 ? Math.PI : 0]);
    });
  }
  for (const S of P.S_PLATS) P.shinDoors().forEach((u, i) => {
    const inward = S.edge === S.v0 ? 1 : -1;
    K.plane(0.6, 0.6, mat.decal('#ffffff', { map: markTex(i + 1, '#1553a8'), transparent: true }), [u, P.Y.platS + 0.006, S.edge + inward * 1.7], [-Math.PI / 2, 0, inward > 0 ? Math.PI : 0]);
  });

  // ================================================================ concourse signs
  const CE = 4.4;
  for (const L of P.LIFTS) {
    const nums = L.s ? [L.plat.slice(1)] : P.ISLANDS.find(i => i.id === L.plat).tracks.map(String);
    const o = L.s ? { text: `新幹線 ${nums[0]}番線  ${P.S_SERVICES[nums[0]].dest}方面`, sub: `Shinkansen Track ${nums[0]}`, badges: [{ t: nums[0], bg: '#1553a8' }], arrow: 'up', key: 'liftS' + nums[0], bg: '#233a66' }
      : { text: `${nums.join('・')}番のりば`, sub: nums.map(n => `${n}: ${P.LINES[P.SERVICES[n].line].name} ${P.SERVICES[n].dest}`).join('   '), badges: nums.map(n => LINE_BADGE(+n)), arrow: 'up', key: 'lift' + nums.join('') };
    hang(L.u0 - 1.2, 3.35, L.v - 0.2, 4.8, 0.8, signM(o), null, 'u', CE);
  }
  // over the central gates (outside: 中央口 / inside: 出口)
  const gIn = signM({ text: '出口  中央口', sub: 'Exit · Central Gate', bg: '#f2c230', fg: '#2d3038', key: 'exitIn' });
  const gOut = signM({ text: '中央改札口  のりば 1〜6・新幹線', sub: 'Central Gate · Tracks 1–6 · Shinkansen', key: 'gateOut' });
  K.box(22, 0.9, 0.3, M.steelD, [0, CE - 0.45, P.GATES.v]);
  K.plane(10, 0.8, gOut, [-6, CE - 0.45, P.GATES.v + 0.16]); K.plane(10, 0.8, gIn, [-6, CE - 0.45, P.GATES.v - 0.16], [0, Math.PI, 0]);
  const sIn = signM({ text: '新幹線のりかえ口', sub: 'Shinkansen Transfer Gates', bg: '#1a4f96', key: 'sgate' });
  K.box(14, 0.9, 0.3, M.steelD, [-2, CE - 0.45, P.SGATES.v]);
  K.plane(8, 0.8, sIn, [-4.5, CE - 0.45, P.SGATES.v + 0.16]);
  K.plane(8, 0.8, signM({ text: '在来線のりかえ口  1〜6番のりば', sub: 'Transfer to Tracks 1–6', key: 'sgateBack' }), [-4.5, CE - 0.45, P.SGATES.v - 0.16], [0, Math.PI, 0]);
  // directions across the concourse
  hang(4, 3.4, 18, 6, 0.8, signM({ text: '新幹線のりかえ口', sub: 'Shinkansen Transfer', arrow: 'up', badges: [{ t: '新', bg: '#1553a8' }], key: 'toShin' }), signM({ text: '出口  中央口', sub: 'Exit · Central Gate', bg: '#f2c230', fg: '#2d3038', arrow: 'up', key: 'toExit' }), 'v', CE);
  hang(4, 3.4, -14, 6, 0.8, signM({ text: '新幹線のりかえ口', sub: 'Shinkansen Transfer', arrow: 'up', badges: [{ t: '新', bg: '#1553a8' }], key: 'toShin' }), signM({ text: '出口  中央口', sub: 'Exit · Central Gate', bg: '#f2c230', fg: '#2d3038', arrow: 'up', key: 'toExit' }), 'v', CE);
  // fare chart above the ticket machines
  K.box(8.2, 3.3, 0.12, M.steelD, [-23, 2.9, 33.2]);
  K.plane(8, 3.1, mat.toon('#ffffff', { map: tx.fareMap, paint: 0.01 }), [-23, 2.9, 33.27]);
  // its back (seen from inside the gates): a lit ad panel
  const adTex = T.draw(1024, 400, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#fbd3e0'); gr.addColorStop(0.55, '#fff6f0'); gr.addColorStop(1, '#cfe6f6'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(233,120,160,0.35)'; for (let i = 0; i < 26; i++) { const x = (i * 97) % w, y = (i * 53) % h; g.beginPath(); g.ellipse(x, y, 16, 9, i, 0, 6.3); g.fill(); }
    g.fillStyle = '#0072bc'; T.roundRect(g, 40, 40, 150, 100, 18); g.fill(); g.fillStyle = '#fff'; g.font = `italic 900 70px ${F.en}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('JR', 115, 94);
    g.fillStyle = '#2d3038'; g.textAlign = 'left'; g.font = `900 84px ${F.sans}`; g.fillText('春の京都へ。', 230, 110);
    g.font = `700 44px ${F.sans}`; g.fillText('新快速で 大阪から 約30分', 236, 200);
    g.fillStyle = '#d9463b'; g.font = `900 40px ${F.sans}`; g.fillText('ICOCA で おトクに', 236, 280);
    g.fillStyle = '#2d3038'; g.font = `500 26px ${F.en}`; g.fillText('JR WEST  ·  Kyoto in Spring', 236, 350);
  }, { key: 'term.adFare' });
  K.plane(8, 3.1, mat.emissive('#ffffff', 0.92, { map: adTex }), [-23, 2.9, 33.13], [0, Math.PI, 0]);

  // ================================================================ LCD departure boards (dynamic)
  const boards = [];
  const lcd = (w, h, rows, u, y, v, rotY, pw, ph, list, shin = false, B2 = 'both', rods = null) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    const g = H.group(u, y, v, rotY, dyn); const k = ctx.kit(g);
    k.box(pw + 0.2, ph + 0.2, 0.18, M.black, [0, 0, 0]);
    k.box(pw + 0.24, 0.06, 0.24, M.steelD, [0, ph / 2 + 0.13, 0]);
    for (const [x, topY] of rods || []) { k.box(0.045, topY - y - ph / 2 - 0.1, 0.045, M.steelD, [x, (topY - y + ph / 2 + 0.1) / 2, 0]); k.box(0.14, 0.05, 0.14, M.steelD, [x, topY - y - 0.03, 0]); }
    const em = mat.emissive('#ffffff', 1.0, { map: tex });
    k.plane(pw, ph, em, [0, 0, 0.095]);
    if (B2 === 'both') k.plane(pw, ph, em, [0, 0, -0.095], [0, Math.PI, 0]);
    boards.push({ c, g2: c.getContext('2d'), tex, rows, list, shin, w, h });
  };
  // concourse board (faces the entrance): all six tracks. It hangs from the ceiling a few metres in front of the
  // gates, over the walkway — clear of the gate sign, the staffed booth (2.6 m) and people's heads (bottom ≈ 2.05 m)
  lcd(1024, 640, 6, 2.2, 3.2, P.GATES.v + 3.6, 0, 3.4, 2.125, [1, 2, 3, 4, 5, 6], false, 'both', [[-1.3, CE], [1.3, CE]]);
  // Shinkansen board over the transfer gates (faces the conventional side)
  lcd(1024, 256, 2, 4.2, 3.35, P.SGATES.v + 0.5, 0, 4.8, 1.2, [13, 14], true, 'both', [[-1.8, CE], [1.8, CE]]);
  // one per island at the stair top (faces east along the platform, hanging from the cable ducts) + one per Shinkansen platform
  for (const I of P.ISLANDS) lcd(1024, 256, 2, 8, P.Y.plat + 3.2, I.v, Math.PI / 2, 3.8, 0.95, I.tracks, false, 'both', [[-1.6, P.Y.plat + P.FRAME_H - 0.06], [1.6, P.Y.plat + P.FRAME_H - 0.06]]);
  for (const S of P.S_PLATS) { const fr = sFrame(S); lcd(1024, 256, 1, 30, P.Y.platS + 3.3, fr.v + fr.s * 4.0, Math.PI / 2, 3.8, 0.95, [S.track], true, 'both', [[-1.6, P.Y.platS + P.FRAME_H - 0.1], [1.6, P.Y.platS + P.FRAME_H - 0.1]]); }

  function drawBoard(B, t, en) {
    const g = B.g2, w = B.w, h = B.h;
    g.fillStyle = '#0a0c10'; g.fillRect(0, 0, w, h);
    const head = B.rows > 2 ? 64 : 0;
    if (head) { g.fillStyle = '#1c2230'; g.fillRect(0, 0, w, head); g.fillStyle = '#e8ecf2'; g.font = `700 34px ${F.sans}`; g.textBaseline = 'middle'; g.textAlign = 'left'; g.fillText(en ? 'Departures' : '発車案内', 20, 32); g.textAlign = 'right'; g.fillText(P.clock(t), w - 20, 32); }
    const rh = (h - head) / B.rows;
    B.list.forEach((trk, i) => {
      const y = head + rh * i + rh / 2;
      g.fillStyle = i % 2 ? '#0e1117' : '#0a0c10'; g.fillRect(0, head + rh * i, w, rh);
      const shin = B.shin, S = shin ? P.S_SERVICES[trk] : P.SERVICES[trk];
      const dep = P.nextDepartures(trk, t, 1, shin)[0];
      const fs = Math.min(52, rh * 0.5);
      g.textBaseline = 'middle';
      // track number
      g.fillStyle = shin ? '#1553a8' : P.LINES[S.line].color; T.roundRect(g, 14, y - rh * 0.34, rh * 0.68, rh * 0.68, 8); g.fill();
      g.fillStyle = '#fff'; g.font = `900 ${fs * 0.9}px ${F.en}`; g.textAlign = 'center'; g.fillText(String(trk), 14 + rh * 0.34, y + 2);
      let x = 24 + rh * 0.68;
      if (shin) { g.fillStyle = '#ff8a2a'; g.font = `700 ${fs}px ${F.sans}`; g.textAlign = 'left'; T.fitText(g, en ? `${S.nameEn} ${S.no}` : `${S.name} ${S.no}号`, x + 6, y, fs * 5.0, fs, en ? F.en : F.sans, 700); x += fs * 5.5; }
      else { g.fillStyle = TYPE_COL[S.type] || '#ddd'; g.font = `700 ${fs}px ${F.sans}`; g.textAlign = 'left'; T.fitText(g, en ? S.typeEn : S.type, x + 8, y, fs * 3.3, fs, en ? F.en : F.sans, 700); x += fs * 3.6; }
      g.fillStyle = '#ffb347'; g.font = `700 ${fs}px ${F.sans}`; g.textAlign = 'left'; g.fillText(P.clock(dep), x, y); x += fs * 2.9;
      g.fillStyle = '#f4f2ea'; T.fitText(g, en ? S.destEn : S.dest + (S.via && !en ? `(${S.via}経由)` : ''), x, y, w - x - (shin ? 200 : 200), fs, en ? F.en : F.sans, 700);
      g.fillStyle = '#9fe0ff'; g.font = `700 ${fs * 0.8}px ${F.sans}`; g.textAlign = 'right';
      const st = shin ? P.shinState(trk, t) : P.convState(trk, t);
      const note = st.phase === 'dwell' ? (en ? 'Boarding' : '発車待ち') : st.phase === 'approach' ? (en ? 'Arriving' : 'まもなく到着') : shin ? (en ? '16 cars' : '16両') : (en ? `${S.cars} cars` : `${S.cars}両`);
      g.fillText(note, w - 16, y);
    });
    B.tex.needsUpdate = true;
  }
  let nextDraw = -1;
  H.update((dt, t) => {
    if (!H.visible() || t < nextDraw) return;
    nextDraw = t + 2;
    const en = Math.floor(t / 8) % 2 === 1;
    for (const B of boards) drawBoard(B, t, en);
  });
  for (const B of boards) drawBoard(B, 0, false);
  return { boards };
}
