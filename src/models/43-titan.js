// ============================================================================
// 43 · TITAN IIIE-CENTAUR on Launch Complex 41 — two UA1205 solid motors either
// side of the Titan core (stage 1, LR87; stage 2, LR91), the Centaur D-1T with
// two RL10s, and the Centaur Standard Shroud over Voyager and its propulsion
// module. Metres, y up from the SRM aft skirts on the launch-platform deck.
// ============================================================================
const TI = TITAN_GEOM;
const ST = {};   // station (base height) of each assembly, filled below
(function stations() {
  ST.srm = 0; ST.s1 = TI.coreBase; ST.s2 = ST.s1 + TI.s1Len; ST.cssBase = ST.s2 + TI.s2Len;
  ST.cen = ST.cssBase; ST.pm = ST.cen + TI.cenLen; ST.sV = ST.pm + TI.pmLen; ST.top = ST.cssBase + TI.cssLen;
})();
// Taken apart, the vehicle does what it does at liftoff: it rises off the platform (the SRM nozzles hang
// 3 m below the deck, so it lifts 2.4 m clear of that), stands forward clear of the umbilical tower while
// the arms swing back, and then comes apart the way it stages: the solids drop away sideways, the core
// stages and the Centaur separate along the axis, the shroud splits into two halves.
const PAD = { w: 26, zf: 13, zb: -14, apronX: 90, apronZ: 100, trenchW: 8, trenchOpen: 15, trenchEnd: 34, deflectorTop: -6.8 };
const STACK_LIFT = TI.srmNozzleLen + 2.4, STACK_CLEAR = 9.5, H_PAD = 3.2;
const STACK_EX = { srmL: [-4.1, 0, 0], srmR: [4.1, 0, 0], s1: [0, 0, 0], s1Eng: [0, -1.4, 0], s2: [0, 6, 0], s2Eng: [0, 4.4, 0], cen: [0, 12, 0], cenEng: [0, 9.6, 0], cssA: [6, 12, 0], cssB: [-6, 12, 0], pm: [0, 15, 0], pmEng: [0, 13.6, 0], sV: [0, 18.5, 0] };
// flight order: a stage that lights in flight climbs away from everything below it, which it leaves behind
const STACK_LV = { srmL: 0, srmR: 0, s1: 1, s1Eng: 1, s2: 2, s2Eng: 2, cssA: 2, cssB: 2, cen: 3, cenEng: 3, pm: 4, pmEng: 4, sV: 4 };
const GROUP_LV = { SRM: 0, S1: 1, S2: 2, CEN: 3, PM: 4 };

function buildStackTextures() {
  // a solid motor's exhaust: white-hot alumina, bright and smoky; hydrogen burns almost clear
  FX_SETS.SOLID = { light: ["#fffdf2", "#ffd27a", "#f39a44", "#e7e1d8", "#cfc8bd", 1.0], dark: ["#fffbe8", "#ffc766", "#f08a3a", "#6b6560", "#4d4843", 1.0] };
  FX_SETS.H2 = FX_SETS.J2;
  T.srm = TEX(1024, 2048, (P) => {
    const segs = TI.srmSegs;
    for (let i = 0; i <= segs; i++) { const v = 0.1 + i * 0.75 / segs; P.hline(v, 0.85, 3); P.rivets(v + 0.006, 120, 0.5, 1.6); P.rivets(v - 0.006, 120, 0.5, 1.6); }
    for (let i = 0; i < 48; i++) P.vline(i / 48, 0.08, 1, 0.1, 0.85);
    P.paint(0.0, 0.86, 1, 0.03); P.paint(0, 0.06, 1, 0.025);                 // dark bands at the forward and aft closures
    P.rect(0.47, 0.12, 0.06, 0.72, 0.5, 2);                                   // raceway cover
  });
  T.core = TEX(1024, 2048, (P) => {
    for (let v = 0.04; v < 1; v += 0.035) P.hline(v, 0.1, 1.2);
    for (const v of [0.02, 0.385, 0.415, 0.985]) { P.hline(v, 0.85, 3); P.rivets(v + 0.004, 100, 0.45, 1.5); }
    for (let i = 0; i < 64; i++) P.vline(i / 64, 0.06, 1);
    P.rect(0.24, 0.42, 0.02, 0.5, 0.45, 2); P.rect(0.74, 0.05, 0.02, 0.32, 0.45, 2);   // propellant feed-line tunnels
    for (let i = 0; i < 8; i++) P.rect(i / 8 + 0.03, 0.392, 0.03, 0.016, 0.6, 2);
  });
  T.s2 = TEX(1024, 1024, (P) => { for (let v = 0.06; v < 1; v += 0.06) P.hline(v, 0.1, 1.2); for (const v of [0.03, 0.5, 0.97]) { P.hline(v, 0.85, 3); P.rivets(v + 0.006, 100, 0.45, 1.5); } P.rect(0.6, 0.1, 0.02, 0.8, 0.45, 2); });
  T.cen = TEX(1024, 1024, (P) => { for (let i = 0; i < 24; i++) P.vline(i / 24, 0.3, 1.6); for (let v = 0.1; v < 1; v += 0.1) P.hline(v, 0.2, 1.4); P.hline(0.02, 0.8, 3); P.hline(0.98, 0.8, 3); });
  T.css = TEX(1024, 2048, (P) => {
    for (let v = 0.03; v < 1; v += 0.045) P.hline(v, 0.16, 1.4);
    for (const v of [0.0, 0.33, 0.66, 0.99]) P.hline(v + 0.005, 0.8, 3);
    P.vline(0.0 + 0.002, 0.9, 4); P.vline(0.5, 0.9, 4);                       // the split line between the halves
    for (let i = 0; i < 8; i++) P.rect(0.12 + i * 0.1, 0.36, 0.03, 0.02, 0.5, 2);
    P.rect(0.68, 0.48, 0.08, 0.05, 0.7, 2.5);                                  // access door
  });
  T.deckTi = TEX(2048, 2048, (P) => { for (let i = 0; i <= 24; i++) { P.vline(i / 24, 0.25, 2); P.hline(i / 24, 0.25, 2); } for (const [u, v, w, h] of [[0.05, 0.05, 0.12, 0.06], [0.8, 0.1, 0.1, 0.08], [0.78, 0.82, 0.14, 0.06], [0.08, 0.84, 0.08, 0.08]]) P.rect(u, v, w, h, 0.6, 2.5); for (let i = 1; i < 60; i++) { P.dot(i / 60, 0.012, 2.2, 0.5); P.dot(i / 60, 0.988, 2.2, 0.5); } });
  T.apron = TEX(2048, 2048, (P) => { for (let i = 1; i < 16; i++) { P.vline(i / 16, 0.14, 2); P.hline(i / 16, 0.14, 2); } });
  T.lattice = TEX(256, 1024, (P) => { const n = 10; for (let i = 0; i < n; i++) { P.polyline([[0, i / n], [1, (i + 1) / n]], 0.5, 3); P.polyline([[1, i / n], [0, (i + 1) / n]], 0.5, 3); P.hline(i / n, 0.5, 3); } P.vline(0.02, 0.6, 4); P.vline(0.98, 0.6, 4); }, { wrap: false });
  T.plateS = TEX(512, 256, (P) => { P.rect(0.04, 0.08, 0.92, 0.84, 0.8, 3); for (const v of [0.66, 0.5, 0.34]) P.hline(v, 0.6, 3, 0.12, 0.88); });
}

