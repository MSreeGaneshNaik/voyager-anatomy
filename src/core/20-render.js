// ============================================================================
// 20 · RENDER — technical-illustration pipeline
//   pass 1  normals + part id + depth   (layer 0, override material)
//   pass 2  paper-tone colour, MSAA     (layer 0)
//   pass 3  composite: ink lines from normal / id / depth discontinuities
//   pass 4  volumetric FX (layer 1), ray-marched in each effect's own space,
//           stopped by the scene depth so nozzles and decks occlude exhaust
// ============================================================================
const FX_LAYER = 1;
const COARSE = matchMedia("(pointer: coarse)").matches;
let MAX_ANISO = 8;
const LIGHT_W = V3(-0.75, 0.6, 0.35).normalize();
const PAL = {}; // live palette (THREE.Color) read from CSS tokens
const PAL_KEYS = ["bg", "hi", "mid", "lo", "metal", "dark", "paint", "ink", "gold", "silver", "glass", "regolith", "sea", "chute", "deck", "tower", "hl", "hl2"];
function readPalette() {
  const cs = getComputedStyle(document.documentElement);
  for (const k of PAL_KEYS) {
    const v = cs.getPropertyValue("--p-" + k).trim() || "#888";
    (PAL[k] ||= new THREE.Color()).set(v);
  }
  PAL.dark3d = cs.getPropertyValue("--p-isdark").trim() === "1";
}

// ---------- materials ----------
const TOON_VERT = /* glsl */`
varying vec3 vN; varying vec2 vUv;
void main(){
  vec4 p = vec4(position,1.0); vec3 n = normal;
  #ifdef USE_INSTANCING
    p = instanceMatrix * p; n = mat3(instanceMatrix) * n;
  #endif
  vUv = uv;
  vN = normalize(normalMatrix * n);
  gl_Position = projectionMatrix * modelViewMatrix * p;
}`;
const TOON_FRAG = /* glsl */`
uniform vec3 uBase, uAlt, uPaint, uInk, uHiCol;
uniform float uHi, uContrast, uHasMap, uInkA, uRim;
uniform sampler2D uMap;
varying vec3 vN; varying vec2 vUv;
void main(){
  vec3 n = normalize(vN); if(!gl_FrontFacing) n = -n;
  vec3 L = normalize(vec3(-0.52, 0.74, 0.42));
  float lam = 0.5 + 0.5 * dot(n, L);
  lam = lam * lam * (3.0 - 2.0 * lam);
  float shade = mix(1.0 - uContrast, 1.0, lam);
  float rim = pow(clamp(1.0 - abs(n.z), 0.0, 1.0), 4.0) * uRim;
  vec3 base = uBase;
  if (uHasMap > 0.5) {
    vec4 m = texture2D(uMap, vUv);
    base = mix(base, uAlt, m.b);
    base = mix(base, uPaint, m.r);
    base = mix(base, uInk, m.g * uInkA);
  }
  vec3 col = base * shade - rim * 0.05;
  col = mix(col, uHiCol, uHi * 0.32);
  gl_FragColor = vec4(col, 1.0);
}`;
const ROLE = { // role → [palette base, palette alt, contrast]
  white: ["hi", "mid", 0.20], light: ["mid", "lo", 0.22], grey: ["lo", "mid", 0.24], metal: ["metal", "lo", 0.28],
  dark: ["dark", "lo", 0.30], paint: ["paint", "lo", 0.25], gold: ["gold", "hi", 0.26], silver: ["silver", "lo", 0.24],
  glass: ["glass", "glass", 0.2], regolith: ["regolith", "lo", 0.32], sea: ["sea", "hi", 0.18], chute: ["chute", "hi", 0.18],
  deck: ["deck", "lo", 0.22], tower: ["tower", "lo", 0.26],
};
const ALL_MATS = [];
function makeToon(role, map, opt = {}) {
  const m = new THREE.ShaderMaterial({
    vertexShader: TOON_VERT, fragmentShader: TOON_FRAG,
    uniforms: {
      uBase: { value: new THREE.Color() }, uAlt: { value: new THREE.Color() }, uPaint: { value: new THREE.Color() },
      uInk: { value: new THREE.Color() }, uHiCol: { value: new THREE.Color() }, uHi: { value: 0 },
      uContrast: { value: 0.2 }, uHasMap: { value: map ? 1 : 0 }, uInkA: { value: opt.inkA ?? 0.85 },
      uMap: { value: map || null }, uRim: { value: opt.rim ?? 1 },
    },
    side: opt.side ?? THREE.FrontSide,
  });
  m.userData = { role, opt };
  applyRole(m);
  ALL_MATS.push(m);
  return m;
}
function applyRole(m) {
  const [b, a, c] = ROLE[m.userData.role];
  const u = m.uniforms;
  u.uBase.value.copy(PAL[b]); if (m.userData.opt.tint) u.uBase.value.lerp(PAL[m.userData.opt.tint[0]], m.userData.opt.tint[1]);
  u.uAlt.value.copy(PAL[m.userData.opt.alt || a]);
  u.uPaint.value.copy(PAL.paint); u.uInk.value.copy(PAL.ink); u.uHiCol.value.copy(PAL.hl);
  u.uContrast.value = PAL.dark3d ? c * 1.25 : c;
}

