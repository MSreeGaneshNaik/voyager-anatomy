// ============================================================================
// 47 · THE GRAND TOUR — both probes from the pad to today on one map of the
// solar system. 1 unit = 1 AU; the ecliptic lies flat. Every planet's orbit,
// every leg and every distance is to scale. Each leg is the Lambert conic
// between real encounter dates (46-orbits); the last runs out to the probe's
// JPL Horizons position on 28 Oct 2026. Planet close-ups use the flown closest
// approach with the v∞ the legs imply. Built on first visit.
// ============================================================================
const JD_HZ = jdOf("2026-10-28T00:00:00Z");
const JD_NOW = () => Date.now() / 86400000 + 2440587.5;
const PROBES = {
  V1: { name: "Voyager 1", cls: "v1", col: "hl", launch: "1977-09-05T12:56:01Z", vehicle: "TC-6",
    legs: [["earth", "1977-09-05T12:56:01Z"], ["jupiter", "1979-03-05T12:05:26Z"], ["saturn", "1980-11-12T23:46:30Z"]],
    hz: { lon: 256.78, lat: 35.16, r: 172.17, v: 16.92, earth: 172.77, lt: 1436.9 },
    ts: ["2004-12-16T00:00:00Z", 94], hp: ["2012-08-25T00:00:00Z", 121.6] },
  V2: { name: "Voyager 2", cls: "v2", col: "hl2", launch: "1977-08-20T14:29:44Z", vehicle: "TC-7",
    legs: [["earth", "1977-08-20T14:29:44Z"], ["jupiter", "1979-07-09T22:29:51Z"], ["saturn", "1981-08-26T03:24:57Z"], ["uranus", "1986-01-24T17:59:47Z"], ["neptune", "1989-08-25T03:56:36Z"]],
    hz: { lon: 290.72, lat: -38.52, r: 144.31, v: 15.26, earth: 144.50, lt: 1201.7 },
    ts: ["2007-08-30T00:00:00Z", 84], hp: ["2018-11-05T00:00:00Z", 119] },
};
// planets: radius and GM (km, km³/s²), north pole (IAU, equatorial J2000), rings and moon orbits (km)
const PLANETS = {
  mercury: { R: 2439.7 }, venus: { R: 6051.8 }, earth: { R: 6378.1 }, mars: { R: 3396.2 },
  jupiter: { R: 71492, mu: 126686534, pole: [268.057, 64.495], moons: [["Io", 421700], ["Europa", 671034], ["Ganymede", 1070412], ["Callisto", 1882709]], bands: true },
  saturn: { R: 60268, mu: 37931187, pole: [40.589, 83.537], rings: [[74658, 92000], [92000, 117580], [122170, 136775]], moons: [["Titan", 1221870]], bands: true },
  uranus: { R: 25559, mu: 5793939, pole: [257.311, -15.175], rings: [[51149 - 300, 51149 + 300]], moons: [["Miranda", 129390], ["Ariel", 190900]] },
  neptune: { R: 24764, mu: 6836529, pole: [299.36, 43.46], rings: [[62932 - 400, 62932 + 400]], moons: [] },
};
// flown closest approaches, km from the planet's centre
const FLOWN_CA = { V1jupiter: 348890, V1saturn: 184300, V2jupiter: 721670, V2saturn: 161000, V2uranus: 107000, V2neptune: 29240 };
const KM = 1 / AU;   // km → scene units
const J = { built: false, root: null, lines: [], labels: [], date: JD_HZ, legs: {}, flybys: {}, t: 1 };

