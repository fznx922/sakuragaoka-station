// Station operations of 大阪駅, driven by the timetable: an approach melody (接近メロディ) and a departure melody
// (発車メロディ) per track, spoken JR-style approach / arrival / door-closing announcements (only on the platform you
// are on, so they never talk over each other), Shinkansen chimes, the electronic departure bell and announcements
// for arriving, departing and passing trains — and the ride home: step into the 桜川線 train on track 1.
// Your own recordings can replace any of these sounds: list them in audio/terminal/manifest.json (see the README
// there), e.g. { "depart2": "my-depart-melody.mp3" }.
import * as P from './plan.js';

const kana = (s) => P.KANA[s] || s;
/** per-track melodies (sound names in core/audio.js) — track 1 plays the town's own「さくら坂」 */
const APPROACH = { 1: 'approachA', 2: 'approachD', 3: 'approachB', 4: 'approachE', 5: 'approachF', 6: 'approachC' };
const DEPART = { 1: 'departMelody', 2: 'departA', 3: 'departB', 4: 'departD', 5: 'departF', 6: 'departE' };
const typeRead = (S) => (S.type === '環状' ? '大阪環状線、内回り' : S.type === '直通' ? 'ゆめ咲線、直通' : S.type);

export function buildOps(ctx, H) {
  const { L } = ctx;
  const au = ctx.audio;
  const islandOf = (trk) => P.ISLANDS.find(i => i.tracks.includes(+trk));
  const last = new Map();
  /** where the player is: island id / Shinkansen platform id / 'concourse' / null (elsewhere) */
  const where = () => {
    const p = H.player(); if (!p) return null;
    if (p.y < 4) return 'concourse';
    for (const I of P.ISLANDS) if (Math.abs(p.v - I.v) < P.ISLAND_W / 2 + 0.5) return I.id;
    for (const S of P.S_PLATS) if (p.v > S.v0 - 0.5 && p.v < S.v1 + 0.5) return S.id;
    return null;
  };
  const paAt = (v, y) => { const p = H.player(); const u = p ? Math.max(-90, Math.min(90, p.u)) : 0; const w = P.toWorld(u, v); return { x: w.x, y: y + 4.2, z: w.z }; };
  const say = (text, pos) => au?.play('speak', { position: pos, text });
  // optional real recordings: audio/terminal/manifest.json maps sound names to files next to it
  if (au?.useFile && typeof fetch === 'function' && typeof location !== 'undefined' && location.protocol !== 'file:') {
    fetch('audio/terminal/manifest.json').then(r => (r.ok ? r.json() : null)).then(m => {
      if (!m || typeof m !== 'object') return;
      for (const [name, file] of Object.entries(m)) if (typeof file === 'string' && file && !name.startsWith('_')) au.useFile(name, 'audio/terminal/' + file);
    }).catch(() => {});
  }

  // ------------------------------------------------ station ambience: guide chimes, escalator + concourse PA
  const chimeSpots = [...P.LIFTS.map(L => ({ u: L.u0 - 1.2, y: 2.4, v: L.v })), { u: 0, y: 2.6, v: P.GATES.v }, { u: -2, y: 2.6, v: P.SGATES.v }];
  const PA_LINES = [
    '本日も、JR西日本を、ご利用いただきまして、ありがとうございます。',
    '駆け込み乗車は、大変危険ですので、おやめください。',
    '不審な物を見かけた際は、お近くの駅係員まで、お知らせください。',
    '新幹線をご利用のお客様は、新幹線のりかえ口をご利用ください。',
    'ホームでは、歩きながらの、スマートフォンの操作は、おやめください。',
  ];
  let nextChime = 0, nextEsc = 0, nextPA = 40, paIdx = 0;
  H.update((dt, t) => {
    const p = H.player(); if (!p || dt <= 0) return;
    if (t >= nextChime) {
      nextChime = t + 3.2;
      let best = null, bd = 16;
      for (const c of chimeSpots) { const d = Math.hypot(p.u - c.u, p.v - c.v) + Math.abs(p.y - 0) * 2; if (d < bd) { bd = d; best = c; } }
      if (best && p.y < 4) { const w = P.toWorld(best.u, best.v); au?.play('guideChime', { position: { x: w.x, y: best.y, z: w.z } }); }
    }
    if (t >= nextEsc) {
      nextEsc = t + 34;
      const L = P.LIFTS.find(L => p.y < 4 && Math.hypot(p.u - (L.u0 - 1), p.v - (L.v - 2.1)) < 12);
      if (L) { const w = P.toWorld(L.u0 + 1, L.v - 2.1); say('エスカレーターを、ご利用の際は、手すりにおつかまりになり、黄色い線の内側に、お乗りください。', { x: w.x, y: 2.2, z: w.z }); }
    }
    if (t >= nextPA) {
      nextPA = t + 70;
      if (p.y < 4) { const w = P.toWorld(p.u, p.v); au?.play('announce', { position: { x: w.x, y: 4, z: w.z + 6 }, text: PA_LINES[paIdx++ % PA_LINES.length] }); }
    }
  });

  H.update((dt, t) => {
    const here = where();
    // ------------------------------------------------ conventional tracks
    for (const trk of Object.keys(P.SERVICES)) {
      const S = P.SERVICES[trk], I = islandOf(trk), st = P.convState(+trk, t), tt = st.tIn;
      const prev = last.get(trk); last.set(trk, tt);
      if (prev === undefined || tt < prev || dt <= 0 || !here) continue;
      const cross = (th) => prev < th && tt >= th;
      const pa = paAt(I.v, P.Y.plat), mine = here === I.id;
      const ta = P.T_CONV.approach, dm = ta + P.T_CONV.melody;
      if (cross(1)) au?.play(APPROACH[trk], { position: pa });
      if (cross(5.5) && mine) say(`まもなく、${trk}番のりばに、${typeRead(S)}、${S.via ? kana(S.via) + '方面、' : ''}${kana(S.dest)}行きが、${S.cars}両で、まいります。危ないですから、黄色い点字ブロックまで、お下がりください。`, pa);
      if (cross(ta + 1.5) && mine) say(`${P.NAME.kana}、${P.NAME.kana}です。ご乗車、ありがとうございます。お忘れ物の、ございませんよう、ご注意ください。`, pa);
      if (cross(ta + 14) && mine) say(`${trk}番のりばの電車は、${typeRead(S)}、${kana(S.dest)}行きです。発車まで、しばらくお待ちください。`, pa);
      if (cross(dm)) au?.play(DEPART[trk], { position: pa });
      if (cross(dm + 7.6) && mine) say(`${trk}番のりば、ドアが閉まります。ご注意ください。駆け込み乗車は、おやめください。`, pa);
    }
    // ------------------------------------------------ Shinkansen
    for (const trk of Object.keys(P.S_SERVICES)) {
      const S = P.S_SERVICES[trk], st = P.shinState(trk, t), tt = st.tIn;
      const prev = last.get('s' + trk); last.set('s' + trk, tt);
      if (prev === undefined || tt < prev || dt <= 0 || !here) continue;
      const cross = (th) => prev < th && tt >= th;
      if (S.pass) {
        if (cross(6)) for (const Pl of P.S_PLATS) { const pa = paAt((Pl.v0 + Pl.v1) / 2, P.Y.platS); au?.play('shinChime', { position: pa }); if (here === Pl.id) setTimeout(() => say('まもなく、通過列車が、まいります。危ないですから、黄色い点字ブロックの内側まで、お下がりください。', pa), 1400); }
        continue;
      }
      const Pl = P.S_PLATS.find(p => p.track === +trk), pa = paAt((Pl.v0 + Pl.v1) / 2, P.Y.platS), mine = here === Pl.id;
      const ta = P.T_SHIN.approach, dm = ta + P.T_SHIN.melody;
      const nm = `${S.name}、${S.no}号`;
      if (cross(4)) au?.play('shinChime', { position: pa });
      if (cross(6) && mine) say(`まもなく、${trk}番線に、${nm}、${kana(S.dest)}行きが、到着します。黄色い点字ブロックまで、お下がりください。この電車は、16両です。自由席は、1号車から、3号車です。`, pa);
      if (cross(ta + 2) && mine) say(`${P.NAME.kana}です。${nm}、${kana(S.dest)}行きです。`, pa);
      if (cross(ta + 20) && mine) say(`${trk}番線の列車は、${nm}、${kana(S.dest)}行きです。停車駅は、${S.dir > 0 ? '京都、名古屋、品川、東京' : '新神戸、岡山、広島、小倉、博多'}です。`, pa);
      if (cross(dm - 8)) au?.play('shinDepart', { position: pa });
      if (cross(dm)) au?.play('departBell', { position: pa });
      if (cross(dm + 7) && mine) say(`${trk}番線から、${nm}、${kana(S.dest)}行きが、発車します。ドアが閉まります、ご注意ください。`, pa);
    }
  });

  // ------------------------------------------------ the ride home: board the 桜川線 train on track 1
  const I1 = P.ISLANDS[0], edge = I1.v + P.ISLAND_W / 2;        // track 1 runs along the south edge of P1
  const doors = P.convDoors(P.SERVICES[1].cars);
  let hold = 0;
  H.update((dt, t) => {
    const p = H.player();
    if (!p || !ctx.travel || dt <= 0) { hold = 0; return; }
    const st = P.convState(1, t);
    const at = st.doors > 0.8 && p.y > P.Y.plat - 0.3 && p.v > edge - 0.5 && doors.some(u => Math.abs(p.u - u) < 0.7);
    if (!at) { hold = 0; return; }
    hold += dt;
    if (hold > 0.5) {
      hold = 0;
      // step off the train at Sakuragaoka platform 1, next to a door, facing the platform
      const x = L.TRAIN_DOORS_X[2];
      ctx.travel({ x, z: L.PLATFORM.south.edgeZ + 1.3, yaw: 180, pitch: 2 }, { toast: '桜ヶ丘駅 1番線ホーム' });
    }
  });
  // ------------------------------------------------ to 東京: board the のぞみ on 13番線 while its doors are open
  {
    const S13 = P.S_PLATS.find(p => p.track === 13), sdoors = P.shinDoors();
    let holdS = 0;
    H.update((dt, t) => {
      const p = H.player();
      if (!p || !ctx.travel || dt <= 0 || !L.TOKYO) { holdS = 0; return; }
      const st = P.shinState(13, t);
      const at = st.doors > 0.8 && p.y > P.Y.platS - 0.3 && p.v < S13.edge + 0.75 && p.v > S13.edge - 0.4 && sdoors.some(u => Math.abs(p.u - u) < 0.7);
      if (!at) { holdS = 0; return; }
      holdS += dt;
      if (holdS > 0.5) { holdS = 0; ctx.travel(L.TOKYO.arrive, { toast: `${P.S_SERVICES[13].name} ${P.S_SERVICES[13].no}号 → 東京駅  山手線` }); }
    });
  }
  return {};
}