// a rocket engine: bell + chamber + turbomachinery block; returns { group, fx }
function engineBell(parent, o) {
  const g = new THREE.Group(); g.position.copy(o.at); if (o.tilt) g.rotation.z = o.tilt; parent.add(g);
  const B = bulk(), L = o.len, re = o.exitR, rt = o.throatR ?? re * 0.28, rc = o.chamberR ?? re * 0.5;
  const prof = [];
  for (let i = 0; i <= 18; i++) { const s = i / 18, r = rt + (re - rt) * Math.pow(s, 0.62); prof.push([r, L * 0.62 * (1 - s), i && i < 18 ? 1 : 0]); }
  prof.reverse();   // exit (y = 0) → throat
  const bell = [...prof, [rt, L * 0.62], [rc, L * 0.7], [rc, L * 0.92], [rc * 0.6, L], [0, L]];
  add(g, turn(bell, { seg: 64 }), o.role || "metal", { map: o.map });
  // inner surface of the bell, so the open nozzle reads hollow
  add(g, turn(prof.map(([r, y, s]) => [r * 0.97, y + 0.01, s]).reverse(), { seg: 64 }), "dark");
  B.add(torusGeo(re + 0.01, Math.max(0.012, re * 0.02), 64), "grey");
  for (const s of o.hoops || [0.3, 0.55]) B.add(torusGeo(rt + (re - rt) * Math.pow(1 - s, 0.62) * 1.0 + 0.01, Math.max(0.01, re * 0.012), 48).translate(0, L * 0.62 * s, 0), "light");
  if (o.pumps) {   // turbopump block beside the chamber, with its exhaust duct
    const p = V3(rc * 1.9, L * 0.82, 0);
    B.add(new THREE.CylinderGeometry(rc * 0.55, rc * 0.55, L * 0.22, 24).translate(p.x, p.y, p.z), "light");
    B.add(new THREE.CylinderGeometry(rc * 0.35, rc * 0.35, L * 0.12, 18).rotateZ(Math.PI / 2).translate(p.x - rc * 0.6, p.y + L * 0.05, 0), "grey");
    duct(B, [[p.x, p.y - L * 0.11, 0], [p.x + rc * 0.2, L * 0.55, 0], [re * 0.95, L * 0.25, 0]], rc * 0.14, { flanges: false });
  }
  B.flush(g);
  const fx = makeFX(o.fx, 0, { len: o.plume, r0: re * 0.95, rmax: re * (o.rmaxK ?? 4), spread: 1.2, pow: 0.9, freq: 1.2, flow: o.flow ?? 30, dens: o.dens ?? 1.4, hot: 5, diam: o.diam ?? 0.4, soot: o.soot ?? 0, fade: 0.45, coolK: o.coolK ?? 1.6 });
  g.add(fx);
  return { group: g, fx };
}