// ---------- the model: legs, positions, flybys ----------
function buildLegs() {
  for (const [k, P] of Object.entries(PROBES)) {
    const legs = [];
    for (let i = 0; i < P.legs.length - 1; i++) {
      const [p1, d1] = P.legs[i], [p2, d2] = P.legs[i + 1], j1 = jdOf(d1), j2 = jdOf(d2);
      const r1 = planetPos(p1, j1), r2 = planetPos(p2, j2), L = lambert(r1, r2, j2 - j1);
      legs.push({ from: p1, to: p2, j1, j2, r1, v1: L.v1, v2: L.v2 });
    }
    // the escape leg: the short-way conic from the last planet to today's Horizons position
    const [pl, dl] = P.legs[P.legs.length - 1], j1 = jdOf(dl), r1 = planetPos(pl, j1);
    const r2 = v3.mul(eclDir(P.hz.lon, P.hz.lat), P.hz.r), L = lambert(r1, r2, JD_HZ - j1, MU_SUN, "short");
    legs.push({ from: pl, to: null, j1, j2: JD_HZ, r1, v1: L.v1, v2: L.v2 });
    J.legs[k] = legs;
    // flybys: v∞ in and out, the turn, and the closest approach a patched conic implies
    for (let i = 0; i < legs.length - 1; i++) {
      const a = legs[i], b = legs[i + 1], pn = a.to, PL = PLANETS[pn], vp = planetVel(pn, a.j2);
      const vin = v3.sub(a.v2, vp), vout = v3.sub(b.v1, vp);
      const si = v3.mul(vin, 1 / v3.len(vin)), so = v3.mul(vout, 1 / v3.len(vout));
      const vi = v3.len(vin) * AUD_KMS, vo = v3.len(vout) * AUD_KMS, vinf = (vi + vo) / 2;
      const turn = Math.acos(clamp(v3.dot(si, so), -1, 1));
      const rpModel = PL.mu / (vinf * vinf) * (1 / Math.sin(turn / 2) - 1);
      J.flybys[k + pn] = { probe: k, planet: pn, jd: a.j2, at: planetPos(pn, a.j2), si, so, vi, vo, vinf, turn, rpModel, rp: FLOWN_CA[k + pn], agree: Math.abs(vi - vo) / vinf < 0.03 };
    }
  }
}
function stateAt(k, jd) {
  const legs = J.legs[k];
  if (jd <= legs[0].j1) return { r: planetPos("earth", jd), v: planetVel("earth", jd), leg: -1 };
  let i = legs.findIndex((L) => jd <= L.j2); if (i < 0) i = legs.length - 1;
  const L = legs[i], s = propagate(L.r1, L.v1, jd - L.j1);
  return { r: s.r, v: s.v, leg: i };
}

// ---------- screen-space lines (drawn after the scene, hidden behind solids) ----------
const JLINE_VERT = /* glsl */`
attribute vec3 aPrev; attribute vec3 aNext; attribute float aSide; attribute float aDist; attribute float aProg;
uniform vec2 uRes; uniform float uW;
varying float vDist; varying float vProg; varying float vVZ; varying float vSide;
void main(){
  vec4 c = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  vec4 p = projectionMatrix * modelViewMatrix * vec4(aPrev, 1.0);
  vec4 n = projectionMatrix * modelViewMatrix * vec4(aNext, 1.0);
  vec2 h = uRes * 0.5, sc = c.xy / c.w * h, d1 = sc - p.xy / p.w * h, d2 = n.xy / n.w * h - sc;
  float l1 = length(d1), l2 = length(d2);
  vec2 t = (l1 > 1e-3 ? d1 / l1 : vec2(0.0)) + (l2 > 1e-3 ? d2 / l2 : vec2(0.0));
  t = length(t) > 1e-4 ? normalize(t) : vec2(1.0, 0.0);
  float hw = uW * 0.5 + 1.0;
  c.xy += vec2(-t.y, t.x) * aSide * hw / h * c.w;
  gl_Position = c;
  vVZ = -(modelViewMatrix * vec4(position, 1.0)).z; vDist = aDist; vProg = aProg; vSide = aSide * hw;
}`;
const JLINE_FRAG = /* glsl */`
uniform sampler2D tDepth; uniform vec2 uRes; uniform vec3 uCol, uColF;
uniform float uNear, uFar, uW, uPx, uProgress, uDash, uA, uAF, uHide, uScreenDash;
varying float vDist; varying float vProg; varying float vVZ; varying float vSide;
void main(){
  float sd = texture2D(tDepth, gl_FragCoord.xy / uRes).r;
  float zs = uNear + sd * (uFar - uNear);
  float vis = (sd < 0.99999 && zs < vVZ - uPx * 4.0) ? uHide : 1.0;
  bool past = vProg <= uProgress;
  float a = past ? uA : uAF;
  if ((!past || uScreenDash > 0.5) && uDash > 0.0 && fract(vDist / (uPx * uDash)) > 0.55) a = 0.0;
  a *= clamp(uW * 0.5 + 0.5 - abs(vSide), 0.0, 1.0) * vis;
  if (a < 0.003) discard;
  gl_FragColor = vec4((past ? uCol : uColF) * a, a);
}`;
function jLine(pts, o = {}) {
  const n = pts.length, P = [], Pr = [], Nx = [], Sd = [], Ds = [], Pg = [], idx = [];
  let acc = 0;
  for (let i = 0; i < n; i++) {
    if (i) acc += pts[i].distanceTo(pts[i - 1]);
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)], pg = o.prog ? o.prog[i] : 0;
    for (const s of [-1, 1]) { P.push(pts[i].x, pts[i].y, pts[i].z); Pr.push(a.x, a.y, a.z); Nx.push(b.x, b.y, b.z); Sd.push(s); Ds.push(acc); Pg.push(pg); }
    if (i < n - 1) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute("aPrev", new THREE.Float32BufferAttribute(Pr, 3));
  g.setAttribute("aNext", new THREE.Float32BufferAttribute(Nx, 3));
  g.setAttribute("aSide", new THREE.Float32BufferAttribute(Sd, 1));
  g.setAttribute("aDist", new THREE.Float32BufferAttribute(Ds, 1));
  g.setAttribute("aProg", new THREE.Float32BufferAttribute(Pg, 1));
  g.setIndex(idx);
  const m = new THREE.ShaderMaterial({
    vertexShader: JLINE_VERT, fragmentShader: JLINE_FRAG, transparent: true, depthTest: false, depthWrite: false, side: THREE.DoubleSide,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
    uniforms: {
      tDepth: { value: null }, uRes: { value: new THREE.Vector2(1, 1) }, uCol: { value: new THREE.Color() }, uColF: { value: new THREE.Color() },
      uNear: { value: 1 }, uFar: { value: 100 }, uW: { value: 2 }, uPx: { value: 1 }, uProgress: { value: o.prog ? 1e9 : -1 }, uDash: { value: o.dash ?? 0 }, uA: { value: o.a ?? 1 }, uAF: { value: o.af ?? 0.35 }, uHide: { value: o.hide ?? 0.18 }, uScreenDash: { value: o.prog ? 0 : 1 },
    },
  });
  const mesh = new THREE.Mesh(g, m);
  mesh.layers.set(FX_LAYER); mesh.frustumCulled = false; mesh.renderOrder = 20;
  mesh.userData.j = { w: o.w ?? 1.5, col: o.col ?? "ink", colF: o.colF ?? o.col ?? "ink", dash: o.dash ?? 0 };
  J.lines.push(mesh);
  return mesh;
}
const circleAt = (c, r, n, u, v) => Array.from({ length: n + 1 }, (_, i) => c.clone().addScaledVector(u, Math.cos(i / n * TAU) * r).addScaledVector(v, Math.sin(i / n * TAU) * r));

