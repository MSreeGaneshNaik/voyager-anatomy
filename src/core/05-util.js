// ============================================================================
// 05 · SHARED HELPERS — DOM shortcuts, number formatting, seeded random,
// stripe textures. (Everything is concatenated into one module script.)
// ============================================================================
const $ = (s) => document.querySelector(s);
const el = (tag, attrs = {}, html = "") => { const e = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); if (html) e.innerHTML = html; return e; };
const fmt = (n, d = 0) => n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const T = {};   // canvas textures, built at boot
function stripesTex(cols, a = 0.45, lw = 1.4, w = 1024, h = 512, extra) {
  return TEX(w, h, (P) => { for (let i = 0; i < cols; i++) P.vline((i + 0.5) / cols, a, lw); if (extra) extra(P); });
}
// write to the DOM only when a value actually changes, so an idle page does no layout or paint work
const _put = new WeakMap();
function put(e, key, val) {
  if (!e) return;
  let m = _put.get(e); if (!m) _put.set(e, (m = {}));
  if (m[key] === val) return;
  m[key] = val;
  if (key === "html") e.innerHTML = val; else if (key === "text") e.textContent = val; else if (key === "class") e.className = val;
  else if (key[0] === "@") e.setAttribute(key.slice(1), val); else e.style[key] = val;
}
const kvHTML = (rows) => rows.map(([a, b, c]) => `<dt>${a}</dt><dd${c ? ` class="${c}"` : ""}>${b}</dd>`).join("");