function buildStack() {
  buildStackTextures();
  const R = TI.coreR;

  // ---------------- launch platform, umbilical tower, flame trench ----------------
  mod("pad"); MODULES.pad = { ...STACKINFO.pad };
  within("pad", (g) => {
    // the deck runs back under the umbilical tower and forward past the vehicle, so the tower stands on it
    // and the taken-apart vehicle stays over it
    const B = bulk(), W = PAD.w, zf = PAD.zf, zb = PAD.zb, D = zf - zb, zc = (zf + zb) / 2, H = 3.2;
    // deck around one long exhaust slot under the solids and the core
    const sx0 = TI.srmX + 1.8, sz0 = 1.8;
    add(g, boxGeo(W, H, zf - sz0, 0, -H / 2, (zf + sz0) / 2), "deck", { map: T.deckTi });
    add(g, boxGeo(W, H, -sz0 - zb, 0, -H / 2, (zb - sz0) / 2), "deck", { map: T.deckTi });
    for (const s of [-1, 1]) add(g, boxGeo(W / 2 - sx0, H, sz0 * 2, s * (W / 2 + sx0) / 2, -H / 2, 0), "deck", { map: T.deckTi });
    add(g, boxGeo(sx0 * 2, 0.4, sz0 * 2, 0, -H + 0.2, 0), "dark");            // the slot's floor shows black through it
    // rail trucks under the platform
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { add(g, boxGeo(3.2, 1.6, 2.2, sx * 9.5, -H - 0.8, zc + sz * 8), "grey"); for (const dx of [-0.9, 0.9]) B.add(new THREE.CylinderGeometry(0.55, 0.55, 0.3, 24).rotateX(Math.PI / 2).translate(sx * 9.5 + dx, -H - 1.6, zc + sz * 8 + (sz > 0 ? 1.15 : -1.15)), "dark"); }
    // apron, rails and the flame trench with its deflector (the apron is its own part, left out of the framing)
    mod("apron", g); MODULES.apron = { name: "Pad apron", kv: [] };
    within("apron", (ga) => {
      add(ga, boxGeo(PAD.apronX, 1.2, PAD.apronZ, 0, -H - 2.2 - 0.6, 0), "light", { map: T.apron });
      // the flame trench runs under the platform and opens onto the apron at both ends
      for (const sz of [-1, 1]) add(ga, boxGeo(PAD.trenchW, 0.1, PAD.trenchEnd - PAD.trenchOpen, 0, -H - 2.15, sz * (PAD.trenchEnd + PAD.trenchOpen) / 2), "dark");
    });
    for (const z of [-9.15, -6.85, 6.85, 9.15]) B.add(boxGeo(PAD.apronX, 0.2, 0.25, 0, -H - 2.1, zc + z), "grey");
    add(g, boxGeo(12, 0.1, 7, 0, -H - 2.15, 0), "dark");                    // trench mouth
    add(g, prismGeo([[-5.5, -2.6], [5.5, -2.6], [5.5, 2.6], [-5.5, 2.6]], -H - 5.4, -H - 4.2), "grey");
    for (const s of [-1, 1]) add(g, prismGeo([[-5.5, 0], [5.5, 0], [5.5, s * 2.6], [-5.5, s * 2.6]].map(([x, z]) => [x, z]), -H - 4.2, -H - 3.6), "grey");
    // deck furniture: hold-down posts under the aft skirts, cable masts, a label plate
    for (const x of [-TI.srmX, TI.srmX]) for (const z of [-1, 1]) for (const dx of [-0.7, 0.7]) B.add(boxGeo(0.45, 0.35, 0.9, x + dx, 0.175 - 0.35, z * 2.0), "grey");   // support pedestals under the aft skirts
    for (const [x, z] of [[-1.5, 2.3], [1.5, 2.3]]) { B.add(boxGeo(0.5, 2.4, 0.5, x, 1.2, z), "light"); B.add(boxGeo(0.7, 0.2, 0.7, x, 2.5, z), "grey"); }
    add(g, boxGeo(3, 0.04, 1.4, W / 2 - 2.2, 0.02, zf - 1.2), "light", { map: T.plateS });
    for (let i = 0; i < 44; i++) B.add(new THREE.CylinderGeometry(0.05, 0.05, 1.1, 8).translate(-W / 2 + 0.3 + i * (W - 0.6) / 43, 0.55, zf - 0.15), "grey");   // handrail
    B.add(boxGeo(W - 0.6, 0.06, 0.06, 0, 1.1, zf - 0.15), "grey");
    B.flush(g);
  });
  mod("tower"); MODULES.tower = { ...STACKINFO.tower };
  within("tower", (g) => {
    const tz = -TI.towerZ, half = 2.6, top = TI.towerH, M = [];
    const cols = [[-half, -half], [half, -half], [half, half], [-half, half]].map(([x, z]) => [x, z + tz]);
    for (const [x, z] of cols) M.push(memberMatrix(V3(x, 0, z), V3(x, top, z), 0.34));
    for (let y = 0; y <= top - 1; y += 3.2) for (let k = 0; k < 4; k++) {
      const [ax, az] = cols[k], [bx, bz] = cols[(k + 1) % 4];
      M.push(memberMatrix(V3(ax, y, az), V3(bx, y, bz), 0.22));
      if (y + 3.2 <= top) { M.push(memberMatrix(V3(ax, y, az), V3(bx, y + 3.2, bz), 0.12)); M.push(memberMatrix(V3(bx, y, bz), V3(ax, y + 3.2, az), 0.12)); }
    }
    lattice(g, M, "tower");
    add(g, boxGeo(half * 2 + 1, 2.2, half * 2 + 1, 0, top + 1.1, tz), "light");   // equipment house
    add(g, rodGeo(V3(0, top + 2.2, tz), V3(0, top + 9, tz), 0.08, 8), "dark");   // lightning mast
    // umbilical swing arms: each runs from the tower's face to its stage, ends in an umbilical plate pressed
    // against the stage's skin, and carries its hoses and cable across; hinged at the root on the +x side,
    // they swing back flat against the tower at liftoff (and when the stack is taken apart)
    TOWER_ARMS.length = 0;
    const face = tz + half;
    for (const [y, on, what] of TI.arms) {
      const Rv = on === "css" ? TI.cssR : R, pivot = new THREE.Group(); pivot.position.set(0.5, y, face); g.add(pivot);
      const xc = -0.5, reach = -face - Rv - 0.36, M2 = [], B2 = bulk();
      // a box truss: four chords, verticals and diagonals every metre
      for (const dy of [0, 1.2]) for (const dx of [-0.5, 0.5]) M2.push(memberMatrix(V3(xc + dx, dy, 0), V3(xc + dx, dy, reach), 0.11));
      const n = Math.max(2, Math.round(reach)), st = reach / n;
      for (let i = 0; i <= n; i++) for (const dx of [-0.5, 0.5]) { const z = i * st; M2.push(memberMatrix(V3(xc + dx, 0, z), V3(xc + dx, 1.2, z), 0.07)); if (i < n) M2.push(memberMatrix(V3(xc + dx, 0, z), V3(xc + dx, 1.2, z + st), 0.05)); }
      for (let i = 0; i <= n; i++) for (const dy of [0, 1.2]) M2.push(memberMatrix(V3(xc - 0.5, dy, i * st), V3(xc + 0.5, dy, i * st), 0.06));
      lattice(pivot, M2, "light");
      B2.add(new THREE.CylinderGeometry(0.09, 0.09, 1.5, 12).translate(0, 0.6, 0), "grey");                                        // the hinge post
      // the umbilical plate on the stage's skin, and the lines that feed it
      B2.add(boxGeo(1.0, 0.9, 0.3, xc, 0.55, reach + 0.21), "grey");
      B2.add(boxGeo(0.7, 0.6, 0.06, xc, 0.55, reach + 0.36 - 0.03), "dark");
      for (const [dx, r, role] of [[-0.3, 0.07, "metal"], [0, 0.05, "dark"], [0.3, 0.07, "metal"]]) cable(B2, [[xc + dx, 0.02, Math.max(0.4, reach - 2.2)], [xc + dx, -0.45, reach - 1.1], [xc + dx, -0.25, reach - 0.15], [xc + dx, 0.25, reach + 0.06]], r, { role, connector: false, clip: 99 });
      B2.flush(pivot);
      TOWER_ARMS.push({ pivot, what });
    }
  });

  // ---------------- two UA1205 solid rocket motors ----------------
  for (const [key, sx] of [["srmL", -1], ["srmR", 1]]) {
    mod(key); MODULES[key] = { ...STACKINFO.srm, name: `UA1205 solid rocket motor (${sx < 0 ? "left" : "right"})` };
    within(key, (g) => {
      const B = bulk(), x = sx * TI.srmX, L = TI.srmLen, r = TI.srmR, noseL = TI.srmNose;
      const body = [[0, TI.srmSkirtH], [r * 1.24, 0.0], [r * 1.24, 0.25], [r, TI.srmSkirtH], [r, L - noseL, 1], [r * 0.82, L - noseL * 0.55, 1], [r * 0.42, L - noseL * 0.16, 1], [0.18, L, 1], [0, L]];
      add(g, turn(body, { seg: 72, vy: [0, L] }).translate(x, 0, 0), "white", { map: T.srm, inkA: 0.8 });
      // thrust-vector-control tank strapped to the outboard side, with its feed lines to the nozzle
      const tx = x + sx * (r + TI.tvcR + 0.05);
      add(g, turn([[0, TI.tvcY0], [TI.tvcR, TI.tvcY0 + 0.4, 1], [TI.tvcR, TI.tvcY0 + TI.tvcLen - 0.4, 1], [0, TI.tvcY0 + TI.tvcLen]], { seg: 40 }).translate(tx, 0, 0), "light", { map: T.tube });
      for (const y of [TI.tvcY0 + 1, TI.tvcY0 + TI.tvcLen - 1]) B.add(boxGeo(0.25, 0.3, 0.6, x + sx * (r + 0.08), y, 0), "grey");
      for (const dz of [-0.35, 0.35]) cable(B, [[tx, TI.tvcY0 + 0.1, dz], [tx - sx * 0.1, 1.2, dz * 1.3], [x + sx * (r * 1.1), 0.4, dz * 1.8]], 0.05, { connector: false, role: "metal", clip: 0.6 });
      // raceway along the outboard side, separation-motor clusters, attach struts
      B.add(boxGeo(0.22, L - noseL - 3, 0.42, x + sx * 0.12, (L - noseL + 3) / 2, r + 0.06), "light");
      for (const [y, sgn] of [[L - noseL * 0.6, 1], [TI.srmSkirtH + 0.6, -1]]) for (const dz of [-0.45, 0, 0.45]) B.add(new THREE.CylinderGeometry(0.11, 0.11, 0.9, 16).rotateZ(sx * 0.5).translate(x + sx * (r * 0.75), y, dz), "grey");
      for (const y of TI.strutY) { strut(B, V3(x - sx * r, y, 0.4), V3(sx * R, y + 0.25, 0.6), 0.09, "grey"); strut(B, V3(x - sx * r, y, -0.4), V3(sx * R, y + 0.25, -0.6), 0.09, "grey"); }
      B.flush(g);
      // nozzle below the aft skirt, canted outboard
      const e = engineBell(g, { at: V3(x, -TI.srmNozzleLen + 0.15, 0), len: TI.srmNozzleLen, exitR: TI.srmExitR, throatR: 0.35, chamberR: 0.7, fx: "SOLID", plume: 46, rmaxK: 5.5, dens: 1.6, diam: 0.1, flow: 26, coolK: 2.2, tilt: sx * TI.srmCant, role: "grey" });
      (SRM_SET[sx < 0 ? 0 : 1] = { group: e.group, fx: e.fx, name: sx < 0 ? "SRM L" : "SRM R", layout: V3(x, 0, 0) });
    });
  }

  // ---------------- core stage 1 (LR87) ----------------
  mod("s1"); MODULES.s1 = { ...STACKINFO.s1 };
  within("s1", (g) => {
    const B = bulk(), L = TI.s1Len;
    add(g, turn([[R * 0.6, 0.6], [R, 1.2], [R, L]], { seg: 72, vy: [0, L] }), "light", { map: T.core, inkA: 0.7 });
    add(g, turn([[0, 0.6], [R * 0.6, 0.6]], { seg: 48 }), "grey");   // aft heat shield
    for (const s of [-1, 1]) B.add(boxGeo(0.3, L * 0.55, 0.3, 0, L * 0.68, s * (R + 0.08)), "light");   // external lines tunnel
    B.flush(g);
  });
  mod("s1Eng"); MODULES.s1Eng = { ...STACKINFO.s1Eng };
  within("s1Eng", (g) => {
    for (const s of [-1, 1]) {
      const e = engineBell(g, { at: V3(s * TI.lr87X, 0.6 - TI.lr87Len, 0), len: TI.lr87Len, exitR: TI.lr87ExitR, chamberR: 0.32, fx: "HYP", plume: 26, rmaxK: 4.5, dens: 1.2, pumps: true });
      S1_SET.push({ group: e.group, fx: e.fx, name: s < 0 ? "Chamber 1" : "Chamber 2", layout: V3(s * TI.lr87X, 0, 0) });
    }
  });

  // ---------------- stage 2 (LR91) ----------------
  mod("s2"); MODULES.s2 = { ...STACKINFO.s2 };
  within("s2", (g) => {
    const L = TI.s2Len;
    add(g, turn([[R, 0], [R, L]], { seg: 72 }), "light", { map: T.s2, inkA: 0.7 });
    add(g, turn([[0, 0.3], [R * 0.98, 0.3]], { seg: 48 }), "grey");
    add(g, turn([[R * 0.99, L - 0.02], [R * 0.99, L], [0, L]], { seg: 48 }), "grey");
  });
  mod("s2Eng"); MODULES.s2Eng = { ...STACKINFO.s2Eng };
  within("s2Eng", (g) => { const e = engineBell(g, { at: V3(0, 0.3 - TI.lr91Len, 0), len: TI.lr91Len, exitR: TI.lr91ExitR, chamberR: 0.3, fx: "HYP", plume: 20, rmaxK: 4.5, dens: 1.0, pumps: true }); S2_SET.push({ group: e.group, fx: e.fx, name: "LR91", layout: V3() }); });

  // ---------------- Centaur D-1T (RL10 × 2) ----------------
  mod("cen"); MODULES.cen = { ...STACKINFO.cen };
  within("cen", (g) => {
    const B = bulk(), L = TI.cenLen, r = TI.cenR, t0 = TI.cenTank0, t1 = TI.cenTank1;
    // interstage adapter from the Titan, around the engines
    add(g, turn([[R, 0], [R, t0 - 0.3], [R - 0.04, t0 - 0.3], [R - 0.04, 0]], { seg: 72 }), "grey", { map: T.s2 });
    // the balloon tank: aft dome, cylinder, forward dome; equipment ring on top
    add(g, turn([[0, t0 - 0.9], [r * 0.6, t0 - 0.72, 1], [r * 0.93, t0 - 0.25, 1], [r, t0], [r, t1, 1], [r * 0.9, t1 + 0.45, 1], [r * 0.55, t1 + 0.8, 1], [0, t1 + 0.92]], { seg: 72, vy: [t0 - 0.9, t1 + 0.92] }), "silver", { map: T.cen, inkA: 0.65 });
    add(g, turn([[r * 0.99, t1 - 0.15], [r * 1.01, t1 - 0.1], [r * 1.01, t1 + 0.25], [r * 0.95, t1 + 0.3]], { seg: 72 }), "grey");
    for (let k = 0; k < 8; k++) { const a = k * 45 * DEG + 22.5 * DEG; B.add(boxGeo(0.4, 0.26, 0.14).rotateY(-a).translate(Math.cos(a) * r * 0.9, t1 + 0.55, Math.sin(a) * r * 0.9), "dark"); }
    // truss adapter that carries the spacecraft and its propulsion module
    add(g, turn([[r * 0.62, t1 + 0.82], [r * 0.62, t1 + 0.92], [r * 0.5, t1 + 0.92], [r * 0.5, t1 + 0.82]], { seg: 64 }), "grey");
    for (let k = 0; k < 12; k++) { const a = k * 30 * DEG, b = a + 15 * DEG; strut(B, V3(Math.cos(a) * r * 0.58, t1 + 0.92, Math.sin(a) * r * 0.58), V3(Math.cos(b) * TI.pmAdapterR, L - 0.06, Math.sin(b) * TI.pmAdapterR), 0.025, "light"); }
    add(g, turn([[TI.pmAdapterR + 0.06, L - 0.08], [TI.pmAdapterR + 0.06, L], [TI.pmAdapterR - 0.08, L], [TI.pmAdapterR - 0.08, L - 0.08]], { seg: 64 }), "grey");
    // propellant lines and the boost pumps' fairing down to the engines
    for (const s of [-1, 1]) duct(B, [[s * 0.5, t0 - 0.7, 0.25], [s * 0.55, t0 - 1.1, 0.3], [s * TI.rl10X * 0.8, 1.72, 0.2]], 0.05, { flanges: true, bolts: 8 });
    B.flush(g);
  });
  mod("cenEng"); MODULES.cenEng = { ...STACKINFO.cenEng };
  within("cenEng", (g) => {
    for (const s of [-1, 1]) {
      const e = engineBell(g, { at: V3(s * TI.rl10X, 0.06, 0), len: TI.rl10Len, exitR: TI.rl10ExitR, chamberR: 0.18, fx: "H2", plume: 14, rmaxK: 4.5, dens: 0.8, diam: 0.6, pumps: true });
      CEN_SET.push({ group: e.group, fx: e.fx, name: s < 0 ? "RL10 C-1" : "RL10 C-2", layout: V3(s * TI.rl10X, 0, 0) });
    }
  });

  // ---------------- Voyager and its propulsion module, stowed for launch ----------------
  buildStowedVoyager();

  // ---------------- Centaur Standard Shroud, in two halves ----------------
  for (const [key, side] of [["cssA", 1], ["cssB", -1]]) {
    mod(key); MODULES[key] = { ...STACKINFO.css };
    within(key, (g) => {
      const r = TI.cssR, L = TI.cssLen, b0 = TI.cssBoat, nose = TI.cssNose;
      // 42 ft cylinder (with a short skirt down to the Titan) under a 16 ft biconic nose
      const prof = [[R + 0.02, 0], [r, b0], [r, TI.cssCyl], [r * 0.62, TI.cssCyl + nose * 0.58], [0.32, L - 0.12], [0.16, L - 0.02], [0, L]];
      const phi0 = side > 0 ? 0 : Math.PI;
      add(g, turn(prof, { seg: 48, phi0, phi: Math.PI, vy: [0, L], u: side > 0 ? [0, 0.5] : [0.5, 1] }), "white", { map: T.css, inkA: 0.75, side: THREE.DoubleSide });
      // the cut faces along the split line
      const cut = new THREE.Shape(prof.map(([rr, y]) => new THREE.Vector2(rr, y)).concat(prof.slice().reverse().map(([rr, y]) => new THREE.Vector2(Math.max(0, rr - 0.06), y))));
      for (const a of [phi0, phi0 + Math.PI]) { const gg = new THREE.ShapeGeometry(cut); const P = gg.attributes.position; for (let i = 0; i < P.count; i++) { const rr = P.getX(i), y = P.getY(i); P.setXYZ(i, rr * Math.sin(a), y, rr * Math.cos(a)); } gg.computeVertexNormals(); add(g, gg, "grey", { side: THREE.DoubleSide }); }
    });
  }

  // ---------------- engine groups ----------------
  ENGINE_SETS.SRM = SRM_SET; ENGINE_SETS.S1 = S1_SET; ENGINE_SETS.S2 = S2_SET; ENGINE_SETS.CEN = CEN_SET; ENGINE_SETS.PM = PM_SET;
  Object.assign(GROUPS, STACK_GROUPS);
  for (const k in GROUPS) C.off[k] = (ENGINE_SETS[GROUPS[k].set] || []).map(() => 0);
  // stack bounds for the camera's depth range
  SCENE.updateMatrixWorld(true);
  STACK_SPHERE = new THREE.Sphere(V3(0, ST.top / 2, -TI.towerZ / 2), Math.max(ST.top, 40) * 0.95 + 62);   // room for the taken-apart layout and a climbing stage
  FRAME_HOOKS.push(stackPose);
  // On the pad the solids fire straight down the slot onto the flame deflector, which splits the exhaust
  // both ways along the trench under the platform; it leaves the trench where it opens onto the apron and
  // rolls up there as a cloud. Nothing passes through the deck or the apron.
  PAD_FIRE.f = makeFX("FIRE", 1, { len: 4, r0: 5, rmax: 6, freq: 1.0, flow: 3, dens: 1.6, attack: 0.5, decay: 1.5 });
  PAD_FIRE.f.position.set(0, -0.2, 0); MODS.pad.group.add(PAD_FIRE.f);
  PAD_FIRE.trench = [-1, 1].map((sz) => {
    const f = makeFX("FIRE", 0, { len: PAD.trenchOpen + 2, r0: 2.6, rmax: 4.2, spread: 0.5, pow: 1, freq: 0.9, flow: 22, dens: 1.5, hot: 3, fade: 0.55, attack: 0.4, decay: 1.2 });
    f.position.set(0, -H_PAD - 3.0, 0); f.rotation.x = -sz * Math.PI / 2; MODS.pad.group.add(f); return f;
  });
  for (const s of [-1, 1]) for (const i of [0, 1]) {
    const f = makeFX("STEAM", 1, { len: 15, r0: 9, rmax: 13, freq: 0.7, flow: 0.5, dens: 1.5, attack: 1.2, decay: 3.2 });
    f.position.set(i ? -2.5 : 2.5, 2, s * (PAD.trenchOpen + 3 + i * 7)); MODS.pad.group.add(f); BILLOWS.push({ f, s, i });
  }
  MODULES.stackInfo = { name: "Titan IIIE-Centaur", by: "Martin Marietta · General Dynamics · United Technologies", desc: "Two solid motors, a two-stage Titan core and a Centaur upper stage under one long shroud. Voyager 2 flew on TC-7 and Voyager 1 on TC-6, sixteen days apart, from Launch Complex 41 at Cape Canaveral.", kv: [["Height", "48.2 m · 158 ft"], ["Liftoff mass", "632,970 kg"], ["Liftoff thrust", "2 × 5,293 kN at sea level"], ["Liftoff T/W", fmt(2 * ENGINES.UA1205.thrustSL * LBF / (LIFTOFF_KG * G0), 2)], ["Voyager 2", "TC-7 · 20 Aug 1977, 14:29:44 UT"], ["Voyager 1", "TC-6 · 5 Sep 1977, 12:56:01 UT"]] };
  addMenu("Launch", STACK_MENU);
}
const SRM_SET = [], S1_SET = [], S2_SET = [], CEN_SET = [], PM_SET = [], TOWER_ARMS = [], BILLOWS = [], PAD_FIRE = {};

