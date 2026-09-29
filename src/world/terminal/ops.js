// Station operations of 桜都駅, driven by the timetable: approach melodies (接近メロディ, one per island), spoken
// approach / arrival / door-closing announcements (only on the platform you are on, so they never talk over
// each other), departure melodies (発車メロディ), Shinkansen chimes + announcements for arriving, departing and
// passing trains — and the ride home: step into the 桜川線 train on track 1 while its doors are open.
import * as P from './plan.js';

const kana = (s) => P.KANA[s] || s;
const MEL = { P1: 'A', P2: 'B', P3: 'C' };

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
      if (cross(1)) au?.play('approach' + MEL[I.id], { position: pa });
      if (cross(5.5) && mine) say(`まもなく、${trk}番のりばに、${S.type === '環状' ? '環状線' : S.type}、${kana(S.dest)}行きが、${S.cars}両でまいります。危ないですから、黄色い点字ブロックまで、お下がりください。`, pa);
      if (cross(ta + 1.5) && mine) say(`${P.NAME.kana}、${P.NAME.kana}です。ご乗車、ありがとうございました。`, pa);
      if (cross(dm)) au?.play('depart' + MEL[I.id], { position: pa });
      if (cross(dm + 7.6) && mine) say(`${trk}番のりば、ドアが閉まります。ご注意ください。`, pa);
    }
    // ------------------------------------------------ Shinkansen
    for (const trk of Object.keys(P.S_SERVICES)) {
      const S = P.S_SERVICES[trk], st = P.shinState(trk, t), tt = st.tIn;
      const prev = last.get('s' + trk); last.set('s' + trk, tt);
      if (prev === undefined || tt < prev || dt <= 0 || !here) continue;
      const cross = (th) => prev < th && tt >= th;
      if (S.pass) {
        if (cross(6)) for (const Pl of P.S_PLATS) { const pa = paAt((Pl.v0 + Pl.v1) / 2, P.Y.platS); au?.play('shinChime', { position: pa }); if (here === Pl.id) setTimeout(() => say('まもなく、列車が通過いたします。危ないですから、黄色い点字ブロックまで、お下がりください。', pa), 1400); }
        continue;
      }
      const Pl = P.S_PLATS.find(p => p.track === +trk), pa = paAt((Pl.v0 + Pl.v1) / 2, P.Y.platS), mine = here === Pl.id;
      const ta = P.T_SHIN.approach, dm = ta + P.T_SHIN.melody;
      if (cross(4)) au?.play('shinChime', { position: pa });
      if (cross(6) && mine) say(`まもなく、${trk}番線に、はなかぜ号、${kana(S.dest)}行きが、到着いたします。黄色い点字ブロックまで、お下がりください。この電車は、16両です。`, pa);
      if (cross(ta + 2) && mine) say(`${P.NAME.kana}です。はなかぜ号、${kana(S.dest)}行きです。`, pa);
      if (cross(dm)) au?.play('shinDepart', { position: pa });
      if (cross(dm + 5.5) && mine) say(`${trk}番線から、はなかぜ号、${kana(S.dest)}行きが、発車いたします。ドアが閉まります。`, pa);
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
  return {};
}
