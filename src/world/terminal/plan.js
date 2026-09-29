// 桜都駅 (Ōto Station) — the plan of a big JR-style terminal, modelled on Osaka Station (ground-level
// island platforms under a huge glass dome, a concourse below) with a Shin-Osaka-style Shinkansen side
// (two side platforms with platform gates + two through tracks). Operator / names are fictional.
//
// Self-contained (no imports): layout.js imports it. Pure data + pure functions of time (deterministic).
// Local frame: u = x - ORIGIN.x (+u = east, along the tracks), v = z - ORIGIN.z (+v = south).
//
// Levels:   0      street, the concourse under the tracks (改札 / コンコース)
//           4.6    concourse ceiling;  5.3 track deck;  5.6 rail top
//           6.7    conventional platforms (1.1 m above rail);  6.85 Shinkansen platforms (1.25 m)

export const ORIGIN = { x: -4000, z: 0 };
export const NAME = { kanji: '桜都', kana: 'おうと', en: 'Ōto', no: 'KR-A01', company: '関西旅客鉄道', companyEn: 'KR West', mark: 'KR' };
export const Y = { floor: 0, ceil: 4.6, deck: 5.3, rail: 5.6, plat: 6.7, platS: 6.85 };
/** Walkable bounds (local). The street plaza is south, the station occupies v ≲ 30. */
export const BOUNDS = { u0: -214, u1: 214, v0: -66.5, v1: 78 };

// ------------------------------------------------------------------ conventional (在来線)
export const PLAT_LEN = 210;                  // u ∈ [-105, 105]
export const ISLANDS = [                      // island platforms, 10 m wide; tracks 6.8 m either side of the centre
  { id: 'P1', v: 20.0, tracks: [1, 2] },
  { id: 'P2', v: 2.4, tracks: [3, 4] },
  { id: 'P3', v: -15.2, tracks: [5, 6] },
];
export const ISLAND_W = 10;
export const TRACKS = {                       // track number -> centreline v (and which island serves it)
  1: 26.8, 2: 13.2, 3: 9.2, 4: -4.4, 5: -8.4, 6: -22.0,
};
// ------------------------------------------------------------------ Shinkansen (新幹線)
export const S_PLAT_LEN = 420;                // u ∈ [-210, 210]
export const S_PLATS = [                      // side platforms (8 m wide)
  { id: 'S13', v0: -40.0, v1: -32.0, edge: -40.0, track: 13 },
  { id: 'S14', v0: -65.3, v1: -57.3, edge: -57.3, track: 14 },
];
export const S_TRACKS = { 13: -41.9, 14: -55.4, P1: -46.4, P2: -50.9 };   // P1/P2 = through tracks (通過線)

// ------------------------------------------------------------------ concourse (under the tracks)
export const CONC = { u0: -34, u1: 34, v0: -66, v1: 48 };      // ground-floor footprint
export const GATES = { v: 32.0, u0: -6.2, n: 13, pitch: 0.95 };  // 中央改札 (IC gates): lane i spans u0 + i·pitch … + pitch
export const SGATES = { v: -30.5, u0: -6.3, n: 7, pitch: 1.05 }; // 新幹線のりかえ口
/** stairs + an up escalator from the concourse to each platform, rising along +u from u0 (floor level).
 *  Across v (relative to v): escalator [v-2.7, v-1.5], stairs [v-0.6, v-0.6+w]; the platform opening is
 *  [v-3.0, v-0.3+w] × [u0-0.3, u0+13.5]. */
export const LIFTS = [
  { plat: 'P1', v: 20.0, u0: -16.5, w: 3.0 }, { plat: 'P2', v: 2.4, u0: -16.5, w: 3.0 }, { plat: 'P3', v: -15.2, u0: -16.5, w: 3.0 },
  { plat: 'S13', v: -34.6, u0: -16.5, w: 2.4, s: true }, { plat: 'S14', v: -62.1, u0: -16.5, w: 2.4, s: true },
];
export const liftHole = (L) => ({ u0: L.u0 - 0.3, u1: L.u0 + 13.5, v0: L.v - 3.0, v1: L.v - 0.3 + L.w });