// ---------- phases ----------
const fmtDate = (jd) => { const d = new Date((jd - 2440587.5) * 86400000); return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }); };
const J_PHASES = [
  { id: "jAll", label: "Both Grand Tours", jd: () => JD_NOW(), view: "planets", name: "The Grand Tour", sub: "Voyager 2 · Jupiter, Saturn, Uranus, Neptune · Voyager 1 · Jupiter, Saturn" },
  { id: "jLaunch", label: "Launch, 1977", jd: () => jdOf("1977-09-05T12:56:01Z"), view: "inner", name: "Launch", sub: "Voyager 2 on 20 Aug · Voyager 1 on 5 Sep 1977" },
  { id: "jV1Jup", label: "Voyager 1 · Jupiter", jd: () => jdOf("1979-03-05T12:05:26Z"), view: "fly:V1jupiter", fly: "V1jupiter", name: "Voyager 1 at Jupiter", sub: "5 Mar 1979, 12:05 UT" },
  { id: "jV2Jup", label: "Voyager 2 · Jupiter", jd: () => jdOf("1979-07-09T22:29:51Z"), view: "fly:V2jupiter", fly: "V2jupiter", name: "Voyager 2 at Jupiter", sub: "9 Jul 1979, 22:29 UT" },
  { id: "jV1Sat", label: "Voyager 1 · Saturn", jd: () => jdOf("1980-11-12T23:46:30Z"), view: "fly:V1saturn", fly: "V1saturn", name: "Voyager 1 at Saturn", sub: "12 Nov 1980, 23:46 UT · Titan the same morning" },
  { id: "jV2Sat", label: "Voyager 2 · Saturn", jd: () => jdOf("1981-08-26T03:24:57Z"), view: "fly:V2saturn", fly: "V2saturn", name: "Voyager 2 at Saturn", sub: "26 Aug 1981, 03:24 UT" },
  { id: "jV2Ura", label: "Voyager 2 · Uranus", jd: () => jdOf("1986-01-24T17:59:47Z"), view: "fly:V2uranus", fly: "V2uranus", name: "Voyager 2 at Uranus", sub: "24 Jan 1986, 17:59 UT · the only visit" },
  { id: "jV2Nep", label: "Voyager 2 · Neptune", jd: () => jdOf("1989-08-25T03:56:36Z"), view: "fly:V2neptune", fly: "V2neptune", name: "Voyager 2 at Neptune", sub: "25 Aug 1989, 03:56 UT · the only visit" },
  { id: "jPBD", label: "Pale Blue Dot, 1990", jd: () => jdOf("1990-02-14T04:48:00Z"), view: "pbd", name: "Pale Blue Dot", sub: "14 Feb 1990 · Voyager 1 looks back from 40 AU" },
  { id: "jTS", label: "Termination shock", jd: () => jdOf("2007-08-30T00:00:00Z"), view: "helio100", name: "Termination shock", sub: "Voyager 1 · 16 Dec 2004 · 94 AU · Voyager 2 · 30 Aug 2007 · 84 AU" },
  { id: "jHP", label: "Heliopause", jd: () => jdOf("2018-11-05T00:00:00Z"), view: "helio130", name: "Heliopause", sub: "Voyager 1 · 25 Aug 2012 · 121.6 AU · Voyager 2 · 5 Nov 2018 · 119 AU" },
  { id: "jNow", label: "Today", jd: () => JD_NOW(), view: "helio180", name: "Today", sub: "" },
];
const J_BY = {}; J_PHASES.forEach((p, i) => (J_BY[p.id] = Object.assign(p, { i })));
const J_CAPTION = "The Sun, every planet's orbit and both paths are drawn to scale, seen from above the plane of the planets. Each leg is the single orbit that joins two encounters in the time actually flown; the last leg runs to each probe's position from JPL Horizons. The close-ups use the closest approach each probe really flew. Step through with Next and Previous, or pick a stage from the index.";