const NORMAL_MAT = new THREE.ShaderMaterial({
  vertexShader: TOON_VERT,
  fragmentShader: /* glsl */`
    uniform float uId; varying vec3 vN; varying vec2 vUv;
    void main(){ vec3 n = normalize(vN); if(!gl_FrontFacing) n = -n; gl_FragColor = vec4(n*0.5+0.5, uId); }`,
  uniforms: { uId: { value: 0 } },
  side: THREE.DoubleSide,
});
let PART_SEQ = 0;
function tagPart(mesh) {
  const id = ((++PART_SEQ * 97) % 251 + 2) / 255;
  mesh.onBeforeRender = (r, s, c, g, mat) => {
    if (mat === NORMAL_MAT) { mat.uniforms.uId.value = id; mat.uniformsNeedUpdate = true; }
  };
}

// ---------- canvas textures (channel masks: R = dark paint, G = ink line, B = alt tone) ----------
function TEX(w, h, draw, { wrap = true, aniso = 8 } = {}) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const g = c.getContext("2d");
  g.fillStyle = "#000"; g.fillRect(0, 0, w, h);
  g.globalCompositeOperation = "lighter";
  const P = {
    g, w, h,
    paint(x, y, ww, hh, a = 1) { g.fillStyle = `rgba(255,0,0,${a})`; g.fillRect(x * w, (1 - y - hh) * h, ww * w, hh * h); },
    alt(x, y, ww, hh, a = 1) { g.fillStyle = `rgba(0,0,255,${a})`; g.fillRect(x * w, (1 - y - hh) * h, ww * w, hh * h); },
    // lines in uv space (v up)
    hline(v, a = 1, lw = 2, u0 = 0, u1 = 1) { g.strokeStyle = `rgba(0,255,0,${a})`; g.lineWidth = lw; g.beginPath(); g.moveTo(u0 * w, (1 - v) * h); g.lineTo(u1 * w, (1 - v) * h); g.stroke(); },
    vline(u, a = 1, lw = 2, v0 = 0, v1 = 1) { g.strokeStyle = `rgba(0,255,0,${a})`; g.lineWidth = lw; g.beginPath(); g.moveTo(u * w, (1 - v0) * h); g.lineTo(u * w, (1 - v1) * h); g.stroke(); },
    rect(u, v, du, dv, a = 1, lw = 2) { g.strokeStyle = `rgba(0,255,0,${a})`; g.lineWidth = lw; g.strokeRect(u * w, (1 - v - dv) * h, du * w, dv * h); },
    dot(u, v, r, a = 1) { g.fillStyle = `rgba(0,255,0,${a})`; g.beginPath(); g.arc(u * w, (1 - v) * h, r, 0, TAU); g.fill(); },
    ring(u, v, r, a = 1, lw = 2) { g.strokeStyle = `rgba(0,255,0,${a})`; g.lineWidth = lw; g.beginPath(); g.arc(u * w, (1 - v) * h, r, 0, TAU); g.stroke(); },
    circle(u, v, r, ch = "alt", a = 1) { g.fillStyle = ch === "paint" ? `rgba(255,0,0,${a})` : ch === "ink" ? `rgba(0,255,0,${a})` : `rgba(0,0,255,${a})`; g.beginPath(); g.arc(u * w, (1 - v) * h, r, 0, TAU); g.fill(); },
    poly(pts, ch = "alt", a = 1) { g.fillStyle = ch === "paint" ? `rgba(255,0,0,${a})` : ch === "ink" ? `rgba(0,255,0,${a})` : `rgba(0,0,255,${a})`; g.beginPath(); pts.forEach(([u, v], i) => (i ? g.lineTo : g.moveTo).call(g, u * w, (1 - v) * h)); g.closePath(); g.fill(); },
    polyline(pts, a = 1, lw = 2, close = false) { g.strokeStyle = `rgba(0,255,0,${a})`; g.lineWidth = lw; g.beginPath(); pts.forEach(([u, v], i) => (i ? g.lineTo : g.moveTo).call(g, u * w, (1 - v) * h)); if (close) g.closePath(); g.stroke(); },
    rivets(v, n, a = 0.5, r = 1.2, u0 = 0, u1 = 1) { for (let i = 0; i < n; i++) P.dot(u0 + (u1 - u0) * (i + 0.5) / n, v, r, a); },
  };
  draw(P);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  t.wrapS = wrap ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  t.anisotropy = Math.max(aniso, MAX_ANISO);
  t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}

