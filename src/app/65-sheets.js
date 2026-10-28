// ============================================================================
// 65 · SHEETS — the specification pages under the figure, and the live
// "where they are now" panel worked out from the trajectory model each second.
// ============================================================================
const MISSIONS = {
  V1: { name: "Voyager 1", vehicle: "Titan IIIE-Centaur TC-6", events: [
    ["5 Sep 1977, 12:56:01 UT", "Launch from LC-41", "TC-6; Centaur finished 3.4 s from depletion"],
    ["5 Mar 1979, 12:05 UT", "Jupiter, closest approach", "348,890 km from centre"],
    ["12 Nov 1980, 05:41 UT", "Titan", "6,490 km"],
    ["12 Nov 1980, 23:46 UT", "Saturn, closest approach", "184,300 km from centre"],
    ["14 Feb 1990", "Pale Blue Dot; cameras switched off", "40 AU"],
    ["16 Dec 2004", "Termination shock", "94 AU"],
    ["25 Aug 2012", "Heliopause: interstellar space", "121.6 AU"],
    ["14 Nov 2023 → 13 Jun 2024", "Flight-data computer chip fails; science restored", "3 % of FDS memory lost"],
    ["19–24 Oct 2024", "X-band off; contact kept on S-band", "first S-band use since 1981"],
    ["25 Feb 2025", "Cosmic Ray Subsystem off", "to save power"],
    ["20 Mar 2025", "Primary roll thrusters revived", "dead since 2004"],
    ["17 Apr 2026", "Low-Energy Charged Particle instrument off", "stepper motor left running"],
    ["18 Nov 2026, 10:16 UT", "One light-day from Earth", "25.9 billion km"],
  ] },
  V2: { name: "Voyager 2", vehicle: "Titan IIIE-Centaur TC-7", events: [
    ["20 Aug 1977, 14:29:44 UT", "Launch from LC-41", "TC-7"],
    ["9 Jul 1979, 22:29 UT", "Jupiter, closest approach", "721,670 km from centre"],
    ["26 Aug 1981, 03:24 UT", "Saturn, closest approach", "161,000 km from centre"],
    ["24 Jan 1986, 17:59 UT", "Uranus, closest approach", "107,000 km from centre"],
    ["25 Aug 1989, 03:56 UT", "Neptune, closest approach", "29,240 km from centre"],
    ["25 Aug 1989, 09:10 UT", "Triton", "39,790 km"],
    ["30 Aug 2007", "Termination shock", "84 AU"],
    ["5 Nov 2018", "Heliopause: interstellar space", "119 AU"],
    ["26 Sep 2024", "Plasma Science off", "to save power"],
    ["24 Mar 2025", "Low-Energy Charged Particle instrument off", "to save power"],
    ["4 Aug 2026", "Heater swap saves almost 10 W", "three instruments stay on"],
  ] },
};
const SOURCES_LIST = [
  ["Voyager press kit, NASA Release 77-136 (1977)", "https://ntrs.nasa.gov/api/citations/19770079866/downloads/19770079866.pdf"],
  ["Titan IIIE/Centaur D-1T Systems Summary (1973)", "https://ntrs.nasa.gov/api/citations/19750004937/downloads/19750004937.pdf"],
  ["V. Dawson & M. Bowles, Taming Liquid Hydrogen: The Centaur Upper Stage Rocket, NASA SP-2004-4230", "https://history.nasa.gov/SP-4230.pdf"],
  ["DESCANSO, Voyager Telecommunications", "https://descanso.jpl.nasa.gov/DPSummary/Descanso4--Voyager_new.pdf"],
  ["NASA, Where are Voyager 1 and Voyager 2 now? (instrument status, 15 Oct 2026)", "https://science.nasa.gov/mission/voyager/where-are-voyager-1-and-voyager-2-now/"],
  ["JPL Horizons: Voyager 1 (−31) and Voyager 2 (−32), 28 Oct 2026", "https://ssd.jpl.nasa.gov/horizons/"],
  ["JPL Solar System Dynamics, Approximate Positions of the Planets (Standish)", "https://ssd.jpl.nasa.gov/planets/approx_pos.html"],
  ["NSSDCA, Voyager closest approaches", "https://nssdc.gsfc.nasa.gov/planetary/voyager-periapse.html"],
  ["PDS Ring-Moon Systems Node, Voyager mission", "https://pds-rings.seti.org/voyager/mission/index.html"],
  ["NSSDCA master catalogue, Voyager 1", "https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1977-084A"],
  ["NSSDCA master catalogue, Voyager 2", "https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1977-076A"],
  ["NSSDCA planetary fact sheets", "https://nssdc.gsfc.nasa.gov/planetary/factsheet/"],
  ["B. Archinal et al., IAU WGCCRE report 2015 (planet pole orientations)", "https://doi.org/10.1007/s10569-017-9805-5"],
  ["NASA, Voyager spacecraft", "https://science.nasa.gov/mission/voyager/spacecraft/"],
  ["NASA, Voyager fast facts", "https://science.nasa.gov/mission/voyager/fast-facts"],
  ["PDS, Voyager 1 host and ISS camera catalogues", "https://pds-rings.seti.org/holdings/volumes/VGISS_5xxx/VGISS_5101/CATALOG/VG1HOST.CAT"],
  ["PDS, IRIS instrument", "https://pds-rings.seti.org/voyager/iris/inst_cat.html"],
  ["PDS PPI, Voyager magnetometer instrument", "https://pds-ppi.igpp.ucla.edu/volume/VG_1501/DATA/MAG/INST.TXT"],
  ["G. Bennett et al., Mission of Daring: The General-Purpose Heat Source RTG (MHW-RTG figures)", "https://nuke.fas.org/space/bennett0706.pdf"],
  ["NASA, The Golden Record cover", "https://science.nasa.gov/mission/voyager/golden-record-cover/"],
  ["NASA, Golden Record contents", "https://science.nasa.gov/mission/voyager/golden-record-contents/"],
  ["NASA, Making of the Golden Record", "https://science.nasa.gov/mission/voyager/making-of-the-golden-record/"],
  ["NASA Voyager blog: Voyager 1 instrument shut-off (17 Apr 2026)", "https://science.nasa.gov/blogs/voyager/2026/04/17/nasa-shuts-off-instrument-on-voyager-1-to-keep-spacecraft-operating/"],
  ["NASA Voyager blog: Voyager 2 heater swap (4 Aug 2026)", "https://science.nasa.gov/blogs/voyager/2026/08/04/nasa-engineers-help-prolong-voyager-2s-science-mission/"],
  ["JPL, Voyager 1 thruster swap (2024)", "https://www.jpl.nasa.gov/news/voyager-1-team-accomplishes-tricky-thruster-swap/"],
  ["JPL, Voyager 1 returning science from all four instruments (2024)", "https://www.jpl.nasa.gov/news/voyager-1-returning-science-data-from-all-four-instruments/"],
  ["Encyclopedia Astronautica, UA1205", "http://www.astronautix.com/u/ua1205.html"],
  ["Encyclopedia Astronautica, LR87-11", "http://www.astronautix.com/l/lr87-11.html"],
  ["Gunter's Space Page, Star 37 (TE-M-364-4)", "https://space.skyrocket.de/doc_eng/star-37.htm"],
  ["Wikipedia, Titan IIIE (liftoff mass, launch times)", "https://en.wikipedia.org/wiki/Titan_IIIE"],
];
const fmtLT = (min) => { const h = Math.floor(min / 60), m = Math.floor(min % 60), s = Math.round((min * 60) % 60); return `${h} h ${String(m).padStart(2, "0")} min ${String(s).padStart(2, "0")} s`; };
const fmtUTC = (jd) => isoOf(jd).replace("T", ", ").slice(0, 17) + " UT";