// ------------------------------------------------------------------ services & timetable
// Every conventional track runs one service pattern on a 180 s loop; Shinkansen on a 240 s loop.
// dir: +1 = trains travel +u (east, 京桜 方面), -1 = west (浜音 方面).
export const PERIOD = 180, S_PERIOD = 240;
export const LINES = {
  sakuragawa: { name: '桜川線', color: '#ef9fbe', band: '#d9718f' },
  kyoto: { name: '京桜線', color: '#2f7fc0', band: '#1f5f9a' },
  kobe: { name: '浜音線', color: '#2f7fc0', band: '#1f5f9a' },
  loop: { name: '環状線', color: '#e9853a', band: '#c96a24' },
  yume: { name: '夢咲線', color: '#3fa36b', band: '#2b7d50' },
};
export const SERVICES = {
  1: { line: 'sakuragawa', type: '普通', typeEn: 'Local', dest: '桜ヶ丘', destEn: 'Sakuragaoka', via: '花見台', dir: -1, cars: 6, offset: 0 },
  2: { line: 'kyoto', type: '新快速', typeEn: 'Special Rapid', dest: '近江野', destEn: 'Ōmino', via: '京桜', dir: 1, cars: 8, offset: 60 },
  3: { line: 'kobe', type: '快速', typeEn: 'Rapid', dest: '白鷺台', destEn: 'Shirasagidai', via: '浜音', dir: -1, cars: 8, offset: 120 },
  4: { line: 'kyoto', type: '普通', typeEn: 'Local', dest: '京桜', destEn: 'Kyōzakura', via: '', dir: 1, cars: 8, offset: 30 },
  5: { line: 'loop', type: '環状', typeEn: 'Loop', dest: '環状線 内回り', destEn: 'Loop Line', via: '', dir: -1, cars: 8, offset: 90 },
  6: { line: 'yume', type: '直通', typeEn: 'Through', dest: '夢咲', destEn: 'Yumesaki', via: '', dir: 1, cars: 8, offset: 150 },
};
export const S_SERVICES = {
  13: { name: 'はなかぜ', nameEn: 'Hanakaze', dest: '東都', destEn: 'Tōto', dir: 1, offset: 20 },
  14: { name: 'はなかぜ', nameEn: 'Hanakaze', dest: '西都', destEn: 'Saito', dir: -1, offset: 140 },
  P1: { name: '', dest: '', dir: 1, offset: 95, pass: true },
  P2: { name: '', dest: '', dir: -1, offset: 205, pass: true },
};
/** readings for the synthesized announcements (fictional names in kanji are read unpredictably) */
export const KANA = { 桜ヶ丘: 'さくらがおか', 近江野: 'おうみの', 白鷺台: 'しらさぎだい', 京桜: 'きょうざくら', '環状線 内回り': 'かんじょうせん、うちまわり', 夢咲: 'ゆめさき', 東都: 'とうと', 西都: 'さいと', はなかぜ: 'はなかぜ' };
export const CAR = { len: 20, gap: 0.5, w: 2.9 };           // conventional EMU car
export const SCAR = { len: 25, nose: 27, gap: 0.6, w: 3.38, cars: 16 };
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const mod = (a, n) => ((a % n) + n) % n;

/** door centres (u, train stopped centred on u = 0) of an n-car EMU: 4 doors per side per 20 m car */
export const DOOR_OFFS = [-7.35, -2.45, 2.45, 7.35];
export function convDoors(cars) {
  const out = [];
  for (let k = 0; k < cars; k++) { const c = (k - (cars - 1) / 2) * (CAR.len + CAR.gap); for (const o of DOOR_OFFS) out.push(c + o); }
  return out;
}
/** Shinkansen car layout (centred on u = 0): [{c, len, nose: -1|0|1}] + one door per car */
export function shinCars() {
  const out = []; let u = -sTrainLen() / 2;
  for (let k = 0; k < SCAR.cars; k++) {
    const len = k === 0 || k === SCAR.cars - 1 ? SCAR.nose : SCAR.len;
    out.push({ c: u + len / 2, len, nose: k === 0 ? -1 : k === SCAR.cars - 1 ? 1 : 0 });
    u += len + SCAR.gap;
  }
  return out;
}
export function shinDoors() { return shinCars().map((c) => c.nose === 1 ? c.c - c.len / 2 + 2.2 : c.c + c.len / 2 - 2.2); }
/** conventional train length (m) */
export const trainLen = (cars) => cars * CAR.len + (cars - 1) * CAR.gap;
export const sTrainLen = () => 2 * SCAR.nose + (SCAR.cars - 2) * SCAR.len + (SCAR.cars - 1) * SCAR.gap;

// timetable phases (seconds within the loop, measured from the service's offset)
export const T_CONV = { approach: 24, dwell: 52, doorsOpen: [2, 44], melody: 36, depart: 30 };
export const T_SHIN = { approach: 50, dwell: 70, doorsOpen: [4, 60], melody: 50, depart: 45 };
const A_IN = 0.95, A_OUT = 0.85, A_IN_S = 0.9, A_OUT_S = 0.62;

/**
 * State of a conventional train at sim time t. Returns {visible, front (u of the leading end), center,
 * speed, dir, phase: 'approach'|'dwell'|'depart'|'gone', doors 0..1, tIn (seconds into the loop)}.
 * The train stops centred on the platform (u = 0).
 */