// ---------- FX volume shader ----------
const NOISE_GLSL = /* glsl */`
float h31(vec3 p){ p = fract(p*0.3183099 + 0.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float vnoise(vec3 x){
  vec3 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f);
  return mix(mix(mix(h31(i+vec3(0,0,0)),h31(i+vec3(1,0,0)),f.x), mix(h31(i+vec3(0,1,0)),h31(i+vec3(1,1,0)),f.x), f.y),
             mix(mix(h31(i+vec3(0,0,1)),h31(i+vec3(1,0,1)),f.x), mix(h31(i+vec3(0,1,1)),h31(i+vec3(1,1,1)),f.x), f.y), f.z);
}
float fbm(vec3 p){ float a = 0.5, s = 0.0; for(int i=0;i<3;i++){ s += a*vnoise(p); p = p*2.03 + 7.1; a *= 0.5; } return s; }`;
const FX_VERT = /* glsl */`
varying vec3 vL; varying float vVZ;
void main(){ vL = position; vec4 mv = modelViewMatrix * vec4(position,1.0); vVZ = -mv.z; gl_Position = projectionMatrix * mv; }`;
const FX_FRAG = /* glsl */`
uniform float uShape, uInt, uTime, uLen, uR0, uSpread, uPow, uRMax, uFreq, uFlow, uDens, uHot, uSeed, uNear, uFar, uAlpha, uDiam, uSoot, uFront, uCut, uFade, uCoolK;
uniform vec3 uDirL, uLightL, uCore, uBody, uDeep, uSmoke, uSootC;
uniform vec2 uRes; uniform sampler2D tDepth;
varying vec3 vL; varying float vVZ;
${NOISE_GLSL}
float cylExit(vec3 ro, vec3 rd){
  float t = 1e5;
  float a = dot(rd.xz, rd.xz);
  if (a > 1e-6){ float b = dot(ro.xz, rd.xz), c = dot(ro.xz, ro.xz) - uRMax*uRMax; float h = b*b - a*c; if (h > 0.0) t = min(t, (-b + sqrt(h))/a); }
  if (rd.y > 1e-5) t = min(t, (0.0 - ro.y)/rd.y);
  if (rd.y < -1e-5) t = min(t, (-uLen - ro.y)/rd.y);
  return max(t, 0.0);
}
// returns density; writes the sample's colour (premultiplied by nothing) and its emissive share
float sampleVol(vec3 p, out vec3 col){
  if (uShape < 0.5) {                      // engine plume along −y from the exit plane
    float s = clamp(-p.y / uLen, 0.0, 1.0);
    float R = uR0 * (1.0 + uSpread * pow(s, uPow));
    float r = length(p.xz) / R;
    float n = fbm(vec3(p.x, p.y + uTime*uFlow, p.z) * uFreq / uR0 + uSeed);
    float ax = smoothstep(0.0, 0.015, s) * (1.0 - smoothstep(uFade, 1.0, s));
    // ignition: the flame front pushes out of the bell; cutoff: the flame detaches and is blown downstream
    float wob = (n - 0.5) * 0.08;
    float front = 1.0 - smoothstep(uFront - 0.1, uFront, s - wob);
    float cutE = smoothstep(uCut - 0.04, uCut + 0.06, s + wob);
    ax *= front * (uCut > 0.0 ? cutE : 1.0);
    float d = exp(-r*r*2.4) * ax * (0.35 + 1.1*n);
    // colour ramp: white-hot core → body → deep → smoke, cooling downstream and outward
    float cool = clamp(s * uCoolK + r * 0.55 + (n - 0.5) * 0.35 + uCut * 1.1, 0.0, 1.0);
    vec3 c = mix(uBody, uDeep, smoothstep(0.15, 0.55, cool));
    c = mix(c, uSmoke, smoothstep(0.5, 0.95, cool));
    float hot = exp(-s * uHot) * exp(-r*r*3.5) * (1.0 - smoothstep(0.0, 0.04, uCut));
    // shock diamonds in the core (spacing ≈ 1.2 exit diameters)
    float dia = uDiam * exp(-r*r*6.0) * exp(-s*2.2) * pow(0.5 + 0.5*cos(6.2832 * (-p.y) / (uR0 * 2.4)), 6.0) * (1.0 - smoothstep(0.0, 0.03, uCut)) * front;
    c = mix(c, uCore, clamp(hot * 1.5 + dia, 0.0, 1.0));
    // fuel-rich turbine-exhaust sheath (F-1): dark film at the lip before it ignites
    float sheath = uSoot * smoothstep(0.42, 0.85, r) * (1.0 - smoothstep(1.0, 1.3, r)) * (1.0 - smoothstep(0.02, 0.16 * uCoolK / 1.6, s)) * front * (uCut > 0.0 ? cutE : 1.0);
    c = mix(c, uSootC, clamp(sheath, 0.0, 0.9));
    d += sheath * 0.8 * ax;
    // side light through the volume, so the plume reads round
    float lit = 0.84 + 0.16 * dot(normalize(vec3(p.x, 0.0, p.z) + vec3(1e-4)), uLightL);   // a flame glows: shade it only lightly
    col = c * mix(lit, 1.0, clamp(hot * 1.5 + dia, 0.0, 1.0));
    return d + dia * 0.6 * ax;
  } else if (uShape < 1.5) {               // billowing cloud: ellipsoid radii (uR0, uLen/2, uR0)
    vec3 q = vec3(p.x/uR0, (p.y + uLen*0.5)/(uLen*0.5), p.z/uR0);
    float n = fbm(p * uFreq / uR0 + vec3(0.0, -uTime*uFlow, uTime*uFlow*0.3) + uSeed);
    float d0 = length(q) + (n - 0.5) * 0.9;
    float lit = 0.62 + 0.38 * clamp(dot(normalize(q + vec3(1e-4)), uLightL) * 0.5 + 0.5, 0.0, 1.0);
    vec3 c = mix(uDeep, uBody, n);
    c = mix(c, uCore, smoothstep(0.7, 1.0, n) * 0.6);
    c = mix(uSmoke, c, smoothstep(0.0, 0.9, q.y * 0.5 + 0.5));
    col = c * lit;
    return smoothstep(1.0, 0.25, d0) * (0.5 + n);
  } else {                                 // ground dust sheet
    float r = length(p.xz);
    float ang = atan(p.z, p.x);
    float streak = vnoise(vec3(ang * 9.0, r * 0.15 - uTime*uFlow, uSeed));
    float hgt = exp(-max(0.0, p.y + uLen) / (uLen * 0.25));
    float rad = smoothstep(uR0*0.15, uR0*0.5, r) * (1.0 - smoothstep(uR0*0.6, uR0, r));
    col = mix(uBody, uSmoke, streak);
    return hgt * rad * streak * streak * 1.6;
  }
}
void main(){
  if (uInt < 0.002) discard;
  vec3 rd = normalize(uDirL), ro = vL;
  float tExit = cylExit(ro, rd);
  vec2 suv = gl_FragCoord.xy / uRes;
  float sd = texture2D(tDepth, suv).r;
  float tScene = (uNear + sd*(uFar-uNear)) - vVZ;
  float tEnd = min(tExit, tScene);
  if (tEnd <= 0.0) discard;
  const int N = 26;
  float dt = tEnd / float(N);
  float jit = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898,78.233))) * 43758.5453);
  vec3 col = vec3(0.0); float a = 0.0;
  for (int i = 0; i < N; i++){
    vec3 p = ro + rd * (dt * (float(i) + jit));
    vec3 c; float d = sampleVol(p, c) * uDens * uInt;
    if (d > 0.001){
      float k = 1.0 - exp(-d * dt);
      col += (1.0 - a) * c * k; a += (1.0 - a) * k;
      if (a > 0.985) break;
    }
  }
  a *= uAlpha; col *= uAlpha;
  float dither = (jit - 0.5) / 255.0;
  gl_FragColor = vec4(col + dither, a);
}`;
const FX_SETS = { // [core, body, deep, smoke, soot, alpha] — light-theme inks on paper · dark-theme glows
  // propellant families: kerosene burns yellow-orange and sooty; hydrogen nearly clear and blue; hypergolics rose-orange
  F1: { light: ["#fff8e0", "#ffb238", "#f26a22", "#8f5040", "#3f322c", 1.0], dark: ["#fff6e2", "#ffb040", "#f0621f", "#5e2a21", "#1b1512", 1.0] },
  J2: { light: ["#ffffff", "#b3c6f7", "#7f93ea", "#dde3f6", "#7f93ea", 0.82], dark: ["#f4f8ff", "#9ab6ff", "#5a6fe0", "#2a3452", "#2a3452", 0.85] },
  HYP: { light: ["#fff3ee", "#ffa38a", "#ee7376", "#f6dad8", "#ee7376", 0.88], dark: ["#fff0ea", "#ff9a82", "#e2606e", "#4a2a30", "#4a2a30", 0.9] },
  RCS: { light: ["#ffffff", "#e2e5e9", "#cfd4da", "#eceef1", "#cfd4da", 0.9], dark: ["#f4f6f8", "#aeb6bf", "#7c858f", "#4b525b", "#4b525b", 0.8] },
  STEAM: { light: ["#fffaf0", "#ece8e1", "#d6cfc5", "#c2bab0", "#c2bab0", 0.95], dark: ["#f3e7d6", "#b3afa9", "#8b8781", "#5f5d5a", "#5f5d5a", 0.82] },
  FIRE: { light: ["#fff3cf", "#f7a03e", "#d8462a", "#b24a34", "#4a3a33", 1.0], dark: ["#fff6e2", "#ffa04a", "#e64d27", "#7a3022", "#1b1512", 1.0] },
  PLASMA: { light: ["#fff7dc", "#ff9a48", "#e2583c", "#d05a7a", "#d05a7a", 1.0], dark: ["#fff8e0", "#ff8a3d", "#d9483a", "#a63a6a", "#a63a6a", 1.0] },
  DUST: { light: ["#bdb6a9", "#a39b8d", "#958e81", "#8f887c", "#8f887c", 0.9], dark: ["#8f887c", "#6f695f", "#5c574f", "#4a463f", "#4a463f", 0.9] },
};
const FX_LIST = [];
function makeFX(kind, shape, p) {
  const geo = shape === 1
    ? new THREE.CylinderGeometry(p.rmax, p.rmax, p.len, 24, 1, false).translate(0, -p.len / 2, 0)
    : new THREE.CylinderGeometry(p.rmax, p.rmax, p.len, 28, 1, false).translate(0, -p.len / 2, 0);
  const u = {
    uShape: { value: shape }, uInt: { value: 0 }, uTime: { value: 0 }, uLen: { value: p.len }, uR0: { value: p.r0 },
    uSpread: { value: p.spread ?? 1 }, uPow: { value: p.pow ?? 1 }, uRMax: { value: p.rmax }, uFreq: { value: p.freq ?? 1.2 },
    uFlow: { value: p.flow ?? 20 }, uDens: { value: p.dens ?? 1 }, uHot: { value: p.hot ?? 6 }, uSeed: { value: Math.random() * 40 },
    uNear: { value: 0.1 }, uFar: { value: 1000 }, uAlpha: { value: 1 }, uDirL: { value: V3(0, 0, -1) },
    uCore: { value: new THREE.Color() }, uBody: { value: new THREE.Color() }, uDeep: { value: new THREE.Color() }, uSmoke: { value: new THREE.Color() }, uSootC: { value: new THREE.Color() },
    uDiam: { value: p.diam ?? 0 }, uSoot: { value: p.soot ?? 0 }, uLightL: { value: V3(-0.6, 0, 0.8) }, uFront: { value: 10 }, uCut: { value: 0 }, uFade: { value: p.fade ?? 0.5 }, uCoolK: { value: p.coolK ?? 1.6 },
    uRes: { value: new THREE.Vector2(1, 1) }, tDepth: { value: null },
  };
  const mat = new THREE.ShaderMaterial({
    vertexShader: FX_VERT, fragmentShader: FX_FRAG, uniforms: u, transparent: true, depthTest: false, depthWrite: false,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
    blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor, side: THREE.FrontSide,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.layers.set(FX_LAYER);
  mesh.frustumCulled = false;
  mesh.renderOrder = 10;
  mesh.userData = { kind, level: 0, target: 0, attack: p.attack ?? 0.25, decay: p.decay ?? 0.7, baseLen: p.len, dens0: p.dens ?? 1 };
  applyFXColors(mesh);
  FX_LIST.push(mesh);
  return mesh;
}
function applyFXColors(mesh) {
  const set = FX_SETS[mesh.userData.kind][PAL.dark3d ? "dark" : "light"];
  const u = mesh.material.uniforms;
  u.uCore.value.set(set[0]); u.uBody.value.set(set[1]); u.uDeep.value.set(set[2]); u.uSmoke.value.set(set[3]); u.uSootC.value.set(set[4]); u.uAlpha.value = set[5];
}

// ---------- pipeline ----------
const PIPE = {
  init(canvas) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: "high-performance" });
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    this.renderer.autoClear = false;
    MAX_ANISO = this.renderer.capabilities.getMaxAnisotropy();
    const gl = this.renderer.getContext();
    this.maxRB = Math.min(gl.getParameter(gl.MAX_RENDERBUFFER_SIZE), this.renderer.capabilities.maxTextureSize);
    this.rtN = new THREE.WebGLRenderTarget(4, 4, { type: THREE.UnsignedByteType });
    this.rtN.depthTexture = new THREE.DepthTexture(4, 4);
    this.rtN.depthTexture.type = THREE.UnsignedIntType;
    this.rtC = new THREE.WebGLRenderTarget(4, 4, { samples: 4, type: THREE.UnsignedByteType });
    this.rtE = new THREE.WebGLRenderTarget(4, 4, { type: THREE.UnsignedByteType, depthBuffer: false });
    this.rtE.texture.minFilter = THREE.LinearFilter; this.rtE.texture.magFilter = THREE.LinearFilter;
    this.down = new THREE.ShaderMaterial({
      uniforms: { tSrc: { value: this.rtE.texture }, uStep: { value: new THREE.Vector2() } },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
      // 4 bilinear taps = a 4×4-texel tent at 2× supersampling: crisp, anti-aliased lines at device resolution
      fragmentShader: `uniform sampler2D tSrc; uniform vec2 uStep; varying vec2 vUv;
        void main(){ vec2 o = uStep * 0.5;
          vec3 c = texture2D(tSrc, vUv + vec2(-o.x,-o.y)).rgb + texture2D(tSrc, vUv + vec2(o.x,-o.y)).rgb + texture2D(tSrc, vUv + vec2(-o.x,o.y)).rgb + texture2D(tSrc, vUv + vec2(o.x,o.y)).rgb;
          gl_FragColor = vec4(c * 0.25, 1.0); }`,
      depthTest: false, depthWrite: false,
    });
    this.dQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.down); this.dQuad.frustumCulled = false;
    this.dScene = new THREE.Scene(); this.dScene.add(this.dQuad);
    this.comp = new THREE.ShaderMaterial({
      uniforms: {
        tColor: { value: this.rtC.texture }, tNormal: { value: this.rtN.texture }, tDepth: { value: this.rtN.depthTexture },
        uTexel: { value: new THREE.Vector2() }, uInk: { value: new THREE.Color() }, uInkA: { value: 0.9 },
        uNear: { value: 0.1 }, uFar: { value: 1000 }, uDT: { value: 0.05 }, uLW: { value: 1.0 },
      },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
      fragmentShader: /* glsl */`
        uniform sampler2D tColor, tNormal, tDepth; uniform vec2 uTexel; uniform vec3 uInk; uniform float uInkA, uNear, uFar, uDT, uLW;
        varying vec2 vUv;
        float D(vec2 uv){ return texture2D(tDepth, uv).r; }
        vec4 N(vec2 uv){ return texture2D(tNormal, uv); }
        float edgeAt(vec2 uv){
          vec2 o = uTexel * uLW;
          float dc = D(uv); if (dc > 0.99999) return 0.0;
          vec4 c = N(uv); vec3 nc = c.xyz*2.0-1.0;
          float range = uFar - uNear, e = 0.0;
          vec2 offs[4]; offs[0] = vec2(o.x,0.0); offs[1] = vec2(-o.x,0.0); offs[2] = vec2(0.0,o.y); offs[3] = vec2(0.0,-o.y);
          for (int i = 0; i < 4; i++){
            vec2 q = uv + offs[i];
            float dq = D(q);
            if (dq > 0.99999) { e = 1.0; continue; }            // silhouette against paper, drawn on the part
            float dOpp = D(uv - offs[i]);
            float jump = (dq - dc) * range;                      // >0: neighbour is farther, this pixel is the near side
            float lap = abs(dq + dOpp - 2.0*dc) * range;
            e = max(e, smoothstep(uDT, uDT*2.0, jump) * smoothstep(uDT*0.5, uDT, lap));
            if (i == 0 || i == 2) {                              // one-sided crease / part-boundary test → 1 px lines
              vec4 qn = N(q);
              float cr = 1.0 - dot(nc, qn.xyz*2.0-1.0);
              e = max(e, smoothstep(0.10, 0.32, cr));
              if (abs(qn.a - c.a) > 0.002 && abs(jump) < uDT * 6.0) e = max(e, 0.85);
            }
          }
          return e;
        }
        void main(){
          vec4 col = texture2D(tColor, vUv);
          float e = edgeAt(vUv);
          gl_FragColor = vec4(mix(col.rgb, uInk, e * uInkA), 1.0);
        }`,
      depthTest: false, depthWrite: false,
    });
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.comp);
    this.quad.frustumCulled = false;
    this.qScene = new THREE.Scene(); this.qScene.add(this.quad);
    this.qCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  },
  aa: true,
  setAA(on) {
    this.aa = !!on;
    const old = this.rtC;
    this.rtC = new THREE.WebGLRenderTarget(4, 4, { samples: this.aa ? 4 : 0, type: THREE.UnsignedByteType });
    this.comp.uniforms.tColor.value = this.rtC.texture;
    old.dispose();
    if (this.w) this.resize(this.w, this.h, this.dpr);
  },
  resize(w, h, dpr) {
    // canvas at exact device pixels; with anti-aliasing on, geometry and ink are
    // supersampled up to 2× (plus 4× MSAA on fills) and box-filtered down
    this.w = w; this.h = h; this.dpr = dpr;
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    const cw = Math.round(w * dpr), ch = Math.round(h * dpr);
    // Full quality on every device: phones get a budget big enough to always reach the full 2× supersampling
    // (plus 4× MSAA), limited only by the GPU's largest render buffer so the canvas can never come up blank.
    const budget = COARSE ? 16e6 : 10e6;
    const ss = this.aa ? clamp(Math.min(Math.sqrt(budget / (cw * ch)), this.maxRB / cw, this.maxRB / ch), 1, 2) : 1;
    const W = Math.round(cw * ss), H = Math.round(ch * ss);
    this.rtN.setSize(W, H); this.rtC.setSize(W, H); this.rtE.setSize(W, H);
    this.comp.uniforms.uTexel.value.set(1 / W, 1 / H);
    this.comp.uniforms.uLW.value = Math.max(1, ss * 0.9);
    this.down.uniforms.uStep.value.set(1 / W, 1 / H).multiplyScalar(ss > 1.01 ? ss * 0.5 : 0);
    this.W = W; this.H = H; this.cw = cw; this.ch = ch; this.ss = ss;
  },
  render(scene, camera) {
    const r = this.renderer;
    camera.layers.set(0);
    scene.overrideMaterial = NORMAL_MAT;
    r.setRenderTarget(this.rtN); r.setClearColor(0x7f7f7f, 0); r.clear(true, true, true);
    r.render(scene, camera);
    scene.overrideMaterial = null;
    r.setRenderTarget(this.rtC); r.setClearColor(PAL.bg, 1); r.clear(true, true, true);
    r.render(scene, camera);
    // composite
    const cu = this.comp.uniforms;
    cu.uNear.value = camera.near; cu.uFar.value = camera.far; cu.uInk.value.copy(PAL.ink);
    const pxWorld = (camera.top - camera.bottom) / camera.zoom / this.H;
    // depth jumps smaller than a few half-precision steps of the depth range are noise, not edges
    cu.uDT.value = Math.max(this.dtFloor ?? 0.03, pxWorld * 6, (camera.far - camera.near) * 2.5e-3);
    cu.uInkA.value = PAL.dark3d ? 0.75 : 0.88;
    r.setRenderTarget(this.rtE); r.render(this.qScene, this.qCam);
    r.setRenderTarget(null); r.setClearColor(PAL.bg, 1); r.clear(true, true, true);
    r.render(this.dScene, this.qCam);
    // FX
    camera.layers.set(FX_LAYER);
    const inv = new THREE.Matrix4(), dir = V3(), q = new THREE.Quaternion();
    camera.getWorldDirection(dir);
    for (const fx of FX_LIST) {
      const u = fx.material.uniforms;
      fx.visible = u.uInt.value > 0.002 && !!fx.parent && isShown(fx.parent);
      if (!fx.visible) continue;
      fx.getWorldQuaternion(q);
      q.invert();
      u.uDirL.value.copy(dir).applyQuaternion(q);
      u.uLightL.value.copy(LIGHT_W).applyQuaternion(q); u.uLightL.value.y = 0; u.uLightL.value.normalize();
      u.uNear.value = camera.near; u.uFar.value = camera.far;
      u.uRes.value.set(this.cw, this.ch); u.tDepth.value = this.rtN.depthTexture;
    }
    journeyFX(camera, this);
    r.render(scene, camera);
    camera.layers.set(0);
  },
};
function isShown(o) { while (o) { if (!o.visible) return false; o = o.parent; } return true; }
