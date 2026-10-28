// ============================================================================
// 66 · MISSION STATUS — the fail-safe for the day either probe falls silent or
// NASA ends a mission, or switches off another instrument. Two places hold it:
//  · as a Claude artifact: this page's database (status/mission), which only the
//    owner or editors can write, read live;
//  · on GitHub Pages: status.json next to the page, re-read every ten minutes.
//    The DSN watch workflow (.github/workflows/dsn-watch.yml) writes the dsn
//    record there every half hour from NASA's DSN Now feed; state, instruments
//    and notes are edited by hand.
// With neither (opened from disk, offline) it shows the status built in.
// Shape: { checked, source, V1: { state, since, lastContact, note, dsn }, V2: {…},
//          instruments: { iLECP: ["2026-04-17", "2025-03-24"], … } }
// dsn: { at, dish, station, rangeKm, rtltS } — the last pass a DSN dish heard the probe
// state: "operating" | "silent" (no signal, mission not yet declared over) | "ended"
// ============================================================================
const MISSION = {
  V1: { state: "operating", since: null, lastContact: null, note: "" },
  V2: { state: "operating", since: null, lastContact: null, note: "" },
  checked: "2026-10-28", source: "NASA Voyager mission status, 15 Oct 2026", live: false, instruments: {},
};
const STATUS_CELL = (x) => (x === "on" ? `<span class="on">On</span>` : x === "—" ? "uses the radio" : `off ${x}`);
const STATE_TXT = { operating: "Operating", silent: "Silent", ended: "Mission ended" };
const isoDay = (s) => (typeof s === "string" && /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 19) : null);
const txt = (s, n = 200) => (typeof s === "string" ? s.slice(0, n) : "");
const num = (v) => (v != null && v !== "" && Number.isFinite(+v) && +v > 0 ? +v : null);
// the DSN feed gives range to three significant figures, so it is shown that way
const fmtRange = (km) => (km >= 1e9 ? `${(km / 1e9).toPrecision(3)} billion km` : `${Math.round(km).toLocaleString("en-US")} km`);
function applyStatus(d) {
  if (d && typeof d === "object") {
    for (const k of ["V1", "V2"]) {
      const s = d[k]; if (!s || typeof s !== "object") continue;
      const dsn = s.dsn && typeof s.dsn === "object" ? s.dsn : null;
      MISSION[k] = { state: STATE_TXT[s.state] ? s.state : "operating", since: isoDay(s.since), lastContact: isoDay(s.lastContact), note: txt(s.note, 280),
        dsn: dsn ? { at: isoDay(dsn.at), dish: txt(dsn.dish, 12), station: txt(dsn.station, 40), rangeKm: num(dsn.rangeKm), rtltS: num(dsn.rtltS) } : null };
    }
    MISSION.checked = isoDay(d.checked) || MISSION.checked; MISSION.source = txt(d.source, 160) || MISSION.source;
    const ins = d.instruments && typeof d.instruments === "object" ? d.instruments : {};
    MISSION.instruments = {};
    // each entry is [Voyager 1, Voyager 2]: "on", an off date (YYYY-MM-DD), or "keep" for the published value
    for (const I of INSTRUMENTS) { const v = ins[I.id]; if (Array.isArray(v) && v.length === 2) MISSION.instruments[I.id] = v.map((x, i) => (x === "on" ? "on" : isoDay(x) ? fmtDay(isoDay(x).slice(0, 10)) : I.status[i])); }
    MISSION.live = d.via || "record";
  }
  renderStatus();
}
const jdIso = (iso) => jdOf(iso.length <= 10 ? iso + "T00:00:00Z" : iso.endsWith("Z") ? iso : iso + "Z");
const fmtDay = (iso) => (iso ? fmtDate(jdIso(iso)) : "");
function renderStatus() {
  const box = $("#mstatus"); if (!box) return;
  box.textContent = "";
  for (const k of ["V1", "V2"]) {
    const S = MISSION[k], quiet = S.state === "operating" && S.dsn?.at ? Math.floor(JD_NOW() - jdIso(S.dsn.at)) : 0;
    const p = el("span", { class: `ms ${PROBES[k].cls} ${S.state}${quiet > QUIET_DAYS[k] ? " silent" : ""}` });
    p.textContent = `${PROBES[k].name} · ${quiet > QUIET_DAYS[k] ? `no Deep Space Network contact for ${quiet} days` : STATE_TXT[S.state]}${S.state !== "operating" && (S.since || S.lastContact) ? ` since ${fmtDay(S.since || S.lastContact)}` : ""}`;
    if (S.note) p.title = S.note;
    box.append(p);
  }
  // the last time a Deep Space Network dish heard each probe, as NASA's DSN Now feed reported it
  const heard = ["V1", "V2"].filter((k) => MISSION[k].dsn?.at).map((k) => { const D = MISSION[k].dsn; return `${PROBES[k].name} last heard ${fmtDay(D.at)}, ${D.at.slice(11, 16)} UT by ${D.dish}${D.station ? " " + D.station : ""}${D.rangeKm ? ` at ${fmtRange(D.rangeKm)}` : ""}`; });
  if (heard.length) { const h = el("small", { class: "heard" }); h.textContent = heard.join(" · "); box.append(h); }
  // a record nobody has re-checked for weeks says so, rather than claiming to be current
  const age = MISSION.checked ? Math.floor(JD_NOW() - jdOf(MISSION.checked.slice(0, 10) + "T00:00:00Z")) : null;
  const c = el("small", {}); c.textContent = `Status ${MISSION.live === "file" ? "from status.json, kept current from NASA's Deep Space Network" : MISSION.live ? "read live from this page's record" : "as published"} · last checked ${fmtDay(MISSION.checked)}${age > 45 ? ` (${age} days ago, not re-checked since)` : ""}${MISSION.source ? " · " + MISSION.source : ""}`; box.append(c);
  // the instruments table follows: a switched-off instrument shows its date, an ended mission switches everything off
  document.querySelectorAll("#insTable tr[data-item]").forEach((r) => {
    const I = INSTRUMENTS.find((x) => x.id === r.dataset.item); if (!I) return;
    const st0 = MISSION.instruments[I.id] || I.status, cells = r.querySelectorAll("td.st");
    ["V1", "V2"].forEach((k, i) => { const end = MISSION[k].state === "ended", v = end && st0[i] === "on" ? (MISSION[k].since ? fmtDay(MISSION[k].since) : "· mission ended") : st0[i]; if (cells[i]) cells[i].innerHTML = STATUS_CELL(v); });
  });
  // cell labels and the journey's craft labels say so too
  if (LIVE.built) ["V1", "V2"].forEach((k, i) => { const lab = $("#now").children[i * 2 + 1]?.querySelector("span"); if (lab) lab.textContent = `${PROBES[k].name} · ${MISSION[k].state === "operating" ? "signal time from Earth" : "time since last contact"}`; });
  if (J.craft) for (const k of ["V1", "V2"]) { const sp = J.craft[k]?.querySelector("span"); if (sp) sp.textContent = PROBES[k].name + (MISSION[k].state === "operating" ? "" : " · " + STATE_TXT[MISSION[k].state].toLowerCase()); }
  LIVE.built && liveTick(performance.now(), true);
}
// a probe the network hasn't heard for this long is flagged (Voyager 2 can only be reached from Canberra)
const QUIET_DAYS = { V1: 21, V2: 35 };
async function watchStatus() {
  renderStatus();
  // inside claude.ai: the artifact's own database, live
  if (window.claude?.use) {
    try { const db = await window.claude.use("db"); if (db) { db.doc("status/mission").onSnapshot((snap) => applyStatus(snap.exists ? snap.data() : null), () => {}); return; } } catch (e) {}
  }
  // anywhere else (GitHub Pages): status.json next to the page, re-read every ten minutes;
  // a copy opened straight from disk has nothing to fetch and keeps the published record
  if (!/^https?:$/.test(location.protocol)) return;
  const read = async () => { try { const r = await fetch("status.json", { cache: "no-store" }); if (r.ok) applyStatus({ ...(await r.json()), via: "file" }); } catch (e) {} };
  read(); setInterval(read, 600000);
}
