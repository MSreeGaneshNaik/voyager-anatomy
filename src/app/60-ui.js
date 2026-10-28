// ============================================================================
// 60 · UI — parts index, figure overlays, propulsion console, sheets
// ============================================================================
const UI = {};
const N2LBF = 1 / LBF;
const fmtN = (n) => (n >= 1e6 ? fmt(n / 1e6, 2) + " MN" : fmt(n / 1e3, 1) + " kN");

function buildUI() {
  // engine groups
  const seg = $("#groupSeg");
  for (const [k, G] of Object.entries(GROUPS)) {
    const b = el("button", { type: "button", "data-g": k, "aria-pressed": "false" }, `<span>${G.label}</span><small>${G.sub}</small>`);
    b.addEventListener("click", () => selectGroup(k));
    seg.append(b);
  }
  if (!C.group && Object.keys(GROUPS).length) { C.group = Object.keys(GROUPS)[0]; C.alt = GROUPS[C.group].alt; }
  for (const id of ["#thr", "#thrMini"]) $(id).addEventListener("input", (e) => { C.thr = +e.target.value / 100; UI.sync(); });
  $("#alt").addEventListener("input", (e) => { const v = +e.target.value; C.alt = v >= 100 ? 1e6 : v * 1000; UI.sync(); });
  for (const b of [$("#ign"), $("#ign2")]) b.addEventListener("click", () => (C.running ? shutdown() : ignite()));
  $("#apart").addEventListener("click", () => setExplode(!(curShow() ? C.sx : C.explode)));
  $("#free").addEventListener("click", () => { CAM.free = !CAM.free; CAM.keys.clear(); try { localStorage.setItem("voyager-free", CAM.free ? "1" : "0"); } catch (e) {} UI.sync(); });
  document.querySelectorAll(".dragmode button").forEach((b) => b.addEventListener("click", () => { CAM.dragMode = b.dataset.mode; try { localStorage.setItem("voyager-drag", CAM.dragMode); } catch (e) {} UI.sync(); }));
  try { const dm = localStorage.getItem("voyager-drag"); if (dm === "pan" || dm === "orbit") CAM.dragMode = dm; } catch (e) {}
  $("#zin").addEventListener("click", () => zoomBy(1 / 1.35));
  $("#zout").addEventListener("click", () => zoomBy(1.35));
  $("#zreset").addEventListener("click", resetView);
  $("#aa").addEventListener("click", () => { PIPE.setAA(!PIPE.aa); try { localStorage.setItem("voyager-aa", PIPE.aa ? "1" : "0"); } catch (e) {} UI.sync(); });
  $("#allOn").addEventListener("click", () => { if (C.group) C.off[C.group] = (C.off[C.group] || []).map(() => 0); UI.sync(); });
  // the journey: step through it from the figure
  const jstep = (d) => { const i = J_BY[C.sel]?.i ?? 0, n = J_PHASES[clamp(i + d, 0, J_PHASES.length - 1)]; if (n) selectItem(n.id); };
  $("#jprev").addEventListener("click", () => jstep(-1));
  $("#jnext").addEventListener("click", () => jstep(1));
  // parts index: stacked sections, one open at a time
  const menu = $("#menu");
  menu.style.setProperty("--n", MENU.length);
  MENU.forEach(([title, items], si) => {
    const sec = el("section", { "data-sec": si });
    const head = el("button", { type: "button", class: "sec-head", "aria-expanded": "false", "aria-controls": `sec${si}` }, `<span>${title}</span><b>${items.length}</b><i aria-hidden="true"></i>`);
    head.addEventListener("click", () => openSection(si, true));
    const body = el("div", { class: "sec-items", id: `sec${si}`, role: "group", "aria-label": title }), inner = el("div", { class: "sec-in" });
    items.forEach(([id, label], ii) => {
      // parts-list number in the narrow first column, the name in the second
      const b = el("button", { type: "button", "data-item": id, "aria-pressed": "false" }, `<em>${String(ii + 1).padStart(2, "0")}</em><span>${label}</span>`);
      b.addEventListener("click", () => selectItem(id));
      inner.append(b);
      SEC_OF[id] = si;
    });
    body.append(inner); sec.append(head, body); menu.append(sec);
  });
  openSection(0);
  // keyboard: keys act while the pointer is over the figure or it has focus
  const fig = $("#fig"); fig.tabIndex = 0;
  const FLY = new Set(["w", "a", "s", "d", "q", "e", "arrowleft", "arrowright", "arrowup", "arrowdown", "shift"]);
  let overFig = false;
  fig.addEventListener("pointerenter", () => (overFig = true));
  fig.addEventListener("pointerleave", () => (overFig = false));
  window.addEventListener("keydown", (e) => {
    if (!(overFig || fig.contains(document.activeElement)) || e.metaKey || e.ctrlKey || e.altKey) return;
    const t = e.target, onControl = t !== fig && t.closest?.("button, input, select, textarea, a");
    const k = e.key.toLowerCase();
    if (onControl && (k === " " || k === "enter" || t.matches?.("input"))) return;
    if (k === " " || k === "enter") { e.preventDefault(); if (GROUPS[C.group] && !SHOW[curShow()]?.journey) C.running ? shutdown() : ignite(); }
    else if (k === "+" || k === "=") { e.preventDefault(); zoomBy(1 / 1.25); }
    else if (k === "-" || k === "_") { e.preventDefault(); zoomBy(1.25); }
    else if (k === "r" || k === "0") { e.preventDefault(); resetView(); }
    else if (CAM.free && FLY.has(k)) { e.preventDefault(); CAM.keys.add(k); }
  });
  window.addEventListener("keyup", (e) => CAM.keys.delete(e.key.toLowerCase()));
  window.addEventListener("blur", () => CAM.keys.clear());
  buildSheets();
  UI.sync();
}

