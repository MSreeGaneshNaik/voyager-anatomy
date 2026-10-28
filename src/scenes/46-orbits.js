// ============================================================================
// 46 · ORBITS — the mathematics behind the Grand Tour map.
// Units: astronomical units and days, heliocentric ecliptic J2000.
//  · planets: JPL's approximate Keplerian elements (Standish), valid 1800–2050
//  · each leg: a Lambert conic between the real encounter dates (universal
//    variables), so the path between two planets is the one ellipse or
//    hyperbola that joins them in exactly the flown time
//  · positions along a leg: universal-variable Kepler propagation
//  · flybys: the turn between the arriving and leaving legs gives v∞ and the
//    closest approach a patched conic implies, checked against the flown one
// ============================================================================
const K_GAUSS = 0.01720209895, MU_SUN = K_GAUSS * K_GAUSS;    // AU³/day²
const AUD_KMS = AU / 86400;                                    // 1 AU/day in km/s
const jdOf = (iso) => Date.parse(iso) / 86400000 + 2440587.5;
const isoOf = (jd) => new Date((jd - 2440587.5) * 86400000).toISOString();
// a, e, I, L, ϖ, Ω and their rates per Julian century (Standish, table 1)
const PLANET_EL = {
  mercury: [0.38709927, 0.20563593, 7.00497902, 252.25032350, 77.45779628, 48.33076593, 0.00000037, 0.00001906, -0.00594749, 149472.67411175, 0.16047689, -0.12534081],
  venus: [0.72333566, 0.00677672, 3.39467605, 181.97909950, 131.60246718, 76.67984255, 0.00000390, -0.00004107, -0.00078890, 58517.81538729, 0.00268329, -0.27769418],
  earth: [1.00000261, 0.01671123, -0.00001531, 100.46457166, 102.93768193, 0.0, 0.00000562, -0.00004392, -0.01294668, 35999.37244981, 0.32327364, 0.0],
  mars: [1.52371034, 0.09339410, 1.84969142, -4.55343205, -23.94362959, 49.55953891, 0.00001847, 0.00007882, -0.00813131, 19140.30268499, 0.44441088, -0.29257343],
  jupiter: [5.20288700, 0.04838624, 1.30439695, 34.39644051, 14.72847983, 100.47390909, -0.00011607, -0.00013253, -0.00183714, 3034.74612775, 0.21252668, 0.20469106],
  saturn: [9.53667594, 0.05386179, 2.48599187, 49.95424423, 92.59887831, 113.66242448, -0.00125060, -0.00050991, 0.00193609, 1222.49362201, -0.41897216, -0.28867794],
  uranus: [19.18916464, 0.04725744, 0.77263783, 313.23810451, 170.95427630, 74.01692503, -0.00196176, -0.00004397, -0.00242939, 428.48202785, 0.40805281, 0.04240589],
  neptune: [30.06992276, 0.00859048, 1.77004347, -55.12002969, 44.96476227, 131.78422574, 0.00026291, 0.00005105, 0.00035372, 218.45945325, -0.32241464, -0.00508664],
};
function planetPos(name, jd) {   // → [x, y, z] AU, ecliptic J2000
  const P = PLANET_EL[name], T = (jd - 2451545.0) / 36525;
  const a = P[0] + P[6] * T, e = P[1] + P[7] * T, I = (P[2] + P[8] * T) * DEG, L = P[3] + P[9] * T, w = P[4] + P[10] * T, O = P[5] + P[11] * T;
  const om = (w - O) * DEG, Om = O * DEG;
  let M = ((L - w) % 360 + 540) % 360 - 180; M *= DEG;
  let E = M + e * Math.sin(M);
  for (let i = 0; i < 12; i++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
  const xp = a * (Math.cos(E) - e), yp = a * Math.sqrt(1 - e * e) * Math.sin(E);
  const co = Math.cos(om), so = Math.sin(om), cO = Math.cos(Om), sO = Math.sin(Om), cI = Math.cos(I), sI = Math.sin(I);
  return [(co * cO - so * sO * cI) * xp + (-so * cO - co * sO * cI) * yp, (co * sO + so * cO * cI) * xp + (-so * sO + co * cO * cI) * yp, (so * sI) * xp + (co * sI) * yp];
}
const planetVel = (name, jd) => { const a = planetPos(name, jd - 0.05), b = planetPos(name, jd + 0.05); return [(b[0] - a[0]) / 0.1, (b[1] - a[1]) / 0.1, (b[2] - a[2]) / 0.1]; };
const v3 = { add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], mul: (a, s) => [a[0] * s, a[1] * s, a[2] * s], dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], len: (a) => Math.hypot(a[0], a[1], a[2]) };

// ---------- Stumpff functions ----------
function stumpC(z) { if (z > 1e-8) return (1 - Math.cos(Math.sqrt(z))) / z; if (z < -1e-8) return (Math.cosh(Math.sqrt(-z)) - 1) / -z; return 0.5 - z / 24; }
function stumpS(z) { if (z > 1e-8) { const s = Math.sqrt(z); return (s - Math.sin(s)) / (s * s * s); } if (z < -1e-8) { const s = Math.sqrt(-z); return (Math.sinh(s) - s) / (s * s * s); } return 1 / 6 - z / 120; }

