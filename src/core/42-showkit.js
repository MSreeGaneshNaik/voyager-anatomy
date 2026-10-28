// ============================================================================
// 42 · SHOWROOM KIT — high-detail parts for the engine stands and crew cabins.
// Small repeated parts (bolts, clips, ties, wires) are merged per assembly and
// role so a single engine can carry thousands of them at one draw call each.
// ============================================================================
function mergeGeos(geos) {
  const list = geos.map((g) => {
    if (!g.index) { const n = g.attributes.position.count, ix = new Uint32Array(n); for (let i = 0; i < n; i++) ix[i] = i; g.setIndex(new THREE.BufferAttribute(ix, 1)); }
    if (!g.attributes.normal) g.computeVertexNormals();
    if (!g.attributes.uv) g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    return g;
  });
  let nP = 0, nI = 0;
  for (const g of list) { nP += g.attributes.position.count; nI += g.index.count; }
  const pos = new Float32Array(nP * 3), nor = new Float32Array(nP * 3), uv = new Float32Array(nP * 2), idx = new Uint32Array(nI);
  let po = 0, io = 0;
  for (const g of list) {
    const P = g.attributes.position, Nn = g.attributes.normal, U = g.attributes.uv;
    for (let i = 0; i < P.count; i++) {
      pos[(po + i) * 3] = P.getX(i); pos[(po + i) * 3 + 1] = P.getY(i); pos[(po + i) * 3 + 2] = P.getZ(i);
      nor[(po + i) * 3] = Nn.getX(i); nor[(po + i) * 3 + 1] = Nn.getY(i); nor[(po + i) * 3 + 2] = Nn.getZ(i);
      uv[(po + i) * 2] = U.getX(i); uv[(po + i) * 2 + 1] = U.getY(i);
    }
    const ia = g.index.array;
    for (let i = 0; i < ia.length; i++) idx[io + i] = ia[i] + po;
    po += P.count; io += ia.length;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  out.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  out.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  return out;
}
function bulk() {
  const by = new Map();
  return {
    add(geo, role = "dark") { if (!by.has(role)) by.set(role, []); by.get(role).push(geo); return geo; },
    flush(parent, o = {}) { for (const [role, gs] of by) if (gs.length) add(parent, mergeGeos(gs), role, o); by.clear(); },
  };
}
const _qa = new THREE.Quaternion();
// Orient a geometry whose axis is +Y along `dir`, then move it to `at`.
function aim(geo, at, dir = UP, spin = 0) {
  if (spin) geo.rotateY(spin);
  _qa.setFromUnitVectors(UP, dir.clone().normalize());
  geo.applyQuaternion(_qa); geo.translate(at.x, at.y, at.z);
  return geo;
}
function basis(n) { // two unit vectors perpendicular to n
  const a = Math.abs(n.y) < 0.9 ? UP : V3(1, 0, 0);
  const u = V3().crossVectors(n, a).normalize(), v = V3().crossVectors(n, u).normalize();
  return [u, v];
}
// Bolt heads (hexagonal) on a circle in the plane normal to n.
function boltCircle(B, c, n, R, count, br = 0.012, bh = 0.016, role = "dark") {
  n = n.clone().normalize(); const [u, v] = basis(n);
  for (let i = 0; i < count; i++) {
    const a = (i / count) * TAU, p = c.clone().addScaledVector(u, Math.cos(a) * R).addScaledVector(v, Math.sin(a) * R);
    B.add(aim(new THREE.CylinderGeometry(br, br, bh, 6).translate(0, bh / 2, 0), p, n), role);
  }
}
function flange(B, c, n, rIn, rOut, t, nb, role = "light") {
  n = n.clone().normalize();
  B.add(aim(turn([[rIn, -t / 2], [rOut, -t / 2], [rOut, t / 2], [rIn, t / 2], [rIn, -t / 2]], { seg: 28 }), c, n), role);
  if (nb) boltCircle(B, c.clone().addScaledVector(n, t / 2), n, (rIn + rOut) / 2, nb, Math.max(0.006, (rOut - rIn) * 0.16), Math.max(0.01, t * 0.5));
}
function curveOf(pts) { return new THREE.CatmullRomCurve3(pts.map((p) => (p.isVector3 ? p : V3(...p))), false, "centripetal"); }
// Duct with flanged ends and optional bellows (t = 0..1 along the run).
function duct(B, pts, r, o = {}) {
  const cv = curveOf(pts), L = cv.getLength();
  B.add(new THREE.TubeGeometry(cv, o.seg ?? Math.max(24, Math.round(L * 40)), r, o.radial ?? 14, false), o.role || "metal");
  const ends = o.flanges === false ? [] : [[0, -1], [1, 1]];
  for (const [t, sgn] of ends) {
    const p = cv.getPointAt(t), tg = cv.getTangentAt(t).multiplyScalar(sgn);
    flange(B, p.clone().addScaledVector(tg, -r * 0.18), tg, r * 0.92, r * 1.55, r * 0.36, o.bolts ?? Math.max(6, Math.round(r * 70)));
  }
  for (const t of o.bellows || []) {
    const p = cv.getPointAt(t), tg = cv.getTangentAt(t);
    for (let k = -3; k <= 3; k++) B.add(aim(torusGeo(r * 1.12, r * 0.13, 20), p.clone().addScaledVector(tg, k * r * 0.26), tg), "light");
  }
  for (const t of o.clamps || []) {
    const p = cv.getPointAt(t), tg = cv.getTangentAt(t);
    B.add(aim(turn([[r * 1.02, -r * 0.2], [r * 1.18, -r * 0.2], [r * 1.18, r * 0.2], [r * 1.02, r * 0.2], [r * 1.02, -r * 0.2]], { seg: 20 }), p, tg), "grey");
  }
  return cv;
}
// Cable with P-clips and a circular connector at the far end.
function cable(B, pts, r = 0.009, o = {}) {
  const cv = curveOf(pts), L = cv.getLength();
  B.add(new THREE.TubeGeometry(cv, Math.max(12, Math.round(L * 60)), r, 6, false), o.role || "dark");
  const step = o.clip ?? 0.22;
  for (let s = step; s < L - 0.05; s += step) {
    const t = s / L, p = cv.getPointAt(t), tg = cv.getTangentAt(t);
    B.add(aim(torusGeo(r * 1.9, r * 0.55, 10), p, tg), "grey");
  }
  if (o.connector !== false) {
    const p = cv.getPointAt(1), tg = cv.getTangentAt(1);
    B.add(aim(new THREE.CylinderGeometry(r * 3.4, r * 3.4, r * 7, 12).translate(0, -r * 3.5, 0), p, tg), "grey");
    B.add(aim(torusGeo(r * 3.6, r * 0.9, 14), p.clone().addScaledVector(tg, -r * 5.5), tg), "dark");
    B.add(aim(new THREE.CylinderGeometry(r * 2.2, r * 3.0, r * 5, 10).translate(0, -r * 9.5, 0), p, tg), "dark");
  }
  return cv;
}
// A twisted bundle of wires with tie-wraps: the engine's main harness runs.
function bundle(B, pts, n = 6, r = 0.006, spread = 0.02, o = {}) {
  const cv = curveOf(pts), L = cv.getLength(), N = Math.max(20, Math.round(L * 70));
  const frames = cv.computeFrenetFrames(N, false);
  for (let k = 0; k < n; k++) {
    const ph = (k / n) * TAU, path = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N, a = ph + t * L * 9;
      path.push(cv.getPointAt(t).addScaledVector(frames.normals[i], Math.cos(a) * spread).addScaledVector(frames.binormals[i], Math.sin(a) * spread));
    }
    B.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(path), N, r, 5, false), k % 3 === 0 ? "grey" : "dark");
  }
  for (let s = 0.08; s < L; s += o.tie ?? 0.14) { const t = s / L; B.add(aim(torusGeo(spread + r * 1.6, r * 0.7, 12), cv.getPointAt(t), cv.getTangentAt(t)), "light"); }
  if (o.clamps) for (let s = 0.25; s < L; s += o.clamps) { const t = s / L, p = cv.getPointAt(t), tg = cv.getTangentAt(t); B.add(aim(new THREE.BoxGeometry(spread * 3.4, spread * 1.6, spread * 1.4), p, tg), "grey"); }
  return cv;
}
// Ball / poppet valve: body, bosses on the flow axis, actuator, position switch, bolts.
function valve(B, at, axis, s = 0.12, o = {}) {
  axis = axis.clone().normalize(); const [u] = basis(axis);
  B.add(new THREE.SphereGeometry(s, 20, 14).translate(at.x, at.y, at.z), o.role || "light");
  for (const sg of [-1, 1]) {
    const c = at.clone().addScaledVector(axis, sg * s * 0.95);
    B.add(aim(new THREE.CylinderGeometry(s * 0.62, s * 0.62, s * 0.5, 18), c, axis), "light");
    boltCircle(B, at.clone().addScaledVector(axis, sg * s * 1.22), axis.clone().multiplyScalar(sg), s * 0.48, 8, s * 0.06, s * 0.08);
  }
  const act = at.clone().addScaledVector(u, s * 1.35);
  B.add(aim(new THREE.CylinderGeometry(s * 0.42, s * 0.42, s * 1.2, 16), act, u), "grey");
  B.add(aim(new THREE.CylinderGeometry(s * 0.5, s * 0.5, s * 0.16, 16), act.clone().addScaledVector(u, s * 0.64), u), "dark");
  B.add(aim(new THREE.BoxGeometry(s * 0.5, s * 0.36, s * 0.42), act.clone().addScaledVector(axis, s * 0.55), u), "grey");
  return act.clone().addScaledVector(u, s * 0.75);   // wiring point
}
// Pressure / temperature transducer on a hex boss; returns its connector point.
function sensor(B, at, n, s = 0.022) {
  n = n.clone().normalize();
  B.add(aim(new THREE.CylinderGeometry(s * 1.15, s * 1.15, s * 0.7, 6).translate(0, s * 0.35, 0), at, n), "grey");
  B.add(aim(new THREE.CylinderGeometry(s * 0.7, s * 0.7, s * 2.4, 12).translate(0, s * 1.9, 0), at, n), "light");
  B.add(aim(new THREE.CylinderGeometry(s * 0.85, s * 0.85, s * 0.9, 12).translate(0, s * 3.4, 0), at, n), "dark");
  return at.clone().addScaledVector(n, s * 3.9);
}
// radius of a lathe profile at height y (first segment that spans y)
function rAt(prof, y) {
  for (let i = 0; i < prof.length - 1; i++) { const [r0, y0] = prof[i], [r1, y1] = prof[i + 1]; if (y0 !== y1 && (y - y0) * (y - y1) <= 0) return r0 + (r1 - r0) * (y - y0) / (y1 - y0); }
  return prof[prof.length - 1][0];
}
// Offset a (r, y) path to its left (inward for a profile traversed with the outside on its right).
function offsetPath(pts, d) {
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const di = typeof d === "function" ? d(i, pts[i]) : d;
    const nrm = [];
    for (const [a, b] of [[pts[i - 1], pts[i]], [pts[i], pts[i + 1]]]) { if (!a || !b) continue; const dr = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dr, dy) || 1; nrm.push([-dy / L, dr / L]); }
    let nx = 0, ny = 0; for (const [x, y] of nrm) { nx += x; ny += y; }
    const L = Math.hypot(nx, ny) || 1; nx /= L; ny /= L;
    const cos = nrm.length > 1 ? Math.max(0.5, nx * nrm[0][0] + ny * nrm[0][1]) : 1;
    const q = [Math.max(0, pts[i][0] + nx * di / cos), pts[i][1] + ny * di / cos]; if (pts[i][2]) q.push(1); out.push(q);
  }
  return out;
}
// closed region between two offsets of a path (material on the left of the loop)
const band = (pts, d0, d1) => offsetPath(pts, d0).concat(offsetPath(pts, d1).reverse());
function strut(B, a, b, r = 0.025, role = "grey") {
  B.add(rodGeo(a, b, r, 10), role);
  for (const p of [a, b]) B.add(new THREE.SphereGeometry(r * 1.6, 10, 8).translate(p.x, p.y, p.z), "dark");
}
// Solid of revolution from a closed profile over part of a turn, with flat cut faces.
function turnCut(prof, phi0, phi, o = {}) {
  const shell = turn(prof.concat([prof[0]]), { seg: o.seg ?? 64, phi0, phi, vy: o.vy, u: o.u });
  const caps = [];
  const shape = new THREE.Shape(prof.map(([r, y]) => new THREE.Vector2(r, y)));
  for (const a of [phi0, phi0 + phi]) {
    const g = new THREE.ShapeGeometry(shape);  // in the (r, y) plane → rotate to the cut plane at angle a
    const P = g.attributes.position;
    for (let i = 0; i < P.count; i++) { const r = P.getX(i), y = P.getY(i); P.setXYZ(i, r * Math.sin(a), y, r * Math.cos(a)); }
    g.computeVertexNormals();
    const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, P.getX(i) * 1.7 + P.getZ(i) * 1.7, P.getY(i) * 1.7);
    caps.push(g);
  }
  return { shell, cap: mergeGeos(caps) };
}