export function convState(track, t) {
  const S = SERVICES[track], L = trainLen(S.cars);
  const tt = mod(t - S.offset, PERIOD);
  const { approach: ta, dwell: td, depart: tdep } = T_CONV;
  let d; // signed distance of the train centre from its stop (along dir; negative = before the stop)
  let speed = 0, phase;
  if (tt < ta) { const r = ta - tt; d = -0.5 * A_IN * r * r; speed = A_IN * r; phase = 'approach'; }
  else if (tt < ta + td) { d = 0; phase = 'dwell'; }
  else if (tt < ta + td + tdep) { const e = tt - ta - td; d = 0.5 * A_OUT * e * e; speed = A_OUT * e; phase = 'depart'; }
  else { d = 1e4; phase = 'gone'; }
  const center = S.dir * d;
  let doors = 0;
  if (phase === 'dwell') { const e = tt - ta; const [o, c] = T_CONV.doorsOpen; doors = clamp(Math.min((e - o) / 1.2, (c - e) / 1.2), 0, 1); }
  return { visible: Math.abs(center) < 900, center, front: center + S.dir * L / 2, speed, dir: S.dir, phase, doors, tIn: tt, len: L, cars: S.cars };
}
/** Shinkansen state; pass trains run straight through at 70 m/s (252 km/h). */
export function shinState(track, t) {
  const S = S_SERVICES[track], L = sTrainLen();
  const tt = mod(t - S.offset, S_PERIOD);
  let d, speed = 0, phase, doors = 0;
  if (S.pass) {
    const V = 70, tPass = 30; // the train's centre passes u = 0 at tt = tPass
    d = (tt - tPass) * V; speed = V; phase = Math.abs(d) < 1300 ? 'pass' : 'gone';
  } else {
    const { approach: ta, dwell: td, depart: tdep } = T_SHIN;
    if (tt < ta) { const r = ta - tt; d = -0.5 * A_IN_S * r * r; speed = A_IN_S * r; phase = 'approach'; }
    else if (tt < ta + td) { d = 0; phase = 'dwell'; const e = tt - ta; const [o, c] = T_SHIN.doorsOpen; doors = clamp(Math.min((e - o) / 1.5, (c - e) / 1.5), 0, 1); }
    else if (tt < ta + td + tdep) { const e = tt - ta - td; d = 0.5 * A_OUT_S * e * e; speed = A_OUT_S * e; phase = 'depart'; }
    else { d = 1e4; phase = 'gone'; }
  }
  const center = S.dir * d;
  return { visible: Math.abs(center) < 1500, center, front: center + S.dir * L / 2, speed, dir: S.dir, phase, doors, tIn: tt, len: L };
}
/** Sim time of the n-th next departure (>= t) of a track. */
export function nextDepartures(track, t, n = 2, shin = false) {
  const S = shin ? S_SERVICES[track] : SERVICES[track], P = shin ? S_PERIOD : PERIOD;
  const T = shin ? T_SHIN : T_CONV;
  const base = t - mod(t - S.offset, P);   // start of the current loop
  const out = [];
  for (let k = 0; out.length < n && k < 6; k++) { const dep = base + k * P + T.approach + T.dwell; if (dep >= t - 1) out.push(dep); }
  return out;
}
/** game clock text for sim time t (the town's clock: 16:02 at t = 0) */
export function clock(t) { const m = 2 + Math.floor(t / 60); const h = 16 + Math.floor(m / 60); return `${h}:${String(m % 60).padStart(2, '0')}`; }

// ------------------------------------------------------------------ region contract
export const isTerminal = (x) => x < ORIGIN.x + 1500;
export const groundAt = () => 0;   // flat street / concourse; every upper level is a physics walk surface
export const toWorld = (u, v) => ({ x: ORIGIN.x + u, z: ORIGIN.z + v });
export const SPOTS = {
  arrive: { u: -30, v: 23.2, yaw: -90, pitch: 2 },     // platform P1, beside the 桜川線 train on track 1 (looking east)
  plaza: { u: 0, v: 64, yaw: 0, pitch: 4 },            // the street in front of the 中央口
  shin: { u: 40, v: -36.5, yaw: 90, pitch: 1 },        // Shinkansen platform 13
};
export const AREAS = [   // y0 / y1: only at these heights (platforms are above the concourse)
  { name: '桜都駅 新幹線 13・14番のりば', u0: -214, u1: 214, v0: -64, v1: -33, y0: 5 },
  { name: '桜都駅 1・2番のりば', u0: -110, u1: 110, v0: 15, v1: 25.2, y0: 5 },
  { name: '桜都駅 3・4番のりば', u0: -110, u1: 110, v0: -2.6, v1: 7.4, y0: 5 },
  { name: '桜都駅 5・6番のりば', u0: -110, u1: 110, v0: -20.2, v1: -10.2, y0: 5 },
  { name: '桜都駅 新幹線のりかえ口', u0: -34, u1: 34, v0: -66, v1: -28, y1: 4 },
  { name: '桜都駅 中央口', u0: -60, u1: 60, v0: 32, v1: 80, y1: 4 },
  { name: '桜都駅 コンコース (改札内)', u0: -34, u1: 34, v0: -28, v1: 32, y1: 4 },
];