// ---------- Lambert's problem (universal variables, prograde) ----------
function lambert(r1, r2, dt, mu = MU_SUN, way) {   // way: "short" | "long" | undefined = prograde about ecliptic north
  const R1 = v3.len(r1), R2 = v3.len(r2);
  let th = Math.acos(clamp(v3.dot(r1, r2) / (R1 * R2), -1, 1));
  if (way ? way === "long" : v3.cross(r1, r2)[2] < 0) th = TAU - th;
  const A = Math.sin(th) * Math.sqrt(R1 * R2 / (1 - Math.cos(th)));
  const y = (z) => R1 + R2 + A * (z * stumpS(z) - 1) / Math.sqrt(stumpC(z));
  const F = (z) => { const yz = y(z); return Math.pow(yz / stumpC(z), 1.5) * stumpS(z) + A * Math.sqrt(yz) - Math.sqrt(mu) * dt; };
  // F rises with z; y(z) must stay positive, and F → −√μ·dt where y → 0, so bracket the root
  // between that boundary and the elliptic limit 4π²
  let lo = -4, hi = TAU * TAU - 1e-6;
  const edge = (a, b) => { for (let i = 0; i < 200; i++) { const m = (a + b) / 2; if (y(m) > 0) b = m; else a = m; } return b; };   // a: y ≤ 0, b: y > 0
  if (y(lo) <= 0) lo = edge(lo, hi);
  else for (let i = 0; i < 80 && F(lo) > 0; i++) { const n = lo * 2; if (y(n) > 0) lo = n; else { lo = edge(n, lo); break; } }
  for (let i = 0; i < 200; i++) { const m = (lo + hi) / 2; if (F(m) > 0) hi = m; else lo = m; }
  const z = (lo + hi) / 2, yz = y(z);
  const f = 1 - yz / R1, g = A * Math.sqrt(yz / mu), gd = 1 - yz / R2;
  return { v1: v3.mul(v3.sub(r2, v3.mul(r1, f)), 1 / g), v2: v3.mul(v3.sub(v3.mul(r2, gd), r1), 1 / g), z };
}
// ---------- state after dt along a conic (universal Kepler) ----------
function propagate(r0, v0, dt, mu = MU_SUN) {
  const R0 = v3.len(r0), vr0 = v3.dot(r0, v0) / R0, alpha = 2 / R0 - v3.dot(v0, v0) / mu, sm = Math.sqrt(mu);
  let x = sm * Math.abs(alpha) * dt;
  if (!isFinite(x) || x === 0) x = sm * dt / R0;
  for (let i = 0; i < 60; i++) {
    const z = alpha * x * x, C = stumpC(z), S = stumpS(z);
    const Fx = R0 * vr0 / sm * x * x * C + (1 - alpha * R0) * x * x * x * S + R0 * x - sm * dt;
    const dF = R0 * vr0 / sm * x * (1 - alpha * x * x * S) + (1 - alpha * R0) * x * x * C + R0;
    const dx = Fx / dF; x -= dx; if (Math.abs(dx) < 1e-12) break;
  }
  const z = alpha * x * x, C = stumpC(z), S = stumpS(z);
  const f = 1 - x * x / R0 * C, g = dt - x * x * x / sm * S;
  const r = v3.add(v3.mul(r0, f), v3.mul(v0, g)), Rn = v3.len(r);
  const fd = sm / (Rn * R0) * (alpha * x * x * x * S - x), gd = 1 - x * x / Rn * C;
  return { r, v: v3.add(v3.mul(r0, fd), v3.mul(v0, gd)) };
}
// orbit elements from a state, for the sheets (a < 0 for a hyperbola)
function elementsOf(r, v, mu = MU_SUN) {
  const R = v3.len(r), V2 = v3.dot(v, v), h = v3.cross(r, v), a = 1 / (2 / R - V2 / mu);
  const ev = v3.sub(v3.mul(r, V2 / mu - 1 / R), v3.mul(v, v3.dot(r, v) / mu));
  return { a, e: v3.len(ev), i: Math.acos(h[2] / v3.len(h)) / DEG, q: a * (1 - v3.len(ev)) };
}
// ecliptic longitude/latitude (deg) → unit vector, and the reverse
const eclDir = (lon, lat) => [Math.cos(lat * DEG) * Math.cos(lon * DEG), Math.cos(lat * DEG) * Math.sin(lon * DEG), Math.sin(lat * DEG)];
const OBLIQ = 23.4392911 * DEG;
function raDecToEcl(raH, decD) {   // equatorial J2000 → ecliptic unit vector
  const ra = raH * 15 * DEG, de = decD * DEG, x = Math.cos(de) * Math.cos(ra), y = Math.cos(de) * Math.sin(ra), z = Math.sin(de);
  return [x, Math.cos(OBLIQ) * y + Math.sin(OBLIQ) * z, -Math.sin(OBLIQ) * y + Math.cos(OBLIQ) * z];
}
// ecliptic (x, y, z) → scene (x, z up, −y): the ecliptic plane lies flat, north up
const toScene = (p) => V3(p[0], p[2], -p[1]);
