// Canvas textures for 稲荷山 (all hand-painted style, seeded, cached by key).
export function makeTextures(ctx) {
  const T = ctx.tex, F = T.FONTS;
  const seeded = (seed) => { let s = seed >>> 0 || 1; return () => ((s = (s * 16807) % 2147483647) / 2147483647); };
  const vtext = (g, text, x, y, size, font, weight, gap, color) => {
    g.font = `${weight} ${size}px ${font}`; g.textAlign = 'center'; g.textBaseline = 'top'; g.fillStyle = color;
    let yy = y; for (const ch of text) { g.fillText(ch, x, yy); yy += size * gap; } return yy;
  };
  const wash = (g, w, h, r, n, dark, light, a0 = 0.05) => {
    for (let i = 0; i < n; i++) {
      const x = r() * w, y = r() * h, rad = 20 + r() * 80;
      const gr = g.createRadialGradient(x, y, 0, x, y, rad); const c = r() < 0.5 ? dark : light;
      gr.addColorStop(0, `rgba(${c},${a0})`); gr.addColorStop(1, `rgba(${c},0)`); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    }
  };

  // granite for steps / kerbs / lanterns (tiles 1 m)
  const stone = T.draw(256, 256, (g, w, h) => {
    g.fillStyle = '#c9c4b8'; g.fillRect(0, 0, w, h);
    const r = seeded(3); wash(g, w, h, r, 36, '112,104,94', '255,252,244', 0.06);
    for (let i = 0; i < 1500; i++) { const c = 140 + ((r() * 100) | 0); g.fillStyle = `rgba(${c},${c - 4},${c - 12},0.4)`; g.fillRect(r() * w, r() * h, 1 + r() * 1.6, 1 + r() * 1.6); }
  }, { key: 'inari.stone', repeat: [1, 1] });

  // stone step treads: slab joints every ~0.5 m across, one tile = 2 m (across) x 1 m (along)
  const steps = T.draw(512, 256, (g, w, h) => {
    g.fillStyle = '#c3bdb0'; g.fillRect(0, 0, w, h);
    const r = seeded(9);
    let x = 0;
    while (x < w) {
      const sw = 90 + r() * 70, c = 186 + ((r() * 24) | 0) - 12;
      g.fillStyle = `rgb(${c},${c - 5},${c - 13})`; g.fillRect(x + 2, 2, sw - 4, h - 4);
      g.fillStyle = 'rgba(255,255,255,0.10)'; g.fillRect(x + 4, 4, sw - 8, 10);
      x += sw;
    }
    wash(g, w, h, r, 24, '100,94,84', '255,250,240', 0.07);
    for (let i = 0; i < 1600; i++) { const c = 140 + ((r() * 90) | 0); g.fillStyle = `rgba(${c},${c - 4},${c - 10},0.35)`; g.fillRect(r() * w, r() * h, 1 + r() * 1.5, 1 + r() * 1.5); }
    // moss creeping in the joints
    for (let i = 0; i < 18; i++) { g.fillStyle = `rgba(116,142,84,${0.12 + r() * 0.15})`; g.beginPath(); g.ellipse(r() * w, r() < 0.5 ? 3 : h - 3, 10 + r() * 30, 3 + r() * 4, 0, 0, Math.PI * 2); g.fill(); }
  }, { key: 'inari.steps', repeat: [1, 1] });

  // approach paving: large granite slabs in running bond (tile 4 m)
  const paving = T.draw(512, 512, (g, w, h) => {
    g.fillStyle = '#a9a398'; g.fillRect(0, 0, w, h);
    const r = seeded(17), rows = 8, rh = h / rows;
    for (let i = 0; i < rows; i++) {
      let x = (i % 2) * -64 - r() * 20;
      while (x < w) {
        const sw = 110 + r() * 60, c = 196 + ((r() * 22) | 0) - 11;
        g.fillStyle = `rgb(${c},${c - 4},${c - 11})`; g.fillRect(x + 2, i * rh + 2, sw - 4, rh - 4);
        x += sw;
      }
    }
    wash(g, w, h, r, 40, '96,90,80', '255,252,244', 0.06);
    for (let i = 0; i < 2600; i++) { const c = 150 + ((r() * 90) | 0); g.fillStyle = `rgba(${c},${c - 4},${c - 10},0.3)`; g.fillRect(r() * w, r() * h, 1 + r() * 1.5, 1 + r() * 1.5); }
  }, { key: 'inari.paving', repeat: [1, 1] });

  // white shrine gravel (tile 2 m)
  const gravel = T.draw(512, 512, (g, w, h) => {
    g.fillStyle = '#d8d3c8'; g.fillRect(0, 0, w, h);
    const r = seeded(11), cols = ['#cbc5b8', '#e4e0d7', '#bfb8ab', '#ebe8e0', '#d2c9b9', '#b6afa3'];
    for (let i = 0; i < 3200; i++) {
      const x = r() * w, y = r() * h, s = 1.5 + r() * 4;
      g.fillStyle = cols[(r() * cols.length) | 0]; g.beginPath(); g.ellipse(x, y, s, s * (0.6 + r() * 0.4), r() * 3, 0, Math.PI * 2); g.fill();
    }
    wash(g, w, h, r, 10, '150,140,125', '255,255,250', 0.06);
  }, { key: 'inari.gravel', repeat: [1, 1] });

  // subtle forest-floor / ground detail (multiplied with vertex colours; tile 6 m)
  const ground = T.draw(512, 512, (g, w, h) => {
    g.fillStyle = '#e6e6e6'; g.fillRect(0, 0, w, h);
    const r = seeded(23);
    for (let i = 0; i < 70; i++) { const x = r() * w, y = r() * h, rad = 10 + r() * 50; const gr = g.createRadialGradient(x, y, 0, x, y, rad); const c = r() < 0.55 ? '200,200,200' : '255,255,255'; gr.addColorStop(0, `rgba(${c},0.5)`); gr.addColorStop(1, `rgba(${c},0)`); g.fillStyle = gr; g.fillRect(0, 0, w, h); }
    for (let i = 0; i < 900; i++) { // fallen leaves / needles
      const x = r() * w, y = r() * h, a = r() * 3.14, l = 3 + r() * 6, c = 170 + ((r() * 60) | 0);
      g.strokeStyle = `rgba(${c},${c},${c},0.55)`; g.lineWidth = 1.2 + r(); g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
    }
    for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(255,255,255,${0.25 + r() * 0.3})`; g.beginPath(); g.ellipse(r() * w, r() * h, 2 + r() * 3, 1 + r() * 2, r() * 3, 0, Math.PI * 2); g.fill(); }
  }, { key: 'inari.ground', repeat: [1, 1] });

  // torii pillars: vermilion wrap with a black vertical inscription on one face (u = 0.5).
  // canvas top = pillar top. Right pillar: 奉納 + donor; left pillar: the date.
  const DONORS = ['桜ヶ丘商店会', '株式会社 丸福', '山本米穀店', '花見台建設', '春日野運輸', '稲荷講 有志', '中村酒造', '大黒屋呉服店', '松葉工業', '東山電機'];
  const DATES = ['令和三年十月吉日', '平成二十八年五月吉日', '令和元年九月吉日', '平成十九年三月吉日', '令和五年四月吉日', '平成二十四年十一月吉日'];
  const pillar = (i, right) => T.draw(256, 1024, (g, w, h) => {
    const r = seeded(101 + i * 7 + (right ? 3 : 0));
    g.fillStyle = '#e55c36'; g.fillRect(0, 0, w, h);
    // weathering: slightly faded top, damp darker base
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,236,210,0.10)'); gr.addColorStop(0.7, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(120,40,30,0.16)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let k = 0; k < 14; k++) { g.fillStyle = `rgba(${r() < 0.5 ? '255,220,190' : '150,50,30'},0.05)`; g.fillRect(r() * w, 0, 3 + r() * 10, h); }
    const ink = 'rgba(52,44,52,0.94)';
    if (right) {
      vtext(g, '奉納', w / 2, 70, 44, F.brush, 700, 1.02, ink);
      const d = DONORS[(i * 3 + 1) % DONORS.length];
      const size = Math.min(46, 700 / [...d].length);
      vtext(g, d, w / 2, 200, size, F.brush, 700, 1.02, ink);
    } else {
      const d = DATES[i % DATES.length];
      const size = Math.min(44, 760 / [...d].length);
      vtext(g, d, w / 2, 120, size, F.brush, 700, 1.0, ink);
    }
  }, { key: 'inari.pillar' + i + (right ? 'R' : 'L') });
  const pillars = { L: [0, 1].map(i => pillar(i, false)), R: [0, 1].map(i => pillar(i, true)) };

  // hiwadabuki (cypress-bark) roof: fine horizontal courses, dark warm brown (tile 1 m)
  const roofBark = T.draw(256, 256, (g, w, h) => {
    g.fillStyle = '#7a6554'; g.fillRect(0, 0, w, h);
    const r = seeded(31);
    for (let y = 0; y < h; y += 8) { g.fillStyle = `rgba(60,44,36,${0.25 + r() * 0.15})`; g.fillRect(0, y, w, 2); g.fillStyle = 'rgba(255,230,200,0.06)'; g.fillRect(0, y + 3, w, 2); }
    for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '50,38,30' : '160,130,105'},0.18)`; g.fillRect(r() * w, r() * h, 1 + r() * 6, 1); }
    wash(g, w, h, r, 16, '60,70,60', '200,180,150', 0.08);
  }, { key: 'inari.roofBark', repeat: [1, 1] });

  // kawara (grey tile) roof for the town houses (tile 1 m)
  const roofTile = T.draw(256, 256, (g, w, h) => {
    g.fillStyle = '#6d7480'; g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 32) { const gr = g.createLinearGradient(x, 0, x + 32, 0); gr.addColorStop(0, 'rgba(40,44,56,0.35)'); gr.addColorStop(0.45, 'rgba(255,255,255,0.10)'); gr.addColorStop(1, 'rgba(40,44,56,0.35)'); g.fillStyle = gr; g.fillRect(x, 0, 32, h); }
    for (let y = 0; y < h; y += 42) { g.fillStyle = 'rgba(40,44,56,0.3)'; g.fillRect(0, y, w, 3); }
  }, { key: 'inari.roofTile', repeat: [1, 1] });

  // white plaster with faint stains (tile 2 m)
  const plaster = T.draw(256, 256, (g, w, h) => {
    g.fillStyle = '#f0ebe0'; g.fillRect(0, 0, w, h);
    const r = seeded(41); wash(g, w, h, r, 30, '150,140,120', '255,255,255', 0.05);
  }, { key: 'inari.plaster', repeat: [1, 1] });

  // dark stained wood (tile 1 m)
  const wood = T.draw(256, 256, (g, w, h) => {
    g.fillStyle = '#7b5a42'; g.fillRect(0, 0, w, h);
    const r = seeded(51);
    for (let i = 0; i < 46; i++) { const x = r() * w; g.strokeStyle = `rgba(60,40,28,${0.1 + r() * 0.16})`; g.lineWidth = 1 + r() * 2.5; g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + (r() - 0.5) * 16, h * 0.3, x + (r() - 0.5) * 16, h * 0.7, x + (r() - 0.5) * 8, h); g.stroke(); }
    for (let i = 0; i < 6; i++) { g.fillStyle = 'rgba(255,235,210,0.06)'; g.fillRect(r() * w, 0, 5 + r() * 12, h); }
  }, { key: 'inari.wood', repeat: [1, 1] });

  // shop lattice front (格子) for machiya (tile 1.8 m wide x 2 m)
  const koshi = T.draw(256, 256, (g, w, h) => {
    g.fillStyle = '#3f3431'; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,214,150,0.28)'; g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 14) { g.fillStyle = '#6b4e3a'; g.fillRect(x, 0, 8, h); g.fillStyle = 'rgba(255,230,200,0.12)'; g.fillRect(x, 0, 2, h); }
    g.fillStyle = '#5a4131'; g.fillRect(0, 0, w, 10); g.fillRect(0, h - 12, w, 12); g.fillRect(0, h * 0.5, w, 6);
  }, { key: 'inari.koshi', repeat: [1, 1] });

  // ---- lettering ----------------------------------------------------------------------------------
  // black-lacquer plaque (額) with gold border + vertical gold text
  const gaku = (text, key, w = 128, h = 256) => T.draw(w, h, (g) => {
    g.fillStyle = '#35303d'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#d9b862'; g.lineWidth = w * 0.06; g.strokeRect(w * 0.05, w * 0.05, w * 0.9, h - w * 0.1);
    g.lineWidth = 2; g.strokeRect(w * 0.13, w * 0.13, w * 0.74, h - w * 0.26);
    const n = [...text].length, size = Math.min(w * 0.56, (h - w * 0.4) / n / 1.02);
    vtext(g, text, w / 2, (h - n * size * 1.02) / 2, size, F.brush, 700, 1.02, '#ecc96f');
  }, { key: 'inari.gaku.' + key });
  // horizontal plaque (横額) for the gate / halls
  const plaqueH = (text, key) => T.draw(512, 160, (g, w, h) => {
    g.fillStyle = '#35303d'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#d9b862'; g.lineWidth = 10; g.strokeRect(8, 8, w - 16, h - 16);
    g.fillStyle = '#ecc96f'; g.font = `700 92px ${F.brush}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    T.fitText(g, text, w / 2, h / 2 + 4, w - 70, 92, F.brush, 700);
  }, { key: 'inari.plaqueH.' + key });
  // engraved stone text (alpha decal): vertical
  const engrave = (text, key, w = 128, h = 512, color = 'rgba(66,60,66,0.85)') => T.draw(w, h, (g) => {
    g.clearRect(0, 0, w, h);
    const n = [...text].length, size = Math.min(w * 0.72, h / n / 1.04);
    vtext(g, text, w / 2, (h - n * size * 1.04) / 2, size, F.brush, 700, 1.04, color);
  }, { key: 'inari.engrave.' + key });
  // wooden signboard, black vertical text (+ optional small arrow line at the bottom)
  const board = (text, key, sub = '') => T.draw(128, 384, (g, w, h) => {
    g.fillStyle = '#e4d3b2'; g.fillRect(0, 0, w, h);
    const r = seeded(key.length * 13); for (let i = 0; i < 20; i++) { g.strokeStyle = `rgba(150,110,70,${0.1 + r() * 0.1})`; g.lineWidth = 2; const x = r() * w; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + (r() - 0.5) * 8, h); g.stroke(); }
    const n = [...text].length, size = Math.min(76, (h - (sub ? 90 : 30)) / n / 1.04);
    vtext(g, text, w / 2, 16, size, F.brush, 700, 1.04, '#2f2a33');
    if (sub) { g.fillStyle = '#b8453a'; g.font = `700 22px ${F.sans}`; g.textAlign = 'center'; g.fillText(sub, w / 2, h - 44); }
  }, { key: 'inari.board.' + key });
  // red nobori banner
  const nobori = (text, donor, key) => T.draw(128, 512, (g, w, h) => {
    g.fillStyle = '#d6503f'; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,0.1)'; g.fillRect(0, 0, 10, h);
    g.fillStyle = '#fbf2e6'; g.font = `900 26px ${F.serif}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('奉納', w / 2, 30);
    const n = [...text].length, size = Math.min(50, 400 / n);
    vtext(g, text, w / 2, 60, size, F.brush, 700, 0.98, '#fbf6ee');
    g.fillStyle = '#fbe9d8'; g.font = `700 14px ${F.serif}`; g.fillText(donor, w / 2, h - 18);
  }, { key: 'inari.nobori.' + key });
  // offering-box front (奉納)
  const saisen = T.draw(256, 128, (g, w, h) => {
    g.fillStyle = '#6f5039'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#e8c874'; g.font = `700 64px ${F.brush}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('奉　納', w / 2, h / 2 + 2);
    g.strokeStyle = '#c9a655'; g.lineWidth = 5; g.strokeRect(8, 8, w - 16, h - 16);
  }, { key: 'inari.saisen' });
  // fox-face ema atlas: white pentagon-free fox heads with drawn faces + wishes
  const EMA = { cols: 6, rows: 4, n: 24 };
  const ema = T.draw(768, 512, (g, w, h) => {
    const cw = w / EMA.cols, ch = h / EMA.rows, r = seeded(77);
    const wishes = ['合格祈願', '商売繁盛', '家内安全', '良縁成就', '健康第一', '無病息災', 'ありがとう', '夢叶う'];
    for (let i = 0; i < EMA.n; i++) {
      const x0 = (i % EMA.cols) * cw, y0 = Math.floor(i / EMA.cols) * ch;
      g.fillStyle = '#f4efe4'; g.fillRect(x0, y0, cw, ch);
      g.save(); g.translate(x0 + cw / 2, y0 + ch * 0.46);
      // ear insides
      g.fillStyle = '#e39aa4'; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * cw * 0.36, -ch * 0.36); g.lineTo(s * cw * 0.2, -ch * 0.12); g.lineTo(s * cw * 0.3, -ch * 0.06); g.fill(); }
      // eyes (a few styles)
      const style = (r() * 4) | 0; g.strokeStyle = '#3a3346'; g.fillStyle = '#3a3346'; g.lineWidth = 3.5; g.lineCap = 'round';
      for (const s of [-1, 1]) {
        g.beginPath();
        if (style === 0) { g.moveTo(s * cw * 0.08, 0); g.quadraticCurveTo(s * cw * 0.16, -ch * 0.06, s * cw * 0.24, 0); g.stroke(); }
        else if (style === 1) { g.arc(s * cw * 0.15, 0, 4.5, 0, Math.PI * 2); g.fill(); }
        else if (style === 2) { g.moveTo(s * cw * 0.07, -ch * 0.04); g.lineTo(s * cw * 0.24, ch * 0.03); g.stroke(); }
        else { g.moveTo(s * cw * 0.08, ch * 0.02); g.quadraticCurveTo(s * cw * 0.16, ch * 0.08, s * cw * 0.24, ch * 0.02); g.stroke(); }
        g.fillStyle = 'rgba(232,120,140,0.45)'; g.beginPath(); g.ellipse(s * cw * 0.2, ch * 0.1, 8, 5, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#3a3346';
      }
      g.beginPath(); g.arc(0, ch * 0.2, 4, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.moveTo(-8, ch * 0.26); g.quadraticCurveTo(0, ch * 0.32, 8, ch * 0.26); g.stroke();
      g.fillStyle = '#b8453a'; g.font = `700 13px ${F.hand}`; g.textAlign = 'center'; g.fillText(wishes[i % wishes.length], 0, -ch * 0.2);
      g.restore();
    }
  }, { key: 'inari.ema' });
  return { stone, steps, paving, gravel, ground, pillars, roofBark, roofTile, plaster, wood, koshi, seeded, vtext, DONORS,
    gaku, plaqueH, engrave, board, nobori, saisen, ema, EMA };
}