// ---------- build ----------
function journeyShell() {
  const g = showItem("jMap", { name: "The Grand Tour", desc: "", kv: [] }, { az: 0, el: 55 * DEG });
  Object.assign(SHOW.jMap, { journey: true, dynSphere: true }); J.root = g;
  for (const p of J_PHASES) MODULES[p.id] = { name: p.name, desc: p.desc || "", kv: p.kv || [] };
  addMenu("The Grand Tour", J_PHASES.map((p) => [p.id, p.label, { show: "jMap", root: true, info: [p.id], jv: p.view, onSelect: (prev) => journeyGo(p.id, prev !== "jMap") }]));
}
function buildJourney() {
  if (J.built) return; J.built = true;
  buildLegs();
  const root = J.root;
  // the Sun
  mod("jSun", root); MODULES.jSun = { name: "The Sun", kv: [["Radius", "696,000 km"]] };
  within("jSun", (g) => add(g, new THREE.SphereGeometry(696000 * KM, 48, 32), "gold", { rim: 0.2 }));
  // planet orbits (one revolution sampled from its elements)
  const per = { mercury: 88, venus: 225, earth: 365.25, mars: 687, jupiter: 4333, saturn: 10759, uranus: 30687, neptune: 60190 };
  for (const [pn, P] of Object.entries(per)) {
    const pts = []; for (let i = 0; i <= 360; i++) pts.push(toScene(planetPos(pn, 2443400 + per[pn] * i / 360)));
    root.add(jLine(pts, { w: 1, a: pn === "earth" ? 0.55 : 0.32, col: "ink" }));
    // the planet itself, to scale (a speck until a close-up)
    const key = "jP_" + pn; mod(key, root); MODULES[key] = { name: pn[0].toUpperCase() + pn.slice(1), kv: [["Radius", fmt(PLANETS[pn].R) + " km"]] };
    within(key, (g) => buildPlanet(g, pn));
    J["pl_" + pn] = MODS[key].group;
  }
  // both paths: dense near the encounters, sparse in the long cruise
  for (const [k, P] of Object.entries(PROBES)) {
    const pts = [], prog = [];
    for (const L of J.legs[k]) {
      const N = L.to ? 500 : 900;
      for (let i = 0; i <= N; i++) {
        const u = i / N, jd = L.j1 + (L.j2 - L.j1) * (L.to ? 0.5 - 0.5 * Math.cos(Math.PI * u) : Math.pow(u, 1.8));   // cosine-spaced legs; the escape leg packs points near the planet
        pts.push(toScene(propagate(L.r1, L.v1, jd - L.j1).r)); prog.push(jd - 2440000);
      }
    }
    // and on past today, faintly, a few years along the same hyperbola
    const last = J.legs[k][J.legs[k].length - 1];
    for (let i = 1; i <= 60; i++) { const jd = JD_HZ + i * 120; pts.push(toScene(propagate(last.r1, last.v1, jd - last.j1).r)); prog.push(jd - 2440000); }
    J["track" + k] = jLine(pts, { w: 2.2, col: P.col, colF: P.col, a: 1, af: 0.3, dash: 7, hide: 0.25, prog });
    root.add(J["track" + k]);
    // termination shock and heliopause: a short arc of each boundary where the probe crossed it
    for (const [b, dash, w] of [["ts", 3, 1.2], ["hp", 8, 1.4]]) {
      const [iso, au] = P[b], r = stateAt(k, jdOf(iso)).r, d = toScene(r).normalize(), up = V3(0, 1, 0), side = V3().crossVectors(d, up).normalize(), nrm = V3().crossVectors(side, d).normalize();
      const arc = []; for (let i = -24; i <= 24; i++) { const a = i * DEG; arc.push(d.clone().multiplyScalar(Math.cos(a)).addScaledVector(nrm, Math.sin(a)).multiplyScalar(v3.len(r))); }
      const ln = jLine(arc, { w, col: "ink", a: 0.55, dash }); root.add(ln); J[b + k] = { line: ln, p: toScene(r), au, iso };
    }
  }
  // the Pale Blue Dot: Voyager 1's line of sight back to Earth on 14 Feb 1990
  { const jd = J_BY.jPBD.jd(); J.pbd = jLine([toScene(stateAt("V1", jd).r), toScene(planetPos("earth", jd))], { w: 1.2, col: "hl", a: 0.8, dash: 4 }); root.add(J.pbd); J.pbd.visible = false; }
  // flyby close-ups: the hyperbola through the flown closest approach, around the planet at that moment
  for (const [key, F] of Object.entries(J.flybys)) buildFlyby(key, F);
  for (const m of Object.values(MODS)) if (m.group && isUnder(m.group, root)) for (const mesh of m.meshes) PICK.push(mesh);
  journeyLabels();
  buildDetails();
  SCENE.updateMatrixWorld(true);
}
const isUnder = (o, root) => { while (o) { if (o === root) return true; o = o.parent; } return false; };
// pole (RA, Dec) → scene direction
const poleDir = (ra, dec) => toScene(raDecToEcl(ra / 15, dec));
function planetTexture(pn) {
  return TEX(1024, 512, (P) => {
    if (pn === "jupiter") { for (const [v, h] of [[0.18, 0.05], [0.3, 0.04], [0.42, 0.06], [0.58, 0.07], [0.7, 0.04], [0.82, 0.05]]) P.alt(0, v, 1, h, 0.55); P.circle(0.6, 0.36, 18, "alt", 0.9); P.ring(0.6, 0.36, 18, 0.7, 2); }
    else if (pn === "saturn") { for (const [v, h] of [[0.25, 0.06], [0.4, 0.08], [0.56, 0.05], [0.7, 0.07]]) P.alt(0, v, 1, h, 0.35); }
    else if (pn === "neptune") { P.circle(0.3, 0.38, 14, "alt", 0.9); }
    for (let i = 1; i < 6; i++) P.hline(i / 6, 0.06, 1);
  });
}
function buildPlanet(g, pn) {
  const PL = PLANETS[pn], R = PL.R * KM;
  const tilt = new THREE.Group(); g.add(tilt);
  if (PL.pole) tilt.quaternion.setFromUnitVectors(UP, poleDir(PL.pole[0], PL.pole[1]));
  const role = pn === "earth" ? "sea" : pn === "mars" ? "regolith" : pn === "jupiter" || pn === "saturn" ? "light" : pn === "uranus" || pn === "neptune" ? "sea" : "light";
  add(tilt, new THREE.SphereGeometry(R, 96, 64), role, { map: PL.bands || pn === "neptune" ? planetTexture(pn) : undefined, inkA: 0.6, rim: 0.4 });
  for (const [a, b] of PL.rings || []) add(tilt, turn([[a * KM, 0], [b * KM, 0]], { seg: 160 }), pn === "saturn" ? "light" : "grey", { side: THREE.DoubleSide });
  J["tilt_" + pn] = tilt;
}
function buildFlyby(key, F) {
  const PL = PLANETS[F.planet], mu = PL.mu, rp = F.rp, vinf = F.vinf;
  const e = 1 + rp * vinf * vinf / mu, a = -mu / (vinf * vinf), nInf = Math.acos(-1 / e);
  const si = toScene(F.si), so = toScene(F.so), pHat = si.clone().sub(so).normalize(), qHat = si.clone().add(so).normalize();
  const g = new THREE.Group(); g.position.copy(toScene(F.at)); J.root.add(g);
  const rMax = Math.max(rp * 3.2, PL.R * 22), pts = [], prog = [], nmax = Math.acos(clamp((rp * (1 + e) / rMax - 1) / e, -1, 1));
  for (let i = 0; i <= 400; i++) {
    const nu = -nmax + 2 * nmax * i / 400, r = rp * (1 + e) / (1 + e * Math.cos(nu));
    pts.push(pHat.clone().multiplyScalar(Math.cos(nu) * r * KM).addScaledVector(qHat, Math.sin(nu) * r * KM));
    const F2 = 2 * Math.atanh(Math.sqrt((e - 1) / (e + 1)) * Math.tan(nu / 2)), M = e * Math.sinh(F2) - F2, t = M / Math.sqrt(mu / Math.pow(-a, 3)) / 86400;
    prog.push(F.jd + t - 2440000);
  }
  const ln = jLine(pts, { w: 2.4, col: PROBES[F.probe].col, a: 1, af: 0.3, dash: 7, hide: 0.2, prog });
  g.add(ln);
  // moon orbits in the planet's equator
  const tilt = new THREE.Quaternion().setFromUnitVectors(UP, poleDir(PL.pole[0], PL.pole[1])), u = V3(1, 0, 0).applyQuaternion(tilt), v = V3(0, 0, 1).applyQuaternion(tilt);
  const moons = [];
  for (const [name, r] of PL.moons) { const l = jLine(circleAt(V3(), r * KM, 256, u, v), { w: 1, col: "ink", a: 0.35, dash: 5 }); g.add(l); moons.push({ name, r, line: l }); }
  F.path = pts; F.group = g; F.line = ln; F.e = e; F.a = a; F.pHat = pHat; F.qHat = qHat; F.moons = moons; F.u = u; F.v = v;
  g.visible = false;
}
// craft position on a flyby hyperbola, dt days from closest approach
function flybyPos(F, dt) {
  const n = Math.sqrt(PLANETS[F.planet].mu / Math.pow(-F.a, 3)), M = n * dt * 86400;
  let H = Math.asinh(M / F.e); for (let i = 0; i < 30; i++) H -= (F.e * Math.sinh(H) - H - M) / (F.e * Math.cosh(H) - 1);
  const x = F.a * (Math.cosh(H) - F.e), y = -F.a * Math.sqrt(F.e * F.e - 1) * Math.sinh(H);
  return F.pHat.clone().multiplyScalar(x * KM).addScaledVector(F.qHat, y * KM);
}

