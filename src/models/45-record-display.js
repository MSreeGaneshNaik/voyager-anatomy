// ============================================================================
// 45 · THE GOLDEN RECORD, CLOSE UP — the disc and its cover side by side at full
// size, drawn from NASA's photographs of the flight record and cover:
//   Side 1 / Side 2 label: "THE SOUNDS OF EARTH" over a photograph of Earth,
//   "Side 1", "NASA", "UNITED STATES OF AMERICA", "PLANET EARTH";
//   hand-etched in the run-out: "TO THE MAKERS OF MUSIC – ALL WORLDS, ALL TIMES".
// Record 12 in (30.48 cm), label 4 in, run-out to ≈ 0.48 of the radius.
// ============================================================================
const REC = { R: 0.1524, rLabel: 0.3333, rRunout: 0.482, coverR: 0.165 };

// the label's photograph of Earth, made once: cloud banks swirled over darker ocean and land
let EARTH_LABEL = null;
function earthLabel() {
  if (EARTH_LABEL) return EARTH_LABEL;
  const W = 512, cv = document.createElement("canvas"); cv.width = cv.height = W;
  const x2 = cv.getContext("2d"), img = x2.createImageData(W, W);
  const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
  const vnoise = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    return (hash(xi, yi) * (1 - u) + hash(xi + 1, yi) * u) * (1 - v) + (hash(xi, yi + 1) * (1 - u) + hash(xi + 1, yi + 1) * u) * v; };
  const fbm = (x, y) => { let a = 0, f = 1, s = 0.5; for (let k = 0; k < 5; k++) { a += vnoise(x * f, y * f) * s; f *= 2.03; s *= 0.5; } return a; };
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
    const dx = (x - W / 2) / (W / 2), dy = (y - W / 2) / (W / 2); if (Math.hypot(dx, dy) > 1) continue;
    const sx = dx * 4.2, sy = dy * 4.2, sw = fbm(sx + 3.1, sy - 1.7);
    const cloud = smooth(0.46, 0.68, fbm(sx + sw * 2.2, sy - sw * 1.6));
    const land = smooth(0.52, 0.6, fbm(sx * 0.7 + 9, sy * 0.7 + 4)) * (1 - cloud);
    const i = (y * W + x) * 4;
    img.data[i] = Math.round(255 * Math.min(0.85, (1 - cloud) * (0.55 + land * 0.25)));   // paint: the dark of ocean and land
    img.data[i + 2] = 255; img.data[i + 3] = 255;                                         // alt: the label's silver
  }
  x2.putImageData(img, 0, 0);
  return (EARTH_LABEL = cv);
}

