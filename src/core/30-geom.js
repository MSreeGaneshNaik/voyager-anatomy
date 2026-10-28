// ============================================================================
// 30 · GEOMETRY KIT
// ============================================================================
const SCENE = new THREE.Scene();
const MODS = {};       // key → { group, mats: Map, meshes: [] }
let CUR = null;        // module receiving new parts

function mod(key, parent = SCENE) {
  const g = new THREE.Group(); g.name = key;
  parent.add(g);
  MODS[key] = { key, group: g, mats: new Map(), meshes: [], parentKey: CUR };
  return g;
}
function within(key, fn) { const prev = CUR; CUR = key; fn(MODS[key].group); CUR = prev; }

function matFor(role, map, opt = {}) {
  const M = MODS[CUR];
  const k = role + "|" + (map ? map.uuid : "-") + "|" + (opt.side ?? 0) + "|" + (opt.inkA ?? "") + "|" + (opt.alt ?? "") + "|" + (opt.tint ? opt.tint.join() : "");
  if (!M.mats.has(k)) M.mats.set(k, makeToon(role, map, opt));
  return M.mats.get(k);
}
// Add a mesh to a parent group. o: {map, p:[x,y,z], r:[rx,ry,rz], s, side, alt, inkA, name}
function add(parent, geo, role, o = {}) {
  const m = o.instances ? new THREE.InstancedMesh(geo, matFor(role, o.map, o), o.instances) : new THREE.Mesh(geo, matFor(role, o.map, o));
  if (o.p) m.position.set(...o.p);
  if (o.r) m.rotation.set(...o.r);
  if (o.q) m.quaternion.copy(o.q);
  if (o.s) typeof o.s === "number" ? m.scale.setScalar(o.s) : m.scale.set(...o.s);
  m.userData.mod = CUR;
  tagPart(m);
  parent.add(m);
  MODS[CUR].meshes.push(m);
  return m;
}

