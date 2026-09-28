// 門前町 — the shop street in front of the shrine (machiya with noren, signboards, eave roofs, red
// lanterns), and the city basin west of the mountain (instanced houses / apartment blocks seen from
// the 四ツ辻 viewpoint). All shop names are fictional.
import * as THREE from 'three';
import * as P from './plan.js';
import { slabSet, gableRoof } from './arch.js';
import { materials, bench, vending, sub, kitOf } from './props.js';

const SHOPS = [
  { name: '稲穂', what: 'きつねうどん', noren: '#2f4f7a', txt: '#f4efe4', sign: 'うどん' },
  { name: '玉屋', what: 'いなり寿司', noren: '#f1ebe0', txt: '#b8453a', sign: 'いなり寿司' },
  { name: '宝玉堂', what: '稲荷せんべい', noren: '#8a3a32', txt: '#f4efe4', sign: 'せんべい' },
  { name: 'きつね庵', what: '土人形', noren: '#4a6a4f', txt: '#f4efe4', sign: '土人形' },
  { name: '茶房 千本', what: '甘味処', noren: '#d9cdb4', txt: '#6b3a2e', sign: '甘味' },
  { name: '朱屋', what: '参道みやげ', noren: '#c9503c', txt: '#fbf2e6', sign: 'おみやげ' },
  { name: '鳥居前', what: 'うずら焼', noren: '#3f3a45', txt: '#f4efe4', sign: '焼鳥' },
  { name: 'ほうじ園', what: '宇治茶', noren: '#5c7a45', txt: '#f4efe4', sign: '茶' },
];

