// Voyager Anatomy — automated checks (Playwright, headless).
// Layout and physics are checked numerically from the live scene; looks are checked by eye on a real GPU.
//   node scripts/check.cjs            → prints a report, exits 1 on any failure
const path = require("node:path");
const { chromium } = require("playwright");

const URL = process.env.TARGET_URL || "file://" + path.join(__dirname, "..", "dist", "voyager.html");
const WIDTHS = [1600, 1440, 1280, 1100, 1024, 900, 800, 600, 390];
const fails = [], notes = [];
const fail = (m) => { fails.push(m); console.log("  ✗ " + m); };
const ok = (m) => console.log("  ✓ " + m);

(async () => {
  const browser = await chromium.launch({ headless: true, args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader", "--ignore-gpu-blocklist"] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });
  await page.goto(URL);
  await page.waitForFunction(() => window.VOYAGER && window.VOYAGER.J && window.VOYAGER.J.built, null, { timeout: 90000 });

  // ---------- menu and page layout at many widths ----------
  console.log("\nLayout");
  for (const w of WIDTHS) {
    await page.setViewportSize({ width: w, height: 900 });
    await page.waitForTimeout(250);
    const r = await page.evaluate(() => {
      const out = { hscroll: document.documentElement.scrollWidth - innerWidth, wrapped: [], narrow: [] };
      for (const b of document.querySelectorAll(".index button")) {
        if (!b.offsetParent) continue;
        const cs = getComputedStyle(b), lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.3;
        const lines = Math.round((b.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)) / lh);
        const words = b.textContent.trim().split(/\s+/).length;
        if (lines > 2 || (lines >= words && words > 1)) out.wrapped.push(`${b.textContent.trim().replace(/\s+/g, " ")} (${lines} lines, ${Math.round(b.clientWidth)}px)`);
      }
      const idx = document.querySelector(".index"); out.indexW = idx ? Math.round(idx.getBoundingClientRect().width) : 0;
      for (const e of document.querySelectorAll(".titleblock b, .glance b, h1, h2")) if (e.scrollWidth > e.clientWidth + 1) out.narrow.push(e.textContent.trim().slice(0, 40));
      return out;
    });
    if (r.hscroll > 0) fail(`${w}px: page scrolls sideways by ${r.hscroll}px`);
    if (r.wrapped.length) fail(`${w}px: index items wrap badly (index ${r.indexW}px): ${r.wrapped.slice(0, 4).join("; ")}${r.wrapped.length > 4 ? " …" : ""}`);
    if (r.narrow.length) fail(`${w}px: text overflowing its box: ${r.narrow.join("; ")}`);
    if (!r.hscroll && !r.wrapped.length && !r.narrow.length) ok(`${w}px: no sideways scroll, index ${r.indexW}px, menu reads cleanly`);
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(300);

  // ---------- every menu item selects cleanly ----------
  console.log("\nEvery view");
  const items = await page.evaluate(() => Object.keys(window.VOYAGER.MENU_ITEMS));
  for (const id of items) {
    const n0 = errors.length;
    const r = await page.evaluate((id) => {
      const V = window.VOYAGER; V.selectItem(id); V.warp(id.startsWith("j") ? 7 : 3);
      const c = V.CAM; return { h: c.h, ok: Number.isFinite(c.h) && Number.isFinite(c.target.x) && c.h > 0 };
    }, id);
    if (!r.ok) fail(`${id}: camera went non-finite`);
    if (errors.length > n0) fail(`${id}: ${errors.slice(n0).join(" | ")}`);
  }
  ok(`${items.length} views selected`);

  // ---------- the launch stack taken apart ----------
  console.log("\nLaunch stack, taken apart");
  const apart = await page.evaluate(async () => {
    const V = window.VOYAGER, T = V.THREE;
    V.selectItem("stack"); V.setExplode(true); V.warp(8);
    document.querySelector("#fig").scrollIntoView({ block: "center" });
    // let the drawing loop run a few frames (software rendering can take seconds on its first frames)
    const f0 = V.frames, t0 = performance.now(); while (V.frames < f0 + 4 && performance.now() - t0 < 90000) await new Promise((r) => setTimeout(r, 200));
    const box = (k) => { const b = new T.Box3(); for (const m of V.MODS[k].meshes) { m.updateWorldMatrix(true, false); const bb = m.isInstancedMesh ? (m.computeBoundingBox(), m.boundingBox) : (m.geometry.boundingBox || (m.geometry.computeBoundingBox(), m.geometry.boundingBox)); b.union(bb.clone().applyMatrix4(m.matrixWorld)); } return b; };
    const flight = Object.keys(V.STACK_LV), res = { below: [], outside: [], overlap: [], screen: [], offFrame: [] };
    const P = V.PAD, B = {}; for (const k of [...flight, "tower", "pad"]) B[k] = box(k);
    for (const k of flight) {
      if (B[k].min.y < 0.3) res.below.push(`${k} ${B[k].min.y.toFixed(2)} m`);
      if (B[k].min.x < -P.w / 2 || B[k].max.x > P.w / 2 || B[k].min.z < P.zb || B[k].max.z > P.zf) res.outside.push(k);
    }
    for (let i = 0; i < flight.length; i++) for (let j = i + 1; j < flight.length; j++) {
      const a = B[flight[i]].clone().expandByScalar(-0.03), b = B[flight[j]].clone().expandByScalar(-0.03);
      if (a.intersectsBox(b)) res.overlap.push(`${flight[i]}×${flight[j]}`);
    }
    // on screen, at the default view: nothing in front of the tower, everything inside the figure
    const cam = V.camera, rect = (b) => { let x0 = 1, x1 = -1, y0 = 1, y1 = -1; for (let i = 0; i < 8; i++) { const p = new T.Vector3(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z).project(cam); x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); } return { x0, x1, y0, y1 }; };
    // silhouettes from the actual vertices (bounding boxes overstate a lattice tower seen at an angle)
    const vrect = (k) => { let x0 = 1, x1 = -1, y0 = 1, y1 = -1; const p = new T.Vector3(), im = new T.Matrix4(), mw = new T.Matrix4();
      for (const m of V.MODS[k].meshes) { const pos = m.geometry.attributes.position, n = m.isInstancedMesh ? m.count : 1, step = Math.max(1, Math.floor(pos.count / 400));
        for (let j = 0; j < n; j++) { if (m.isInstancedMesh) { m.getMatrixAt(j, im); mw.multiplyMatrices(m.matrixWorld, im); } else mw.copy(m.matrixWorld);
          for (let i = 0; i < pos.count; i += step) { p.fromBufferAttribute(pos, i).applyMatrix4(mw).project(cam); x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); } } }
      return { x0, x1, y0, y1 }; };
    const tw = vrect("tower");
    for (const k of flight) {
      const r = vrect(k);
      if (r.x1 > tw.x0 + 0.004 && r.x0 < tw.x1 && r.y1 > tw.y0 && r.y0 < tw.y1) res.screen.push(k);
      if (r.x0 < -1 || r.x1 > 1 || r.y0 < -1 || r.y1 > 1) res.offFrame.push(k);
    }
    return res;
  });
  apart.below.length ? fail(`parts at or under the deck: ${apart.below.join(", ")}`) : ok("every part clears the deck");
  apart.outside.length ? fail(`parts beyond the platform's footprint: ${apart.outside.join(", ")}`) : ok("every part stays over the platform");
  apart.overlap.length ? fail(`parts intersecting: ${apart.overlap.join(", ")}`) : ok("no two parts intersect");
  apart.screen.length ? fail(`drawn over the tower: ${apart.screen.join(", ")}`) : ok("nothing is drawn over the tower");
  apart.offFrame.length ? fail(`cut off by the frame: ${apart.offFrame.join(", ")}`) : ok("everything fits in the figure");

  // ---------- umbilical arms: stacked, each plate meets its stage's skin and no arm enters the vehicle ----------
  const arms = await page.evaluate(() => {
    const V = window.VOYAGER, T = V.THREE; V.selectItem("stack"); V.setExplode(false); V.warp(6);
    const radius = { core: 3.05 / 2, css: 4.27 / 2 }, out = [];
    for (const a of V.TOWER_ARMS) {
      const b = new T.Box3().setFromObject(a.pivot);   // z grows towards the vehicle's axis at z = 0
      out.push({ what: a.what, tip: b.max.z });
    }
    return out;
  });
  const deep = arms.filter((a) => a.tip > -1.5 + 0.02 && !/shroud|air/.test(a.what) || a.tip > -2.12 + 0.02 && /shroud|air/.test(a.what));
  deep.length ? fail(`arms reaching into the vehicle: ${deep.map((a) => a.what + " to z " + a.tip.toFixed(2)).join("; ")}`) : ok(`all ${arms.length} umbilical arms stop at the stage skin`);

  // ---------- staging: a stage lit in flight climbs until its whole plume clears what it leaves ----------
  console.log("\nStaging");
  for (const [g, item] of [["SRM", "lSRM"], ["S1", "lS1"], ["S2", "lS2"], ["CEN", "lCEN"], ["PM", "lPM"]]) {
    const r = await page.evaluate(([g, item]) => {
      const V = window.VOYAGER, T = V.THREE;
      V.selectItem(item); V.setExplode(true); V.warp(4); V.ignite(); V.warp(5);
      const box = (k) => { const b = new T.Box3(); for (const m of V.MODS[k].meshes) { m.updateWorldMatrix(true, false); const bb = m.geometry.boundingBox || (m.geometry.computeBoundingBox(), m.geometry.boundingBox); b.union(bb.clone().applyMatrix4(m.matrixWorld)); } return b; };
      const lv = V.GROUP_LV[g]; let exit = Infinity, below = 0;
      for (const k in V.STACK_LV) { const b = box(k); if (V.STACK_LV[k] === lv) exit = Math.min(exit, b.min.y); else if (V.STACK_LV[k] < lv && Math.abs(b.getCenter(new T.Vector3()).x) < 1) below = Math.max(below, b.max.y); }
      const out = { running: V.C.running && V.C.explode, explode: V.C.explode, gap: exit - below, len: V.GROUPS[g].plume.len };
      V.shutdown(); V.warp(4); return out;
    }, [g, item]);
    if (!r.running) fail(`${g}: did not ignite`);
    else if (r.gap < r.len) fail(`${g}: plume ${r.len} m but only ${r.gap.toFixed(1)} m clear below`);
    else ok(`${g}: climbs until ${r.gap.toFixed(1)} m clear for a ${r.len} m plume`);
  }
  const srm = await page.evaluate(() => { const V = window.VOYAGER; V.selectItem("stack"); V.setExplode(false); V.warp(4); V.selectItem("lSRM"); V.ignite(); V.warp(4); const r = { explode: V.C.explode, running: V.C.running }; V.shutdown(); V.warp(4); return r; });
  srm.running && !srm.explode ? ok("stacked, the solids light on the pad without taking it apart") : fail(`solids on the pad: running ${srm.running}, taken apart ${srm.explode}`);

  // ---------- pad exhaust stays on the pad ----------
  const pad = await page.evaluate(() => window.VOYAGER.padExhaust?.() ?? null);
  if (pad) pad.ok ? ok(`pad exhaust: ${pad.msg}`) : fail(`pad exhaust: ${pad.msg}`);

  // ---------- live numbers tick ----------
  console.log("\nLive numbers");
  await page.evaluate(() => document.querySelector("#now").scrollIntoView({ block: "center" }));
  await page.waitForFunction(() => { const b = document.querySelector("#now b"); const v = b && b.textContent; const ok = window.__nowPrev && v !== window.__nowPrev; window.__nowPrev = v; return ok; }, null, { timeout: 90000, polling: 500 }).catch(() => {});
  const t0 = await page.evaluate(() => [...document.querySelectorAll("#now b")].map((b) => b.textContent));
  await page.waitForTimeout(2500);
  const t1 = await page.evaluate(() => [...document.querySelectorAll("#now b")].map((b) => b.textContent));
  const still = t0.filter((v, i) => v === t1[i]);
  still.length ? fail(`not ticking: ${still.join(" | ")}`) : ok(`all ${t0.length} live figures changed within 2.5 s`);

  // ---------- end-of-mission fail-safe ----------
  console.log("\nMission-status fail-safe");
  const fs_ = await page.evaluate(() => {
    const { applyStatus, J } = window.VOYAGER;
    applyStatus({ checked: "2030-01-02", source: "test", V1: { state: "ended", since: "2029-12-01", lastContact: "2029-11-28" }, V2: { state: "silent", lastContact: "2029-06-10" }, instruments: { iMAG: ["on", "2029-01-15"] } });
    const strip = document.querySelector("#mstatus").textContent, now = [...document.querySelectorAll("#now span")].map((s) => s.textContent).join(" | ");
    const mag = [...document.querySelector('#insTable tr[data-item="iMAG"]').querySelectorAll("td.st")].map((t) => t.textContent);
    const anyOnV1 = [...document.querySelectorAll("#insTable tr[data-item]")].some((r) => r.querySelectorAll("td.st")[0]?.textContent === "On");
    const craft = J.craft?.V1?.querySelector("span")?.textContent;
    applyStatus({ checked: "2026-10-28", source: "NASA Voyager mission status, 15 Oct 2026", V1: { state: "operating" }, V2: { state: "operating" }, instruments: {} });
    return { strip, now, mag, anyOnV1, craft };
  });
  (fs_.strip.includes("Voyager 1 · Mission ended") && fs_.strip.includes("Voyager 2 · Silent")) ? ok("status strip switches to ended / silent") : fail(`status strip: ${fs_.strip}`);
  fs_.now.includes("Voyager 1 · time since last contact") ? ok("live section counts time since last contact") : fail(`live labels: ${fs_.now}`);
  (!fs_.anyOnV1 && fs_.mag[1].startsWith("off")) ? ok("instruments table switches off with the mission") : fail(`instruments: anyOnV1 ${fs_.anyOnV1}, MAG ${fs_.mag}`);
  /ended/.test(fs_.craft || "") ? ok("journey label marks the probe") : fail(`craft label: ${fs_.craft}`);

  if (errors.length) fail(`console errors: ${[...new Set(errors)].slice(0, 6).join(" | ")}`);
  else ok("no console errors");
  await browser.close();
  console.log(`\n${fails.length ? fails.length + " problem(s)" : "All checks passed"}`);
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