// stowed spacecraft: bus, dish, folded booms, RTGs folded down beside the propulsion module
function buildStowedVoyager() {
  mod("pm"); MODULES.pm = { ...STACKINFO.pm };
  within("pm", (g) => {
    const B = bulk(), h = TI.pmLen, r = TI.pmR;
    // the module: a 1 m × 0.9 m cylinder of struts round the motor, ringed top and bottom
    for (const y of [0.04, h - 0.04]) add(g, turn([[r + 0.04, y - 0.04], [r + 0.04, y + 0.04], [r - 0.05, y + 0.04], [r - 0.05, y - 0.04]], { seg: 64 }), "grey");
    for (let k = 0; k < 12; k++) { const a = k * 30 * DEG, b = a + 30 * DEG; strut(B, V3(Math.cos(a) * r, 0.08, Math.sin(a) * r), V3(Math.cos(b) * r, h - 0.08, Math.sin(b) * r), 0.018, "light"); }
    add(g, turn([[TI.pmAdapterR + 0.05, 0], [TI.pmAdapterR + 0.05, 0.05], [r, 0.05], [r, 0]], { seg: 64 }), "light");
    // eight hydrazine engines on outriggers: four 445 N for pitch and yaw, four 22 N for roll
    for (let k = 0; k < 8; k++) {
      const big = k % 2 === 0, a = (k * 45) * DEG, p = V3(Math.cos(a) * (r + 0.22), h * 0.35, Math.sin(a) * (r + 0.22));
      B.add(boxGeo(big ? 0.12 : 0.08, big ? 0.14 : 0.09, big ? 0.12 : 0.08, p.x, p.y, p.z), "grey");
      B.add(rodGeo(p, V3(Math.cos(a) * r, h * 0.45, Math.sin(a) * r), 0.015, 6), "light");
      B.add(turn([[big ? 0.03 : 0.018, 0], [big ? 0.06 : 0.03, -0.12], [big ? 0.055 : 0.026, -0.12], [big ? 0.025 : 0.014, 0]], { seg: 16 }).translate(p.x, p.y - 0.06, p.z), "metal");
    }
    B.flush(g);
  });
  mod("pmEng"); MODULES.pmEng = { ...STACKINFO.pmEng };
  within("pmEng", (g) => {
    const h = TI.pmLen, rc = TI.te364R, B = bulk(), yc = h * 0.5;
    add(g, sphereGeo(rc, 0, yc, 0, 40, 28), "light", { map: T.tank });
    B.add(torusGeo(rc, 0.02, 64).translate(0, yc, 0), "grey");
    const e = engineBell(g, { at: V3(0, yc - rc - TI.te364NozLen * 0.6, 0), len: TI.te364NozLen, exitR: TI.te364ExitR, throatR: 0.06, chamberR: 0.14, fx: "SOLID", plume: 8, rmaxK: 4, dens: 1.2, diam: 0.1, flow: 18, role: "grey" });
    PM_SET.push({ group: e.group, fx: e.fx, name: "TE-M-364-4", layout: V3() });
    B.flush(g);
  });
  // Voyager as it rode in the shroud: the same spacecraft as the flight model, part for part, with the
  // science boom and the RTG boom folded down alongside the propulsion module, the magnetometer mast
  // coiled in its canister and the radio antennas rolled up
  mod("sV"); MODULES.sV = { ...STACKINFO.sV };
  SHOW.sVs = { key: "sVs", group: MODS.sV.group, asm: [], fx: [], stowed: true };
  buildVoyager("sVs", { stowed: true });
  const fold = (key, hinge, ang) => { const g = MODS[key].group, piv = new THREE.Group(); piv.position.copy(hinge); g.parent.add(piv); piv.add(g); g.position.sub(hinge); piv.rotation.z = ang; };
  fold("sVs.sci", V3(-VB.a - 0.12, 0.3, 0), Math.PI / 2);
  fold("sVs.rtgBoom", V3(VB.a + 0.12, 0.24, 0), -Math.PI / 2);
  // in the stack it answers as one part: its meshes and materials gather under "sV"
  for (const k of Object.keys(MODS)) if (k.startsWith("sVs.")) { MODS.sV.meshes.push(...MODS[k].meshes); for (const [mk, m] of MODS[k].mats) MODS.sV.mats.set(k + "|" + mk, m); MOD_TO_ITEM_EXTRA[k] = "lSV"; }
}

