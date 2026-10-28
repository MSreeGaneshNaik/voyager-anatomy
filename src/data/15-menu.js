// ============================================================================
// 15 · PARTS INDEX — sections of items; each item frames some parts of one
// display (or the launch stack) and opens a sheet under the figure.
// ============================================================================
const MENU = [], MENU_ITEMS = {}, MOD_TO_ITEM = {};
function addMenu(title, items) {
  MENU.push([title, items]);
  for (const [id, label, o] of items) MENU_ITEMS[id] = { id, label, mods: [], ...o };
}
// a click on a part opens the most specific item that holds it
const MOD_TO_ITEM_EXTRA = {};   // parts that open an item without being framed by it
function indexMods() {
  Object.assign(MOD_TO_ITEM, MOD_TO_ITEM_EXTRA);
  const by = {};
  for (const it of Object.values(MENU_ITEMS)) for (const k of it.mods || []) if (!by[k] || by[k].mods.length > it.mods.length) by[k] = it;
  for (const k in by) MOD_TO_ITEM[k] = by[k].id;
}
const dv = (s) => "dV." + s;
const BAYS = Array.from({ length: 10 }, (_, k) => dv("bay" + k));
addMenu("Voyager", [
  ["whole", "Whole spacecraft", { show: "dV", root: true, info: ["dV"] }],
  ["hga", "High-gain antenna", { show: "dV", mods: [dv("hga")] }],
  ["bus", "Bus and electronics bays", { show: "dV", mods: [dv("frame"), ...BAYS], info: [dv("frame"), "dV.bay0"] }],
  ["tank", "Hydrazine tank", { show: "dV", mods: [dv("tank")], apart: true }],
  ["thr", "Thrusters", { show: "dV", mods: [dv("thr")] }],
  ["rtg", "RTGs and their boom", { show: "dV", mods: [dv("rtgBoom"), dv("rtg0"), dv("rtg1"), dv("rtg2")], info: [dv("rtg0"), dv("rtgBoom")] }],
  ["sci", "Science boom", { show: "dV", mods: [dv("sci"), dv("crs"), dv("lecp"), dv("pls")], info: [dv("sci")] }],
  ["scan", "Scan platform", { show: "dV", mods: [dv("scan"), dv("iss"), dv("iris"), dv("uvs"), dv("pps")], info: [dv("scan")] }],
  ["mag", "Magnetometer boom", { show: "dV", mods: [dv("mag")] }],
  ["pra", "Radio and plasma-wave antennas", { show: "dV", mods: [dv("pra")] }],
]);
addMenu("Instruments", INSTRUMENTS.map((i) => [i.id, i.short, { show: "dV", mods: i.mods.map(dv), info: [i.id] }]));
