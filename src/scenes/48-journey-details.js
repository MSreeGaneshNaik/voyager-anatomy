// ============================================================================
// 48 · ENCOUNTER DETAILS — on the overview the planets are specks a millionth of
// the frame across, so each planet a probe swung past is marked where it stood at
// that closest approach, with Earth where both left it, and each encounter gets a
// detail circle: the planet and its rings to scale, the moons' orbits, and the
// probe's actual path round it (the flown closest approach), seen from the same
// angle as the main drawing.
// ============================================================================
const PL_LOOK = {   // fill, band, ring for the glyphs (CSS custom properties, set per theme)
  earth: "var(--pl-earth)", jupiter: "var(--pl-jup)", saturn: "var(--pl-sat)", uranus: "var(--pl-ura)", neptune: "var(--pl-nep)",
};
const JDET = { svg: null, items: [], key: "" };
const SVGNS = "http://www.w3.org/2000/svg";
const svgEl = (tag, attrs = {}, parent) => { const e = document.createElementNS(SVGNS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); parent?.append(e); return e; };
const cap = (s) => s[0].toUpperCase() + s.slice(1);

function buildDetails() {
  const box = $("#jlab");
  const svg = svgEl("svg", { class: "jdet", "aria-hidden": "true" }); box.prepend(svg); JDET.svg = svg;
  // patterns for the banded giants
  const defs = svgEl("defs", {}, svg);
  const bands = (id, col, n) => { const p = svgEl("pattern", { id, patternUnits: "objectBoundingBox", width: 1, height: 1 / n }, defs); svgEl("rect", { width: 400, height: 400, fill: col }, p); svgEl("rect", { y: 0, width: 400, height: 3, fill: "var(--pl-band)", opacity: 0.55 }, p); return `url(#${id})`; };
  const jupFill = bands("plJup", "var(--pl-jup)", 7), satFill = bands("plSat", "var(--pl-sat)", 5);
  const fillOf = (pn) => (pn === "jupiter" ? jupFill : pn === "saturn" ? satFill : PL_LOOK[pn]);
  // Earth, where both probes left it
  const launch = { probe: "both", planet: "earth", at: planetPos("earth", jdOf(PROBES.V1.launch)), jd: jdOf(PROBES.V2.launch), label: "Earth · launch, Aug–Sep 1977" };
  const enc = [launch, ...Object.entries(J.flybys).map(([key, F]) => ({ key, F, probe: F.probe, planet: F.planet, at: F.at, jd: F.jd, label: `${cap(F.planet)} · ${PROBES[F.probe].name.replace("Voyager ", "V")} · ${fmtDate(F.jd)}` }))];
  for (const E of enc) {
    const g = svgEl("g", { class: "jd " + (E.probe === "both" ? "" : PROBES[E.probe].cls) }, svg);
    E.leader = svgEl("line", { class: "jd-lead" }, g);
    // the marker where the planet stood
    E.mark = svgEl("g", { class: "jd-mark" }, g);
    if (E.planet === "saturn") svgEl("ellipse", { rx: 10, ry: 3.2, class: "jd-ring" }, E.mark);
    if (E.planet === "earth") { const t = svgEl("text", { class: "jd-t2", x: -12, y: 26, "text-anchor": "end" }, E.mark); t.textContent = "Earth · launch 1977"; }
    svgEl("circle", { r: E.planet === "earth" ? 4.5 : 6, fill: fillOf(E.planet), class: "jd-planet" }, E.mark);
    if (E.F) {
      // the detail circle
      E.det = svgEl("g", { class: "jd-det" }, g);
      E.clipId = "jdc" + E.key; const cp = svgEl("clipPath", { id: E.clipId }, defs); E.clipC = svgEl("circle", { r: 40 }, cp);
      E.bg = svgEl("circle", { r: 40, class: "jd-bg" }, E.det);
      E.inner = svgEl("g", { "clip-path": `url(#${E.clipId})` }, E.det);
      E.rim = svgEl("circle", { r: 40, class: "jd-rim" }, E.det);
      E.t1 = svgEl("text", { class: "jd-t1", "text-anchor": "middle" }, E.det); E.t1.textContent = `${cap(E.planet)} · ${PROBES[E.probe].name.replace("Voyager ", "V")}`;
      E.t2 = svgEl("text", { class: "jd-t2", "text-anchor": "middle" }, E.det); E.t2.textContent = `${fmtDate(E.jd)} · ${fmt(E.F.rp)} km`;
      E.fillOf = fillOf(E.planet);
    }
    JDET.items.push(E);
  }
}

