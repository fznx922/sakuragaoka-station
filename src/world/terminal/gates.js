// 自動改札機 — the IC gate lines: 中央改札 (13 lanes) and the 新幹線のりかえ口 (7 lanes, blue, with ticket
// slots). Walking through a lane "touches" your card at the reader: ピピッ (balance > ¥1,000), sometimes ピッ
// (commuter pass) or ピピピッ (low balance) — and now and then the gate says ピンポーン, the flaps snap shut and
// the lane lamp turns red until you step back and try again. Staff booths, glass fences to the walls.
import * as THREE from 'three';
import * as P from './plan.js';

export function buildGates(ctx, H) {
  const { root, dyn, M } = H;
  const { mat } = ctx;
  const T = ctx.tex, F = T.FONTS;
  const K = H.kit();
  const rnd = ctx.rng('terminal.gates');
  // textures: end panel with arrow / no-entry, the reader target, the small LCD
  const arrowTex = T.draw(128, 128, (g, w, h) => {
    g.fillStyle = '#1b2433'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#3aa0ff'; g.beginPath(); g.moveTo(w / 2, 16); g.lineTo(w - 22, 64); g.lineTo(w / 2 + 16, 64); g.lineTo(w / 2 + 16, h - 16); g.lineTo(w / 2 - 16, h - 16); g.lineTo(w / 2 - 16, 64); g.lineTo(22, 64); g.closePath(); g.fill();
  }, { key: 'term.gate.arrow' });
  const readerTex = T.draw(128, 128, (g, w, h) => {
    g.fillStyle = '#2a3446'; g.fillRect(0, 0, w, h);
    for (const [r, a] of [[52, 0.35], [40, 0.6], [28, 0.9]]) { g.strokeStyle = `rgba(90,190,255,${a})`; g.lineWidth = 6; g.beginPath(); g.arc(w / 2, h / 2, r, 0, 6.3); g.stroke(); }
    g.fillStyle = '#e8f4ff'; g.font = `900 26px ${F.en}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('IC', w / 2, h / 2);
  }, { key: 'term.gate.reader' });
  const lcdTex = T.draw(128, 64, (g, w, h) => {
    g.fillStyle = '#10283f'; g.fillRect(0, 0, w, h); g.fillStyle = '#9fe0ff'; g.font = `700 16px ${F.sans}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('IC・きっぷ', w / 2, 20); g.font = `700 13px ${F.en}`; g.fillText('TOUCH ▶', w / 2, 44);
  }, { key: 'term.gate.lcd' });
  const cab = mat.toon('#d8dbde', { paint: 0.02 }), cabTop = mat.toon('#8c939c', { paint: 0.02 }), cabS = mat.toon('#dbe3ee', { paint: 0.02 });
  const endM = mat.emissive('#ffffff', 1.05, { map: arrowTex }), readerM = mat.emissive('#ffffff', 1.0, { map: readerTex }), lcdM = mat.emissive('#ffffff', 0.9, { map: lcdTex });

  const banks = [];
  const bank = (G, shin) => {
    const L = shin ? 2.0 : 1.8, Hh = shin ? 1.05 : 0.98;
    const cabs = G.n + 1, xs = [];
    for (let k = 0; k < cabs; k++) {
      const x = G.u0 + k * G.pitch; xs.push(x);
      K.box(0.2, Hh - 0.08, L, shin ? cabS : cab, [x, (Hh - 0.08) / 2, G.v]);
      K.box(0.22, 0.08, L + 0.02, cabTop, [x, Hh - 0.04, G.v]);
      for (const s of [-1, 1]) {
        K.plane(0.16, 0.2, endM, [x, Hh - 0.35, G.v + s * (L / 2 + 0.006)], [0, s > 0 ? 0 : Math.PI, 0]);
        // reader (tilted target) + LCD at each end on the top
        K.plane(0.17, 0.17, readerM, [x, Hh + 0.012, G.v + s * (L / 2 - 0.2)], [-Math.PI / 2, 0, s > 0 ? 0 : Math.PI]);
        K.plane(0.14, 0.07, lcdM, [x, Hh + 0.012, G.v + s * (L / 2 - 0.45)], [-Math.PI / 2, 0, s > 0 ? 0 : Math.PI]);
      }
      K.box(0.12, 0.012, 0.03, M.black, [x, Hh + 0.006, G.v - 0.06]); K.box(0.12, 0.012, 0.03, M.black, [x, Hh + 0.006, G.v + 0.12]); // ticket slots
      H.box(x, G.v, 0.22, L, 0, -1, Hh);
    }
    // staff booth (有人改札) at the east end + glass fences from the bank to the concourse walls
    const bx0 = G.u0 + G.n * G.pitch + 0.25, bx1 = bx0 + 3.2;
    K.box(bx1 - bx0, 2.3, 2.4, M.wall, [(bx0 + bx1) / 2, 1.15, G.v]);
    K.box(bx1 - bx0 - 0.3, 1.0, 0.05, M.glass, [(bx0 + bx1) / 2, 1.6, G.v + 1.22]); K.box(bx1 - bx0 - 0.3, 1.0, 0.05, M.glass, [(bx0 + bx1) / 2, 1.6, G.v - 1.22]);
    K.box(bx1 - bx0 + 0.2, 0.3, 2.6, M.band, [(bx0 + bx1) / 2, 2.45, G.v]);
    H.box((bx0 + bx1) / 2, G.v, bx1 - bx0, 2.4, 0, -1, 2.5);
    const fence = (a, b) => {
      K.box(b - a, 1.0, 0.04, M.glass, [(a + b) / 2, 0.6, G.v]); K.box(b - a, 0.06, 0.08, M.steel, [(a + b) / 2, 1.13, G.v]);
      for (let x = a; x <= b + 1e-6; x += 2) K.box(0.06, 1.1, 0.06, M.steel, [x, 0.55, G.v]);
      H.box((a + b) / 2, G.v, b - a, 0.2, 0, -1, 1.3);
    };
    fence(P.CONC.u0, G.u0 - 0.1); fence(bx1, P.CONC.u1);
    banks.push({ G, shin, L, Hh, lanes: G.n, state: Array.from({ length: G.n }, () => ({ closed: 0, until: 0, side: 0, inside: false, flash: 0, err: false })) });
  };
  bank(P.GATES, false);
  bank(P.SGATES, true);

  // ---- dynamic: flaps (2 per lane) + lane lamps (flash blue on touch, red on error)
  const nL = banks.reduce((a, b) => a + b.lanes, 0);
  const flapIM = new THREE.InstancedMesh(new THREE.BoxGeometry(0.04, 0.46, 0.3), mat.toon('#c7cdd4', { paint: 0.02 }), nL * 2);
  const lampIM = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.1, 0.1).rotateX(-Math.PI / 2), mat.emissive('#ffffff', 1.2), nL * 2);
  for (const im of [flapIM, lampIM]) { im.frustumCulled = false; dyn.add(im); }
  flapIM.castShadow = true;
  const m4 = new THREE.Matrix4(), col = new THREE.Color();
  const draw = () => {
    let k = 0;
    for (const B of banks) for (let i = 0; i < B.lanes; i++) {
      const s = B.state[i], x0 = B.G.u0 + i * B.G.pitch, x1 = x0 + B.G.pitch;
      const ext = 0.12 + 0.2 * s.closed;       // how far each flap reaches into the lane
      flapIM.setMatrixAt(k * 2, m4.makeScale(ext / 0.04, 1, 1).setPosition(x0 + 0.1 + ext / 2 - 0.02, 0.72, B.G.v));
      flapIM.setMatrixAt(k * 2 + 1, m4.makeScale(ext / 0.04, 1, 1).setPosition(x1 - 0.1 - ext / 2 + 0.02, 0.72, B.G.v));
      for (const e of [0, 1]) {
        const z = B.G.v + (e ? 1 : -1) * (B.L / 2 - 0.08);
        lampIM.setMatrixAt(k * 2 + e, m4.makeTranslation(x0 + (e ? B.G.pitch - 0.1 : 0.1), B.Hh + 0.02, z));
        if (s.err && s.closed > 0.3) col.set('#ff4a3d'); else if (s.flash > 0) col.set('#bfe8ff').lerp(new THREE.Color('#2f8fff'), 1 - s.flash); else col.set('#2f8fff');
        lampIM.setColorAt(k * 2 + e, col);
      }
      k++;
    }
    flapIM.instanceMatrix.needsUpdate = true; lampIM.instanceMatrix.needsUpdate = true; if (lampIM.instanceColor) lampIM.instanceColor.needsUpdate = true;
  };
  draw();
  // closed flaps block the lane
  ctx.physics.addDynamic(() => {
    const out = [];
    for (const B of banks) B.state.forEach((s, i) => { if (s.closed > 0.5) { const p = P.toWorld(B.G.u0 + (i + 0.5) * B.G.pitch, B.G.v); out.push({ cx: p.x, cz: p.z, w: B.G.pitch, d: 0.12, y0: -1, y1: 1.2 }); } });
    return out;
  });

  let lastErr = -1e9, dirty = true;
  H.update((dt, t) => {
    const p = H.player();
    for (const B of banks) {
      const { G } = B;
      B.state.forEach((s, i) => {
        const x0 = G.u0 + i * G.pitch, x1 = x0 + G.pitch;
        const inLane = p && p.y < 1 && p.u > x0 + 0.1 && p.u < x1 - 0.1 && Math.abs(p.v - G.v) < B.L / 2 + 0.15;
        if (inLane && !s.inside) {
          // touch! the reader is at the end the player walked in from
          s.inside = true; s.side = Math.sign(p.v - G.v) || 1;
          const pos = P.toWorld((x0 + x1) / 2, G.v + s.side * (B.L / 2 - 0.2));
          const at = { x: pos.x, y: B.Hh + 0.1, z: pos.z };
          const k = rnd();
          if (s.closed < 0.1 && t - lastErr > 25 && k < 0.07) { s.err = true; s.until = t + 2.2; lastErr = t; ctx.audio?.play('icError', { position: at }); }
          else { s.err = false; s.flash = 1; ctx.audio?.play(B.shin ? 'icTouch' : k < 0.8 ? 'icTouch' : k < 0.93 ? 'icPass' : 'icLow', { position: at }); }
        } else if (!inLane && s.inside && (!p || Math.abs(p.v - G.v) > B.L / 2 + 0.3 || p.u < x0 || p.u > x1)) s.inside = false;
        const want = s.err && t < s.until ? 1 : 0;
        if (want !== s.closed || s.flash > 0) dirty = true;
        s.closed += Math.sign(want - s.closed) * Math.min(Math.abs(want - s.closed), dt * 8);
        s.flash = Math.max(0, s.flash - dt * 1.6);
        if (!want && s.err && t >= s.until) s.err = false;
      });
    }
    if (dirty && H.visible()) { draw(); dirty = false; }
  });
  return { banks };
}
