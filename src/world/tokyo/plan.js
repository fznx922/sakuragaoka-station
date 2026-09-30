// 東京 — the JR 山手線 (Yamanote Line) loop, at half scale: a 17 km ring viaduct with all 30 stations placed by their real
// distances along the line (Tokyo in the east, Shinagawa south, Shibuya / Shinjuku west, Ikebukuro north-west, Ueno
// north-east), two tracks — 外回り (clockwise, outer track) and 内回り (anticlockwise, inner track) — with side platforms,
// platform doors and a timetable of 11-car E235 trains in each direction. Pure data + pure functions of time.
//
// Local frame: u = x - ORIGIN.x, v = z - ORIGIN.z (the ring's centre). Angle φ: 0 = east, increasing clockwise on
// the map (φ = 90° is south): a point on the ring of radius r is (r cos φ, r sin φ).

export const ORIGIN = { x: -16000, z: 0 };
export const SCALE = 0.5;                       // metres in game per metre of real line
export const R = 34500 * SCALE / (2 * Math.PI); // centre-line radius (≈ 2745 m)
export const Y = { ground: 0, deck: 7.4, rail: 8.0, plat: 9.1 };
export const TRACK = { outer: R + 2.1, inner: R - 2.1 };   // 外回り runs on the outer track, 内回り on the inner
export const PLAT_W = 6;                                    // side platforms, 6 m wide
export const PLAT_LEN = 232;
export const EDGE = { outer: TRACK.outer + 1.55, inner: TRACK.inner - 1.55 };   // platform edges (radius)
export const CAR = { len: 20, gap: 0.5, w: 2.95, cars: 11 };
export const DOOR_OFFS = [-7.35, -2.45, 2.45, 7.35];
export const TRAIN_LEN = CAR.cars * CAR.len + (CAR.cars - 1) * CAR.gap;