// ---------- labels and markers (HTML over the canvas) ----------
function journeyLabels() {
  const box = $("#jlab");
  const mk = (cls, html) => { const e = el("div", { class: "jl " + cls }, html); box.append(e); return e; };
  J.labels = [];
  const L = (cls, html, p, on, left) => J.labels.push({ e: mk(cls, html), p, on, left });
  L("body", "Sun", () => V3(), (ph) => !ph.fly);
  for (const pn of ["earth", "jupiter", "saturn", "uranus", "neptune"]) L("site planet", pn[0].toUpperCase() + pn.slice(1), () => toScene(planetPos(pn, J.date)), (ph) => ph.view === "planets" || ph.view === "inner" ? pn !== "earth" || ph.view === "inner" : false);
  for (const pn of ["mars"]) L("site planet", "Mars", () => toScene(planetPos(pn, J.date)), (ph) => ph.view === "inner");
  for (const [k, P] of Object.entries(PROBES)) {
    for (const b of ["ts", "hp"]) { const X = J[b + k]; L("note " + P.cls, `${b === "ts" ? "Termination shock" : "Heliopause"} · ${fmt(X.au, X.au % 1 ? 1 : 0)} AU · ${fmtDate(jdOf(X.iso))}`, () => X.p, (ph) => (b === "ts" ? ph.view === "helio100" : ph.view === "helio130" || ph.view === "helio180")); }
  }
  for (const [key, F] of Object.entries(J.flybys)) {
    L("site ca below", `Closest approach · ${fmt(F.rp)} km`, () => toScene(F.at).add(F.pHat.clone().multiplyScalar(F.rp * KM)), (ph) => ph.fly === key, true);
    for (const m of F.moons) L("note", `${m.name}'s orbit`, () => Array.from({ length: 48 }, (_, i) => toScene(F.at).add(F.u.clone().multiplyScalar(m.r * KM * Math.cos(i / 48 * TAU)).addScaledVector(F.v, m.r * KM * Math.sin(i / 48 * TAU)))), (ph) => ph.fly === key && m.r * KM < journeyFrameBox(ph.view).w * 0.6);
  }
  L("note", "Earth, 6 billion km away", () => toScene(planetPos("earth", J.date)), (ph) => ph.view === "pbd", true);
  J.craft = Object.fromEntries(Object.entries(PROBES).map(([k, P]) => [k, mk("craft " + P.cls, `<i></i><span>${P.name}</span>`)]));
}
const _jp = new THREE.Vector3();
function journeyOverlay(cam) {
  const box = $("#jlab"), on = SHOW[curShow()]?.journey && J.built;
  box.hidden = !on; if (!on) return;
  const r = PIPE.renderer.domElement, W = r.clientWidth, H = r.clientHeight, ph = J_BY[C.sel];
  const place = (e, p, show, left) => {
    if (!show) { e.style.display = "none"; return; }
    if (Array.isArray(p)) { let best = null, by = Infinity; for (const q of p) { _jp.copy(q).add(J.root.position).project(cam); const yy = (1 - _jp.y) / 2 * H, xx = (_jp.x + 1) / 2 * W; if (yy < by && xx > 20 && xx < W - 160 && yy > 60) { by = yy; best = q; } } if (!best) { e.style.display = "none"; return; } p = best; }
    _jp.copy(p).add(J.root.position).project(cam);
    const x = (_jp.x + 1) / 2 * W, y = (1 - _jp.y) / 2 * H;
    const out = x < -40 || y < -20 || x > W + 40 || y > H + 20, flip = left || x > W * 0.66;
    e.style.display = out ? "none" : "";
    e.classList.toggle("flip", flip);
    e.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)` + (flip && !e.classList.contains("craft") ? " translateX(-100%)" : "");
  };
  for (const Lb of J.labels) place(Lb.e, Lb.p(), !!ph && Lb.on(ph), Lb.left);
  for (const k of Object.keys(PROBES)) {
    const F = ph?.fly && J.flybys[ph.fly], here = F && F.probe === k;
    const p = here ? toScene(F.at).add(flybyPos(F, J.date - F.jd)) : toScene(stateAt(k, J.date).r);
    place(J.craft[k], p, !!ph && (!F || here) && J.date >= jdOf(PROBES[k].launch) - 0.01);
  }
  journeyDetails(cam, W, H, ph);
}
// ---------- motion between stages ----------
function journeyGo(id, enter) {
  buildJourney();
  const ph = J_BY[id], to = ph.jd();
  J.dFrom = enter ? to : J.date; J.dTo = to; J.t = enter || REDUCED ? 1 : 0; if (J.t >= 1) J.date = to;
  for (const F of Object.values(J.flybys)) F.group.visible = F === J.flybys[ph.fly];
  for (const [pn, g] of Object.entries(J)) if (pn.startsWith("pl_")) g.visible = true;
  const v = journeyFrameBox(ph.view);
  if (enter) { CAM.az = v.az; CAM.el = v.el; CAM.fly = null; CAM.script = null; }
  else {
    // fly the camera: zoom in log space, with the centre following the zoom so the target stays in frame
    const aspect = PIPE.w / PIPE.h, c1 = v.c.clone().add(J.root.position), h1 = Math.max(v.h, v.w / aspect) / Math.max(0.5, 1 - (UI.insets.top + UI.insets.bottom) / PIPE.h);
    const c0 = CAM.target.clone(), h0 = CAM.h, az0 = CAM.az, el0 = CAM.el, az1 = az0 + Math.atan2(Math.sin(v.az - az0), Math.cos(v.az - az0)), dur = Math.abs(Math.log(h1 / h0)) > 3 ? 2.8 : 1.8;
    let t = 0;
    CAM.user = false;
    CAM.script = (dt) => {
      t = Math.min(1, t + dt / dur); const e = ease(t), h = Math.exp(lerp(Math.log(h0), Math.log(h1), e));
      const w = Math.abs(h0 - h1) > 1e-12 ? (h - h1) / (h0 - h1) : 1 - e;
      CAM.target.copy(c1).addScaledVector(c0.clone().sub(c1), clamp(w, 0, 1)); CAM.h = h;
      CAM.az = lerp(az0, az1, e); CAM.el = lerp(el0, v.el, e);
      if (t >= 1) CAM.script = null;
    };
  }
}
function journeyFrame(dt) {
  if (!J.built || !SHOW[curShow()]?.journey) return false;
  const busy = J.t < 1;
  if (busy) { J.t = Math.min(1, J.t + dt / 2.6); J.date = lerp(J.dFrom, J.dTo, ease(J.t)); }
  else if (C.sel === "jNow" || C.sel === "jAll") J.date = JD_NOW();
  const prog = J.date - 2440000;
  for (const k of Object.keys(PROBES)) J["track" + k].material.uniforms.uProgress.value = prog;
  for (const F of Object.values(J.flybys)) F.line.material.uniforms.uProgress.value = prog;
  // planets move with the date (their orbits are fixed lines)
  for (const pn of Object.keys(PLANETS)) J["pl_" + pn].position.copy(toScene(planetPos(pn, J.date)));
  const ph = J_BY[C.sel], F = ph?.fly && J.flybys[ph.fly];
  if (F) J["pl_" + F.planet].position.copy(toScene(F.at));   // the close-up holds the planet where it was at closest approach
  for (const k of Object.keys(PROBES)) J["track" + k].visible = !F;
  for (const k of Object.keys(PROBES)) for (const b of ["ts", "hp"]) J[b + k].line.visible = !F && ph?.view?.startsWith("helio");
  J.pbd.visible = ph?.view === "pbd";
  return busy || !!CAM.script;
}
// per-frame uniforms for the line pass (called by the pipeline just before the FX layer)
function journeyFX(cam, pipe) {
  if (!J.built || !J.root.visible) return;
  const px = (cam.top - cam.bottom) / pipe.ch, dpr = pipe.dpr || 1;
  for (const m of J.lines) {
    const u = m.material.uniforms, d = m.userData.j;
    u.tDepth.value = pipe.rtN.depthTexture; u.uRes.value.set(pipe.cw, pipe.ch);
    u.uNear.value = cam.near; u.uFar.value = cam.far; u.uPx.value = px; u.uW.value = d.w * dpr;
    u.uCol.value.copy(PAL[d.col]); u.uColF.value.copy(PAL[d.colF]);
    u.uDash.value = d.dash * dpr;
  }
}
function journeyDepth() { const ph = J_BY[C.sel]; return ph?.fly ? Math.max(PLANETS[J.flybys[ph.fly].planet].R * KM * 40, CAM.h) : Math.max(CAM.h, 200); }
// camera frame for a stage: centre (journey-local), the width × height it needs, the view angle
function journeyFrameBox(view) {
  const top = (el) => ({ az: 0, el });
  if (view && view.startsWith("fly:")) {
    const F = J.flybys[view.slice(4)]; if (!F) return { c: V3(), w: 1, h: 1, az: 0, el: 1 };
    const n = V3().crossVectors(F.pHat, F.qHat).normalize(), s = n.y < 0 ? -1 : 1;
    const az = Math.atan2(n.x * s, n.z * s), el = clamp(Math.asin(clamp(n.y * s, -1, 1)), 20 * DEG, 75 * DEG);
    const R = Math.max(F.rp * 2.6, PLANETS[F.planet].R * 6) * KM;
    return { c: toScene(F.at), w: R * 2.2, h: R * 1.6, az, el };
  }
  switch (view) {
    case "inner": return { c: V3(1.6, 0, -1.2), w: 12.5, h: 9, ...top(58 * DEG) };
    case "planets": return { c: V3(-2, 0, 2), w: 64, h: 50, ...top(60 * DEG) };
    case "pbd": return sideFrame(J_BY.jPBD.jd(), 1.25);
    case "helio100": return sideFrame(J_BY.jTS.jd(), 1.2);
    case "helio130": return sideFrame(J_BY.jHP.jd(), 1.2);
    case "helio180": return sideFrame(JD_NOW(), 1.2);
  }
  return { c: V3(), w: 60, h: 50, ...top(60 * DEG) };
}
// seen side-on, just above the plane of the planets, so Voyager 1 climbs north and Voyager 2 dives south
function sideFrame(jd, pad) {
  const az = 90 * DEG, el = 10 * DEG, D = V3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)), Rt = V3().crossVectors(UP, D).normalize(), Up = V3().crossVectors(D, Rt).normalize();
  const pts = [V3(), ...Object.keys(PROBES).map((k) => toScene(stateAt(k, Math.max(jd, jdOf(PROBES[k].launch))).r))];
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const p of pts) { const x = p.dot(Rt), y = p.dot(Up); x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const c = Rt.clone().multiplyScalar((x0 + x1) / 2).addScaledVector(Up, (y0 + y1) / 2);
  return { c, w: (x1 - x0) * pad + 8, h: (y1 - y0) * pad + 8, az, el };
}
// readout for the selected stage
function J_READOUT() {
  const ph = J_BY[C.sel]; if (!ph || !J.built) return "";
  const F = ph.fly && J.flybys[ph.fly];
  if (F) return `${ph.name} · ${ph.sub}<small>${fmt(F.rp)} km from centre · ${fmt(F.rp / PLANETS[F.planet].R, 2)} radii · v∞ ${fmt(F.vinf, 1)} km/s · turned ${fmt(F.turn / DEG, 0)}°</small>`;
  const d = (k) => fmt(v3.len(stateAt(k, J.date).r), 1);
  return `${ph.name} · ${fmtDate(J.date)}<small>Voyager 1 · ${J.date >= jdOf(PROBES.V1.launch) ? d("V1") + " AU" : "not yet launched"} · Voyager 2 · ${J.date >= jdOf(PROBES.V2.launch) ? d("V2") + " AU" : "not yet launched"} from the Sun</small>`;
}