// one face of the record: grooves in bands, the dark run-out with its etched line, the label
function recordSideTex(side) {
  const N = COARSE ? 2048 : 4096, c = N / 2;
  return TEX(N, N, (P) => {
    const g = P.g, px = (r) => r * c;
    // grooves: one ring every 1.5 px, with the darker gaps between bands of selections
    g.lineWidth = 1;
    for (let r = REC.rRunout + 0.006; r < 0.986; r += 1.5 / c) { g.strokeStyle = "rgba(0,255,0,0.13)"; g.beginPath(); g.arc(c, c, px(r), 0, TAU); g.stroke(); }
    const rnd = mulberry(side * 7 + 3);
    let r = REC.rRunout + 0.02;
    while (r < 0.95) { r += 0.03 + rnd() * 0.05; if (r > 0.96) break; g.strokeStyle = "rgba(0,255,0,0.42)"; g.lineWidth = 2.2 * N / 4096 * 2; g.beginPath(); g.arc(c, c, px(r), 0, TAU); g.stroke(); }
    g.lineWidth = 3 * N / 2048; g.strokeStyle = "rgba(0,255,0,0.75)";
    for (const rr of [0.992, REC.rRunout, REC.rLabel]) { g.beginPath(); g.arc(c, c, px(rr), 0, TAU); g.stroke(); }
    // the run-out: dark, with the inscription scratched through to the metal
    const off = document.createElement("canvas"); off.width = off.height = N; const o = off.getContext("2d");
    o.fillStyle = "rgba(255,0,0,0.92)"; o.beginPath(); o.arc(c, c, px(REC.rRunout), 0, TAU); o.arc(c, c, px(REC.rLabel), 0, TAU, true); o.fill();
    o.globalCompositeOperation = "destination-out";
    const text = "TO THE MAKERS OF MUSIC – ALL WORLDS, ALL TIMES", rT = px((REC.rLabel + REC.rRunout) / 2 - 0.012), fs = N * 0.0215;
    o.font = `italic 500 ${fs}px "Helvetica Neue", Arial, sans-serif`; o.textAlign = "center"; o.textBaseline = "middle";
    const widths = [...text].map((ch) => o.measureText(ch).width * 1.06), total = widths.reduce((a, b) => a + b, 0);
    let phi = Math.PI / 2 + total / rT / 2;                     // centred on the bottom, read left to right, tops to the centre
    const wob = mulberry(11);
    [...text].forEach((ch, i) => {
      phi -= widths[i] / rT / 2;
      o.save(); o.translate(c + Math.cos(phi) * rT, c + Math.sin(phi) * rT); o.rotate(phi - Math.PI / 2 + (wob() - 0.5) * 0.05);   // by hand: a little uneven
      o.fillText(ch, 0, (wob() - 0.5) * fs * 0.08); o.restore();
      phi -= widths[i] / rT / 2;
    });
    o.globalCompositeOperation = "source-over";
    g.drawImage(off, 0, 0);
    // the label: a photograph of Earth, clouds over oceans and land
    const L = px(REC.rLabel);
    g.globalCompositeOperation = "lighter"; g.drawImage(earthLabel(), c - L, c - L, 2 * L, 2 * L);
    // the title, arched and tilted as printed
    const ink = (a) => { g.fillStyle = `rgba(0,255,0,${a})`; g.strokeStyle = `rgba(0,255,0,${a})`; };
    const arcWord = (word, R, size, weight = 700) => {
      g.save(); g.translate(c, c); g.rotate(9 * DEG); g.translate(0, 0.9 * L);
      g.font = `${weight} ${size}px Georgia, "Times New Roman", serif`; g.textAlign = "center"; g.textBaseline = "alphabetic";
      const ws = [...word].map((ch) => g.measureText(ch).width + size * 0.12), tot = ws.reduce((a, b) => a + b, 0);
      let a = -Math.PI / 2 - tot / (R * L) / 2;
      [...word].forEach((ch, i) => { a += ws[i] / (R * L) / 2; g.save(); g.translate(Math.cos(a) * R * L, Math.sin(a) * R * L); g.rotate(a + Math.PI / 2);
        ink(0.95); g.lineWidth = size * 0.07; g.strokeText(ch, 0, 0); ink(0.35); g.fillText(ch, 0, 0); g.restore(); a += ws[i] / (R * L) / 2; });
      g.restore();
    };
    arcWord("THE", 1.66, L * 0.13); arcWord("SOUNDS", 1.47, L * 0.2); arcWord("OF", 1.29, L * 0.12); arcWord("EARTH", 1.1, L * 0.2);
    // the line under it: side, the agency, the sender
    g.textAlign = "center"; g.textBaseline = "middle";
    ink(0.95); g.font = `400 ${L * 0.07}px "Helvetica Neue", Arial, sans-serif`; g.fillText(`Side ${side}`, c, c + L * 0.36);
    g.font = `800 italic ${L * 0.075}px "Helvetica Neue", Arial, sans-serif`; g.fillText("NASA", c, c + L * 0.46);
    g.font = `800 ${L * 0.088}px "Helvetica Neue", Arial, sans-serif`; g.fillText("UNITED STATES OF AMERICA", c, c + L * 0.6);
    g.font = `800 ${L * 0.105}px "Helvetica Neue", Arial, sans-serif`; g.fillText("PLANET EARTH", c, c + L * 0.73);
    // spindle hole
    g.strokeStyle = "rgba(0,255,0,0.9)"; g.lineWidth = 3 * N / 2048; g.beginPath(); g.arc(c, c, px(0.024), 0, TAU); g.stroke();
  }, { wrap: false, aniso: 16 });
}