/** the 30 stations, 外回り order, with the real cumulative distance from 東京 (km) and the main transfers */
export const STATIONS = [
  ['JY01', '東京', 'とうきょう', 'Tōkyō', 0.0, '東海道新幹線・中央線・京浜東北線', 'Tokaido Shinkansen, Chuo Line'],
  ['JY02', '有楽町', 'ゆうらくちょう', 'Yūrakuchō', 0.8, '有楽町線', 'Yurakucho Line'],
  ['JY03', '新橋', 'しんばし', 'Shimbashi', 1.9, '銀座線・ゆりかもめ', 'Ginza Line, Yurikamome'],
  ['JY04', '浜松町', 'はままつちょう', 'Hamamatsuchō', 3.1, '東京モノレール', 'Tokyo Monorail'],
  ['JY05', '田町', 'たまち', 'Tamachi', 4.6, '', ''],
  ['JY06', '高輪ゲートウェイ', 'たかなわゲートウェイ', 'Takanawa Gateway', 5.9, '', ''],
  ['JY07', '品川', 'しながわ', 'Shinagawa', 6.8, '東海道新幹線・京急線', 'Tokaido Shinkansen, Keikyu Line'],
  ['JY08', '大崎', 'おおさき', 'Ōsaki', 8.8, 'りんかい線', 'Rinkai Line'],
  ['JY09', '五反田', 'ごたんだ', 'Gotanda', 9.7, '都営浅草線・東急池上線', 'Toei Asakusa Line'],
  ['JY10', '目黒', 'めぐろ', 'Meguro', 10.9, '東急目黒線・南北線', 'Tokyu Meguro Line'],
  ['JY11', '恵比寿', 'えびす', 'Ebisu', 12.4, '日比谷線', 'Hibiya Line'],
  ['JY12', '渋谷', 'しぶや', 'Shibuya', 14.0, '東急東横線・田園都市線・銀座線', 'Tokyu Toyoko Line, Den-en-toshi Line'],
  ['JY13', '原宿', 'はらじゅく', 'Harajuku', 15.2, '千代田線・副都心線', 'Chiyoda Line'],
  ['JY14', '代々木', 'よよぎ', 'Yoyogi', 16.7, '中央・総武線・大江戸線', 'Chuo-Sobu Line'],
  ['JY15', '新宿', 'しんじゅく', 'Shinjuku', 17.4, '中央線・小田急線・京王線', 'Chuo Line, Odakyu Line, Keio Line'],
  ['JY16', '新大久保', 'しんおおくぼ', 'Shin-Ōkubo', 18.7, '', ''],
  ['JY17', '高田馬場', 'たかだのばば', 'Takadanobaba', 20.1, '西武新宿線・東西線', 'Seibu Shinjuku Line, Tozai Line'],
  ['JY18', '目白', 'めじろ', 'Mejiro', 21.0, '', ''],
  ['JY19', '池袋', 'いけぶくろ', 'Ikebukuro', 22.2, '西武池袋線・東武東上線・丸ノ内線', 'Seibu Ikebukuro Line, Tobu Tojo Line'],
  ['JY20', '大塚', 'おおつか', 'Ōtsuka', 24.0, '都電荒川線', 'Toden Arakawa Line'],
  ['JY21', '巣鴨', 'すがも', 'Sugamo', 25.1, '都営三田線', 'Toei Mita Line'],
  ['JY22', '駒込', 'こまごめ', 'Komagome', 25.8, '南北線', 'Namboku Line'],
  ['JY23', '田端', 'たばた', 'Tabata', 27.4, '京浜東北線', 'Keihin-Tohoku Line'],
  ['JY24', '西日暮里', 'にしにっぽり', 'Nishi-Nippori', 28.2, '千代田線・日暮里舎人ライナー', 'Chiyoda Line'],
  ['JY25', '日暮里', 'にっぽり', 'Nippori', 28.7, '京成線', 'Keisei Line'],
  ['JY26', '鶯谷', 'うぐいすだに', 'Uguisudani', 29.8, '', ''],
  ['JY27', '上野', 'うえの', 'Ueno', 30.9, '新幹線・銀座線・日比谷線', 'Shinkansen, Ginza Line, Hibiya Line'],
  ['JY28', '御徒町', 'おかちまち', 'Okachimachi', 31.5, '', ''],
  ['JY29', '秋葉原', 'あきはばら', 'Akihabara', 32.5, '総武線・日比谷線・つくばエクスプレス', 'Sobu Line, Hibiya Line, Tsukuba Express'],
  ['JY30', '神田', 'かんだ', 'Kanda', 33.2, '中央線・銀座線', 'Chuo Line, Ginza Line'],
].map(([id, kanji, kana, en, km, xfer, xferEn], i) => ({ i, id, kanji, kana, en, km, xfer, xferEn, phi: (km / 34.5) * Math.PI * 2 }));
export const LOOP_KM = 34.5;
export const LINE_COLOR = '#9acd32';            // 山手線 黄緑 (JR East line colour)

// ------------------------------------------------------------------ timetable
// A train stops with its centre at a station's centre angle. Run: accelerate at A to VMAX, cruise, brake at B.
const A = 1.0, B = 1.0, VMAX = 25;
export const DWELL = 22, DOORS = [2.5, 17.5];   // seconds after arrival: doors open / close
export const TRAINS_PER_DIR = 12;
const runTime = (d) => { const da = VMAX * VMAX / (2 * A), db = VMAX * VMAX / (2 * B); if (d >= da + db) return (d - da - db) / VMAX + VMAX / A + VMAX / B; const vp = Math.sqrt(2 * d * A * B / (A + B)); return vp / A + vp / B; };
/** distance covered t seconds into a run of length d (and the speed then) */
function runAt(d, t) {
  const da = VMAX * VMAX / (2 * A), db = VMAX * VMAX / (2 * B);
  let vp = VMAX, ta = VMAX / A, tc = 0;
  if (d < da + db) { vp = Math.sqrt(2 * d * A * B / (A + B)); ta = vp / A; }
  else tc = (d - da - db) / VMAX;
  const tb = vp / B, T = ta + tc + tb;
  if (t <= 0) return { s: 0, v: 0 };
  if (t >= T) return { s: d, v: 0 };
  if (t < ta) return { s: 0.5 * A * t * t, v: A * t };
  if (t < ta + tc) return { s: 0.5 * A * ta * ta + vp * (t - ta), v: vp };
  const e = T - t; return { s: d - 0.5 * B * e * e, v: B * e };
}
const mod = (a, n) => ((a % n) + n) % n;
/** per direction ('outer' = 外回り, clockwise; 'inner' = 内回り): legs between consecutive stops */
function buildLegs(dir) {
  const r = TRACK[dir], n = STATIONS.length, order = dir === 'outer' ? STATIONS.map((_, i) => i) : STATIONS.map((_, i) => (n - i) % n);
  const legs = []; let t = 0;
  for (let k = 0; k < n; k++) {
    const a = STATIONS[order[k]], b = STATIONS[order[(k + 1) % n]];
    let dphi = dir === 'outer' ? b.phi - a.phi : a.phi - b.phi; dphi = mod(dphi, Math.PI * 2);
    const d = dphi * r, run = runTime(d);
    legs.push({ from: a.i, to: b.i, d, t0: t, dwellEnd: t + DWELL, run, t1: t + DWELL + run });
    t += DWELL + run;
  }
  return { legs, period: t, r };
}
export const LEGS = { outer: buildLegs('outer'), inner: buildLegs('inner') };