function buildSheets() {
  $("#titleblock").innerHTML = [["Spacecraft", "Voyager 1 · Voyager 2"], ["HGA", "3.66 m · 12 ft"], ["Mission module", "825 kg"], ["Launched", "20 AUG · 5 SEP 1977"]].map(([a, b]) => `<div><span>${a}</span><b>${b}</b></div>`).join("");
  $("#glance").innerHTML = [
    ["Mission module", "825 kg", "after injection, with 105 kg of science"],
    ["Power at launch", "≈470 W", "3 MHW-RTGs at 30 V DC"],
    ["Power today", "≈4 W less", "every year, as Pu-238 decays"],
    ["High-gain antenna", "3.66 m", "≈48 dBi at X-band"],
    ["Instruments", "11", "investigations; 3 still on Voyager 2, 2 on Voyager 1"],
    ["Hydrazine", "105 kg", "16 × 0.89 N thrusters"],
    ["Data rate", "160 bit/s", "today · 115.2 kbit/s at Jupiter"],
    ["Golden Record", "12 in", "gold-plated copper, 16⅔ rpm"],
  ].map(([s, b, sm]) => `<div><span>${s}</span><b>${b}</b><small>${sm}</small></div>`).join("");
  // instruments
  const st = STATUS_CELL;
  $("#insTable").innerHTML = `<thead><tr><th>Investigation</th><th>Measures</th><th class="num">Mass</th><th class="num">Power</th><th>Voyager 1</th><th>Voyager 2</th></tr></thead><tbody>` +
    INSTRUMENTS.map((I) => `<tr data-item="${I.id}"><td><b>${I.name}</b></td><td>${I.what}</td><td class="num">${I.mass || "—"}</td><td class="num">${I.power || "—"}</td><td class="st">${st(I.status[0])}</td><td class="st">${st(I.status[1])}</td></tr>`).join("") + "</tbody>";
  document.querySelectorAll("#insTable tr[data-item]").forEach((r) => r.addEventListener("click", () => { selectItem(r.dataset.item); $("#fig").scrollIntoView({ behavior: REDUCED ? "auto" : "smooth", block: "center" }); }));
  // hardware sheets: one per assembly of the spacecraft, then the launch vehicle
  const keys = Object.keys(MODULES).filter((k) => /^dV\.(?!bay[1-9]|rtg[12])/.test(k)).concat(["stackInfo", "srmR", "s1", "s1Eng", "s2", "s2Eng", "cen", "cenEng", "cssA", "pm", "pmEng", "pad"].filter((k) => MODULES[k]));
  $("#specs").innerHTML = keys.map((k) => { const M = MODULES[k]; return `<article class="spec" data-mod="${k}"><header><h4>${k === "dV.bay0" ? "Electronics bays" : k === "dV.rtg0" ? "MHW-RTGs (× 3)" : k === "srmR" ? "UA1205 solid rocket motors (× 2)" : M.name}</h4>${M.by ? `<span class="by">${M.by}</span>` : ""}</header><dl class="kv">${kvHTML(M.kv || [])}</dl></article>`; }).join("");
  // engines
  const E = ENGINES;
  const rows = [
    ["UA1205", "Stage 0", "2", fmt(E.UA1205.thrustSL), fmt(E.UA1205.thrustVac), `${E.UA1205.ispSL} / ${E.UA1205.ispVac}`, E.UA1205.burn, E.UA1205.prop],
    ["LR87-AJ-11", "Stage 1", "1 (2 chambers)", "2 × " + fmt(E.LR87.thrustSL), "2 × " + fmt(E.LR87.thrustVac), `250 / ${E.LR87.ispVac}`, E.LR87.burn, E.LR87.prop],
    ["LR91-AJ-11", "Stage 2", "1", "—", fmt(E.LR91.thrustVac), `— / ${E.LR91.ispVac}`, E.LR91.burn, E.LR91.prop],
    ["RL10A-3-3", "Centaur D-1T", "2", "—", fmt(E.RL10.thrustVac), `— / ${E.RL10.ispVac}`, "2 burns", E.RL10.prop],
    ["TE-M-364-4", "Propulsion module", "1", "—", fmt(E.TE364.thrustVac) + " avg", `— / ${E.TE364.ispVac}`, E.TE364.burn, "solid"],
  ];
  $("#engTable").innerHTML = `<thead><tr><th>Engine</th><th>Where</th><th class="num">On each launch</th><th class="num">Thrust SL, lbf</th><th class="num">Thrust vac, lbf</th><th class="num">Isp SL / vac, s</th><th class="num">Burn</th><th>Propellants</th></tr></thead><tbody>` +
    rows.map((r) => `<tr>${r.map((c, i) => `<td${[2, 3, 4, 5, 6].includes(i) ? ' class="num"' : ""}>${c}</td>`).join("")}</tr>`).join("") + "</tbody>";
  const Ae = (k) => (E[k].thrustVac - E[k].thrustSL) * LBF / P0;
  $("#math").innerHTML = [
    `<p>F(p<sub>a</sub>) = F<sub>vac</sub> − p<sub>a</sub> · A<sub>e</sub> <em>— the momentum thrust is fixed by the propellant flow; the atmosphere takes away p<sub>a</sub>·A<sub>e</sub></em></p>`,
    `<p>UA1205: F<sub>vac</sub> = 5,293 kN × 263 s ÷ 238 s = ${fmt(E.UA1205.thrustVac * LBF / 1000)} kN <em>(same mass flow at the vacuum Isp) → A<sub>e</sub> = ${fmt(Ae("UA1205"), 2)} m², exit Ø ${fmt(Math.sqrt(4 * Ae("UA1205") / Math.PI), 2)} m</em></p>`,
    `<p>LR87, per chamber: A<sub>e</sub> = (1,156.5 − 968.4) kN ÷ 101,325 Pa = ${fmt(Ae("LR87"), 2)} m² <em>→ exit Ø ${fmt(Math.sqrt(4 * Ae("LR87") / Math.PI), 2)} m, which is why two bells fill the 3.05 m core</em></p>`,
    `<p>T/W at liftoff = 2 × 5,293 kN ÷ (632,970 kg × 9.80665 m/s²) = ${fmt(2 * E.UA1205.thrustSL * LBF / (LIFTOFF_KG * G0), 2)}</p>`,
    `<p>Mass flow ṁ = F<sub>vac</sub> ÷ (Isp<sub>vac</sub> · g₀), fixed for each engine; Isp at any altitude = F ÷ (ṁ · g₀). Ambient pressure: U.S. Standard Atmosphere 1976.</p>`,
  ].join("");
  // missions
  $("#missions").innerHTML = Object.entries(MISSIONS).map(([k, M]) => `<div class="mis"><h3 class="${PROBES[k].cls}">${M.name} · ${M.vehicle}</h3><div class="table-wrap"><table><thead><tr><th>Date</th><th>Event</th><th>Logged</th></tr></thead><tbody>${M.events.map(([d, e, l]) => `<tr><td class="get">${d}</td><td>${e}</td><td>${l}</td></tr>`).join("")}</tbody></table></div></div>`).join("");
  $("#sources").innerHTML = SOURCES_LIST.map(([t, u]) => `<li><a href="${u}" target="_blank" rel="noopener">${t}</a></li>`).join("");
  UI.live = liveNow; liveNow(); watchStatus();
}
// where they are now: the trajectory model, evaluated every frame while the section is on screen
const V1_LIGHT_DAY_NASA = Date.UTC(2026, 10, 18, 10, 16) / 86400000 + 2440587.5;   // NASA's time for 1 light-day from Earth
const LIVE = { built: false, open: 0, cross: 0, crossAt: 0, cells: [], on: false, last: 0 };
const pad2 = (n) => String(n).padStart(2, "0");
// one-way light time to the microsecond: it grows by a few hundredths of a millisecond every second
const fmtLTus = (sec) => { const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60; return `${h} h ${pad2(m)} min ${s.toFixed(6).padStart(9, "0")} s`; };
const fmtSpan = (d) => { if (d <= 0) return "passed"; const t = Math.floor(d * 86400), dd = Math.floor(t / 86400), hh = Math.floor((t % 86400) / 3600), mm = Math.floor((t % 3600) / 60), ss = t % 60; return `${dd} d ${pad2(hh)} h ${pad2(mm)} min ${pad2(ss)} s`; };
function liveNow() {
  const box = $("#now"); if (!box) return;
  if (!J.legs.V1) buildLegs();
  if (!LIVE.built) {
    const cells = [];
    for (const [k, P] of Object.entries(PROBES)) cells.push([P.cls, `${P.name} · from the Sun`], [P.cls, `${P.name} · signal time from Earth`]);
    cells.push(["v1", "Voyager 1 · one light-day from Earth in"], ["", "Model clock"]);
    box.innerHTML = cells.map(([cls, a]) => `<div class="${cls}"><span>${a}</span><b></b><small></small></div>`).join("");
    LIVE.cells = [...box.children].map((d) => ({ b: d.querySelector("b"), s: d.querySelector("small") }));
    LIVE.open = JD_NOW(); LIVE.built = true;
    new IntersectionObserver((e) => { LIVE.on = e[0].isIntersecting; if (LIVE.on) requestAnimationFrame(liveTick); }, { rootMargin: "120px" }).observe(box);
  }
  liveTick(performance.now(), true);
}
function liveTick(now, once) {
  if (!once) { if (!LIVE.on || document.hidden) return; requestAnimationFrame(liveTick); if (now - LIVE.last < 50) return; }
  LIVE.last = now;
  const jd = JD_NOW(), E = planetPos("earth", jd), out = [];
  for (const k of Object.keys(PROBES)) {
    const s = stateAt(k, jd), rS = v3.len(s.r), rE = v3.len(v3.sub(s.r, E)), v = v3.len(s.v) * AUD_KMS;
    out.push([`${Math.round(rS * AU).toLocaleString("en-US")} km`, `${rS.toFixed(6)} AU · ${fmt(v, 2)} km/s outward, ${fmt(v * 3600)} km/h`]);
    const M = MISSION[k];
    if (M.state === "operating") out.push([fmtLTus(rE * AU / C_KMS), `${Math.round(rE * AU).toLocaleString("en-US")} km from Earth, at the speed of light, one way`]);
    else { const t0 = M.lastContact || M.since, d = t0 ? jd - jdOf(t0.length <= 10 ? t0 + "T00:00:00Z" : t0.endsWith("Z") ? t0 : t0 + "Z") : 0;
      out.push([t0 ? fmtSpan(d) : STATE_TXT[M.state], `${M.state === "ended" ? "mission ended" : "silent"}${t0 ? ", last heard " + fmtDay(t0) : ""} · a signal would still take ${fmtLT(rE * AU / C_KMS / 60)} to arrive`]); }
  }
  // Voyager 1 reaches one light-day (25.9 billion km) from Earth: NASA's time, and where this model puts it
  if (!LIVE.cross || jd - LIVE.crossAt > 1 / 24) {
    const LD = C_KMS * 86400 / AU, e1 = (t) => v3.len(v3.sub(stateAt("V1", t).r, planetPos("earth", t)));
    let lo = jd - 400, hi = jd + 400; for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (e1(m) < LD) lo = m; else hi = m; }
    LIVE.cross = lo; LIVE.crossAt = jd;
  }
  out.push([fmtSpan(V1_LIGHT_DAY_NASA - jd), `NASA: 18 Nov 2026, 10:16 UT · this model: ${fmtDate(LIVE.cross)}, ${isoOf(LIVE.cross).slice(11, 16)} UT`]);
  out.push([isoOf(jd).slice(11, 19) + " UT", `${fmtDate(jd)} · checked against JPL Horizons for 28 Oct 2026: Voyager 1 ${fmt(PROBES.V1.hz.r, 2)} AU, Voyager 2 ${fmt(PROBES.V2.hz.r, 2)} AU`]);
  out.forEach(([b, sm], i) => { const c = LIVE.cells[i]; if (!c) return; if (c.b.textContent !== b) c.b.textContent = b; if (c.s.textContent !== sm) c.s.textContent = sm; });
}
