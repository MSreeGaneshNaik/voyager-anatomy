// Headless check: serves dist/voyager.html, maps the three.js CDN to node_modules,
// runs a list of actions and saves screenshots + console output.
// usage: node scripts/shot.mjs out-prefix '[["wait",3000],["eval","VOYAGER.selectItem(\"stack\"); VOYAGER.ignite()"],["el","fire","#fig"]]' [--w=1280] [--h=1400] [--dpr=2] [--dark] [--mobile] [--noaa]
import { chromium } from "playwright";
import { readFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));

const args = process.argv.slice(2);
const prefix = args[0] || "shot";
const actions = JSON.parse(args[1] || '[["wait",4000],["shot","main"]]');
const opt = Object.fromEntries(args.slice(2).filter(a => a.startsWith("--")).map(a => { const [k, v] = a.slice(2).split("="); return [k, v ?? true]; }));
const W = +(opt.w || 1280), H = +(opt.h || 1400);
mkdirSync(root + "shots", { recursive: true });

// SwiftShader: software WebGL, so it runs the same on any machine, GPU or not
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--enable-webgl"] });
const ctx = await browser.newContext({
  viewport: { width: opt.mobile ? 390 : W, height: opt.mobile ? 844 : H },
  deviceScaleFactor: +(opt.dpr || 1),
  colorScheme: opt.dark ? "dark" : "light",
});
const page = await ctx.newPage();
if (opt.noaa) await page.addInitScript(() => { try { localStorage.setItem("voyager-aa", "0"); } catch (e) {} });
const logs = [];
page.on("console", (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on("pageerror", (e) => logs.push(`[pageerror] ${e.message}`));

await page.route("**/*", async (route) => {
  const url = route.request().url();
  if (url.startsWith("https://local.test/")) {
    return route.fulfill({ status: 200, contentType: "text/html", body: readFileSync(root + "dist/voyager.html", "utf8") });
  }
  const m = url.match(/cdn\.jsdelivr\.net\/npm\/three@[\d.]+\/(.*)$/);
  if (m) {
    return route.fulfill({ status: 200, contentType: "application/javascript", headers: { "access-control-allow-origin": "*" }, body: readFileSync(root + "node_modules/three/" + m[1]) });
  }
  if (/fonts\.(googleapis|gstatic)\.com/.test(url)) return route.fulfill({ status: 200, contentType: "text/css", body: "" });
  return route.continue();
});

await page.goto("https://local.test/index.html");
for (const [kind, a, b] of actions) {
  if (kind === "wait") await page.waitForTimeout(a);
  else if (kind === "eval") { const r = await page.evaluate(a); if (r !== undefined) logs.push(`[eval] ${JSON.stringify(r)}`); }
  else if (kind === "shot") await page.screenshot({ path: `${root}shots/${prefix}-${a}.png`, fullPage: !!b, timeout: 180000 });
  else if (kind === "el") { const bb = await page.evaluate((sel) => { const r = document.querySelector(sel).getBoundingClientRect(); return { x: r.x, y: r.y + window.scrollY, width: r.width, height: r.height }; }, b || "#fig"); await page.screenshot({ path: `${root}shots/${prefix}-${a}.png`, clip: bb, fullPage: true, timeout: 120000 }); }
  else if (kind === "clip") await page.screenshot({ path: `${root}shots/${prefix}-${a}.png`, clip: b, timeout: 180000 });
  else if (kind === "move") await page.mouse.move(a, b);
  else if (kind === "click") await page.mouse.click(a, b);
  else if (kind === "drag") { const [x1, y1, x2, y2, btn] = a; await page.mouse.move(x1, y1); await page.mouse.down({ button: btn || "left" }); await page.mouse.move(x2, y2, { steps: 10 }); await page.mouse.up({ button: btn || "left" }); }
  else if (kind === "wheel") { await page.mouse.move(a[0], a[1]); await page.mouse.wheel(0, a[2]); }
}
console.log(logs.slice(0, 60).join("\n"));
await browser.close();