// ---------- stacked index ----------
const SEC_OF = {};
let openSec = -1, secFor = null;
function openSection(si, toggle = false, reveal = false) {
  const menu = $("#menu");
  openSec = toggle && openSec === si ? -1 : si;
  menu.querySelectorAll("section").forEach((s) => {
    const on = +s.dataset.sec === openSec;
    s.classList.toggle("open", on);
    s.querySelector(".sec-head").setAttribute("aria-expanded", String(on));
  });
  const sec = menu.querySelector(`section[data-sec="${openSec}"]`); if (!sec) return;
  const go = (e, o) => e.scrollTo({ ...o, behavior: REDUCED ? "auto" : "smooth" });
  const run = () => {
    const head = sec.querySelector(".sec-head"), sel = sec.querySelector('button[aria-pressed="true"]'), mr = menu.getBoundingClientRect();
    if (menu.scrollWidth > menu.clientWidth + 2) {
      const hr = head.getBoundingClientRect();
      if (hr.left < mr.left || hr.right > mr.right) go(menu, { left: Math.max(0, hr.left - mr.left + menu.scrollLeft - 8) });
      const row = sec.querySelector(".sec-in");
      if (sel && row) { const rr = row.getBoundingClientRect(), sr = sel.getBoundingClientRect(); if (sr.left < rr.left || sr.right > rr.right) go(row, { left: Math.max(0, sr.left - rr.left + row.scrollLeft - 8) }); }
    } else {
      const hr = head.getBoundingClientRect(), tr = (reveal && sel ? sel : sec).getBoundingClientRect();
      const vis = Math.min(mr.bottom, innerHeight) - mr.top;
      let top = hr.top - mr.top + menu.scrollTop - 2;
      const need = tr.bottom - mr.top + menu.scrollTop + 10;
      if (need - top > vis) top = need - vis;
      if (hr.top < mr.top || tr.bottom > mr.top + vis) go(menu, { top: Math.max(0, top) });
    }
  };
  sec.querySelector(".sec-items").addEventListener("transitionend", run, { once: true });
  requestAnimationFrame(run); setTimeout(run, 450);
}
function toggleEngine(group, i) { (C.off[group] ||= []); C.off[group][i] = C.off[group][i] ? 0 : 1; UI.sync(); }