// Turned body. prof: [[r, y, smooth?], ...] traversed so the outside lies to the right.
// Corners are creases (own normals per segment); smooth points average.
function turn(prof, o = {}) {
  const seg = o.seg ?? 64, phi0 = o.phi0 ?? 0, phi = o.phi ?? TAU, n = prof.length;
  const sn = [];
  for (let k = 0; k < n - 1; k++) {
    const dr = prof[k + 1][0] - prof[k][0], dy = prof[k + 1][1] - prof[k][1], L = Math.hypot(dr, dy) || 1;
    sn.push([dy / L, -dr / L]);
  }
  let vs;
  if (o.vy) vs = prof.map((p) => (p[1] - o.vy[0]) / (o.vy[1] - o.vy[0]));
  else { let acc = 0; vs = [0]; for (let k = 0; k < n - 1; k++) { acc += Math.hypot(prof[k + 1][0] - prof[k][0], prof[k + 1][1] - prof[k][1]); vs.push(acc); } vs = vs.map((v) => v / (acc || 1)); }
  const avg = (a, b) => { const x = a[0] + b[0], y = a[1] + b[1], L = Math.hypot(x, y) || 1; return [x / L, y / L]; };
  const pos = [], nor = [], uv = [], idx = [];
  let base = 0;
  for (let k = 0; k < n - 1; k++) {
    const A = prof[k], B = prof[k + 1];
    if (A[0] === B[0] && A[1] === B[1]) continue;
    const nA = A[2] && k > 0 ? avg(sn[k - 1], sn[k]) : sn[k];
    const nB = B[2] && k < n - 2 ? avg(sn[k], sn[k + 1]) : sn[k];
    for (let i = 0; i <= seg; i++) {
      const u = i / seg, th = phi0 + u * phi, s = Math.sin(th), c = Math.cos(th);
      pos.push(A[0] * s, A[1], A[0] * c, B[0] * s, B[1], B[0] * c);
      nor.push(nA[0] * s, nA[1], nA[0] * c, nB[0] * s, nB[1], nB[0] * c);
      uv.push(o.u ? o.u[0] + u * (o.u[1] - o.u[0]) : u, vs[k], o.u ? o.u[0] + u * (o.u[1] - o.u[0]) : u, vs[k + 1]);
    }
    for (let i = 0; i < seg; i++) { const a = base + i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    base += (seg + 1) * 2;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}
const UP = V3(0, 1, 0);
// Cylinder from a to b (geometry already placed in parent space).
function rodGeo(a, b, r, seg = 10, r2) {
  const d = V3().subVectors(b, a), L = d.length();
  const g = new THREE.CylinderGeometry(r2 ?? r, r, L, seg, 1, false);
  g.translate(0, L / 2, 0);
  const q = new THREE.Quaternion().setFromUnitVectors(UP, d.normalize());
  g.applyQuaternion(q); g.translate(a.x, a.y, a.z);
  return g;
}
function tubeGeo(pts, r, o = {}) {
  const curve = new THREE.CatmullRomCurve3(pts.map((p) => (p.isVector3 ? p : V3(...p))), false, "centripetal");
  return new THREE.TubeGeometry(curve, o.seg ?? Math.max(16, pts.length * 10), r, o.radial ?? 10, false);
}
function torusGeo(R, r, seg = 64, arc = TAU) { const g = new THREE.TorusGeometry(R, r, 10, seg, arc); g.rotateX(Math.PI / 2); return g; }
function boxGeo(w, h, d, x = 0, y = 0, z = 0) { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); return g; }
function sphereGeo(r, x = 0, y = 0, z = 0, ws = 24, hs = 16) { const g = new THREE.SphereGeometry(r, ws, hs); g.translate(x, y, z); return g; }
// Prism from a polygon in the xz plane, y0..y1, with perimeter-mapped side UVs.
function prismGeo(pts, y0, y1, o = {}) {
  { let ar = 0; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; ar += a[0] * b[1] - b[0] * a[1]; } if (ar < 0) pts = pts.slice().reverse(); }
  const n = pts.length, pos = [], nor = [], uv = [], idx = [];
  let per = 0; const L = [0];
  for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n]; per += Math.hypot(b[0] - a[0], b[1] - a[1]); L.push(per); }
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz);
    const nx = dz / l, nz = -dx / l;
    const k = pos.length / 3;
    pos.push(a[0], y0, a[1], b[0], y0, b[1], a[0], y1, a[1], b[0], y1, b[1]);
    for (let j = 0; j < 4; j++) nor.push(nx, 0, nz);
    const u0 = L[i] / per, u1 = L[i + 1] / per;
    uv.push(u0, 0, u1, 0, u0, 1, u1, 1);
    idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3);
  }
  if (o.caps !== false) {
    const sh = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, z)));
    const tri = THREE.ShapeUtils.triangulateShape(sh.getPoints(), []);
    const xs = pts.map((p) => p[0]), zs = pts.map((p) => p[1]);
    const mnx = Math.min(...xs), mxx = Math.max(...xs), mnz = Math.min(...zs), mxz = Math.max(...zs);
    for (const [y, sgn] of [[y1, 1], [y0, -1]]) {
      const k = pos.length / 3;
      for (const [x, z] of pts) { pos.push(x, y, z); nor.push(0, sgn, 0); uv.push((x - mnx) / (mxx - mnx), (z - mnz) / (mxz - mnz)); }
      for (const t of tri) {
        const A = pts[t[0]], B = pts[t[1]], C = pts[t[2]];
        // y-component of (B−A)×(C−A) for points (x, y, z) = (x, y, z): ny = dz1*dx2 − dx1*dz2
        const ny = (B[1] - A[1]) * (C[0] - A[0]) - (B[0] - A[0]) * (C[1] - A[1]);
        (ny > 0) === (sgn > 0) ? idx.push(k + t[0], k + t[1], k + t[2]) : idx.push(k + t[0], k + t[2], k + t[1]);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}
// Box member between two points (for lattices), returned as a Matrix4 for an instanced unit box.
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = V3(), _p = V3();
function memberMatrix(a, b, w, d = w) {
  const dir = V3().subVectors(b, a), L = dir.length();
  _q.setFromUnitVectors(UP, dir.normalize());
  _p.addVectors(a, b).multiplyScalar(0.5);
  _s.set(w, L, d);
  return new THREE.Matrix4().compose(_p.clone(), _q.clone(), _s.clone());
}
function lattice(parent, members, role, o = {}) {
  const geo = o.geo || new THREE.BoxGeometry(1, 1, 1);
  const im = add(parent, geo, role, { instances: members.length, ...o });
  members.forEach((m, i) => im.setMatrixAt(i, m));
  im.instanceMatrix.needsUpdate = true;
  im.computeBoundingSphere();
  return im;
}
// A rod mesh that can be re-aimed every frame (unit cylinder along +y).
function liveRod(parent, r, role, o = {}) {
  const g = new THREE.CylinderGeometry(r, r, 1, o.seg ?? 10, 1, false); g.translate(0, 0.5, 0);
  const m = add(parent, g, role, o);
  m.userData.aim = (a, b) => {
    const d = V3().subVectors(b, a), L = d.length();
    m.position.copy(a); m.quaternion.setFromUnitVectors(UP, d.normalize()); m.scale.set(1, L, 1);
  };
  return m;
}
const polar = (r, a, y = 0) => V3(r * Math.sin(a), y, r * Math.cos(a)); // matches turn(): x = r sinθ, z = r cosθ