// redraw a detail's contents for the current view direction (only when the view turns)
function drawDetail(E, rB) {
  const F = E.F, PL = PLANETS[F.planet], S = Math.max(F.rp * 2.5, PL.R * 2.3), k = rB * 0.92 / S;
  const P2 = (v) => [v.dot(CAM_RIGHT) / KM * k, -v.dot(CAM_UP) / KM * k];   // scene offset → detail px
  const g = E.inner; while (g.firstChild) g.firstChild.remove();
  const path = (pts, attrs) => svgEl("path", { d: pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(""), ...attrs }, g);
  const ring = (r) => Array.from({ length: 97 }, (_, i) => P2(F.u.clone().multiplyScalar(r * KM * Math.cos(i / 96 * TAU)).addScaledVector(F.v, r * KM * Math.sin(i / 96 * TAU))));
  // moons' orbits that fall inside the circle
  for (const [, r] of PL.moons) if (r < S * 1.15) path(ring(r), { class: "jd-moon" });
  // rings behind and in front of the planet: draw whole, the planet over, then the near half again
  const rings = (PL.rings || []).map(([a, b]) => ring((a + b) / 2));
  const facing = F.u.clone().cross(F.v).dot(CAM_DIR);
  for (const R of rings) path(R, { class: "jd-pring" + (F.planet === "saturn" ? " sat" : "") });
  svgEl("circle", { cx: 0, cy: 0, r: Math.max(1.6, PL.R * k), fill: E.fillOf, class: "jd-planet" }, g);
  for (const R of rings) { const near = R.filter((_, i) => { const a = i / 96 * TAU, p = F.u.clone().multiplyScalar(Math.cos(a)).addScaledVector(F.v, Math.sin(a)); return p.dot(CAM_DIR) > 0; }); if (near.length > 2) path(near, { class: "jd-pring near" + (F.planet === "saturn" ? " sat" : "") }); }
  // the path round the planet, with its direction and the closest point
  const pts = F.path.map(P2).filter(([x, y]) => Math.hypot(x, y) < rB * 1.4);
  path(pts, { class: "jd-path" });
  const n = pts.length, a = pts[Math.floor(n * 0.82)], b = pts[Math.min(n - 1, Math.floor(n * 0.82) + 3)];
  if (a && b) { const ang = Math.atan2(b[1] - a[1], b[0] - a[0]); svgEl("path", { d: "M0,0 L-6,-3.4 L-6,3.4 Z", class: "jd-arrow", transform: `translate(${b[0].toFixed(1)},${b[1].toFixed(1)}) rotate(${(ang / DEG).toFixed(1)})` }, g); }
  const ca = P2(F.pHat.clone().multiplyScalar(F.rp * KM)); svgEl("circle", { cx: ca[0], cy: ca[1], r: 2.2, class: "jd-ca" }, g);
}

// place markers and detail circles; called with the overlay every frame
function journeyDetails(cam, W, H, ph) {
  const svg = JDET.svg; if (!svg) return;
  const show = !!ph && (ph.view === "planets" || ph.view === "inner");
  svg.style.display = show ? "" : "none"; if (!show) return;
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.setAttribute("width", W); svg.setAttribute("height", H);
  const proj = (p) => { _jp.copy(p).add(J.root.position).project(cam); return [(_jp.x + 1) / 2 * W, (1 - _jp.y) / 2 * H]; };
  const sun = proj(V3()), rB = clamp(Math.min(W * 0.055, H * 0.06), 26, 42), bot = H - (UI.insets?.bottom || 60) - rB - 18;
  const key = `${CAM.az.toFixed(3)},${CAM.el.toFixed(3)},${rB.toFixed(1)}`, redraw = key !== JDET.key; JDET.key = key;
  const details = [];
  for (const E of JDET.items) {
    const a = proj(toScene(E.at)); E.a = a;
    const on = ph.view === "planets" ? true : E.planet === "earth" || E.planet === "jupiter";
    E.mark.parentNode.style.display = on ? "" : "none"; if (!on) continue;
    E.mark.setAttribute("transform", `translate(${a[0].toFixed(1)},${a[1].toFixed(1)})`);
    if (E.det) { const showDet = ph.view === "planets"; E.det.style.display = showDet ? "" : "none"; E.leader.style.display = showDet ? "" : "none"; if (showDet) details.push(E); }
    else E.leader.style.display = "none";
  }
  // detail circles stand in two columns down the sides, each ordered top to bottom by its encounter so
  // the leaders don't cross; the left column clears the hint, the right the camera controls
  const xs = details.map((E) => E.a[0]).sort((a, b) => a - b), mid = xs.length ? (xs[Math.floor((xs.length - 1) / 2)] + xs[Math.ceil((xs.length - 1) / 2)]) / 2 : W / 2;
  const cols = [details.filter((E) => E.a[0] <= mid), details.filter((E) => E.a[0] > mid)];
  if (Math.abs(cols[0].length - cols[1].length) > 1) { const all = [...details].sort((a, b) => a.a[0] - b.a[0]); cols[0] = all.slice(0, Math.ceil(all.length / 2)); cols[1] = all.slice(Math.ceil(all.length / 2)); }
  cols.forEach((col, ci) => {
    col.sort((a, b) => a.a[1] - b.a[1]);
    const y0 = (ci ? 250 : 150) + rB, y1 = Math.max(y0, bot), x = ci ? W - rB - 18 : rB + 18;
    col.forEach((E, i) => { E.c = [x, col.length > 1 ? y0 + (y1 - y0) * i / (col.length - 1) : (y0 + y1) / 2]; E.col = ci; });
  });
  for (const E of details) {
    E.det.setAttribute("transform", `translate(${E.c[0].toFixed(1)},${E.c[1].toFixed(1)})`);
    for (const c of [E.bg, E.rim, E.clipC]) c.setAttribute("r", rB);
    // captions run inward from the circle's outer edge, so they never leave the figure
    for (const t of [E.t1, E.t2]) { t.setAttribute("text-anchor", E.col ? "end" : "start"); t.setAttribute("x", E.col ? rB : -rB); }
    E.t1.setAttribute("y", -rB - 6); E.t2.setAttribute("y", rB + 13);
    const dx = E.c[0] - E.a[0], dy = E.c[1] - E.a[1], d = Math.hypot(dx, dy) || 1;
    E.leader.setAttribute("x1", (E.a[0] + dx / d * 8).toFixed(1)); E.leader.setAttribute("y1", (E.a[1] + dy / d * 8).toFixed(1));
    E.leader.setAttribute("x2", (E.c[0] - dx / d * rB).toFixed(1)); E.leader.setAttribute("y2", (E.c[1] - dy / d * rB).toFixed(1));
    if (redraw || !E.drawn) { drawDetail(E, rB); E.drawn = true; }
  }
}
