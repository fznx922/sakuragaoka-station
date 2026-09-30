// The 山手線 ring viaduct: deck + parapets on piers, slab track (concrete panels), four rails, catenary portals with
// messenger / contact wires, and the ground plane of the city under it.
import * as THREE from 'three';
import * as P from './plan.js';
import { arcBand, arcWall, arcBar, arcBox } from './geo.js';

export function buildViaduct(ctx, H) {
  const { root, M } = H;
  const { mat } = ctx;
  const T = ctx.tex;
  const TAU = Math.PI * 2, R = P.R, Y = P.Y;
  const add = (g, m, shadow = true) => { const mesh = new THREE.Mesh(g, m); mesh.castShadow = shadow; mesh.receiveShadow = true; root.add(mesh); return mesh; };
  const concrete = mat.toon('#ffffff', { map: H.tx.concrete, paint: 0.05 });
  const concreteD = mat.toon('#b4b1aa', { paint: 0.05 });
  // split the full ring into sectors so each piece has a sensible bounding sphere (culling / batching)
  const SECT = 48, sect = (fn) => { for (let i = 0; i < SECT; i++) fn(i * TAU / SECT, (i + 1) * TAU / SECT); };

  // ---- ground: streets and blocks (tiled), a big disc under the whole city
  const street = T.draw(256, 256, (g, w, h) => {
    g.fillStyle = '#8f8d88'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#a6a39c'; g.fillRect(22, 22, w - 44, h - 44);                        // block
    g.fillStyle = '#b9b6ae'; g.fillRect(16, 16, w - 32, 6); g.fillRect(16, h - 22, w - 32, 6); g.fillRect(16, 16, 6, h - 32); g.fillRect(w - 22, 16, 6, h - 32);   // pavements
    g.fillStyle = '#f2f0ea'; for (let x = 0; x < w; x += 20) { g.fillRect(x, 8, 10, 2); g.fillRect(8, x, 2, 10); }
  }, { key: 'tokyo.street', repeat: [1, 1] });
  street.repeat?.set?.(1, 1);
  const gg = new THREE.CircleGeometry(R + 1100, 96); gg.rotateX(-Math.PI / 2);
  { const uv = gg.attributes.uv, p = gg.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i) / 60, -p.getZ(i) / 60); }
  add(gg, mat.toon('#ffffff', { map: street, paint: 0.06 }), false);

  // ---- deck, parapets, underside
  const DW = 6.6;
  sect((a, b) => {
    add(arcBand(R - DW, R + DW, a, b, Y.deck, { tile: 4, maxLen: 8 }), concrete);
    add(arcBand(R - DW + 0.6, R + DW - 0.6, a, b, Y.deck - 1.1, { tile: 4, maxLen: 8, down: true }), concreteD, false);
    for (const [r, out] of [[R + DW, true], [R - DW, false]]) {
      add(arcWall(r, a, b, Y.deck - 1.1, Y.deck + 1.0, { out, tile: 4, maxLen: 8 }), concrete);
      add(arcBand(Math.min(r, r - (out ? 0.3 : -0.3)), Math.max(r, r - (out ? 0.3 : -0.3)), a, b, Y.deck + 1.0, { tile: 4, maxLen: 8 }), concreteD);
      add(arcWall(r - (out ? 0.3 : -0.3), a, b, Y.deck, Y.deck + 1.0, { out: !out, tile: 4, maxLen: 8 }), concreteD);
    }
    // track slabs (the concrete bed of each track) + four rails
    for (const r of [P.TRACK.outer, P.TRACK.inner]) {
      add(arcBox(r - 1.25, r + 1.25, a, b, Y.deck, Y.rail - 0.3, { tile: 5, maxLen: 8 }), mat.toon('#c2bfb8', { paint: 0.05 }));
      for (const s of [-1, 1]) { add(arcBar(r + s * 0.57, a, b, Y.rail - 0.08, 0.07, 0.16, 10), M.rail); add(arcBar(r + s * 0.57, a, b, Y.rail - 0.005, 0.066, 0.012, 10), M.railTop, false); }
    }
    // overhead wires: messenger + contact per track (thin bars)
    for (const r of [P.TRACK.outer, P.TRACK.inner]) for (const [y, w] of [[Y.rail + 6.0, 0.03], [Y.rail + 5.05, 0.035]]) add(arcBar(r, a, b, y, w, w, 24), mat.toon('#5a5560', { paint: 0.01 }), false);
  });

  // ---- instanced: slab panels (every 5 m per track), piers + caps (every 30 m), catenary portals (every 50 m)
  const inst = (geo, m, list, shadow = true) => {
    const im = new THREE.InstancedMesh(geo, m, list.length);
    list.forEach((mm, i) => im.setMatrixAt(i, mm));
    im.castShadow = shadow; im.receiveShadow = true; im.computeBoundingSphere(); root.add(im); return im;
  };
  const place = (r, phi, y, sx = 1, sy = 1, sz = 1, extraYaw = 0) => {
    const m = new THREE.Matrix4().compose(new THREE.Vector3(r * Math.cos(phi), y, r * Math.sin(phi)), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -phi - Math.PI / 2 + extraYaw), new THREE.Vector3(sx, sy, sz));
    return m;
  };
  // (sectors of instances so each instanced mesh is local)
  const SI = 24;
  for (let s = 0; s < SI; s++) {
    const a = s * TAU / SI, b = (s + 1) * TAU / SI;
    const slabs = [], piers = [], caps = [], poles = [], beams = [];
    for (const r of [P.TRACK.outer, P.TRACK.inner]) for (let d = a * r; d < b * r; d += 5) slabs.push(place(r, d / r, Y.rail - 0.28, 4.7, 1, 1));
    for (let d = a * R; d < b * R; d += 30) { const phi = d / R; piers.push(place(R, phi, (Y.deck - 1.1) / 2, 1.6, Y.deck - 1.1, 6.0)); caps.push(place(R, phi, Y.deck - 1.4, 2.2, 0.9, 13.4)); }
    for (let d = a * R; d < b * R; d += 50) {
      const phi = d / R + 12 / R;
      for (const off of [-6.1, 6.1]) poles.push(place(R + off, phi, Y.deck + (Y.rail + 7.4 - Y.deck) / 2, 0.3, Y.rail + 7.4 - Y.deck, 0.3));
      beams.push(place(R, phi, Y.rail + 7.2, 0.35, 0.5, 12.8));
    }
    const unit = new THREE.BoxGeometry(1, 1, 1);
    inst(new THREE.BoxGeometry(1, 0.2, 2.3), mat.toon('#d3d0c9', { paint: 0.04 }), slabs, false);
    inst(unit, concreteD, piers); inst(unit, concrete, caps);
    inst(unit, M.steelD, poles); inst(unit, M.steelD, beams);
  }
  return {};
}
