// ============================================================================
// 70 · MAIN — build, pick, loop
// ============================================================================
let camera;
const _sc = new THREE.Vector3();
let STACK_SPHERE = new THREE.Sphere(new THREE.Vector3(0, 25, 0), 70);   // replaced by the launch stack's own bounds
const _dynS = new THREE.Sphere();
const PICK = [];
const HI = {};

const BOOT_T0 = performance.now();
function boot() {
  const B0 = performance.now();
  readPalette();
  const canvas = $("#cv");
  try { const fp = localStorage.getItem("voyager-free"); CAM.free = fp === null ? matchMedia("(pointer: fine)").matches : fp === "1"; } catch (e) { CAM.free = matchMedia("(pointer: fine)").matches; }
  try { PIPE.init(canvas); let aa = "1"; try { aa = localStorage.getItem("voyager-aa") ?? "1"; } catch (e) {} if (aa === "0") PIPE.setAA(false); }
  catch (e) { $("#fig").insertAdjacentHTML("beforeend", `<div class="nogl">This drawing needs WebGL, which this browser has turned off. The specification sheets below still hold every figure.</div>`); try { buildSheets(); } catch (e2) {} return; }
  const BT = {}, tm = (k, f) => { const t = performance.now(); f(); BT[k] = Math.round(performance.now() - t); };
  tm("textures", () => { buildVoyagerTextures(); buildShowTextures(); });
  tm("stack", () => { if (typeof buildStack === "function") buildStack(); });
  tm("showroom", () => buildShowroom());
  journeyShell();
  indexMods();
  window.VOYAGER_BOOT = BT;
  { const seen = new Set(); for (const k in MODS) for (const m of MODS[k].meshes) if (!seen.has(m)) { seen.add(m); PICK.push(m); } }
  for (const set of Object.values(ENGINE_SETS)) for (const e of set) ENGINE_FX.add(e.fx);
  camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 6000);
  const v0 = SHOW[curShow()]?.view; if (v0) { CAM.az = v0.az; CAM.el = v0.el; }
  CAM.snap = true;
  { const t = performance.now(); buildUI(); window.VOYAGER_BOOT.ui = Math.round(performance.now() - t); window.VOYAGER_BOOT.start = Math.round(B0); }

  const fig = $("#fig");
  const resize = () => {
    const r = fig.getBoundingClientRect();
    PIPE.resize(Math.max(1, Math.round(r.width)), Math.max(1, Math.round(r.height)), Math.min(window.devicePixelRatio || 1, 3));
    UI.sync?.(); CAM.snap = !CAM.user;
  };
  new ResizeObserver(resize).observe(fig); resize();
  matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`).addEventListener?.("change", resize);

  // theme
  const retheme = () => { readPalette(); ALL_MATS.forEach(applyRole); FX_LIST.forEach(applyFXColors); };
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", retheme);
  new MutationObserver(retheme).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "class", "style"] });

  // picking
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let pending = null;
  const ndcOf = (ev) => { const r = canvas.getBoundingClientRect(); return new THREE.Vector2(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1); };
  const pick = (ev) => { ndc.copy(ndcOf(ev)); ray.setFromCamera(ndc, camera); const hits = ray.intersectObjects(PICK.filter((m) => isShown(m)), false); return hits[0]?.object || null; };
  canvas.addEventListener("pointermove", (ev) => { pending = ev; });
  const ptrs = new Map(); let dragged = 0, lastPinch = null;
  const onMove = (ev) => {
    const p = ptrs.get(ev.pointerId); if (!p) return;
    const dx = ev.clientX - p.x, dy = ev.clientY - p.y; p.x = ev.clientX; p.y = ev.clientY;
    dragged += Math.abs(dx) + Math.abs(dy);
    if (dragged < 3) return;
    ev.preventDefault();
    if (ptrs.size >= 2) {
      const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      if (lastPinch) { panBy(mx - lastPinch.x, my - lastPinch.y); if (d > 0 && lastPinch.d > 0) zoomBy(lastPinch.d / d, ndcOf({ clientX: mx, clientY: my })); }
      lastPinch = { d, x: mx, y: my }; return;
    }
    const pan = CAM.dragMode === "pan" ? !(p.shift || ev.shiftKey) : (p.b === 1 || p.b === 2 || p.shift || ev.shiftKey);
    if (pan) panBy(dx, dy); else orbitBy(dx, dy);
    canvas.classList.add("dragging");
  };
  const onUp = (ev) => {
    ptrs.delete(ev.pointerId); if (ptrs.size < 2) lastPinch = null;
    if (!ptrs.size) { canvas.classList.remove("dragging"); window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); window.removeEventListener("pointercancel", onUp); }
  };
  canvas.addEventListener("pointerdown", (ev) => {
    if (!CAM.free) { if (ev.pointerType !== "touch") fig.focus({ preventScroll: true }); dragged = 0; return; }
    ev.preventDefault();
    fig.focus({ preventScroll: true });
    if (!ptrs.size) { window.addEventListener("pointermove", onMove, { passive: false }); window.addEventListener("pointerup", onUp); window.addEventListener("pointercancel", onUp); }
    ptrs.set(ev.pointerId, { x: ev.clientX, y: ev.clientY, b: ev.button, shift: ev.shiftKey });
    dragged = 0;
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; lastPinch = { d: Math.hypot(a.x - b.x, a.y - b.y), x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; }
  });
  canvas.addEventListener("dragstart", (ev) => ev.preventDefault());
  canvas.addEventListener("contextmenu", (ev) => { if (CAM.free) ev.preventDefault(); });
  canvas.addEventListener("wheel", (ev) => {
    if (!CAM.free && !ev.ctrlKey) return;
    ev.preventDefault();
    const k = ev.deltaMode === 1 ? 40 : ev.deltaMode === 2 ? 800 : 1;
    zoomBy(Math.exp(ev.deltaY * k * (ev.ctrlKey ? 0.01 : 0.0015)), ndcOf(ev));
  }, { passive: false });
  canvas.addEventListener("dblclick", () => { if (CAM.free) resetView(); });
  canvas.addEventListener("pointerleave", () => { pending = null; C.hover = null; setHotSpec(null); canvas.classList.remove("can-click"); });
  canvas.addEventListener("click", (ev) => {
    if (dragged > 4) return;
    const o = pick(ev); if (!o) return;
    const k = o.userData.mod, id = MOD_TO_ITEM[k] || (MENU_ITEMS[k] ? k : null);
    if (id) selectItem(id);
  });
  const doHover = () => {
    if (!pending) return;
    const o = pick(pending); pending = null;
    const key = o ? o.userData.mod : null;
    canvas.classList.toggle("can-click", !!o);
    if (key !== C.hover) { C.hover = key; setHotSpec(key); UI.tick(true); }
  };

  // loop — runs only while the figure is on screen
  let visible = true, last = performance.now(), lastSig = "";
  new IntersectionObserver((e) => { visible = e[0].isIntersecting; if (visible) { last = performance.now(); requestAnimationFrame(frame); } }, { threshold: 0.01 }).observe(fig);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) { last = performance.now(); requestAnimationFrame(frame); } });
  function frame(now) {
    if (!visible || document.hidden) return;
    FRAMES++;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    doHover();
    applyFrame(dt);
    const jBusy = journeyFrame(dt);
    const it = MENU_ITEMS[C.sel];
    for (const k in MODS) {
      const tgt = C.hover === k ? 1 : (it?.mods.includes(k) && !it.root ? 0.3 : 0);
      HI[k] = (HI[k] || 0) + (tgt - (HI[k] || 0)) * Math.min(1, dt * 10);
      if (HI[k] < 0.002 && tgt === 0) { if (HI[k] !== 0) { HI[k] = 0; MODS[k].mats.forEach((m) => (m.uniforms.uHi.value = 0)); } continue; }
      MODS[k].mats.forEach((m) => (m.uniforms.uHi.value = HI[k]));
    }
    // skip drawing when nothing on screen can have changed
    const moving = jBusy || CAM.keys.size > 0 || ANIMATING() || FX_LIST.some((f) => f.userData.level > 0.0005 || f.userData.target > 0);
    const sig = `${CAM.target.x.toFixed(4)},${CAM.target.y.toFixed(4)},${CAM.target.z.toFixed(4)},${CAM.h.toPrecision(6)},${C.exAmt.toFixed(4)},${C.sxAmt.toFixed(4)},${CAM.az.toFixed(4)},${CAM.el.toFixed(4)},${C.hover},${C.sel},${PIPE.w}x${PIPE.h},${Object.values(HI).map((v) => v.toFixed(3)).join("")},${PAL.bg.getHexString()}`;
    if (!moving && sig === lastSig) { UI.tick(); requestAnimationFrame(frame); return; }
    lastSig = sig;
    const aspect = PIPE.w / PIPE.h, h = CAM.h / 2;
    camera.top = h; camera.bottom = -h; camera.left = -h * aspect; camera.right = h * aspect;
    camBasis();
    // the depth range hugs whatever is on show, so depth stays precise on phone GPUs
    const show = SHOW[curShow()];
    const sph = show?.dynSphere ? _dynS.set(CAM.target, CAM.h * Math.max(aspect, 1) * 0.8 + CAM.h * 0.05) : show?.sphere || STACK_SPHERE;
    if (show?.dynSphere) sph.radius = Math.max(sph.radius, journeyDepth());
    const toC = _sc.copy(sph.center).sub(CAM.target).dot(CAM_DIR), K = toC + sph.radius * 1.05;
    camera.position.copy(CAM.target).addScaledVector(CAM_DIR, K);
    camera.near = sph.radius * 0.002; camera.far = sph.radius * 2.1;
    PIPE.dtFloor = show?.journey ? 0 : 0.03;
    camera.up.set(0, 1, 0);
    camera.lookAt(_sc.copy(camera.position).sub(CAM_DIR));
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    PIPE.render(SCENE, camera);
    journeyOverlay(camera);
    UI.tick();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  const idle = window.requestIdleCallback || ((f) => setTimeout(f, 1200));
  const warm = (o) => { const R = PIPE.renderer; R.extensions.has("KHR_parallel_shader_compile") ? R.compileAsync(o, camera) : R.compile(o, camera); };
  idle(() => { try { warm(SCENE); } catch (e) {} }, { timeout: 3000 });
  if (!COARSE) idle(() => { try { buildJourney(); } catch (e) { console.warn(e); } }, { timeout: 6000 });
  window.VOYAGER = { SHOW, MENU, MENU_ITEMS, MODS, C, CAM, J, THREE, GROUPS, STACK_LV, GROUP_LV, PAD, PIPE, padExhaust, applyStatus, MISSION, TOWER_ARMS, SCENE, PICK, isShown, selectItem, selectGroup, ignite, shutdown, setExplode, zoomBy, orbitBy, panBy, resetView, setAA: (on) => { PIPE.setAA(on); UI.sync(); }, get camera() { return camera; }, get frames() { return FRAMES; },
    project: (key) => { const c = boxOf([key]).getCenter(V3()).project(camera), r = canvas.getBoundingClientRect(); return { x: Math.round(r.left + (c.x + 1) / 2 * r.width), y: Math.round(r.top + (1 - c.y) / 2 * r.height) }; },
    warp: (sec) => { for (let t = 0; t < sec; t += 1 / 30) { applyFrame(1 / 30); journeyFrame(1 / 30); } UI.sync(); } };
}
// anything that moves on its own (the LECP stepper) keeps the loop drawing
const ANIM = new Set();
let FRAMES = 0;
const ANIMATING = () => ANIM.size > 0;
boot();
