// ============================================================================
// 41 · VOYAGER — the spacecraft, part by part. Metres, y up = the spacecraft's
// +Z axis (the high-gain antenna boresight, toward Earth). The bus sits on
// y = 0 … 0.47; the science boom runs along −x, the RTG boom along +x and the
// magnetometer boom off bay 7. Built once deployed (display "dV") and once
// stowed for launch inside the Centaur Standard Shroud.
// ============================================================================
const VB = { a: 0.89, h: 0.47, ai: 0.46 };            // bus: apothem (1.78 m across flats), height, inner apothem
const VB_RO = VB.a / Math.cos(18 * DEG), VB_RI = VB.ai / Math.cos(18 * DEG);
const VH = { R: 1.83, f: 1.37, y0: 0.64, hole: 0.12 }; // high-gain antenna: radius (3.66 m dish), focal length, vertex height
const yFront = (r) => VH.y0 + (r * r) / (4 * VH.f);
const yBack = (r) => yFront(r) - lerp(0.06, 0.034, r / VH.R);
// face k of the decagon: outward normal at azimuth 36°·k (x = cos, z = sin)
function faceOf(k, inset = 0) {
  const a = k * 36 * DEG, n = V3(Math.cos(a), 0, Math.sin(a)), t = V3(-Math.sin(a), 0, Math.cos(a));
  return { k, a, n, t, o: n.clone().multiplyScalar(VB.a - inset), w: 2 * VB.a * Math.tan(18 * DEG) };
}
const _mb = new THREE.Matrix4();
// place a geometry in a face's frame: u along the face (tangent), v up, w out of the face
function onFace(geo, F, u, v, w = 0) {
  _mb.makeBasis(F.t, UP, F.n).setPosition(F.o.clone().addScaledVector(F.t, u).addScaledVector(UP, v).addScaledVector(F.n, w));
  return geo.applyMatrix4(_mb);
}
// frame (t, b, d) for a direction d: t, b ⟂ d
function frameAlong(d) { const [t, b] = basis(d); return { t, b, d: d.clone().normalize() }; }
const placeIn = (geo, F, at) => { _mb.makeBasis(F.t, F.d, F.b).setPosition(at); return geo.applyMatrix4(_mb); }; // geometry's +y → d

function buildVoyagerTextures() {
  buildRecordTextures();
  // electronics-bay cover: panel edge, fastener row, connector plate
  T.bay = TEX(512, 512, (P) => {
    P.rect(0.03, 0.04, 0.94, 0.92, 0.7, 3); P.rect(0.07, 0.09, 0.86, 0.82, 0.25, 1.5);
    for (let i = 0; i < 12; i++) { P.dot(0.07 + i * 0.078, 0.065, 3, 0.7); P.dot(0.07 + i * 0.078, 0.935, 3, 0.7); }
    for (let i = 1; i < 8; i++) { P.dot(0.05, i / 8, 3, 0.7); P.dot(0.95, i / 8, 3, 0.7); }
    for (const v of [0.3, 0.5, 0.7]) P.hline(v, 0.12, 1.2, 0.1, 0.9);
  });
  T.blanket = TEX(512, 512, (P) => { for (let i = 0; i < 6; i++) { P.hline((i + 0.5) / 6, 0.22, 1.4); P.vline((i + 0.5) / 6, 0.12, 1.2); } const r = mulberry(4); for (let i = 0; i < 70; i++) P.dot(r(), r(), 2, 0.35); });
  T.dish = TEX(1024, 1024, (P) => { for (let i = 1; i < 7; i++) P.hline(i / 7, 0.1, 1.2); for (let i = 0; i < 24; i++) P.vline(i / 24, 0.06, 1); });
  T.dishBack = TEX(1024, 512, (P) => { for (let i = 0; i < 48; i++) P.vline(i / 48, 0.2, 1.2); for (const v of [0.2, 0.45, 0.7]) P.hline(v, 0.3, 1.6); });
  T.rtgCase = TEX(512, 512, (P) => { for (const v of [0.08, 0.92]) P.hline(v, 0.8, 2.5); for (let v = 0.16; v < 0.86; v += 0.07) P.hline(v, 0.18, 1.2); for (let i = 0; i < 24; i++) { P.dot(i / 24, 0.04, 2.4, 0.6); P.dot(i / 24, 0.96, 2.4, 0.6); } });
  T.tube = TEX(512, 256, (P) => { for (const v of [0.06, 0.94]) P.hline(v, 0.7, 2.5); for (let i = 0; i < 16; i++) P.dot(i / 16, 0.1, 2.2, 0.6); P.hline(0.5, 0.18, 1.4); });
  T.louver = TEX(256, 256, (P) => { P.rect(0.02, 0.02, 0.96, 0.96, 0.8, 3); });
  T.grid = TEX(256, 256, (P) => { for (let i = 1; i < 10; i++) { P.vline(i / 10, 0.7, 1.6); P.hline(i / 10, 0.7, 1.6); } });
  T.tank = TEX(1024, 512, (P) => { P.hline(0.5, 0.8, 3); P.rivets(0.5 + 0.02, 90, 0.4, 2); for (let i = 0; i < 8; i++) P.vline(i / 8, 0.08, 1.2); });
}