// ---------- engine layout seen from below; click an engine to cut it ----------
function clusterSVG() {
  const G = GROUPS[C.group], svg = $("#cluster");
  if (!G) { svg.innerHTML = ""; return; }
  const set = ENGINE_SETS[G.set] || [];
  const pts = set.map((e) => e.layout || V3()), rE = G.exitR;
  const maxR = Math.max(rE, ...pts.map((p) => Math.hypot(p.x, p.z) + rE));
  const k = 52 / maxR;
  let h = `<circle cx="0" cy="0" r="58" fill="none" stroke="var(--line-2)" stroke-dasharray="2 3"/>`;
  if (G.outline) h += G.outline(k);
  pts.forEach((p, i) => {
    const x = p.x * k, y = p.z * k, r = rE * k * 0.96, off = C.off[C.group]?.[i];
    const lvl = set[i].fx.userData.level;
    h += `<g class="eng-g" data-i="${i}" role="button" tabindex="0" aria-label="${set[i].name} ${off ? "cut" : "enabled"}" aria-pressed="${!off}">`;
    h += `<circle class="eng" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="var(--card)" stroke="var(--ink)" stroke-width="1.4"/>`;
    h += `<circle class="glow" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(r * 0.82).toFixed(1)}" fill="var(--accent)" opacity="${(lvl * 0.85).toFixed(2)}" pointer-events="none"/>`;
    h += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(r * 0.26).toFixed(1)}" fill="none" stroke="var(--ink-2)" stroke-width="1" pointer-events="none"/>`;
    if (off) h += `<path d="M${x - r * 0.6} ${y - r * 0.6}L${x + r * 0.6} ${y + r * 0.6}M${x + r * 0.6} ${y - r * 0.6}L${x - r * 0.6} ${y + r * 0.6}" stroke="var(--accent)" stroke-width="2" pointer-events="none"/>`;
    h += `<text x="${x.toFixed(1)}" y="${(y + r + 9).toFixed(1)}" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="7.5" fill="var(--ink-2)" pointer-events="none">${set[i].name}</text></g>`;
  });
  svg.innerHTML = h;
  svg.querySelectorAll(".eng-g").forEach((g) => {
    const t = () => toggleEngine(C.group, +g.dataset.i);
    g.addEventListener("click", t);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); t(); } });
  });
}