export function buildTown(ctx, H) {
  const { mat } = ctx;
  const { tx } = H;
  const M = materials(ctx, tx);
  const T = ctx.tex, F = T.FONTS;
  const tileM = { top: M.tile, under: M.tileUnder, edge: M.tileEdge, gable: mat.toon('#ffffff', { map: tx.plaster, paint: 0.04 }), ridge: M.tileEdge };
  const woodFront = mat.toon('#ffffff', { map: tx.wood, paint: 0.05 });
  const koshiM = mat.toon('#ffffff', { map: tx.koshi, paint: 0.03 });
  const interior = mat.emissive('#f2c68e', 0.42);
  const excl = [];

  const noren = (s, i) => T.draw(256, 192, (g, w, h) => {
    g.fillStyle = s.noren; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(0,0,0,0.12)'; for (const x of [w / 3, 2 * w / 3]) g.fillRect(x - 2, 30, 4, h);
    g.fillStyle = s.txt; g.textAlign = 'center'; g.textBaseline = 'middle';
    T.fitText(g, s.what, w / 2, h * 0.52, w * 0.86, 58, F.brush, 700);
    g.font = `700 20px ${F.serif}`; g.fillText(s.name, w / 2, h * 0.85);
  }, { key: 'inari.noren' + i });
  const kanban = (s, i) => T.draw(512, 128, (g, w, h) => {
    g.fillStyle = '#4a3528'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#2f231c'; g.lineWidth = 8; g.strokeRect(4, 4, w - 8, h - 8);
    g.fillStyle = '#efd9a4'; g.textAlign = 'center'; g.textBaseline = 'middle';
    T.fitText(g, s.name, w / 2, h / 2 + 3, w - 60, 86, F.brush, 700);
  }, { key: 'inari.kanban' + i });
  const lanternTex = (s, i) => T.draw(128, 128, (g, w, h) => {
    g.fillStyle = '#d9483a'; g.fillRect(0, 0, w, h);
    for (let y = 8; y < h; y += 10) { g.fillStyle = 'rgba(120,30,20,0.25)'; g.fillRect(0, y, w, 2); }
    g.fillStyle = '#2f2a33'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `700 40px ${F.brush}`;
    const ch = [...s.sign]; ch.slice(0, 2).forEach((c, j) => g.fillText(c, w / 2, h / 2 + (j - (Math.min(2, ch.length) - 1) / 2) * 44));
  }, { key: 'inari.chochin' + i });
  const vend = T.draw(256, 420, (g, w, h) => {
    g.fillStyle = '#c9463d'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#f7f2e8'; g.fillRect(10, 10, w - 20, h * 0.5);
    const cols = ['#e2a33b', '#6aa5d6', '#7fbf6a', '#d85f5f', '#f0d060', '#9a7ad0'];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 6; c++) { g.fillStyle = cols[(r * 2 + c) % 6]; g.fillRect(20 + c * 37, 22 + r * 66, 26, 48); g.fillStyle = '#fff'; g.fillRect(20 + c * 37, 74 + r * 66, 26, 8); }
    g.fillStyle = '#fff'; g.font = `900 34px ${F.round}`; g.textAlign = 'center'; g.fillText('つめた〜い', w / 2, h * 0.64);
    g.font = `700 22px ${F.en}`; g.fillText('INARI DRINK', w / 2, h * 0.76);
  }, { key: 'inari.vend' });
  H.vendTex = vend;

  // ---------------------------------------------------------------- the shop street
  const FRONT = 5.7, D = 9.0;
  const r = ctx.rng('inari.town');
  let si = 0;
  for (const side of [-1, 1]) {
    let u = 1.5;
    while (u > -132) {
      const w = 6.5 + r() * 3;
      const uc = u - w / 2;
      if (Math.abs(uc + 58) < 3 && side < 0) { u -= 5; continue; } // a side alley
      const rot = side < 0 ? 0 : Math.PI;
      const g = H.group(uc, 0, side * FRONT, rot); const k = H.kit(g);
      const s = SHOPS[si % SHOPS.length], near = uc > -64;
      shopFront(k, w, D, s, si, near);
      H.box(uc, side * (FRONT + D / 2), w, D, 0, -1, 8);
      si++; u -= w + 0.25;
    }
  }
  excl.push({ u0: -140, u1: 4, v0: -18, v1: 18 });

  function shopFront(k, w, D, s, i, near) {
    const two = i % 3 !== 2; // most have a second floor
    const h1 = 3.3, h2 = two ? 2.5 : 0, yE = h1 + h2 + (two ? 0.35 : 0.1);
    k.box(w, yE, D - 0.9, i % 2 ? M.plaster : woodFront, [0, yE / 2, -0.9 - (D - 0.9) / 2]);
    for (const x of [-1, 1]) k.box(0.22, h1, 0.22, M.woodD, [x * (w / 2 - 0.11), h1 / 2, -0.12]);
    k.box(w, 0.28, 0.26, M.woodD, [0, h1 - 0.14, -0.12]);
    k.plane(w - 0.5, h1 - 0.5, interior, [0, (h1 - 0.5) / 2 + 0.1, -0.88]);
    if (near) {
      // shelves inside + counter + goods
      for (const yy of [1.2, 1.8, 2.4]) k.box(w - 0.7, 0.05, 0.4, M.woodD, [0, yy, -0.68]);
      for (let j = 0; j < Math.floor((w - 0.9) / 0.3); j++) for (const yy of [1.2, 1.8]) k.box(0.2, 0.18 + ((j * 7 + i) % 3) * 0.06, 0.24, mat.toon(['#e8d7a8', '#d9a066', '#c9503c', '#8fb37a', '#e9c3c9', '#f1ebe0'][(j + i + yy * 10) % 6 | 0], { paint: 0.03 }), [-(w - 1.1) / 2 + j * 0.3, yy + 0.12, -0.7]);
      k.box(w - 1.4, 0.85, 0.7, M.woodL, [0, 0.425, -0.55]);
      const gc = ['#e8d7a8', '#d9a066', '#f1ebe0', '#c9503c', '#8fb37a', '#e9c3c9'];
      for (let j = 0; j < Math.floor((w - 1.6) / 0.42); j++) k.box(0.3, 0.12 + (j % 3) * 0.05, 0.36, mat.toon(gc[(i + j) % gc.length], { paint: 0.03 }), [-(w - 1.8) / 2 + j * 0.42, 0.91 + (j % 3) * 0.025, -0.55]);
      // noren (three panels) + red lanterns
      const nm = mat.toon('#ffffff', { map: noren(s, i % SHOPS.length), paint: 0.02, side: 'double' });
      const nw = Math.min(2.8, w - 1.2);
      k.plane(nw, 1.0, nm, [0, h1 - 0.8, 0.05]);
      const lm = mat.toon('#ffffff', { map: lanternTex(s, i % SHOPS.length), paint: 0.02 });
      for (const x of [-1, 1]) {
        k.cyl(0.004, 0.004, 0.3, M.ink, [x * (w / 2 - 0.55), h1 - 0.1, 0.35], null, 4);
        k.mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.46, 12), lm, [x * (w / 2 - 0.55), h1 - 0.52, 0.35]);
        for (const dy of [0.25, -0.25]) k.cyl(0.13, 0.13, 0.04, M.black, [x * (w / 2 - 0.55), h1 - 0.52 + dy, 0.35], null, 12);
      }
      if (i % 4 === 1) { const bg = sub(k, -w / 2 + 1.3, 0, 1.0, 0); bench(kitOf(bg), M, 1.6, i % 8 === 1); }
      if (i === 5) { const vg = sub(k, w / 2 + 0.2, 0, 0.3, 0); vending(ctx, kitOf(vg), M, vend); }
    }
    // eave roof (庇)
    const S = slabSet();
    S.add([[-w / 2 - 0.1, h1 + 0.1, 1.25], [w / 2 + 0.1, h1 + 0.1, 1.25], [w / 2 + 0.1, h1 + 0.55, -0.15], [-w / 2 - 0.1, h1 + 0.55, -0.15]], 0.12);
    S.meshes(k, tileM);
    if (two) {
      k.box(w - 0.1, h2, 0.2, i % 2 ? woodFront : M.plaster, [0, h1 + 0.35 + h2 / 2, -0.8]);
      k.plane(w * 0.55, h2 * 0.55, koshiM, [0, h1 + 0.35 + h2 * 0.5, -0.69]);
      const km = mat.toon('#ffffff', { map: kanban(s, i % SHOPS.length), paint: 0.02 });
      k.box(Math.min(3.4, w - 1), 0.78, 0.08, M.woodD, [0, h1 + 0.95, -0.45]);
      k.plane(Math.min(3.4, w - 1) - 0.1, 0.7, km, [0, h1 + 0.95, -0.405]);
    } else {
      const km = mat.toon('#ffffff', { map: kanban(s, i % SHOPS.length), paint: 0.02 });
      k.plane(Math.min(3.4, w - 1), 0.7, km, [0, h1 + 0.5, 0.2]);
    }
    gableRoof(k, { w: w + 0.3, zF: 0.55, zB: -D - 0.4, yF: yE, yB: yE, yR: yE + 1.9, zR: -D / 2, t: 0.2, flare: 0.05, mats: tileM, gable: { x: w / 2 - 0.02, y: yE } });
  }

  // ---------------------------------------------------------------- the city basin (instanced, low detail)
  {
    const pts = [];
    const rr = ctx.rng('inari.city');
    const SP = 15;
    for (let v = -760; v <= 760; v += SP) for (let u = -760; u <= 30; u += SP) {
      if (((u / SP) | 0) % 7 === 0 || ((v / SP) | 0) % 6 === 0) continue;   // streets
      const x = u + (rr() - 0.5) * 5, z = v + (rr() - 0.5) * 5;
      if (x > -142 && Math.abs(z) < 24) continue;                        // the shop street
      if (x > 8 || P.natural(x, z) > 0.8) continue;                        // foothills: forest
      if (x > -60 && Math.abs(z) < 60 && rr() < 0.5) continue;
      const apt = rr() < 0.05;
      pts.push({ x, z, apt, rot: (rr() < 0.5 ? 0 : Math.PI / 2) + (rr() - 0.5) * 0.08, w: apt ? 12 + rr() * 8 : 7 + rr() * 3, d: apt ? 9 + rr() * 4 : 7 + rr() * 3, h: apt ? 9 + ((rr() * 5) | 0) * 2.9 : 5.2 + rr() * 1.6, c: rr(), c2: rr() });
    }
    const box = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
    const prism = new THREE.BufferGeometry();
    { // unit gable prism: base 1x1 at y=0, ridge along x at y=1
      const p = [-0.5, 0, 0.5, 0.5, 0, 0.5, 0.5, 1, 0, -0.5, 0, 0.5, 0.5, 1, 0, -0.5, 1, 0,
        0.5, 0, -0.5, -0.5, 0, -0.5, -0.5, 1, 0, 0.5, 0, -0.5, -0.5, 1, 0, 0.5, 1, 0,
        0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 1, 0, -0.5, 0, -0.5, -0.5, 0, 0.5, -0.5, 1, 0];
      prism.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); prism.computeVertexNormals();
      prism.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(p.length / 3 * 2), 2));
    }
    const houses = pts.filter(p => !p.apt), apts = pts.filter(p => p.apt);
    const white = mat.toon('#ffffff', { paint: 0.05 });
    const mk = (geo, n) => { const im = new THREE.InstancedMesh(geo, white, n); im.castShadow = false; im.receiveShadow = true; H.root.add(im); return im; };
    const body = mk(box, houses.length), roof = mk(prism, houses.length), ab = mk(box, apts.length), at = mk(box, apts.length);
    const Mx = new THREE.Matrix4(), Q = new THREE.Quaternion(), Y = new THREE.Vector3(0, 1, 0), c = new THREE.Color();
    const walls = ['#ece6d8', '#e2d8c4', '#d6d2c8', '#efe9df', '#cfc6b6', '#e6dccb'], roofs = ['#5d6573', '#6b5a50', '#4f5c6c', '#7a6a5c', '#8a4f44', '#566b64'];
    houses.forEach((p, i) => {
      const y = 0;
      Q.setFromAxisAngle(Y, p.rot);
      Mx.compose(new THREE.Vector3(p.x, y, p.z), Q, new THREE.Vector3(p.w, p.h, p.d)); body.setMatrixAt(i, Mx);
      body.setColorAt(i, c.set(walls[(p.c * walls.length) | 0]));
      Mx.compose(new THREE.Vector3(p.x, y + p.h, p.z), Q, new THREE.Vector3(p.w + 0.8, 1.6 + p.c2, p.d + 0.8)); roof.setMatrixAt(i, Mx);
      roof.setColorAt(i, c.set(roofs[(p.c2 * roofs.length) | 0]));
    });
    apts.forEach((p, i) => {
      Q.setFromAxisAngle(Y, p.rot);
      Mx.compose(new THREE.Vector3(p.x, 0, p.z), Q, new THREE.Vector3(p.w, p.h, p.d)); ab.setMatrixAt(i, Mx); ab.setColorAt(i, c.set(p.c < 0.5 ? '#eeeae2' : '#dcd6ca'));
      Mx.compose(new THREE.Vector3(p.x, p.h, p.z), Q, new THREE.Vector3(p.w * 0.3, 1.2, p.d * 0.4)); at.setMatrixAt(i, Mx); at.setColorAt(i, c.set('#b9b6ae'));
    });
    for (const im of [body, roof, ab, at]) { im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; im.computeBoundingSphere(); }
  }
  return { excl };
}