// ---------------------------------------------------------------------------
// Builds the spacecraft into `item` (a display root). `o.stowed` folds the booms
// for launch. Returns the module keys of every assembly.
// ---------------------------------------------------------------------------
function buildVoyager(item, o = {}) {
  const S = SHOW[item], P = item + ".";
  const keys = {};
  const part = (sub, info, ex = [0, 0, 0], parent) => { const k = asm(item, sub, info.name, info.desc, ex, info.kv || [], parent ? MODS[parent].group : undefined); MODULES[k].short = info.short || info.name; keys[sub] = k; return k; };
  const stow = !!o.stowed;

  // ---------------- bus frame, decks and the hydrazine tank ----------------
  part("frame", PARTINFO.frame);
  within(P + "frame", (g) => {
    const B = bulk();
    const seg = (r0, r1, y0, y1, k) => { const a0 = (k * 36 - 18) * DEG, a1 = (k * 36 + 18) * DEG; return prismGeo([[r0 * Math.cos(a0), r0 * Math.sin(a0)], [r1 * Math.cos(a0), r1 * Math.sin(a0)], [r1 * Math.cos(a1), r1 * Math.sin(a1)], [r0 * Math.cos(a1), r0 * Math.sin(a1)]], y0, y1); };
    for (let k = 0; k < 10; k++) {
      B.add(seg(0.3, VB_RO + 0.012, VB.h - 0.018, VB.h + 0.006, k), "grey");     // upper deck ring
      B.add(seg(0.3, VB_RO + 0.012, -0.006, 0.018, k), "grey");                  // lower deck ring
      const a = (k * 36 + 18) * DEG, p = V3(Math.cos(a) * (VB_RO - 0.004), 0, Math.sin(a) * (VB_RO - 0.004));
      B.add(boxGeo(0.034, VB.h - 0.03, 0.034, p.x, VB.h / 2, p.z).rotateY(0), "light");              // corner longerons
      for (const y of [0.05, VB.h - 0.05]) B.add(new THREE.CylinderGeometry(0.006, 0.006, 0.012, 8).rotateZ(Math.PI / 2).translate(0, 0, 0).applyMatrix4(new THREE.Matrix4().makeRotationY(-a)).translate(p.x * 1.02, y, p.z * 1.02), "dark");
    }
    // central cylinder that carries the tank
    B.add(turn([[0.3, 0.0], [0.3, VB.h], [0.29, VB.h], [0.29, 0.0], [0.3, 0.0]], { seg: 48 }), "light");
    for (let k = 0; k < 10; k++) { const a = (k * 36 + 18) * DEG; B.add(rodGeo(V3(Math.cos(a) * 0.3, VB.h - 0.03, Math.sin(a) * 0.3), V3(Math.cos(a) * (VB_RO - 0.03), VB.h - 0.03, Math.sin(a) * (VB_RO - 0.03)), 0.01, 6), "grey"); }
    // top deck: interface ring for the antenna adapter, fasteners
    B.add(turn([[0.42, VB.h + 0.006], [0.42, VB.h + 0.03], [0.36, VB.h + 0.03], [0.36, VB.h + 0.006]], { seg: 64 }), "light");
    boltCircle(B, V3(0, VB.h + 0.03, 0), UP, 0.39, 24, 0.008, 0.008);
    for (let k = 0; k < 10; k++) { const a = k * 36 * DEG; for (const r of [0.55, 0.75]) B.add(new THREE.CylinderGeometry(0.007, 0.007, 0.008, 8).translate(Math.cos(a) * r, VB.h + 0.009, Math.sin(a) * r), "dark"); }
    // two Canopus star trackers side by side on the upper ring, looking out across the bus
    { const F = faceOf(8); for (const u of [-0.09, 0.09]) { B.add(onFace(boxGeo(0.12, 0.1, 0.18), F, u, VB.h + 0.056, -0.12), "grey"); B.add(onFace(new THREE.CylinderGeometry(0.04, 0.05, 0.16, 20).rotateX(Math.PI / 2), F, u, VB.h + 0.07, 0.02), "light"); B.add(onFace(new THREE.CircleGeometry(0.036, 20), F, u, VB.h + 0.07, 0.101), "glass"); } }
    // lower deck: adapter ring to the propulsion module
    B.add(turn([[0.4, -0.006], [0.4, -0.03], [0.48, -0.03], [0.48, -0.006]], { seg: 64 }), "light");
    boltCircle(B, V3(0, -0.03, 0), V3(0, -1, 0), 0.44, 24, 0.008, 0.008);
    B.flush(g);
  });
  part("tank", PARTINFO.tank, [0, -1.15, 0]);
  within(P + "tank", (g) => {
    const B = bulk(), r = PROBE.tankR, yc = VB.h / 2 - 0.04;
    add(g, sphereGeo(r, 0, yc, 0, 48, 32), "metal", { map: T.tank });
    B.add(torusGeo(r * 1.0, 0.012, 64).translate(0, yc, 0), "grey");                 // girth weld land
    for (const s of [-1, 1]) {
      B.add(new THREE.CylinderGeometry(0.035, 0.045, 0.06, 16).translate(0, yc + s * (r + 0.02), 0), "grey");   // polar bosses
      B.add(torusGeo(0.04, 0.008, 20).translate(0, yc + s * (r + 0.05), 0), "dark");
    }
    for (let k = 0; k < 4; k++) { const a = k * 90 * DEG + 45 * DEG; B.add(rodGeo(V3(Math.cos(a) * r * 0.7, yc, Math.sin(a) * r * 0.7), V3(Math.cos(a) * 0.29, yc - 0.05, Math.sin(a) * 0.29), 0.008, 6), "dark"); }   // mounting tabs
    cable(B, [[0, yc - r - 0.05, 0], [0.12, yc - r - 0.08, 0.05], [0.24, -0.02, 0.1]], 0.008, { connector: false, role: "metal" });   // propellant line
    B.flush(g);
  });

  // ---------------- ten electronics bays ----------------
  for (let k = 0; k < 10; k++) {
    const F = faceOf(k), info = { name: LOUVER_BAYS.includes(k) ? "Electronics bay with louvres" : "Electronics bay", short: "Bay", desc: PARTINFO.bay.desc, kv: PARTINFO.bay.kv };
    part("bay" + k, info, F.n.clone().multiplyScalar(stow ? 0 : 0.62).toArray());
    within(P + "bay" + k, (g) => {
      const B = bulk(), a0 = (k * 36 - 18) * DEG, a1 = (k * 36 + 18) * DEG, gap = 0.012;
      const pts = [[VB_RI, a0], [VB_RO - 0.02, a0], [VB_RO - 0.02, a1], [VB_RI, a1]].map(([r, a], i) => { const da = (i === 0 || i === 1 ? 1 : -1) * gap / r; return [r * Math.cos(a + da), r * Math.sin(a + da)]; });
      add(g, prismGeo(pts, 0.022, VB.h - 0.022), "dark", { map: T.blanket, inkA: 0.6 });
      // the bay's outer cover plate
      add(g, onFace(boxGeo(F.w - 0.05, VB.h - 0.07, 0.012), F, 0, VB.h / 2, 0.006), "dark", { map: T.bay, inkA: 0.9 });
      // connector bracket and harness stubs near the top of the bay
      // (the record bay keeps its face clear for the record)
      if (k !== RECORD_BAY) {
        for (let i = -2; i <= 2; i++) B.add(onFace(new THREE.CylinderGeometry(0.014, 0.014, 0.03, 12).rotateX(Math.PI / 2), F, i * 0.07, VB.h - 0.07, 0.025), i % 2 ? "grey" : "metal");
        B.add(onFace(boxGeo(0.4, 0.03, 0.02), F, 0, VB.h - 0.07, 0.012), "grey");
      }
      if (LOUVER_BAYS.includes(k)) {
        // thermal-control louvres: a frame of blades driven by bimetal springs
        const fw = F.w - 0.12, fh = VB.h - 0.15;
        add(g, onFace(boxGeo(fw, fh, 0.018), F, 0, VB.h / 2 - 0.01, 0.02), "metal", { map: T.louver });
        for (let i = 0; i < 9; i++) {
          const v = 0.07 + (i + 0.5) * fh / 9 - 0.01, bl = new THREE.BoxGeometry(fw - 0.03, fh / 9 * 0.86, 0.004).rotateX(-25 * DEG);
          B.add(onFace(bl, F, 0, v, 0.034), "silver");
        }
        B.add(onFace(boxGeo(0.05, fh, 0.02), F, fw / 2 + 0.02, VB.h / 2 - 0.01, 0.025), "grey");   // actuator housing
      }
      B.flush(g);
    });
  }

  // ---------------- the Golden Record and its engraved cover, on a bus side panel ----------------
  part("record", PARTINFO.record, faceOf(RECORD_BAY).n.clone().multiplyScalar(0.42).toArray(), P + "bay" + RECORD_BAY);
  within(P + "record", (g) => {
    const F = faceOf(RECORD_BAY), B = bulk();
    const disc = (r, t) => new THREE.CylinderGeometry(r, r, t, 128).rotateX(Math.PI / 2);   // axis along the face normal
    add(g, onFace(disc(0.1524, 0.004), F, 0, VB.h / 2, 0.026), "gold", { map: T.recordGrooves, inkA: 0.8, rim: 0.3 });   // the 12-inch record
    for (let i = 0; i < 6; i++) { const a = i * 60 * DEG + 30 * DEG; B.add(onFace(new THREE.CylinderGeometry(0.01, 0.01, 0.026, 10).rotateX(Math.PI / 2), F, Math.cos(a) * 0.14, VB.h / 2 + Math.sin(a) * 0.14, 0.012), "grey"); }   // stand-offs
    B.flush(g);
  });
  part("cover", { ...PARTINFO.cover, short: "Record cover" }, faceOf(RECORD_BAY).n.clone().multiplyScalar(0.3).toArray(), P + "record");
  within(P + "cover", (g) => {
    const F = faceOf(RECORD_BAY), R = PROBE.recordCoverR, B = bulk();
    // the cover's engraved face looks out of the spacecraft: its texture is drawn on the cylinder's top cap
    add(g, onFace(new THREE.CylinderGeometry(R, R, 0.006, 128).rotateY(Math.PI).rotateX(Math.PI / 2), F, 0, VB.h / 2, 0.034), "gold", { map: T.recordCover, inkA: 0.95, rim: 0.25 });
    B.add(onFace(torusGeo(R, 0.004, 128).rotateX(Math.PI / 2), F, 0, VB.h / 2, 0.034), "gold");
    B.flush(g);
  });

  // ---------------- high-gain antenna ----------------
  part("hga", PARTINFO.hga, [0, 1.55, 0]);
  within(P + "hga", (g) => {
    const B = bulk(), N = 40, prof = [];
    for (let i = 0; i <= N; i++) { const r = VH.hole + (VH.R - VH.hole) * i / N; prof.push([r, yBack(r), i > 0 && i < N ? 1 : 0]); }
    prof.push([VH.R + 0.012, yFront(VH.R) - 0.004]);
    for (let i = N; i >= 0; i--) { const r = VH.hole + (VH.R - VH.hole) * i / N; prof.push([r, yFront(r), i > 0 && i < N ? 1 : 0]); }
    prof.push([VH.hole, yBack(VH.hole)]);
    add(g, turn(prof, { seg: 160 }), "white", { map: T.dish, inkA: 0.5 });
    B.add(torusGeo(VH.R + 0.006, 0.014, 160).translate(0, yFront(VH.R) - 0.012, 0), "light");     // rolled rim
    // 24 radial ribs and two hoops under the reflector
    for (let k = 0; k < 24; k++) {
      const sh = new THREE.Shape(), r0 = 0.3, r1 = VH.R - 0.04, n = 16;
      for (let i = 0; i <= n; i++) { const r = r0 + (r1 - r0) * i / n; i ? sh.lineTo(r, yBack(r)) : sh.moveTo(r, yBack(r)); }
      for (let i = n; i >= 0; i--) { const r = r0 + (r1 - r0) * i / n, d = lerp(0.13, 0.03, i / n); sh.lineTo(r, yBack(r) - d); }
      const ge = new THREE.ExtrudeGeometry(sh, { depth: 0.012, bevelEnabled: false }).translate(0, 0, -0.006).rotateY(-k * 15 * DEG);
      B.add(ge, k % 2 ? "light" : "grey");
    }
    for (const r of [0.75, 1.3]) B.add(turn([[r - 0.012, yBack(r) - 0.006], [r - 0.012, yBack(r) - 0.07 * (1.7 - r) - 0.03], [r, yBack(r) - 0.07 * (1.7 - r) - 0.03], [r, yBack(r) - 0.006]], { seg: 120 }), "grey");
    // feed horn at the vertex: X- and S-band
    add(g, turn([[0.08, VH.y0 - 0.08], [0.08, VH.y0 + 0.02], [0.165, VH.y0 + 0.3], [0.155, VH.y0 + 0.3], [0.07, VH.y0 + 0.02], [0.07, VH.y0 - 0.08]], { seg: 48 }), "light", { map: T.tube });
    B.add(torusGeo(0.16, 0.008, 48).translate(0, VH.y0 + 0.3, 0), "grey");
    B.add(new THREE.CylinderGeometry(0.11, 0.11, 0.1, 24).translate(0, VH.y0 - 0.1, 0), "grey");
    // subreflector on four struts, low-gain antenna on its back
    const ys = VH.y0 + 1.02, rs = 0.26;
    add(g, turn([[0.0, ys - 0.07], [rs * 0.5, ys - 0.055, 1], [rs, ys - 0.01], [rs + 0.01, ys], [rs + 0.01, ys + 0.02], [0.13, ys + 0.03], [0.13, ys + 0.03]], { seg: 64 }), "light");
    add(g, turn([[0.13, ys + 0.03], [0.13, ys + 0.12], [0.1, ys + 0.13], [0, ys + 0.13]], { seg: 40 }), "grey");
    add(g, turn([[0.058, ys + 0.13], [0.058, ys + 0.17], [0.108, ys + 0.3], [0.1, ys + 0.3], [0.05, ys + 0.17], [0.05, ys + 0.13]], { seg: 40 }), "white");   // LGA
    B.add(torusGeo(0.105, 0.006, 40).translate(0, ys + 0.3, 0), "grey");
    for (let k = 0; k < 4; k++) {
      const a = (45 + k * 90) * DEG, foot = V3(Math.cos(a) * 1.05, yFront(1.05) + 0.004, Math.sin(a) * 1.05), top = V3(Math.cos(a) * (rs - 0.02), ys + 0.005, Math.sin(a) * (rs - 0.02));
      strut(B, foot, top, 0.016, "light");
      B.add(new THREE.CylinderGeometry(0.03, 0.036, 0.02, 16).translate(foot.x, foot.y, foot.z), "grey");
    }
    // the 1.78 m support ring under the reflector, on short struts from the bus corners
    const ringY = yBack(VB.a) - 0.05, hubY = yBack(0.3);
    B.add(turn([[VB.a - 0.04, ringY - 0.03], [VB.a - 0.04, ringY + 0.04], [VB.a + 0.03, ringY + 0.04], [VB.a + 0.03, ringY - 0.03]].reverse(), { seg: 96 }), "grey");
    for (let k = 0; k < 10; k++) { const a = (k * 36 + 18) * DEG, b = a + 18 * DEG; strut(B, V3(Math.cos(a) * (VB_RO - 0.03), VB.h + 0.006, Math.sin(a) * (VB_RO - 0.03)), V3(Math.cos(b) * VB.a, ringY - 0.03, Math.sin(b) * VB.a), 0.012, "light"); }
    B.add(turn([[0.31, hubY - 0.02], [0.31, hubY + 0.004], [0.2, hubY + 0.004], [0.2, hubY - 0.02]], { seg: 48 }), "grey");
    // the Sun sensor's slot in the dish, and the sensor under it
    B.add(boxGeo(0.06, 0.012, 0.16, 0.42, yFront(0.42) + 0.004, 0).rotateZ(Math.atan(0.42 / (2 * VH.f)) * 0), "dark");
    B.add(boxGeo(0.1, 0.08, 0.14, 0.42, yBack(0.42) - 0.05, 0), "grey");
    B.flush(g);
  });

  // ---------------- science boom with CRS, LECP, PLS and the scan platform ----------------
  const SB = { y: 0.3, x0: -VB.a, x1: -VB.a - PROBE.sciLen, w: 0.07 }, SB_MID = -VB.a - PROBE.sciLen / 2;
  part("sci", PARTINFO.sci, [-0.75, 0, 0]);
  within(P + "sci", (g) => {
    const B = bulk(), M = [];
    const c = (x, sy, sz) => V3(x, SB.y + sy * SB.w, sz * SB.w);
    const xs = []; for (let x = SB.x0 - 0.06; x >= SB.x1 - 1e-6; x -= 0.24) xs.push(x); if (xs[xs.length - 1] > SB.x1 + 0.05) xs.push(SB.x1);
    const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    for (const [sy, sz] of corners) M.push(memberMatrix(c(xs[0], sy, sz), c(SB.x1, sy, sz), 0.022));
    for (let i = 0; i < xs.length; i++) {
      for (let j = 0; j < 4; j++) { const [ay, az] = corners[j], [by, bz] = corners[(j + 1) % 4]; M.push(memberMatrix(c(xs[i], ay, az), c(xs[i], by, bz), 0.014)); }
      if (i < xs.length - 1) for (let j = 0; j < 4; j++) { const [ay, az] = corners[j], [by, bz] = corners[(j + 1) % 4]; M.push(memberMatrix(c(xs[i], ay, az), c(xs[i + 1], by, bz), 0.008)); }
    }
    lattice(g, M, "white");
    // root hinge and latch on the bus face
    const F = faceOf(5);
    add(g, onFace(boxGeo(0.2, 0.2, 0.05), F, 0, SB.y, 0.03), "grey");
    B.add(new THREE.CylinderGeometry(0.03, 0.03, 0.24, 16).translate(SB.x0 - 0.06, SB.y, 0), "metal");
    for (const s of [-1, 1]) B.add(new THREE.CylinderGeometry(0.045, 0.045, 0.03, 16).translate(SB.x0 - 0.06, SB.y + s * 0.11, 0), "grey");
    bundle(B, [[SB.x0 - 0.02, SB.y - SB.w - 0.02, 0.0], [-1.6, SB.y - SB.w - 0.02, 0.02], [-2.6, SB.y - SB.w - 0.02, 0.02], [SB.x1 + 0.1, SB.y - SB.w - 0.02, 0.0]], 4, 0.005, 0.012, { tie: 0.18 });
    B.flush(g);
  });
  const onBoom = (x, side = 0) => V3(x, SB.y + (side ? 0 : SB.w + 0.012), side * (SB.w + 0.012));   // on top, or on a side (±z)
  // Cosmic Ray Subsystem
  part("crs", PARTINFO.crs, [0, 0.35, -0.35], P + "sci");
  within(P + "crs", (g) => {
    const B = bulk(), b = onBoom(SB_MID, -1).add(V3(0, -0.06, -0.15));
    B.add(boxGeo(0.3, 0.05, 0.16, b.x, b.y + 0.04, b.z + 0.1), "grey");   // bracket to the boom
    add(g, boxGeo(0.34, 0.22, 0.3, b.x, b.y + 0.11, b.z), "dark", { map: T.blanket, inkA: 0.6 });
    add(g, boxGeo(0.3, 0.012, 0.26, b.x, b.y + 0.226, b.z), "silver");   // radiator
    // two high-energy and four low-energy telescopes
    const tel = (p, d, r, l, role) => { const F = frameAlong(d); B.add(placeIn(turn([[0, 0], [r, 0], [r, l], [r * 0.82, l], [r * 0.82, l * 0.2], [0, l * 0.2]], { seg: 24 }), F, p), role); B.add(placeIn(new THREE.CircleGeometry(r * 0.8, 24).rotateX(-Math.PI / 2).translate(0, l * 0.2, 0), F, p), "glass"); };
    tel(V3(b.x - 0.06, b.y + 0.23, b.z - 0.05), V3(0, 1, 0), 0.045, 0.1, "light");
    tel(V3(b.x + 0.08, b.y + 0.23, b.z + 0.05), V3(0, 1, 0), 0.045, 0.1, "light");
    for (const [dx, dz, d] of [[0.17, 0.0, V3(1, 0.2, 0)], [-0.17, 0.04, V3(-1, 0.2, 0)], [0.0, 0.15, V3(0, 0.25, 1)], [0.08, -0.15, V3(0, 0.25, -1)]]) tel(V3(b.x + dx, b.y + 0.14, b.z + dz), d, 0.03, 0.07, "grey");
    for (const [x, z] of [[-0.15, -0.13], [0.15, -0.13], [0.15, 0.13], [-0.15, 0.13]]) B.add(new THREE.CylinderGeometry(0.006, 0.006, 0.008, 8).translate(b.x + x, b.y + 0.235, b.z + z), "dark");
    B.add(boxGeo(0.36, 0.02, 0.32, b.x, b.y - 0.001, b.z), "grey");   // mounting plate
    B.flush(g);
  });
  // Low-Energy Charged Particle instrument on its stepper platform
  part("lecp", PARTINFO.lecp, [0, 0.35, 0.4], P + "sci");
  within(P + "lecp", (g) => {
    const B = bulk(), b = onBoom(SB_MID, 1).add(V3(0, -0.06, 0.13));
    B.add(boxGeo(0.24, 0.05, 0.14, b.x, b.y + 0.02, b.z - 0.08), "grey");   // bracket to the boom
    B.add(boxGeo(0.24, 0.02, 0.2, b.x, b.y, b.z), "grey");
    add(g, boxGeo(0.2, 0.13, 0.16, b.x, b.y + 0.075, b.z), "dark", { map: T.blanket, inkA: 0.6 });
    add(g, new THREE.CylinderGeometry(0.075, 0.075, 0.06, 32).translate(b.x, b.y + 0.17, b.z), "grey");   // stepper motor
    const head = new THREE.Group(); head.position.set(b.x, b.y + 0.2, b.z); g.add(head);
    add(head, new THREE.CylinderGeometry(0.1, 0.1, 0.16, 40).translate(0, 0.08, 0), "light", { map: T.tube });
    add(head, turn([[0, 0.16], [0.1, 0.16], [0.085, 0.19], [0, 0.19]], { seg: 40 }), "light");
    const HB = bulk();
    for (const [a, y, l, r] of [[0, 0.06, 0.1, 0.035], [180, 0.11, 0.08, 0.028]]) {   // LEPT and LEMPA apertures
      const d = V3(Math.cos(a * DEG), 0, Math.sin(a * DEG)), F = frameAlong(d), p = d.clone().multiplyScalar(0.095).setY(y);
      HB.add(placeIn(turn([[0, 0], [r, 0], [r * 1.3, l], [r * 1.15, l], [r * 0.6, 0.01], [0, 0.01]], { seg: 24 }), F, p), "grey");
      HB.add(placeIn(new THREE.CircleGeometry(r * 0.6, 20).rotateX(-Math.PI / 2).translate(0, 0.01, 0), F, p), "glass");
    }
    HB.add(boxGeo(0.02, 0.12, 0.07, 0, 0.08, 0.09), "grey");   // sun shield
    HB.flush(head);
    LECP_HEADS.push(head);
    B.flush(g);
  });
  // Plasma Science: the main sensor's three Faraday cups face Earth, the side sensor looks across
  part("pls", PARTINFO.pls, [0, 0.5, -0.1], P + "sci");
  within(P + "pls", (g) => {
    const B = bulk(), b = onBoom(SB.x1 + 0.55);
    B.add(boxGeo(0.28, 0.02, 0.26, b.x, b.y, b.z), "grey");
    add(g, boxGeo(0.26, 0.16, 0.24, b.x, b.y + 0.09, b.z), "dark", { map: T.blanket, inkA: 0.6 });
    const cup = (p, d) => {
      const F = frameAlong(d);
      B.add(placeIn(turn([[0.0, 0], [0.055, 0], [0.06, 0.012], [0.06, 0.07], [0.052, 0.07], [0.052, 0.014], [0, 0.014]], { seg: 32 }), F, p), "light");
      B.add(placeIn(new THREE.CircleGeometry(0.052, 32).rotateX(-Math.PI / 2).translate(0, 0.066, 0), F, p), "grey", { map: T.grid });
      B.add(placeIn(torusGeo(0.058, 0.004, 32).translate(0, 0.07, 0), F, p), "grey");
    };
    const top = V3(b.x, b.y + 0.17, b.z);
    for (let i = 0; i < 3; i++) { const a = (i * 120 + 30) * DEG; cup(top.clone().add(V3(Math.cos(a) * 0.065, 0.01, Math.sin(a) * 0.065)), V3(Math.cos(a) * 0.36, 1, Math.sin(a) * 0.36)); }
    cup(V3(b.x, b.y + 0.09, b.z + 0.12), V3(0, 0, 1));
    B.flush(g);
  });
  // scan platform: two-axis actuator and the five remote-sensing instruments
  part("scan", PARTINFO.scan, [-0.7, 0.1, 0], P + "sci");
  const SP = V3(SB.x1 - 0.32, SB.y + 0.1, 0);
  within(P + "scan", (g) => {
    const B = bulk();
    add(g, new THREE.CylinderGeometry(0.075, 0.075, 0.2, 32).rotateZ(Math.PI / 2).translate(SB.x1 - 0.1, SB.y, 0), "grey", { map: T.tube });   // azimuth actuator
    B.add(boxGeo(0.08, 0.26, 0.16, SB.x1 - 0.24, SB.y + 0.05, 0), "grey");
    add(g, new THREE.CylinderGeometry(0.06, 0.06, 0.18, 32).rotateX(Math.PI / 2).translate(SB.x1 - 0.24, SB.y + 0.15, 0), "metal");   // elevation actuator
    add(g, boxGeo(0.62, 0.035, 0.5, SP.x - 0.08, SP.y, SP.z), "light");   // platform
    for (let i = 0; i < 8; i++) B.add(new THREE.CylinderGeometry(0.007, 0.007, 0.008, 8).translate(SP.x - 0.36 + (i % 4) * 0.19, SP.y + 0.02, SP.z + (i < 4 ? -0.23 : 0.23)), "dark");
    B.flush(g);
  });
  // instruments look along +z (toward the viewer of the default drawing)
  const scope = (B, c, r, l, o2 = {}) => {   // a telescope tube along +z centred at c, with sun shade and back cap
    const F = frameAlong(V3(0, 0, 1)), p0 = c.clone().add(V3(0, 0, -l / 2));
    const role = o2.role || "dark";
    add(MODS[CUR].group, placeIn(turn([[0, 0], [r * 0.98, 0], [r, 0.02], [r, l], [r * 0.9, l], [r * 0.9, 0.03], [0, 0.03]], { seg: 48 }), F, p0), role, { map: o2.map || T.blanket, inkA: 0.6 });
    B.add(placeIn(torusGeo(r, 0.006, 48).translate(0, l, 0), F, p0), "grey");
    if (o2.shade) B.add(placeIn(turn([[r * 0.92, l], [r * 1.12, l + o2.shade], [r * 1.08, l + o2.shade], [r * 0.88, l]], { seg: 48 }), F, p0), "light");
    B.add(placeIn(new THREE.CircleGeometry(r * 0.88, 40).rotateX(-Math.PI / 2).translate(0, l - 0.04, 0), F, p0), "glass");
    return p0;
  };
  const deck = SP.y + 0.018;
  part("iss", PARTINFO.iss, [0.1, 0.5, 0.25], P + "scan");
  within(P + "iss", (g) => {
    const B = bulk();
    scope(B, V3(SP.x + 0.12, deck + 0.105, 0.0), 0.1, 0.95, { shade: 0.14 });   // narrow-angle: 1,500 mm f/8.5
    add(g, boxGeo(0.2, 0.16, 0.18, SP.x + 0.12, deck + 0.08, -0.5), "dark", { map: T.blanket, inkA: 0.6 });   // vidicon + electronics
    scope(B, V3(SP.x + 0.12, deck + 0.29, 0.1), 0.06, 0.48, { shade: 0.08, role: "light", map: T.tube });   // wide-angle: 200 mm f/3
    for (const z of [-0.3, 0.2]) B.add(boxGeo(0.12, 0.08, 0.03, SP.x + 0.12, deck + 0.2, z), "grey");
    B.flush(g);
  });
  part("iris", PARTINFO.iris, [-0.2, 0.55, 0.35], P + "scan");
  within(P + "iris", (g) => {
    const B = bulk(), c = V3(SP.x - 0.22, deck + 0.29, 0.02);
    scope(B, c, 0.28, 0.56, { role: "gold", map: T.blanket });
    // secondary mirror on a four-vane spider
    const zf = c.z + 0.28 - 0.04;
    B.add(new THREE.CylinderGeometry(0.075, 0.075, 0.05, 32).rotateX(Math.PI / 2).translate(c.x, c.y, zf + 0.015), "grey");
    for (let k = 0; k < 4; k++) { const a = k * 90 * DEG + 45 * DEG; B.add(rodGeo(V3(c.x + Math.cos(a) * 0.075, c.y + Math.sin(a) * 0.075, zf + 0.015), V3(c.x + Math.cos(a) * 0.25, c.y + Math.sin(a) * 0.25, zf + 0.015), 0.005, 6), "grey"); }
    add(g, boxGeo(0.34, 0.012, 0.3, c.x, c.y + 0.3, c.z - 0.05), "silver");   // radiative cooler plate
    for (const s of [-1, 1]) B.add(boxGeo(0.02, 0.03, 0.3, c.x + s * 0.15, c.y + 0.285, c.z - 0.05), "grey");
    B.flush(g);
  });
  part("uvs", PARTINFO.uvs, [-0.1, 0.4, -0.35], P + "scan");
  within(P + "uvs", (g) => {
    const B = bulk(), c = V3(SP.x + 0.12, deck + 0.4, -0.12);
    add(g, boxGeo(0.14, 0.12, 0.5, c.x, c.y + 0.06, c.z), "dark", { map: T.blanket, inkA: 0.6 });
    for (let i = 0; i < 6; i++) B.add(boxGeo(0.14, 0.12, 0.004, c.x, c.y + 0.06, c.z + 0.25 + i * 0.022).translate(0, 0, 0), "grey");   // collimator baffles
    B.add(boxGeo(0.15, 0.13, 0.012, c.x, c.y + 0.06, c.z + 0.37), "light");
    for (const s of [-1, 1]) B.add(boxGeo(0.004, 0.13, 0.13, c.x + s * 0.072, c.y + 0.06, c.z + 0.31), "light");
    B.flush(g);
  });
  part("pps", PARTINFO.pps, [0.25, 0.3, 0.3], P + "scan");
  within(P + "pps", (g) => {
    const B = bulk(), c = V3(SP.x + 0.12, deck + 0.4, 0.27);
    scope(B, c.clone().add(V3(0, 0.08, 0)), 0.075, 0.34, { shade: 0.05, role: "light", map: T.tube });
    add(g, new THREE.CylinderGeometry(0.06, 0.06, 0.05, 32).translate(c.x, c.y + 0.17, c.z - 0.06), "grey");   // filter / analyser wheel housing
    B.flush(g);
  });

  // ---------------- RTG boom and the three MHW-RTGs ----------------
  const RB = { y: 0.24, x0: VB.a, x1: 2.65, w: 0.06 };
  part("rtgBoom", PARTINFO.rtgBoom, [0.5, 0, 0]);
  within(P + "rtgBoom", (g) => {
    const B = bulk(), M = [];
    const c = (x, sy, sz) => V3(x, RB.y + sy * RB.w, sz * RB.w);
    const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]], xs = [RB.x0 + 0.06, 1.35, 1.8, 2.25, RB.x1];
    for (const [sy, sz] of corners) M.push(memberMatrix(c(xs[0], sy, sz), c(RB.x1, sy, sz), 0.022));
    for (let i = 0; i < xs.length; i++) for (let j = 0; j < 4; j++) { const [ay, az] = corners[j], [by, bz] = corners[(j + 1) % 4]; M.push(memberMatrix(c(xs[i], ay, az), c(xs[i], by, bz), 0.014)); if (i < xs.length - 1) M.push(memberMatrix(c(xs[i], ay, az), c(xs[i + 1], by, bz), 0.008)); }
    lattice(g, M, "white");
    add(g, onFace(boxGeo(0.18, 0.18, 0.05), faceOf(0), 0, RB.y, 0.03), "grey");
    B.add(new THREE.CylinderGeometry(0.028, 0.028, 0.2, 16).translate(RB.x0 + 0.06, RB.y, 0), "metal");
    B.add(turn([[0.16, RB.x1 - 0.01], [0.16, RB.x1 + 0.02], [0.05, RB.x1 + 0.02], [0.05, RB.x1 - 0.01]], { seg: 48 }).rotateZ(-Math.PI / 2).translate(0, RB.y, 0), "grey");   // mounting ring
    // power cable from the RTGs back to the bus
    cable(B, [[RB.x1, RB.y - 0.09, 0.05], [1.8, RB.y - 0.1, 0.07], [RB.x0 + 0.04, RB.y - 0.08, 0.06]], 0.01, { role: "dark" });
    B.flush(g);
  });
  for (let i = 0; i < 3; i++) {
    const L = PROBE.rtgLen, x0 = RB.x1 + 0.03 + i * (L + 0.05);
    part("rtg" + i, { ...PARTINFO.rtg, name: `MHW-RTG ${i + 1}`, short: `RTG ${i + 1}` }, [0.28 * (i + 1), 0, 0], P + "rtgBoom");
    within(P + "rtg" + i, (g) => {
      const B = bulk(), rc = 0.105, rf = PROBE.rtgFinR;
      const along = (geo) => geo.rotateZ(-Math.PI / 2).translate(0, RB.y, 0);   // lathe y → +x
      add(g, along(turn([[0.0, x0], [0.14, x0], [0.14, x0 + 0.03], [rc, x0 + 0.04], [rc, x0 + L - 0.04], [0.14, x0 + L - 0.03], [0.14, x0 + L], [0, x0 + L]], { seg: 48 })), "dark", { map: T.rtgCase, inkA: 0.75 });
      for (let k = 0; k < 6; k++) {   // six radiator fins
        const a = (k * 60 + 30) * DEG;
        B.add(boxGeo(L - 0.1, 0.006, rf - rc).translate(x0 + L / 2, 0, rc + (rf - rc) / 2).applyMatrix4(new THREE.Matrix4().makeRotationX(a)).translate(0, RB.y, 0), "dark");
      }
      for (const x of [x0 + 0.015, x0 + L - 0.015]) boltCircle(B, V3(x, RB.y, 0), V3(x === x0 + 0.015 ? -1 : 1, 0, 0), 0.125, 12, 0.008, 0.01);
      if (i === 2) B.add(along(turn([[0.0, x0 + L], [0.06, x0 + L], [0.05, x0 + L + 0.05], [0, x0 + L + 0.05]], { seg: 32 })), "grey");   // end cover with relief device
      B.flush(g);
    });
  }
  // a strut ties the far end of the stack back to the bus
  within(P + "rtgBoom", (g) => { const B = bulk(); for (const s of [-1, 1]) strut(B, V3(VB_RO * Math.cos(36 * DEG) - 0.02, 0.03, s * (VB_RO * Math.sin(36 * DEG) - 0.02)), V3(RB.x1 - 0.02, RB.y - RB.w, s * RB.w), 0.012, "light"); B.flush(g); });   // outrigger struts

  // ---------------- magnetometer boom (13 m Astromast) ----------------
  const MD = faceOf(MAG_BAY).n, MF = frameAlong(MD), MR = 0.095, M0 = faceOf(MAG_BAY).o.clone().setY(0.39).addScaledVector(MD, 0.05);
  part("mag", PARTINFO.mag, MD.clone().multiplyScalar(0.7).toArray());
  within(P + "mag", (g) => {
    const B = bulk(), Lb = PROBE.magLen, M = [];
    // canister
    add(g, placeIn(new THREE.CylinderGeometry(0.115, 0.115, 0.66, 40).translate(0, 0.33, 0), MF, M0), "light", { map: T.tube });   // 23 × 66 cm canister
    B.add(placeIn(turn([[0.0, 0.66], [0.125, 0.66], [0.125, 0.69], [0.0, 0.69]], { seg: 40 }), MF, M0), "grey");
    for (const y of [0.15, 0.5]) B.add(placeIn(boxGeo(0.06, 0.08, 0.3).translate(0, y, -0.12), MF, M0), "grey");   // saddle clamps to the bus
    if (stow) { B.flush(g); return; }   // for launch the mast is coiled inside the canister, sensors and all
    // lattice: three longerons, triangular battens, crossed diagonals
    const P0 = M0.clone().addScaledVector(MD, 0.69), n = Math.round(Lb / 0.14), step = Lb / n;
    const v = (i, j) => P0.clone().addScaledVector(MD, i * step).addScaledVector(MF.t, Math.cos(j * TAU / 3 + 0.5) * MR).addScaledVector(MF.b, Math.sin(j * TAU / 3 + 0.5) * MR);
    for (let j = 0; j < 3; j++) M.push(memberMatrix(v(0, j), v(n, j), 0.009));
    for (let i = 0; i <= n; i++) for (let j = 0; j < 3; j++) { M.push(memberMatrix(v(i, j), v(i, (j + 1) % 3), 0.006)); if (i < n) { M.push(memberMatrix(v(i, j), v(i + 1, (j + 1) % 3), 0.0025)); M.push(memberMatrix(v(i, (j + 1) % 3), v(i + 1, j), 0.0025)); } }
    lattice(g, M, "light");
    // the two low-field magnetometers: one at the tip, one part-way out
    const sensor = (s) => { const p = P0.clone().addScaledVector(MD, s); add(g, placeIn(new THREE.CylinderGeometry(0.07, 0.07, 0.14, 32).translate(0, 0, 0), MF, p), "white", { map: T.tube }); B.add(placeIn(torusGeo(0.072, 0.006, 32), MF, p), "grey"); };
    sensor(PROBE.lfm[0]); sensor(Lb + 0.07);
    B.add(placeIn(new THREE.CylinderGeometry(0.1, 0.1, 0.02, 24).translate(0, 0, 0), MF, P0.clone().addScaledVector(MD, Lb)), "grey");
    B.flush(g);
  });

  // ---------------- planetary radio astronomy / plasma wave antennas ----------------
  part("pra", PARTINFO.pra, [0, -0.45, 0.25]);
  within(P + "pra", (g) => {
    const B = bulk(), F = faceOf(PRA_BAY), root = F.o.clone().setY(0.02).addScaledVector(F.n, 0.06);
    B.add(onFace(boxGeo(0.2, 0.1, 0.1), F, 0, 0.0, 0.06), "grey");
    for (const s of [-1, 1]) {
      const az = F.a + s * PRA_HALF, d = V3(Math.cos(az) * Math.cos(PRA_DIP), -Math.sin(PRA_DIP), Math.sin(az) * Math.cos(PRA_DIP));
      const a = root.clone().addScaledVector(F.t, s * 0.06), b = a.clone().addScaledVector(d, stow ? 0.16 : PROBE.praLen);   // for launch each whip is rolled up in its canister
      add(g, rodGeo(a, b, 0.0065, 8), "metal");
      B.add(placeIn(new THREE.CylinderGeometry(0.03, 0.03, 0.16, 16).translate(0, 0.08, 0), frameAlong(d), a), "grey");   // deployment canister stub
      B.add(new THREE.SphereGeometry(0.014, 12, 8).translate(b.x, b.y, b.z), "grey");
    }
    B.flush(g);
  });

  // ---------------- hydrazine thrusters ----------------
  part("thr", PARTINFO.thr, [0, -0.3, 0]);
  within(P + "thr", (g) => {
    const B = bulk();
    const nozzle = (p, d) => { const F = frameAlong(d); B.add(placeIn(turn([[0.012, -0.03], [0.012, 0.0], [0.02, 0.05], [0.017, 0.05], [0.009, 0.0], [0.009, -0.03]], { seg: 16 }), F, p), "metal"); B.add(placeIn(new THREE.CylinderGeometry(0.018, 0.018, 0.04, 12).translate(0, -0.05, 0), F, p), "grey"); };
    for (const k of THRUSTER_BAYS) {   // attitude-control clusters on the lower deck rim
      const F = faceOf(k), base = F.o.clone().setY(-0.04).addScaledVector(F.n, -0.08);
      B.add(boxGeo(0.12, 0.05, 0.08).applyMatrix4(new THREE.Matrix4().makeBasis(F.t, UP, F.n)).translate(base.x, base.y, base.z), "grey");
      nozzle(base.clone().addScaledVector(F.t, 0.04).add(V3(0, -0.03, 0)), F.t.clone());
      nozzle(base.clone().addScaledVector(F.t, -0.04).add(V3(0, -0.03, 0)), F.t.clone().negate());
      nozzle(base.clone().add(V3(0, -0.04, 0)), V3(0, -1, 0).addScaledVector(F.n, 0.15));
    }
    for (let k = 0; k < 4; k++) { const a = (k * 90 + 45) * DEG; nozzle(V3(Math.cos(a) * 0.36, -0.07, Math.sin(a) * 0.36), V3(0, -1, 0)); }   // trajectory-correction thrusters
    B.flush(g);
  });
  return keys;
}
const LOUVER_BAYS = [1, 4, 6, 9], RECORD_BAY = 3, MAG_BAY = 7, PRA_BAY = 2, THRUSTER_BAYS = [0, 5];
const PRA_DIP = 35 * DEG, PRA_HALF = 59.4 * DEG;   // two whips 90° apart, each 35° below the bus plane
const LECP_HEADS = [];
