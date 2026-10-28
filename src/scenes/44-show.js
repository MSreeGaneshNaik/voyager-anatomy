// ============================================================================
// 44 · DISPLAYS — every subject stands on its own, well away from the others;
// only the selected display is drawn. Assemblies of a display separate along
// their own vectors when it is taken apart.
// ============================================================================
const SHOW = {};        // display key → { group, asm: [{ key, group, ex }], fx: [], view, sphere }
const SHOW_ROOT = new Set();
const SHOW_X = { dV: 400, dRecord: 470, dLineup: 520, jMap: 0 };
function showItem(key, info, view) {
  const g = mod(key); g.position.set(SHOW_X[key] ?? 0, 0, 0); g.visible = false;
  SHOW[key] = { key, group: g, asm: [], fx: [], info, view };
  MODULES[key] = { name: info.name, desc: info.desc, by: info.by, kv: info.kv || [] };
  SHOW_ROOT.add(g);
  return g;
}
function asm(item, sub, name, desc, ex, kv = [], parent) {
  const key = `${item}.${sub}`, g = mod(key, parent || SHOW[item].group);
  MODULES[key] = { name, desc, kv, short: name };
  SHOW[item].asm.push({ key, group: g, ex: V3(...ex) });
  return key;
}
const _bc = new THREE.Vector3();
function boxCorners(o, fn) {
  const b = o.geometry.boundingBox || (o.geometry.computeBoundingBox(), o.geometry.boundingBox);
  for (let i = 0; i < 8; i++) fn(_bc.set(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z).applyMatrix4(o.matrixWorld));
}
const SHOW_CAPS = {
  dV: "Voyager as it flies: the high-gain antenna on Earth, the science boom and scan platform on one side, the three RTGs on the other, the magnetometer boom reaching 13 m out and the radio antennas trailing below. Both probes are this spacecraft. Hover any part to name it; Take apart opens the bus and spreads every assembly.",
};
function buildShowroom() {
  showItem("dV", { name: "Voyager spacecraft", by: "Jet Propulsion Laboratory · Pasadena", desc: "The spacecraft that flew as Voyager 1 and Voyager 2: identical twins, launched sixteen days apart in 1977.", kv: [] }, { az: -28 * DEG, el: 24 * DEG });
  buildVoyager("dV");
  SHOW.dV.frameApartSkip = ["dV.mag", "dV.pra"];
  MODULES.dV.kv = [["Flown", "Voyager 1 · Voyager 2"], ["Mission module", "825 kg"], ["Power at launch", "≈470 W"]];
  buildRecordDisplay();
  addMenu("Golden Record", RECORD_ITEMS); MENU.splice(2, 0, MENU.pop());
  // bounding sphere of each display, with room for its taken-apart layout, for a tight camera depth range
  SCENE.updateMatrixWorld(true);
  const bx = new THREE.Box3();
  for (const k in SHOW) {
    if (SHOW[k].journey) continue;
    bx.makeEmpty();
    SHOW[k].group.traverse((o) => { if (o.isMesh && !o.isInstancedMesh) boxCorners(o, (p) => bx.expandByPoint(p)); else if (o.isInstancedMesh) { o.computeBoundingBox?.(); if (o.boundingBox) bx.union(o.boundingBox.clone().applyMatrix4(o.matrixWorld)); } });
    const ex = SHOW[k].asm.reduce((m, a) => Math.max(m, a.ex.length()), 0);
    SHOW[k].sphere = bx.getBoundingSphere(new THREE.Sphere());
    SHOW[k].sphere.radius += ex * 2 + 2;
  }
}
const curShow = () => MENU_ITEMS[C.sel]?.show || null;