/**
 * State of train k (0..TRAINS_PER_DIR-1) of a direction at sim time t:
 * { phi (centre angle), speed, dir: +1 clockwise | -1, atStation (index while dwelling, else -1), next (index of the
 *   next / current stop), prev, doors 0..1, phase 'dwell'|'run', tDwell (s since arrival), tRun, runLeft (s to the next stop) }
 */
export function trainState(dirName, k, t) {
  const L = LEGS[dirName], P = L.period;
  const tt = mod(t + (k / TRAINS_PER_DIR) * P, P);
  let lo = 0, hi = L.legs.length - 1;
  while (lo < hi) { const m = (lo + hi + 1) >> 1; if (L.legs[m].t0 <= tt) lo = m; else hi = m - 1; }
  const leg = L.legs[lo], dir = dirName === 'outer' ? 1 : -1, a = STATIONS[leg.from];
  if (tt < leg.dwellEnd) {
    const e = tt - leg.t0, [o, c] = DOORS;
    const doors = Math.max(0, Math.min(1, Math.min((e - o) / 1.4, (c - e) / 1.4)));
    return { phi: a.phi, speed: 0, dir, atStation: a.i, next: a.i, prev: a.i, doors, phase: 'dwell', tDwell: e, tRun: 0, runLeft: leg.dwellEnd - tt + leg.run, dist: 0 };
  }
  const e = tt - leg.dwellEnd, { s, v } = runAt(leg.d, e);
  return { phi: a.phi + dir * s / L.r, speed: v, dir, atStation: -1, next: leg.to, prev: leg.from, doors: 0, phase: 'run', tDwell: 0, tRun: e, runLeft: leg.run - e, dist: leg.d - s };
}
/** world-local (u, v) of a point at angle phi on radius r, and the travel heading (rotation.y of a +x-forward car) */
export const ringPt = (r, phi) => ({ u: r * Math.cos(phi), v: r * Math.sin(phi) });
/** rotation.y that points a car's local +x along the clockwise tangent at phi (for dir -1 add π) */
export const tangentYaw = (phi) => -phi - Math.PI / 2;

// ------------------------------------------------------------------ region contract
export const isTokyo = (x) => x < -9000;
export const groundAt = () => Y.ground;
export const toWorld = (u, v) => ({ x: ORIGIN.x + u, z: ORIGIN.z + v });
export const BOUNDS = { u0: -R - 400, u1: R + 400, v0: -R - 400, v1: R + 400 };
/** arrival: 東京駅 山手線 外回り platform, beside the stop, looking along the platform */
export const SPOTS = (() => {
  const s = STATIONS[0], r = EDGE.outer + 2.2, p = ringPt(r, s.phi + 40 / r);
  return { arrive: { u: p.u, v: p.v, yaw: 180, pitch: 2 } };   // facing south, along the platform
})();
/** HUD areas: a box around each station's platforms (only at platform height) */
export const AREAS = STATIONS.map((s) => {
  let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
  for (const r of [EDGE.outer + PLAT_W, EDGE.inner - PLAT_W]) for (let k = -1; k <= 1; k += 0.25) { const p = ringPt(r, s.phi + k * (PLAT_LEN / 2) / r); u0 = Math.min(u0, p.u); u1 = Math.max(u1, p.u); v0 = Math.min(v0, p.v); v1 = Math.max(v1, p.v); }
  return { name: `${s.kanji}駅  山手線 ${s.id}`, u0: u0 - 2, u1: u1 + 2, v0: v0 - 2, v1: v1 + 2, y0: Y.deck };
});