// ---------- reference-style test stand ----------
function testStand(g, o) {
  let { half = 4, H = 8 } = o;
  const pw0 = o.pw ?? (o.px ? clamp((o.px + 0.6) * 0.1, 0.22, 0.5) : clamp(half * 0.1, 0.22, 0.5));
  if (o.px) half = o.half ?? o.px + pw0 * 1.1 + 0.25;
  const sk = clamp(half / 4, 0.4, 1);
  const B = bulk();
  if (o.plate !== false) {                       // base plate (the engine stands go without one)
  const rr = 0.6, pts = [];
  for (const [cx, cz, a0] of [[half - rr, half - rr, 0], [-(half - rr), half - rr, 90], [-(half - rr), -(half - rr), 180], [half - rr, -(half - rr), 270]])
    for (let i = 0; i <= 6; i++) { const a = (a0 + i * 15) * DEG; pts.push([cx + Math.cos(a) * rr, cz + Math.sin(a) * rr]); }
  add(g, prismGeo(pts, -0.42, 0), "light", { map: T.plateTop });
  add(g, prismGeo(pts.map(([x, z]) => [x * 1.025, z * 1.025]), -0.62, -0.42), "grey");
  for (const [x, z] of [[half - 0.4, half - 0.4], [-(half - 0.4), half - 0.4], [-(half - 0.4), -(half - 0.4)], [half - 0.4, -(half - 0.4)]]) {
    B.add(new THREE.CylinderGeometry(sk * 0.07, sk * 0.07, 0.05, 16).translate(x, 0.025, z), "grey");
    B.add(new THREE.CylinderGeometry(sk * 0.03, sk * 0.03, 0.06, 6).translate(x, 0.05, z), "dark");
    B.add(new THREE.BoxGeometry(0.4, 0.14, 0.4).translate(x, -0.69, z), "dark");  // feet
  }
  // ruler strips with ticks along the two lit edges
  const ticks = [];
  for (let i = 0; i <= Math.floor((half * 2 - 1.2) / 0.1); i++) {
    const s = -half + 0.6 + i * 0.1, maj = i % 10 === 0, mid = i % 5 === 0;
    ticks.push(new THREE.Matrix4().compose(V3(s, 0.012, half - 0.12 - (maj ? 0.1 : mid ? 0.06 : 0.035)), new THREE.Quaternion(), V3(0.012, 0.012, maj ? 0.2 : mid ? 0.12 : 0.07)));
    ticks.push(new THREE.Matrix4().compose(V3(half - 0.12 - (maj ? 0.1 : mid ? 0.06 : 0.035), 0.012, s), new THREE.Quaternion(), V3(maj ? 0.2 : mid ? 0.12 : 0.07, 0.012, 0.012)));
  }
  lattice(g, ticks, "dark");
  { const w = 1.6 * sk, d = 0.7 * sk; add(g, boxGeo(w, 0.03, d, half - 0.5 * sk - w / 2, 0.015, half - 0.4 * sk - d / 2), "light", { map: T.plate }); }
  // flame plate: ring + channel + sensor
  if (o.ring !== 0) {
  add(g, turn([[o.ring ?? 1.6, 0], [o.ring ?? 1.6, 0.03], [(o.ring ?? 1.6) - 0.12, 0.03], [(o.ring ?? 1.6) - 0.12, 0.0]], { seg: 96 }), "grey");
  add(g, turn([[0, 0.006], [(o.ring ?? 1.6) - 0.16, 0.006]], { seg: 96 }), "dark", { map: T.plateRing });
  add(g, boxGeo(half - (o.ring ?? 1.6) - 0.3, 0.02, 0.1, ((o.ring ?? 1.6) + half - 0.3) / 2, 0.01, 0), "grey");
  add(g, boxGeo(0.3 * sk, 0.12 * sk, 0.2 * sk, half - 0.5 * sk, 0.06 * sk, 0), "light");
  }
  }
  if (o.posts === false) { B.flush(g); return; }
  // posts, collars, ladder, beam, thrust mount — sized to the stand
  const pw = pw0, beam = o.beam ?? pw * 1.2;
  const px = o.px ?? half - pw * 1.1, pz = o.pz ?? -0.15 * half;
  for (const sx of [-1, 1]) {
    add(g, boxGeo(pw, H, pw, sx * px, H / 2, pz), "white");
    for (const y of [pw * 0.5, H * 0.33, H * 0.62, H - pw * 1.2]) {
      add(g, boxGeo(pw * 1.32, pw * 0.72, pw * 1.32, sx * px, y, pz), "light");
      for (const dx of [0.26, -0.26]) B.add(new THREE.CylinderGeometry(pw * 0.05, pw * 0.05, 0.02, 8).rotateX(Math.PI / 2).translate(sx * px + dx * pw * 1.6, y, pz + pw * 0.67), "dark");
    }
    B.add(new THREE.BoxGeometry(pw * 1.6, 0.08, pw * 1.6).translate(sx * px, 0.04, pz), "grey");
  }
  const lx = -px - pw * 0.84, lw = pw * 0.4;
  for (const dz of [-lw, lw]) B.add(rodGeo(V3(lx, 0.1, pz + dz), V3(lx, H - pw * 1.4, pz + dz), pw * 0.044, 8), "grey");
  for (let y = 0.4; y < H - pw * 1.6; y += 0.3) B.add(rodGeo(V3(lx, y, pz - lw), V3(lx, y, pz + lw), pw * 0.032, 6), "grey");
  for (let y = 0.6; y < H - pw * 1.6; y += 1.4) B.add(rodGeo(V3(lx, y, pz), V3(-px - pw * 0.5, y, pz), pw * 0.032, 6), "grey");
  add(g, boxGeo(px * 2 + pw * 1.6, beam, pw * 1.24, 0, H + beam / 2, pz), "white");
  add(g, boxGeo(px * 2 + pw * 1.8, 0.08, pw * 1.4, 0, H + beam + 0.04, pz), "light");
  if (o.mountY !== undefined) {
    // thrust mount: adapter plate on the engine's gimbal, a socket, and one slim hanger rod up to the beam
    const mw = o.mount ?? pw * 1.8, rr = o.rod ?? mw * 0.15, y0 = o.mountY + 0.12, ys = y0 + mw * 0.32;
    add(g, boxGeo(mw * 1.22, 0.12, mw * 1.22, 0, o.mountY + 0.06, 0), "grey");
    boltCircle(B, V3(0, y0, 0), UP, mw * 0.47, 12, mw * 0.028, 0.03);
    add(g, turn([[mw * 0.36, y0], [mw * 0.36, y0 + mw * 0.12], [rr * 1.6, ys - mw * 0.06], [rr * 1.6, ys]], { seg: 40 }), "light");
    add(g, turn([[rr, ys], [rr, H]], { seg: 32 }), "metal");
    for (const y of [ys + mw * 0.08, H - mw * 0.1]) B.add(new THREE.CylinderGeometry(rr * 1.35, rr * 1.35, mw * 0.1, 24).translate(0, y, 0), "grey");
    B.add(new THREE.CylinderGeometry(rr * 1.6, rr * 1.6, mw * 0.22, 6).translate(0, (ys + H) / 2, 0), "grey");          // turnbuckle
    add(g, boxGeo(rr * 3.2, beam, Math.abs(pz) + pw * 0.62 + rr * 1.6, 0, H + beam / 2, (pz - pw * 0.62 + rr * 1.6) / 2), "white");   // saddle on the beam
  }
  B.flush(g);
}
function buildShowTextures() {
  T.plateTop = TEX(1024, 1024, (P) => { P.rect(0.03, 0.03, 0.94, 0.94, 0.5, 2); P.rect(0.06, 0.06, 0.88, 0.88, 0.25, 1.5); for (let i = 1; i < 8; i++) { P.hline(i / 8, 0.06, 1); P.vline(i / 8, 0.06, 1); } });
  T.plateRing = TEX(512, 512, (P) => { for (let i = 0; i < 24; i++) P.vline(i / 24, 0.35, 2); P.hline(0.5, 0.4, 2); });
  T.hatch = TEX(256, 256, (P) => { for (let i = -8; i < 16; i++) P.polyline([[i / 8, 0], [i / 8 + 1, 1]], 0.85, 2.2); }, { aniso: 4 });
  T.hatch2 = TEX(256, 256, (P) => { for (let i = -8; i < 16; i++) { P.polyline([[i / 8, 0], [i / 8 + 1, 1]], 0.7, 1.6); P.polyline([[i / 8, 1], [i / 8 + 1, 0]], 0.7, 1.6); } }, { aniso: 4 });
  T.honey = TEX(512, 512, (P) => { const s = 1 / 24; for (let j = 0; j < 28; j++) for (let i = 0; i < 28; i++) { const cx = i * s * 1.5, cy = j * s * 1.732 + (i % 2) * s * 0.866; const pts = []; for (let k = 0; k <= 6; k++) pts.push([cx + Math.cos(k * Math.PI / 3) * s, cy + Math.sin(k * Math.PI / 3) * s]); P.polyline(pts, 0.45, 1.2); } });
  T.coil = stripesTex(1, 0, 1, 512, 512, (P) => { for (let v = 0; v < 1; v += 1 / 40) P.hline(v, 0.55, 2); });
  T.tubesF1 = stripesTex(178, 0.6, 1.4, 4096, 512, (P) => { for (const v of [0.12, 0.38, 0.62, 0.88]) P.hline(v, 0.22, 2); });
  T.tubesJ2 = stripesTex(180, 0.55, 1.4, 4096, 512);
  T.ringsSPS = TEX(1024, 512, (P) => { for (let v = 0.02; v < 1; v += 1 / 26) P.hline(v, 0.28, 1.6); for (let i = 0; i < 16; i++) P.vline(i / 16, 0.12, 1.2); });
  // instrument panels: switch rows, gauges, captioned groups
  T.panel = TEX(2048, 1024, (P) => {
    const rnd = mulberry(11);
    for (let gx = 0; gx < 8; gx++) for (let gy = 0; gy < 4; gy++) {
      const u = 0.012 + gx * 0.123, v = 0.02 + gy * 0.245, w = 0.112, h = 0.225, kind = rnd();
      P.rect(u, v, w, h, 0.75, 2.2);
      P.hline(v + h - 0.03, 0.35, 1.4, u, u + w);
      if (kind < 0.45) { for (let r = 0; r < 3; r++) for (let c = 0; c < 6; c++) { const x = u + 0.012 + c * 0.018, y = v + 0.03 + r * 0.06; P.dot(x, y, 3.2, 0.9); P.rect(x - 0.005, y - 0.016, 0.01, 0.032, 0.4, 1); } }
      else if (kind < 0.7) { for (let c = 0; c < 3; c++) { const x = u + 0.02 + c * 0.036, y = v + 0.1; P.ring(x, y, 22, 0.85, 2); P.polyline([[x, y], [x + 0.01, y + 0.03]], 0.9, 2); } }
      else if (kind < 0.85) { for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) P.rect(u + 0.01 + c * 0.025, v + 0.02 + r * 0.045, 0.02, 0.035, 0.6, 1.5); }
      else { P.alt(u + 0.01, v + 0.02, w - 0.02, h - 0.07, 0.8); for (let r = 0; r < 5; r++) P.hline(v + 0.04 + r * 0.03, 0.4, 1.2, u + 0.015, u + w - 0.015); }
    }
  });
  T.dsky = TEX(512, 512, (P) => {
    P.alt(0.06, 0.52, 0.88, 0.42, 1); P.rect(0.06, 0.52, 0.88, 0.42, 0.9, 3);
    for (let r = 0; r < 4; r++) for (let c = 0; c < (r ? 5 : 3); c++) P.rect(0.12 + c * 0.16, 0.56 + r * 0.09, 0.12, 0.06, 0.8, 2);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 7; c++) { P.rect(0.05 + c * 0.13, 0.06 + r * 0.14, 0.11, 0.11, 0.9, 2.5); P.dot(0.105 + c * 0.13, 0.115 + r * 0.14, 3, 0.5); }
  });
  T.cmOut = TEX(1024, 512, (P) => { for (let v = 0.04; v < 1; v += 0.045) P.hline(v, 0.09, 1.2); for (let i = 0; i < 24; i++) P.vline(i / 24, 0.06, 1); });
  T.breakers = TEX(1024, 512, (P) => { for (let r = 0; r < 8; r++) { P.hline(0.05 + r * 0.12, 0.4, 1.5); for (let c = 0; c < 40; c++) P.dot(0.02 + c * 0.024, 0.09 + r * 0.12, 3.5, 0.95); } });
  T.suit = TEX(512, 512, (P) => { for (let v = 0.1; v < 1; v += 0.2) P.hline(v, 0.3, 2); P.vline(0.5, 0.25, 2); P.rect(0.3, 0.55, 0.12, 0.08, 0.6, 2); });
  T.locker = TEX(512, 512, (P) => { for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) { P.rect(0.03 + i * 0.24, 0.04 + j * 0.32, 0.22, 0.29, 0.75, 2); P.dot(0.2 + i * 0.24, 0.18 + j * 0.32, 3, 0.9); } });
  T.foilQ = TEX(512, 512, (P) => { const rnd = mulberry(5); for (let i = 0; i < 160; i++) { const u = rnd(), v = rnd(), l = 0.02 + rnd() * 0.05, a = rnd() * TAU; P.polyline([[u, v], [u + Math.cos(a) * l, v + Math.sin(a) * l]], 0.25, 1.2); } });
}