// per-frame: the stack's taken-apart pose, swing arms, shroud halves
const STACK_BASE = () => ({ srmL: 0, srmR: 0, s1: ST.s1, s1Eng: ST.s1, s2: ST.s2, s2Eng: ST.s2, cen: ST.cen, cenEng: ST.cen, cssA: ST.cssBase, cssB: ST.cssBase, pm: ST.pm, pmEng: ST.pm, sV: ST.sV });
// a module's vertical extent about its own origin
const _ly = {};
function localY(k) {
  if (_ly[k]) return _ly[k];
  const g = MODS[k].group; g.updateWorldMatrix(true, true);
  const inv = g.matrixWorld.clone().invert(), b = new THREE.Box3(), t = new THREE.Box3(), m4 = new THREE.Matrix4();
  for (const m of MODS[k].meshes) {
    let bb; if (m.isInstancedMesh) { m.computeBoundingBox(); bb = m.boundingBox; } else { if (!m.geometry.boundingBox) m.geometry.computeBoundingBox(); bb = m.geometry.boundingBox; }
    b.union(t.copy(bb).applyMatrix4(m4.multiplyMatrices(inv, m.matrixWorld)));
  }
  return (_ly[k] = [b.min.y, b.max.y]);
}
// how far a stage must climb, taken apart, for its whole exhaust plume to clear what it leaves behind
// on the axis below it (or the platform deck)
function climbFor(lv) {
  const B0 = STACK_BASE(), apartY = (k) => B0[k] + STACK_EX[k][1] + STACK_LIFT;
  let exit = Infinity, below = 0;
  for (const k in STACK_LV) {
    const [y0, y1] = localY(k).map((v) => v + apartY(k));
    if (STACK_LV[k] === lv) exit = Math.min(exit, y0);
    else if (STACK_LV[k] < lv && STACK_EX[k][0] === 0) below = Math.max(below, y1);
  }
  const G = GROUPS[Object.keys(GROUP_LV).find((g) => GROUP_LV[g] === lv)];
  return Math.max(0, G.plume.len + 1.5 - (exit - below));
}

