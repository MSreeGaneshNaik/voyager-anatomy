// ============================================================================
// 40 · THE GOLDEN RECORD COVER — the engraving, drawn from its data: the
// fourteen pulsar codes and galactic longitudes (Johnston's transcription of
// the cover; Sagan, Sagan & Drake 1972), the hydrogen hyperfine diagram, the
// playing instructions and the picture-decoding diagrams. Positions and line
// lengths are measured from NASA's cover photo (± 1–2 % of the radius).
// Cover coordinates: origin at the centre hole, x right, y down, unit = radius.
// ============================================================================
const PULSARS = [   // [PSR, code, drawn l°, length (galactic-centre line = 100), broken]
  ["B1727−47", "1000110001111100100011011101010", 343.6, 29.9, 1], ["B1451−68", "10110010011000101011101101111", 312.4, 2, 0],
  ["B1240−64", "100000110110010110001001111000", 302.7, 54.6, 0], ["B0833−45", "111100011011011001010100111", 264.5, 15.5, 0],
  ["B0950+08", "10101011011001101100101000011", 229.4, 0.7, 0], ["B0823+26", "101100111011010101011110001011", 197.4, 2.3, 0],
  ["B0531+21", "10110011100000101010000010", 185.2, 19.5, 0], ["B0525+21", "100111101000110101000100111000100", 183.8, 12.4, 1],
  ["B0329+54", "111100011111100011111000010110", 145.8, 6.9, 1], ["B2217+47", "101101100101101001000010110001", 98.4, 10.8, 0],
  ["B2016+28", "101111001111001110011000001101", 68.2, 2.4, 0], ["B1933+16", "11110010111110001110100011110", 51.9, 39.9, 0],
  ["B1929+10", "10011001011010111010010111000", 47.4, 1.0, 0], ["B1642−03", "100000110100101010001110101100", 13.9, 7.8, 0],
];
function buildRecordTextures() {
  T.recordCover = coverTex(2048);                                         // on the bus
  T.recordCoverHi = lazyTex(() => coverTex(COARSE ? 2048 : 4096));       // the close-up, drawn when first shown
  T.recordGrooves = TEX(1024, 1024, (P) => { for (let r = 70; r < 505; r += 4) P.ring(0.5, 0.5, r, 0.12, 1); P.ring(0.5, 0.5, 120, 0.7, 2); P.ring(0.5, 0.5, 22, 0.8, 2); }, { wrap: false });
}
// a texture that starts as a blank placeholder and is drawn the first time it is needed
function lazyTex(make) {
  const c = document.createElement("canvas"); c.width = c.height = 4;
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.userData.fill = () => { if (t.userData.done) return; t.userData.done = true; const real = make(); t.image = real.image; t.anisotropy = real.anisotropy; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.needsUpdate = true; };
  return t;
}
function coverTex(NC) {
  const kc = NC / 2048;   // drawn in 2048-px units, scaled to the texture
  return TEX(NC, NC, (P) => {
    const g = P.g, S = 1000, X = (x) => 1024 + x * S, Y = (y) => 1024 + y * S;
    g.setTransform(0, kc, -kc, 0, NC, 0);   // the cylinder cap turns and mirrors the canvas; pre-transform so the cover reads true from outside
    const ink = (a = 1, w = 3) => { g.strokeStyle = `rgba(0,255,0,${a})`; g.fillStyle = `rgba(0,255,0,${a})`; g.lineWidth = w; g.lineCap = "round"; };
    const line = (x0, y0, x1, y1) => { g.beginPath(); g.moveTo(X(x0), Y(y0)); g.lineTo(X(x1), Y(y1)); g.stroke(); };
    const circ = (x, y, r, fill) => { g.beginPath(); g.arc(X(x), Y(y), r * S, 0, TAU); fill ? g.fill() : g.stroke(); };
    // a binary number: "1" is a stroke across the reading direction, "0" a dash along it
    const code = (s, x, y, dx, dy, step = 0.0105, h = 0.0055) => {
      const nx = -dy, ny = dx;
      for (let i = 0; i < s.length; i++) { const cx = x + dx * step * i, cy = y + dy * step * i; s[i] === "1" ? line(cx - nx * h, cy - ny * h, cx + nx * h, cy + ny * h) : line(cx - dx * h, cy - dy * h, cx + dx * h, cy + dy * h); }
    };
    ink(0.9, 4); circ(0, 0, 0.985); ink(0.6, 3); circ(0, 0, 0.035);
    // pulsar map, lower left: rays from the Sun at the pulsars' galactic longitudes, the long line to the galactic centre
    const O = [-0.394, 0.481], u = 0.862 / 100;
    ink(0.95, 3.4); line(O[0], O[1], O[0] + 100 * u, O[1]); line(O[0] + 100 * u, O[1] - 0.012, O[0] + 100 * u, O[1] + 0.012);
    for (const [, s, l, len, broken] of PULSARS) {
      const dx = Math.cos(l * DEG), dy = -Math.sin(l * DEG), L = Math.max(len, 0.7) * u, g0 = broken ? 0.032 * 100 * u : 0;
      if (broken) { line(O[0], O[1], O[0] + dx * 0.022 * 100 * u, O[1] + dy * 0.022 * 100 * u); line(O[0] + dx * g0, O[1] + dy * g0, O[0] + dx * L, O[1] + dy * L); }
      else line(O[0], O[1], O[0] + dx * L, O[1] + dy * L);
      const along = L + 0.02;
      if (len > 45) code(s, O[0] + dx * 0.05 + dy * 0.012, O[1] + dy * 0.05 - dx * 0.012, dx, dy);   // the long 1240 line carries its digits beside it
      else code(s, O[0] + dx * along, O[1] + dy * along, dx, dy);
    }
    // hydrogen hyperfine transition, lower right: antiparallel → parallel spins, labelled 1
    ink(0.95, 3);
    for (const [cx, eUp] of [[0.286, false], [0.453, true]]) {
      circ(cx, 0.715, 0.044);
      line(cx, 0.735, cx, 0.695); circ(cx, 0.695, 0.004, true);                                       // proton, up
      const ey = 0.715 - 0.044; eUp ? (line(cx, ey + 0.016, cx, ey - 0.016), circ(cx, ey - 0.016, 0.004, true)) : (line(cx, ey - 0.016, cx, ey + 0.016), circ(cx, ey + 0.016, 0.004, true));   // electron
    }
    line(0.339, 0.714, 0.401, 0.714); line(0.370, 0.722, 0.370, 0.738);
    // how to play, upper left: the record seen from above with its cartridge, the 3.6 s turn in binary round it
    const rc = [-0.469, -0.428];
    circ(rc[0], rc[1], 0.236); ink(0.5, 2); for (let r = 0.07; r < 0.23; r += 0.012) circ(rc[0], rc[1], r); ink(0.95, 3); circ(rc[0], rc[1], 0.046); circ(rc[0], rc[1], 0.009, true);
    g.beginPath(); g.rect(X(rc[0] + 0.226), Y(rc[1] - 0.06), 0.03 * S, 0.11 * S); g.stroke(); line(rc[0] + 0.236, rc[1] + 0.05, rc[0] + 0.232, rc[1] + 0.066);
    const ring = "100110000110010000000000000000000", ang = [33, 38, 47, 51, 55, 61, 71, 82, 93, 99, 103, 109, 118, 125];
    for (let i = 14; i < 33; i++) ang.push(136 + (i - 14) * (337 - 136) / 18);
    ring.split("").forEach((d, i) => { const a = -ang[i] * DEG, R0 = 0.25; if (d === "1") line(rc[0] + Math.cos(a) * (R0 - 0.009), rc[1] + Math.sin(a) * (R0 - 0.009), rc[0] + Math.cos(a) * (R0 + 0.009), rc[1] + Math.sin(a) * (R0 + 0.009)); else { g.beginPath(); g.arc(X(rc[0]), Y(rc[1]), R0 * S, a + 4 * DEG, a - 4 * DEG, true); g.stroke(); } });
    // side view below it, with the playing time per side in binary between two bars
    line(-0.705, 0.0, -0.227, 0.0); line(-0.705, -0.006, -0.705, 0.006); g.beginPath(); g.rect(X(-0.24), Y(-0.05), 0.026 * S, 0.044 * S); g.stroke();
    line(-0.476, 0.015, -0.476, 0.13); line(-0.231, 0.015, -0.231, 0.13);
    ["100001011", "0000000000", "0000000000", "0000000000", "0000"].forEach((r, i) => code(r, -0.455, 0.035 + i * 0.022, 1, 0, 0.021, 0.006));
    // picture decoding, upper right: the signal (a start burst and three lines), the interlaced scan, the raster, the first picture
    const wave = [[-0.011, -0.58]]; for (let k = 0; k < 6; k++) wave.push([0.005 + k * 0.012, k % 2 ? -0.64 : -0.52]);
    for (let n = 0; n < 3; n++) { const x0 = 0.09 + n * 0.205; wave.push([x0, -0.58]); for (let k = 0; k < 9; k++) wave.push([x0 + 0.02 + k * 0.018, -0.58 + Math.sin(k * 1.7 + n) * 0.045]); wave.push([x0 + 0.19, -0.515]); wave.push([x0 + 0.195, -0.58]); }
    g.beginPath(); wave.forEach(([x, y], i) => (i ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y)))); g.stroke();
    [["1", 0.18], ["10", 0.385], ["11", 0.59]].forEach(([c, x]) => code(c, x, -0.686, 1, 0, 0.014));
    line(0.18, -0.49, 0.18, -0.465); line(0.385, -0.49, 0.385, -0.465); line(0.18, -0.465, 0.385, -0.465);
    code("101101001100000000000000", 0.188, -0.478, 1, 0, 0.0083, 0.004);
    g.beginPath(); for (let k = 0; k <= 6; k++) { const x = 0.207 + k * 0.084; g.lineTo(X(x), Y(-0.238)); g.lineTo(X(x + 0.07), Y(-0.391)); } g.stroke();
    [["1", 0.25], ["10", 0.42], ["11", 0.59]].forEach(([c, x]) => code(c, x, -0.41, 1, 0, 0.014));
    g.beginPath(); g.rect(X(0.213), Y(-0.161), 0.272 * S, 0.201 * S); g.stroke();
    ink(0.6, 2); g.beginPath(); for (let k = 0; k < 6; k++) { g.lineTo(X(0.222 + k * 0.009), Y(-0.15)); g.lineTo(X(0.226 + k * 0.009), Y(0.03)); } g.stroke(); line(0.468, -0.15, 0.472, 0.03);
    ink(0.95, 3); code("1000000000", 0.476, -0.29, 0, 1, 0.012); code("10000", 0.226, -0.185, 1, 0, 0.012);
    g.beginPath(); g.rect(X(0.214), Y(0.077), 0.272 * S, 0.201 * S); g.stroke(); circ(0.352, 0.174, 0.064);
  }, { wrap: false, aniso: 16 });
}