function buildRecordDisplay() {
  const K = "dRecord";
  showItem(K, { name: "The Golden Record", by: "NASA · JPL · selected by a committee chaired by Carl Sagan", desc: "The record and its cover at full size: a 12-inch gold-plated copper disc and the aluminium cover that faces out from the spacecraft's side.", kv: [["Record", "30.48 cm · 12 in"], ["Cover", "≈ 33 cm"], ["Speed", "16⅔ rpm"]] },
    { az: -10 * DEG, el: 6 * DEG });
  SHOW[K].hMin = 0.004;   // close enough to read the etching
  T.recordSide1 = lazyTex(() => recordSideTex(1)); T.recordSide2 = lazyTex(() => recordSideTex(2));
  const fill = () => { for (const t of [T.recordSide1, T.recordSide2, T.recordCoverHi]) t.userData.fill(); };
  const xRec = -0.19, xCov = 0.2, y0 = 0.02;
  // the record: gold faces on a copper-edged disc
  const rec = asm(K, "disc", "Golden Record · the disc", "Gold-plated copper, 12 inches across, cut on both sides to play at 16⅔ rpm from the outside in. Side 1 faces you; take it apart to turn it over.", [-0.16, 0, 0.05],
    [["Diameter", "30.48 cm · 12 in"], ["Metal", "copper, nickel- and gold-plated"], ["Speed", "16⅔ rpm"], ["Per side", "53–54 min"]]);
  within(rec, (g0) => {
    const g = new THREE.Group(); g.position.set(xRec, y0, 0); g0.add(g); RECG.disc = g;
    add(g, new THREE.CylinderGeometry(REC.R, REC.R, 0.0024, 160, 1, true).rotateX(Math.PI / 2), "gold", { rim: 0.4 });
    add(g, new THREE.CircleGeometry(REC.R, 192).translate(0, 0, 0.0012), "gold", { map: T.recordSide1, alt: "silver", inkA: 0.95, rim: 0.2 });
    add(g, new THREE.CircleGeometry(REC.R, 192).rotateY(Math.PI).translate(0, 0, -0.0012), "gold", { map: T.recordSide2, alt: "silver", inkA: 0.95, rim: 0.2 });
  });
  // the cover: the same engraved part as on the bus, at full resolution
  const cov = asm(K, "cover", "Golden Record · the cover", PARTINFO.cover.desc, [0.16, 0, 0.05], PARTINFO.cover.kv);
  within(cov, (g0) => {
    const g = new THREE.Group(); g.position.set(xCov, y0, 0); g0.add(g); RECG.cover = g;
    add(g, new THREE.CylinderGeometry(REC.coverR, REC.coverR, 0.006, 192).rotateY(Math.PI).rotateX(Math.PI / 2), "gold", { map: T.recordCoverHi, inkA: 0.95, rim: 0.25 });
    const B = bulk(); B.add(torusGeo(REC.coverR, 0.0025, 192).rotateX(Math.PI / 2).translate(0, 0, 0.003), "gold"); B.flush(g);
  });
  // the cartridge and stylus packed with each record
  const cart = asm(K, "cart", "Cartridge and stylus", "Packed beside each record, so whoever finds it has the means to play it as the cover shows: stylus set in the outer groove, played from the outside in.", [0, -0.12, 0.08],
    [["Packed", "one with each record"]]);
  within(cart, (g0) => {
    const g = new THREE.Group(); g.position.set(0.005, -0.15, 0.02); g0.add(g);
    const B = bulk();
    B.add(boxGeo(0.018, 0.026, 0.013), "silver"); B.add(boxGeo(0.02, 0.004, 0.015, 0, 0.015, 0), "grey");
    B.add(boxGeo(0.006, 0.004, 0.004, 0, -0.015, 0.003), "grey");
    B.add(rodGeo(V3(0, -0.017, 0.004), V3(0, -0.021, 0.006), 0.0004, 6), "dark");
    for (const x of [-0.006, -0.002, 0.002, 0.006]) B.add(rodGeo(V3(x, 0.017, -0.004), V3(x, 0.02, -0.004), 0.0006, 6), "gold");
    B.flush(g);
  });
  SHOW[K].frameApartSkip = [];
  // taken apart, the disc turns over to show Side 2
  FRAME_HOOKS.push((dt, sh) => { if (sh === K) RECG.disc.rotation.y = Math.PI * ease(C.sxAmt); });
  // places to read up close: the four corners of the cover, the label and the run-out
  const coverAt = (x, y, h) => () => { const c = RECG.cover.getWorldPosition(V3()); return new THREE.Box3().setFromCenterAndSize(V3(c.x + x * REC.coverR, c.y - y * REC.coverR, c.z), V3(h * REC.coverR, h * REC.coverR, 0.01)); };
  const recAt = (x, y, h) => () => { const c = RECG.disc.getWorldPosition(V3()); return new THREE.Box3().setFromCenterAndSize(V3(c.x + x * REC.R, c.y + y * REC.R, c.z), V3(h * REC.R, h * REC.R, 0.01)); };
  const parts = {
    howto: ["Cover · how to play it", "The record seen from above, its stylus set at the start: it plays from the outside in. The binary round it is one turn, 3.6 s, counted in the hydrogen unit of 0.70 billionths of a second. The side view below carries the playing time of one side in binary: between 53 and 54 minutes.", coverAt(-0.47, -0.32, 0.72)],
    pictures: ["Cover · how to see the pictures", "How to rebuild the images: the signal that starts a picture; picture lines 1, 2 and 3 in binary, each about 8 ms long; the lines drawn vertically and interlaced; 512 (2⁹) lines to a picture; and the first picture, a circle, to check the decoding and the picture's proportions.", coverAt(0.33, -0.3, 0.8)],
    pulsars: ["Cover · the pulsar map", "Where the Sun is, as directions and distances to 14 pulsars. Each line's binary is that pulsar's period in hydrogen time units; periods slow with age, so the map also dates the launch. The long line runs to the centre of the Galaxy. The same map flew on Pioneer 10 and 11.", coverAt(-0.2, 0.38, 0.85)],
    hydrogen: ["Cover · hydrogen, the unit", "Hydrogen in its two lowest states, the electron's spin flipped from one to the other, joined by a line and the digit 1. That transition, 0.70 billionths of a second, is the unit of every number on the cover.", coverAt(0.37, 0.71, 0.38)],
    label: ["Record · the label", "Side 1: \"The Sounds of Earth\" over a photograph of Earth, then \"Side 1\", \"NASA\", \"United States of America\" and \"Planet Earth\". Side 2 is labelled the same.", recAt(0, 0, 0.72)],
    runout: ["Record · the inscription", "Hand-etched in the run-out between the label and the grooves: \"To the makers of music – all worlds, all times.\" The record was at first turned down for the addition; Carl Sagan got it accepted.", recAt(0, -0.27, 0.62)],
  };
  for (const [id, [name, desc]] of Object.entries(parts)) MODULES["rec_" + id] = { name, desc, kv: [] };
  RECORD_ITEMS.push(["record", "Record and cover", { show: K, root: true, info: [K], onSelect: fill }]);
  for (const [id, [name, , box]] of Object.entries(parts)) RECORD_ITEMS.push(["rec_" + id, name, { show: K, mods: [], box, info: ["rec_" + id], onSelect: fill }]);
  RECORD_ITEMS.push(["rec_cart", "Cartridge and stylus", { show: K, mods: [cart], onSelect: fill }]);
  RECORD_ITEMS.push(["rec_bus", "Where it rides on Voyager", { show: "dV", mods: [dv("cover"), dv("record")], info: [dv("record"), dv("cover")] }]);
}
const RECORD_ITEMS = [], RECG = {};