// per-frame: the stack's taken-apart pose, a firing stage's climb, swing arms
function stackPose(dt, sh) {
  if (sh) return;
  const exS = ease(C.exAmt), B0 = STACK_BASE();
  // a stage that lights in flight, fired taken apart, climbs off the spent hardware below it
  // (lighting the solids taken apart lifts the whole vehicle: they carry everything at liftoff)
  const lv = GROUP_LV[C.group], firing = C.running && C.explode && lv != null;
  if (firing && C.climbLv !== lv && !(C.climbAmt > 0.01)) { C.climbLv = lv; C.climbD = climbFor(lv); C.climbT0 = C.t; }
  if (firing && C.climbLv === lv) C.climbAmt = Math.max(C.climbAmt || 0, REDUCED ? 1 : smooth(0.35, 3.2, C.t - C.climbT0));
  else C.climbAmt = (C.climbAmt || 0) * Math.exp(-dt * (REDUCED ? 60 : 1.6));
  if (C.climbAmt < 1e-4) C.climbAmt = 0;
  for (const k in STACK_LV) {
    const e = STACK_EX[k], up = STACK_LV[k] >= (C.climbLv ?? 99) ? (C.climbD || 0) * C.climbAmt : 0;
    MODS[k].group.position.set(e[0] * exS, B0[k] + (e[1] + STACK_LIFT) * exS + up, (e[2] + STACK_CLEAR) * exS);
  }
  const srm = SRM_SET.reduce((a, e) => a + (e.fx.userData.thrust || 0), 0) / 2;
  PAD_FIRE.f.userData.target = srm * (1 - C.exAmt);
  PAD_FIRE.trench.forEach((f) => (f.userData.target = srm * (1 - C.exAmt)));
  // the clouds grow and roll outward along the trench while the solids burn, staying over the apron
  BILLOWS.forEach((b) => { b.f.userData.target = srm * (1 - C.exAmt); const L = b.f.userData.level; b.f.position.z = b.s * (PAD.trenchOpen + 3 + b.i * 7 + L * 5); b.f.material.uniforms.uR0.value = 6 + 6 * L; });
  const sw = smooth(0, 0.4, C.exAmt);
  TOWER_ARMS.forEach((a) => (a.pivot.rotation.y = sw * 80 * DEG));
}

// where the pad exhaust goes, for the automated checks
function padExhaust() {
  const G = GROUPS.SRM, exitY = -TI.srmNozzleLen + 0.15, end = exitY - G.plume.padLen;
  const far = Math.max(...BILLOWS.map((b) => Math.abs(b.f.position.z) + b.f.material.uniforms.uRMax.value * 0.6));
  const okEnd = end >= PAD.deflectorTop - 0.6, okFar = far <= PAD.apronZ / 2;
  return { ok: okEnd && okFar, msg: `solid plume ends at ${end.toFixed(1)} m on the deflector (top ${PAD.deflectorTop} m); clouds reach ${far.toFixed(1)} m of the apron's ${PAD.apronZ / 2} m` };
}