UI.sync = function () {
  const G = GROUPS[C.group], sh = curShow(), apart = sh ? C.sx : C.explode, journey = !!SHOW[sh]?.journey, ph = J_BY[C.sel];
  const fig = $("#fig");
  fig.classList.toggle("journey", journey);
  if (journey && ph) { $("#jpos").textContent = ph.i ? `${ph.i} / ${J_PHASES.length - 1}` : "Overview"; $("#jprev").disabled = ph.i === 0; $("#jnext").disabled = ph.i === J_PHASES.length - 1; }
  document.querySelectorAll("#groupSeg button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.g === C.group)));
  document.querySelectorAll("#menu button[data-item]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.item === C.sel)));
  if (C.sel !== secFor) { secFor = C.sel; const si = SEC_OF[C.sel]; if (si !== undefined) openSection(si, false, true); }
  renderDetail();
  const engHere = !!G && (G.show || null) === sh;
  for (const b of [$("#ign"), $("#ign2")]) { b.querySelector("span").textContent = C.running ? "Shut down" : "Ignite"; b.disabled = !G || journey; }
  fig.classList.toggle("noeng", !engHere);
  $("#ign").classList.toggle("on", C.running);
  $("#ign2").classList.toggle("off", !C.running);
  $("#apart").setAttribute("aria-pressed", String(apart));
  $("#apart").textContent = apart ? "Assemble" : "Take apart";
  $("#aa").setAttribute("aria-pressed", String(PIPE.aa));
  $("#aa").innerHTML = `Anti-aliasing <b>${PIPE.aa ? `On · ${fmt(PIPE.ss || 1, 1)}× + MSAA` : "Off"}</b>`;
  $("#free").setAttribute("aria-pressed", String(CAM.free));
  $("#free").innerHTML = `Free cam <b>${CAM.free ? "On" : "Off"}</b>`;
  fig.classList.toggle("free", CAM.free);
  fig.classList.toggle("pan", CAM.dragMode === "pan");
  document.querySelectorAll(".dragmode button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mode === CAM.dragMode)));
  $("#hint").textContent = CAM.free ? (CAM.dragMode === "pan" ? "Drag to pan · shift-drag to orbit" : "Drag to orbit · right- or shift-drag to pan") + " · scroll to zoom · W/S in-out · A/D sideways · Q/E down-up · R reset" : "Hover or click a part to read it · turn on free cam to fly around";
  // throttle: a solid has none; the liquids flew at 100 %, lower is a what-if on propellant flow
  const solid = !G || ENGINES[G.eng].solid, thrTxt = solid ? "Solid · no throttle" : `${fmt(C.thr * 100, C.thr === 1 || C.thr === 0 ? 0 : 1)} %${C.thr < 1 ? " · what-if" : ""}`;
  for (const [i, o] of [["#thr", "#thrOut"], ["#thrMini", "#thrMiniOut"]]) {
    const r = $(i); r.disabled = solid; r.value = solid ? 100 : C.thr * 100; $(o).textContent = i === "#thr" ? thrTxt : solid ? "Solid" : `${fmt(C.thr * 100, 0)} %`;
    r.style.setProperty("--track", "linear-gradient(90deg, var(--line) 0 99%, var(--ink) 99% 100%)");
  }
  $(".mini-thr").classList.toggle("off", solid);
  // ambient
  const alt = $("#alt"), vac = !G || ENGINES[G.eng].vacOnly;
  alt.disabled = vac;
  alt.value = C.alt >= 1e6 ? 100 : C.alt / 1000;
  $("#altOut").textContent = vac ? "Vacuum (design point)" : C.alt >= 1e6 ? "Vacuum" : C.alt === 0 ? "Sea level" : `${fmt(C.alt / 1000, 1)} km`;
  clusterSVG();
  if (G) { $("#engNote").innerHTML = ENGINES[G.eng].note || ""; $("#engName").textContent = `${ENGINES[G.eng].name} × ${(ENGINE_SETS[G.set] || []).length}`; }
  $("#figTitle").textContent = journey ? `The Grand Tour · ${ph ? ph.label : ""}` : sh ? (MODULES[sh]?.name || "") + (C.sx ? " · taken apart" : "") : C.explode ? "Titan IIIE-Centaur · taken apart" : STACK_TITLE();
  $("#caption").innerHTML = journey ? J_CAPTION : sh ? (SHOW_CAPS[sh] || "") : (G?.cap || STACK_CAP);
  UI.tick(true);
  UI.measure();
};
const STACK_TITLE = () => "Titan IIIE-Centaur · LC-41";
const STACK_CAP = "";
// the drawing is framed inside the band the overlays leave free
UI.insets = { top: 0, bottom: 0 };
UI.measure = function () {
  const f = $("#fig").getBoundingClientRect(); if (!f.height) return;
  let top = 0;
  for (const s of f.width < 640 ? [".tl", "#hint", ".tr"] : [".tl", "#hint"]) { const r = $(s).getBoundingClientRect(); if (r.height) top = Math.max(top, r.bottom - f.top); }
  const ft = $("#foot").getBoundingClientRect();
  UI.insets = { top: top + 8, bottom: f.bottom - ft.top + 8 };
};

let lastTick = 0;
UI.tick = function (force) {
  const now = performance.now();
  if (!force && now - lastTick < 90) return;
  lastTick = now;
  const ro = $("#readout"), sh = curShow(), journey = !!SHOW[sh]?.journey;
  const S = groupState();
  if (S) {
    const set = ENGINE_SETS[S.G.set] || [];
    const lit = set.reduce((a, e) => a + (e.fx.userData.thrust || 0), 0);
    const total = lit * S.per, lbf = total * N2LBF;
    put($("#thrustBig"), "html", `${fmt(lbf)}<small>lbf</small>`);
    put($("#thrustSub"), "text", `${fmtN(total)} · ${S.n} of ${S.N} ${S.N > 1 ? S.G.unitPl || "engines" : S.G.unit || "engine"} lit`);
    const tw = S.G.twMass ? total / (S.G.twMass * G0) : null, bar = $("#twBar");
    if (tw !== null) {
      const max = S.G.twMax || 2;
      put(bar.querySelector("b"), "width", `${clamp(tw / max, 0, 1) * 100}%`);
      put(bar.querySelector("em"), "left", `${(1 / max) * 100}%`);
      put($("#twMid"), "text", "1.0 = liftoff");
      put($("#twMax"), "text", `${max}`);
    } else {
      const ref = S.per * S.N;
      put(bar.querySelector("b"), "width", `${ref > 0 ? clamp(total / ref, 0, 1) * 100 : 0}%`);
      put(bar.querySelector("em"), "left", "calc(100% - 2px)");
      put($("#twMid"), "text", "share of rated thrust");
      put($("#twMax"), "text", "100 %");
    }
    const kv = [["Thrust per " + (S.G.unit || "engine"), `${fmt(S.per * N2LBF)} lbf · ${fmt(S.per / 1000, 1)} kN`],
      ["Ambient pressure", S.pa >= 1 ? `${fmt(S.pa, S.pa < 100 ? 1 : 0)} Pa · ${fmt((S.pa / P0) * 100, 2)} % SL` : S.pa > 0 ? `${S.pa.toFixed(3)} Pa` : "0 Pa (vacuum)"],
      ["Specific impulse", `${fmt(S.isp, 1)} s`],
      ["Propellant flow", `${fmt(lit > 0 ? S.mdot * lit : 0, S.mdot < 50 ? 1 : 0)} kg/s`]];
    if (tw !== null) kv.push([S.G.twLabel, fmt(tw, 2), tw > 1 ? "hi" : ""]);
    for (const r of S.G.flown || []) kv.push(r);
    put($("#liveKV"), "html", kvHTML(kv));
    const st = $("#engStatus"), outs = (C.off[C.group] || []).reduce((a, b) => a + b, 0);
    put(st, "class", "status" + (C.running ? (outs ? " warn" : " go") : ""));
    put(st, "text", C.running ? (outs ? `Firing · ${outs} out` : "Firing") : "Safed");
    set.forEach((e, i) => { const c = document.querySelector(`#cluster .eng-g[data-i="${i}"] .glow`); if (c) put(c, "@opacity", ((e.fx.userData.thrust || 0) * 0.85).toFixed(2)); });
    if (!journey && !(C.hover && MODULES[C.hover]) && (S.G.show || null) === sh && (C.running || lit > 0.001 || MENU_ITEMS[C.sel]?.group)) {
      put(ro, "html", `${S.G.code} × ${S.N} · ${lit > 0.001 ? fmt(lbf) + " lbf" : "idle"}<small>${lit > 0.001 ? `${fmtN(total)} · Isp ${fmt(S.isp, 1)} s` + (tw !== null ? ` · T/W ${fmt(tw, 2)}` : "") : S.G.idle || "Safed"}</small>`);
      return;
    }
  }
  const jph = journey && J_BY[C.sel];
  if (jph && !(C.hover && MODULES[C.hover])) { put(ro, "html", J_READOUT()); return; }
  if (C.hover && MODULES[C.hover]) { const M = MODULES[C.hover]; put(ro, "html", `${M.name}<small>${(M.kv || []).slice(0, 2).map(([a, b]) => `${a} ${b}`).join(" · ") || "Click to open its sheet"}</small>`); return; }
  const it = MENU_ITEMS[C.sel], M = MODULES[(it?.info || it?.mods || [])[0]];
  put(ro, "html", M ? `${it.root ? M.name : it.label}<small>${(M.kv || []).slice(0, 2).map(([a, b]) => `${a} ${b}`).join(" · ")}</small>` : "");
};

// ---------- the sheet for the selected item, under the figure ----------
let detailFor = null;
function renderDetail() {
  if (detailFor === C.sel) return;
  detailFor = C.sel;
  const it = MENU_ITEMS[C.sel], box = $("#detail");
  if (!it) { box.innerHTML = ""; return; }
  const keys = (it.info || it.mods).filter((k) => MODULES[k]);
  const M = MODULES[keys[0]] || {};
  let cols = "";
  for (const k of keys) {
    const m = MODULES[k];
    if (!m.kv?.length) continue;
    if (keys.length > 1) cols += `<h3>${m.name}</h3>`;
    const half = Math.ceil(m.kv.length / 2);
    cols += `<dl class="kv">${kvHTML(m.kv.slice(0, half))}</dl><dl class="kv">${kvHTML(m.kv.slice(half))}</dl>`;
  }
  const descs = keys.map((k) => MODULES[k].desc).filter(Boolean);
  box.innerHTML = `<div class="d-head"><h3>Selected · ${it.label}</h3><h2>${it.root || keys.length === 1 ? M.name || it.label : it.label}</h2>${M.by ? `<span class="d-by">${M.by}</span>` : ""}${descs.map((d) => `<p>${d}</p>`).join("")}</div><div class="d-cols">${cols}</div>`;
}
function setHotSpec(key) {
  document.querySelectorAll(".spec.hot").forEach((e) => e.classList.remove("hot"));
  if (key) document.querySelector(`.spec[data-mod="${key}"]`)?.classList.add("hot");
}
