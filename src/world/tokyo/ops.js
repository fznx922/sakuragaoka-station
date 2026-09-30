// Operations of the 山手線, driven by the timetable:
//   on the platform you stand on — the approach announcement (JP + EN) as a train nears, the station's own departure
//   melody (JY01–JY30, 駒込 plays「さくらさくら」), then「ドアが閉まります」;
//   inside the train you ride — the automated E235 announcements: 次は… / まもなく… with the transfers, then the
//   English "The next station is …", and the「この電車は…」line when you board.
// Also a safety net: should you ever end up below the viaduct, you're taken back to the 東京 platform.
import * as P from './plan.js';
import { towards } from './stations.js';

export function buildOps(ctx, H, { trains, stations }) {
  const { L } = ctx;
  const au = ctx.audio;
  // ---- back to 大阪: the stairs at 東京 are the 東海道新幹線 transfer (a sign over them; walk in to go)
  const tokyoStairs = (stations?.stairs || []).filter(s => s.st === 0);
  {
    const sgn = ctx.mat.toon('#ffffff', { map: H.tx.sign({ w: 512, h: 96, text: '東海道新幹線 のりかえ', sub: 'Tokaido Shinkansen · to Shin-Osaka / Osaka', bg: '#1d3564', badges: [{ t: '新', bg: '#f77321' }], arrow: 'up', key: 'tokyo.toShin' }), paint: 0.01 });
    for (const s of tokyoStairs) {
      const g = H.group(s.u, P.Y.plat + 3.25, s.v, s.yaw); const k = ctx.kit(g);
      k.box(3.2, 0.62, 0.08, H.M.steelD, [-s.L / 2 - 0.2, 0, 0], [0, Math.PI / 2, 0]);
      k.plane(3.1, 0.58, sgn, [-s.L / 2 - 0.25, 0, 0], [0, -Math.PI / 2, 0]);
      for (const z of [-1.2, 1.2]) k.box(0.035, 0.6, 0.035, H.M.steelD, [-s.L / 2 - 0.2, 0.6, z]);
    }
  }
  let holdStairs = 0;
  const say = (text, lang, pos) => au?.play('speak', { position: pos, text, lang });
  const jy = (s) => 'jy' + s.id.slice(2);
  const last = new Map();
  let fallT = -99, boardedTr = null;
  H.update((dt, t) => {
    const pl = H.player(); if (!pl || dt <= 0 || !trains?.list) return;
    // fell off the viaduct? back up to the platform
    if (pl.y < P.Y.deck - 2 && t - fallT > 5) { fallT = t; ctx.travel?.(L.TOKYO.arrive, { toast: '東京駅 山手線' }); return; }
    // at the head of the 東京 stairs (the entrance end of the enclosure) -> 大阪駅 新幹線ホーム
    let atStairs = false;
    for (const s of tokyoStairs) {
      const dx = pl.u - s.u, dz = pl.v - s.v, c = Math.cos(s.yaw), sn = Math.sin(s.yaw), lx = dx * c - dz * sn, lz = dx * sn + dz * c;
      if (lx > -s.L / 2 - 1.6 && lx < -s.L / 2 + 0.3 && Math.abs(lz) < s.W / 2 + 0.4 && pl.y > P.Y.plat - 0.3) atStairs = true;
    }
    holdStairs = atStairs ? holdStairs + dt : 0;
    if (holdStairs > 0.7 && ctx.travel && L.TERMINAL) {
      holdStairs = 0;
      const TP = ctx.services.terminal?.plan;
      if (TP) { const sp = TP.SPOTS.shin; ctx.travel({ x: TP.ORIGIN.x + sp.u, z: TP.ORIGIN.z + sp.v, yaw: sp.yaw, pitch: 0, y: TP.Y.platS }, { toast: '東海道新幹線 のぞみ → 大阪駅 13番線' }); }
    }
    const phiP = Math.atan2(pl.v, pl.u), rP = Math.hypot(pl.u, pl.v);
    const plPos = { x: pl.u + P.ORIGIN.x, y: pl.y + 1.6, z: pl.v + P.ORIGIN.z };
    // the station whose platforms the player is on (if any)
    let here = null;
    if (pl.y > P.Y.plat - 0.5) for (const s of P.STATIONS) { let d = Math.abs(phiP - s.phi); d = Math.min(d, Math.PI * 2 - d); if (d * P.R < P.PLAT_LEN / 2 + 5 && Math.abs(rP - P.R) < 12) { here = s; break; } }
    const riding = trains.riding?.tr || null;
    for (const tr of trains.list) {
      const st = tr.st; if (!st) continue;
      const pv = last.get(tr); last.set(tr, { tRun: st.tRun, runLeft: st.runLeft, tDwell: st.tDwell, phase: st.phase });
      if (!pv) continue;
      const crossUp = (a, b, th) => a < th && b >= th, crossDown = (a, b, th) => a > th && b <= th;
      const next = P.STATIONS[st.next], tw = towards(st.next, tr.dir), dirJa = tr.dir > 0 ? '外回り' : '内回り';
      // ---- in the train
      if (tr === riding) {
        if (boardedTr !== tr) { boardedTr = tr; if (st.phase === 'dwell') { say(`この電車は、山手線、${dirJa}、${tw.map(x => x.kanji).join('、')}方面行きです。`, 'ja', plPos); say(`This is the Yamanote Line train bound for ${tw.map(x => x.en).join(' and ')}.`, 'en', plPos); } }
        if (st.phase === 'run' && pv.phase === 'run' && crossUp(pv.tRun, st.tRun, 5)) {
          say(`次は、${next.kanji}、${next.kanji}。お出口は、左側です。${next.xfer ? next.xfer.replace(/・/g, '、') + 'は、お乗り換えです。' : ''}`, 'ja', plPos);
          say(`The next station is ${next.en}, ${next.id.replace('JY', 'J Y ')}. The doors on the left side will open.${next.xferEn ? ` Please change here for the ${next.xferEn}.` : ''}`, 'en', plPos);
        }
        if (st.phase === 'run' && crossDown(pv.runLeft, st.runLeft, 24) && st.tRun > 12) { say(`まもなく、${next.kanji}です。お出口は、左側です。`, 'ja', plPos); say(`We will soon make a brief stop at ${next.en}.`, 'en', plPos); }
        if (st.phase === 'dwell' && crossUp(pv.tDwell, st.tDwell, P.DOORS[1] - 2.4)) say('ドアが閉まります。ご注意ください。', 'ja', plPos);
      } else if (!riding) boardedTr = null;
      // ---- on the platform of this train's next / current stop
      if (!here) continue;
      const side = tr.dirName, er = P.EDGE[side] + (side === 'outer' ? 3 : -3);
      const pa = { x: er * Math.cos(phiP) + P.ORIGIN.x, y: P.Y.plat + 3.6, z: er * Math.sin(phiP) + P.ORIGIN.z };
      if (st.phase === 'run' && st.next === here.i && crossDown(pv.runLeft, st.runLeft, 30) && tr !== riding) {
        au?.play('announce', { position: pa, text: `まもなく、${dirJa}、${tw.map(x => x.kanji).join('・')}方面行きが、まいります。危ないですから、黄色い点字ブロックまで、お下がりください。` });
        setTimeout(() => say(`The train for ${tw.map(x => x.en).join(' and ')} is now arriving. Please stand behind the yellow line.`, 'en', pa), 200);
      }
      if (st.phase === 'dwell' && st.atStation === here.i) {
        if (crossUp(pv.tDwell, st.tDwell, P.DOORS[1] - 9)) au?.play(jy(here), { position: pa });
        if (crossUp(pv.tDwell, st.tDwell, P.DOORS[1] - 1.8) && tr !== riding) say(`${dirJa}、ドアが閉まります。ご注意ください。`, 'ja', pa);
      }
    }
  });
  return {};
}
