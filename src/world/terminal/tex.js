// Canvas textures for 大阪駅 (flooring, tactile paving, panels, the 駅名標, hanging signs, fare chart,
// posters, building windows) in the JR West house style (a personal fan recreation).
import * as P from './plan.js';

export function makeTextures(ctx) {
  const T = ctx.tex, F = T.FONTS;
  const seeded = (seed) => { let s = seed >>> 0 || 1; return () => ((s = (s * 16807) % 2147483647) / 2147483647); };
  const wash = (g, w, h, r, n, a = 0.05) => { for (let i = 0; i < n; i++) { const x = r() * w, y = r() * h, rad = 20 + r() * 90; const gr = g.createRadialGradient(x, y, 0, x, y, rad); const c = r() < 0.5 ? '90,86,80' : '255,255,255'; gr.addColorStop(0, `rgba(${c},${a})`); gr.addColorStop(1, `rgba(${c},0)`); g.fillStyle = gr; g.fillRect(0, 0, w, h); } };
  const speck = (g, w, h, r, n, lo, hi, a) => { for (let i = 0; i < n; i++) { const c = lo + ((r() * (hi - lo)) | 0); g.fillStyle = `rgba(${c},${c},${c - 4},${a})`; g.fillRect(r() * w, r() * h, 1 + r() * 1.5, 1 + r() * 1.5); } };

  // concourse floor: 60 cm terrazzo tiles, tile = 2.4 m
  const floor = T.draw(512, 512, (g, w, h) => {
    const r = seeded(3); g.fillStyle = '#d6d1c7'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { const c = 212 + ((r() * 14) | 0) - 7; g.fillStyle = `rgb(${c},${c - 4},${c - 11})`; g.fillRect(i * 128 + 1, j * 128 + 1, 126, 126); }
    speck(g, w, h, r, 5000, 120, 250, 0.35); wash(g, w, h, r, 30, 0.04);
    g.strokeStyle = 'rgba(120,112,100,0.35)'; g.lineWidth = 2; for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 128, 0); g.lineTo(i * 128, h); g.stroke(); g.beginPath(); g.moveTo(0, i * 128); g.lineTo(w, i * 128); g.stroke(); }
  }, { key: 'term.floor', repeat: [1, 1] });
  // platform surface: grey non-slip tiles 30 cm, tile = 1.2 m
  const platform = T.draw(256, 256, (g, w, h) => {
    const r = seeded(5); g.fillStyle = '#b9b8b2'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { const c = 186 + ((r() * 12) | 0) - 6; g.fillStyle = `rgb(${c},${c},${c - 5})`; g.fillRect(i * 64 + 1, j * 64 + 1, 62, 62); }
    speck(g, w, h, r, 2200, 110, 230, 0.35); wash(g, w, h, r, 14, 0.05);
  }, { key: 'term.platform', repeat: [1, 1] });
  // tactile paving (点字ブロック): warning dots / guiding lines, one 30 cm block per 128 px
  const tactile = (kind) => T.draw(128, 128, (g, w, h) => {
    g.fillStyle = '#e8bf2c'; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(150,110,20,0.35)'; g.fillRect(0, 0, w, 2); g.fillRect(0, 0, 2, h);
    if (kind === 'dot') { for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) { const x = 13 + i * 25.5, y = 13 + j * 25.5; g.fillStyle = 'rgba(150,110,20,0.45)'; g.beginPath(); g.arc(x + 1.5, y + 1.5, 7, 0, 6.3); g.fill(); g.fillStyle = '#f4d24a'; g.beginPath(); g.arc(x, y, 7, 0, 6.3); g.fill(); } }
    else for (let i = 0; i < 4; i++) { const x = 16 + i * 32; g.fillStyle = 'rgba(150,110,20,0.45)'; g.fillRect(x - 5, 8, 12, h - 14); g.fillStyle = '#f4d24a'; g.fillRect(x - 6, 6, 12, h - 14); }
  }, { key: 'term.tactile.' + kind, repeat: [1, 1] });
  // ceiling: white panels with a fine grid (tile 1.2 m)
  const ceiling = T.draw(256, 256, (g, w, h) => {
    g.fillStyle = '#eceae4'; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(120,120,130,0.3)'; for (let i = 0; i <= 2; i++) { g.fillRect(i * 128 - 1, 0, 2, h); g.fillRect(0, i * 128 - 1, w, 2); }
    for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) { g.fillStyle = 'rgba(120,120,130,0.12)'; g.fillRect(8 + i * 16, 8 + j * 16, 2, 2); }
  }, { key: 'term.ceiling', repeat: [1, 1] });
  // wall panels (enamel / stone-look), tile 2.4 m wide x 1.2 high
  const wall = T.draw(256, 128, (g, w, h) => {
    const r = seeded(9); g.fillStyle = '#e3dfd6'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2; i++) { const c = 226 + ((r() * 8) | 0); g.fillStyle = `rgb(${c},${c - 3},${c - 9})`; g.fillRect(i * 128 + 2, 2, 124, h - 4); }
    wash(g, w, h, r, 8, 0.04);
  }, { key: 'term.wall', repeat: [1, 1] });
  // ballast (tile 2 m)
  const ballast = T.draw(256, 256, (g, w, h) => {
    const r = seeded(13); g.fillStyle = '#76736d'; g.fillRect(0, 0, w, h);
    const cols = ['#8a867e', '#6a6761', '#9a958b', '#5e5b56', '#7f7a72'];
    for (let i = 0; i < 1800; i++) { g.fillStyle = cols[(r() * cols.length) | 0]; g.beginPath(); g.ellipse(r() * w, r() * h, 2 + r() * 3, 1.5 + r() * 2.5, r() * 3, 0, 6.3); g.fill(); }
  }, { key: 'term.ballast', repeat: [1, 1] });
  const concrete = T.draw(256, 256, (g, w, h) => { const r = seeded(17); g.fillStyle = '#b3b1ab'; g.fillRect(0, 0, w, h); speck(g, w, h, r, 1600, 120, 220, 0.3); wash(g, w, h, r, 20, 0.06); }, { key: 'term.concrete', repeat: [1, 1] });
  // office-tower windows: horizontal glass bands with thin mullions (tile = 3.6 m wide x 4 m storey)
  const windows = (tint, key) => T.draw(128, 128, (g, w, h) => {
    const r = seeded(key.length * 7);
    g.fillStyle = '#d4d6d8'; g.fillRect(0, 0, w, h);                 // spandrel / floor band
    const gr = g.createLinearGradient(0, 14, 0, 104); gr.addColorStop(0, tint); gr.addColorStop(1, '#4f6477');
    g.fillStyle = gr; g.fillRect(0, 14, w, 90);
    g.fillStyle = 'rgba(255,255,255,0.14)'; g.beginPath(); g.moveTo(10, 104); g.lineTo(50, 14); g.lineTo(70, 14); g.lineTo(30, 104); g.fill();
    if (r() < 0.3) { g.fillStyle = 'rgba(236,232,220,0.35)'; g.fillRect(64, 20, 60, 80); }
    g.fillStyle = '#9aa0a8'; for (const x of [0, 42, 85]) g.fillRect(x, 14, 3, 90);
    g.fillStyle = '#b8bcc2'; g.fillRect(0, 104, w, 4);
  }, { key: 'term.win.' + key, repeat: [1, 1] });
  const winBlue = windows('#8fb0cc', 'blue'), winGrey = windows('#9aa6b3', 'grey'), winTeal = windows('#86b5b8', 'teal');

  // ---- 駅名標 (station name board), JR West style: white board, the station-number badge in the line colour,
  // big kanji with hiragana above and romaji below, the line-colour band with the neighbouring stations
  const nameBoard = (prev, next, key, o = {}) => T.draw(1024, 384, (g, w, h) => {
    const lc = o.color || '#0072bc', num = o.num || P.NAME.no.replace('JR-', '');
    g.fillStyle = '#fbfbf8'; g.fillRect(0, 0, w, h);
    g.fillStyle = lc; g.fillRect(0, h - 108, w, 108);
    g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(0, h - 108, w, 4);
    // station number badge: JR on top, line letter + number in a line-colour frame
    g.textAlign = 'center'; g.textBaseline = 'middle';
    if (!o.noNum) {
      g.fillStyle = '#fff'; g.strokeStyle = lc; g.lineWidth = 11; T.roundRect(g, 44, 52, 124, 144, 16); g.fill(); g.stroke();
      g.fillStyle = lc; g.fillRect(44, 52, 124, 36);
      g.fillStyle = '#fff'; g.font = `900 28px ${F.en}`; g.fillText('JR', 106, 71);
      g.fillStyle = '#2b2b33'; g.font = `900 46px ${F.en}`; g.fillText(num[0], 106, 118); g.font = `900 40px ${F.en}`; g.fillText(num.slice(1), 106, 164);
    }
    // JR mark top right
    g.fillStyle = '#0072bc'; T.roundRect(g, w - 132, 40, 88, 60, 12); g.fill(); g.fillStyle = '#fff'; g.font = `900 40px ${F.en}`; g.fillText('JR', w - 88, 72);
    g.fillStyle = '#2b2b33'; g.font = `700 38px ${F.sans}`; g.fillText(o.kana || P.NAME.kana, w / 2, 52);
    T.fitText(g, o.kanji || P.NAME.kanji, w / 2, 140, 560, 128, F.sans, 900);
    g.fillStyle = '#44444f'; g.font = `600 40px ${F.en}`; g.fillText(o.en || P.NAME.en, w / 2, 232);
    g.fillStyle = '#fff'; g.textBaseline = 'middle';
    g.textAlign = 'left'; g.font = `700 42px ${F.sans}`; g.fillText('◀ ' + prev[0], 36, h - 68); g.font = `500 26px ${F.en}`; g.fillText(prev[1] + (prev[2] ? '  ' + prev[2] : ''), 78, h - 28);
    g.textAlign = 'right'; g.font = `700 42px ${F.sans}`; g.fillText(next[0] + ' ▶', w - 36, h - 68); g.font = `500 26px ${F.en}`; g.fillText((next[2] ? next[2] + '  ' : '') + next[1], w - 78, h - 28);
  }, { key: 'term.name.' + key });
  // ---- hanging signs: dark panel, white text (+ small english), optional yellow badge (exit) or number badges
  const sign = (o) => T.draw(o.w || 1024, o.h || 192, (g, w, h) => {
    g.fillStyle = o.bg || '#27324a'; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(0, 0, w, 3); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, h - 3, w, 3);
    let x = 34;
    for (const b of o.badges || []) { // coloured number / line badges (round = track number, square = line symbol)
      g.fillStyle = b.bg; if (b.round) { g.beginPath(); g.arc(x + h * 0.32, h * 0.5, h * 0.32, 0, 6.3); g.fill(); } else { T.roundRect(g, x, h * 0.18, h * 0.64, h * 0.64, 12); g.fill(); }
      if (b.ring) { g.strokeStyle = b.ring; g.lineWidth = 6; g.beginPath(); g.arc(x + h * 0.32, h * 0.5, h * 0.3, 0, 6.3); g.stroke(); }
      g.fillStyle = b.fg || '#fff'; g.font = `900 ${h * 0.42}px ${F.en}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(b.t, x + h * 0.32, h * 0.52); x += h * 0.72;
    }
    if (o.arrow === 'left') { g.fillStyle = o.fg || '#fff'; g.font = `900 ${h * 0.6}px ${F.en}`; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText('←', x, h * 0.5); x += h * 0.72; }
    g.fillStyle = o.fg || '#fff'; g.textAlign = 'left'; g.textBaseline = 'middle';
    const maxW = w - x - 40 - (o.arrow === 'right' || o.arrow === 'up' ? h * 0.7 : 0);
    T.fitText(g, o.text, x + 10, h * (o.sub ? 0.4 : 0.52), maxW, h * (o.sub ? 0.44 : 0.52), F.sans, 700);
    if (o.sub) { g.globalAlpha = 0.85; T.fitText(g, o.sub, x + 12, h * 0.8, maxW, h * 0.2, F.en, 500); g.globalAlpha = 1; }
    if (o.arrow === 'right' || o.arrow === 'up') { g.fillStyle = o.fg || '#fff'; g.font = `900 ${h * 0.6}px ${F.en}`; g.textAlign = 'right'; g.fillText(o.arrow === 'up' ? '↑' : '→', w - 30, h * 0.52); }
  }, { key: 'term.sign.' + (o.key || o.text) });
  // fare chart (運賃表) over the ticket machines: a stylised route map with fares
  const fareMap = T.draw(1024, 512, (g, w, h) => {
    g.fillStyle = '#f4f2ec'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#2d3038'; g.fillRect(0, 0, w, 56); g.fillStyle = '#fff'; g.font = `700 30px ${F.sans}`; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText('きっぷうりば  運賃表  Fares (yen)', 24, 29);
    const lines = [['#0072bc', 150, [['姫路', 1520], ['三ノ宮', 410], ['尼崎', 190], ['塚本', 170], ['大阪', 0], ['新大阪', 170], ['高槻', 400], ['京都', 580]]], ['#f15a22', 260, [['西九条', 170], ['福島', 140], ['大阪', 0], ['天満', 140], ['京橋', 170], ['天王寺', 200]]], ['#ef8fb4', 370, [['桜ヶ丘', 310], ['花見台', 260], ['大阪', 0], ['春日野', 360]]], ['#1f6fbd', 450, [['桜島', 190], ['ユニバーサルシティ', 190], ['大阪', 0]]]];
    for (const [c, y, st] of lines) {
      g.strokeStyle = c; g.lineWidth = 14; g.beginPath(); g.moveTo(60, y); g.lineTo(w - 60, y); g.stroke();
      st.forEach(([n, f], i) => { const x = 80 + i * (w - 160) / (st.length - 1); g.fillStyle = '#fff'; g.strokeStyle = n === '大阪' ? '#d9463b' : '#2d3038'; g.lineWidth = 5; g.beginPath(); g.arc(x, y, 13, 0, 6.3); g.fill(); g.stroke(); g.fillStyle = '#2d3038'; g.font = `700 22px ${F.sans}`; g.textAlign = 'center'; g.fillText(n, x, y - 32); if (f) { g.fillStyle = '#d9463b'; g.font = `700 20px ${F.en}`; g.fillText(String(f), x, y + 32); } });
    }
  }, { key: 'term.fare' });
  // ticket machine screen (touch panel)
  const tvm = T.draw(128, 128, (g, w, h) => {
    g.fillStyle = '#1f4d8a'; g.fillRect(0, 0, w, h); g.fillStyle = '#f2f5fa'; g.font = `700 14px ${F.sans}`; g.textAlign = 'center'; g.fillText('きっぷ・IC', w / 2, 18);
    const c = ['#f2a33a', '#5fb4e6', '#7bc47f', '#e86e6e']; for (let i = 0; i < 4; i++) { g.fillStyle = c[i]; T.roundRect(g, 10 + (i % 2) * 58, 30 + Math.floor(i / 2) * 46, 50, 38, 6); g.fill(); }
  }, { key: 'term.tvm' });
  // advertising posters (fictional products / places)
  const posters = ['京都 春の特別拝観', 'JRゆめ咲線で ユニバーサルシティへ', '新幹線で 東京まで 2時間半', 'ICOCA で ピッと', 'さくらサイダー 新発売'].map((t, i) => T.draw(256, 384, (g, w, h) => {
    const cols = [['#f7d3de', '#d9718f'], ['#bfe3ef', '#2f7fc0'], ['#e8eef7', '#0a5fb0'], ['#e9f5d8', '#3fa36b'], ['#fbe8c8', '#e9853a']][i];
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, cols[0]); gr.addColorStop(1, '#ffffff'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = cols[1]; g.beginPath(); g.arc(w * 0.5, h * 0.42, 70, 0, 6.3); g.fill();
    g.fillStyle = '#2d3038'; g.font = `900 30px ${F.round}`; g.textAlign = 'center'; T.fitText(g, t, w / 2, h * 0.8, w - 30, 30, F.round, 900);
    g.fillStyle = cols[1]; g.fillRect(0, h - 22, w, 22);
  }, { key: 'term.poster' + i }));
  return { floor, platform, tactile: { dot: tactile('dot'), line: tactile('line') }, ceiling, wall, ballast, concrete, win: [winBlue, winGrey, winTeal], nameBoard, sign, fareMap, tvm, posters, seeded };
}
