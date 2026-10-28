// ============================================================================
// 12 · LAUNCH VEHICLE TRUTH — Titan IIIE-Centaur (TC-6 for Voyager 1, TC-7 for
// Voyager 2) and the engines the console can fire.
// ============================================================================
// geometry (m). Lengths are rated where the sources give them; the small
// adapters and fittings between them are drawn to fit.
const TITAN_GEOM = {
  coreR: 3.05 / 2, coreBase: 3.7, s1Len: 19.2, s2Len: 7.0,                  // stage I 63 ft, stage II 23 ft; core top at 98 ft [TCS]
  srmX: 3.42, srmR: 3.05 / 2, srmLen: 25.9, srmNose: 4.2, srmSkirtH: 1.6, srmSegs: 5, srmNozzleLen: 3.2, srmExitR: 1.45, srmCant: 6 * DEG,
  tvcR: 0.42, tvcY0: 2.6, tvcLen: 8.5, strutY: [4.4, 21.6],
  lr87X: 0.76, lr87Len: 2.7, lr87ExitR: 0.74, lr91Len: 2.8, lr91ExitR: 0.78,   // LR87 exit from its rated pair: A_e = 1.86 m² per chamber
  cenR: 3.05 / 2, cenLen: 9.6, cenTank0: 2.6, cenTank1: 7.2, rl10X: 0.62, rl10Len: 1.78, rl10ExitR: 0.5,   // 31.5 ft with its truss adapter [TCS]
  cssR: 4.27 / 2, cssLen: 17.7, cssCyl: 12.8, cssBoat: 0.9, cssNose: 4.88,   // 58 ft: 42 ft × 14 ft cylinder, 16 ft biconic nose [TCS]
  pmLen: 0.9, pmR: 0.5, pmAdapterR: 0.95, te364R: 0.93 / 2, te364NozLen: 0.75, te364ExitR: 0.3,
  towerZ: 10.5, towerH: 54,
  // umbilical swing arms: height of the arm, and which part of the stack it plugs into
  arms: [[7.0, "core", "Stage 1 fuel"], [16.5, "core", "Stage 1 oxidiser"], [25.6, "core", "Stage 2"], [35.0, "css", "Centaur, through the shroud"], [43.8, "css", "spacecraft air conditioning"]],
};

const STACKINFO = {
  pad: { name: "Launch Complex 41 · launch platform", short: "LC-41 platform", desc: "The Titan III was stacked indoors on a mobile launch platform and rolled to the pad on rails. The solids stand on the platform deck; their exhaust drops through openings into the flame deflector below.", kv: [["Complex", "LC-41, Cape Canaveral"], ["Launches", "TC-7 (Voyager 2) · TC-6 (Voyager 1)"]] },
  tower: { name: "Umbilical tower", short: "Umbilical tower", desc: "A steel tower on the launch platform whose arms carried propellant, power and data to each stage until they swung away at liftoff.", kv: [["Role", "propellant, power and data until liftoff"]] },
  srm: { short: "UA1205 SRM", desc: "United Technologies' five-segment solid motor, stage 0 of the Titan IIIE. Both light on the pad and carry the vehicle alone for the first two minutes; the core's engines start in the air. A tank on the outside holds nitrogen tetroxide, injected into the nozzle to steer.", kv: [["Diameter", "3.05 m · 120 in"], ["Height", "25.9 m · 85 ft with nose"], ["Segments", "5"], ["Loaded mass", "over 500,000 lb each"], ["Thrust, sea level", "5,293 kN · 1.19 million lbf"], ["Isp", "238 s SL · 263 s vac"], ["Burn", "≈115–117 s"], ["Nozzle expansion", "8 : 1"]] },
  s1: { name: "Titan core stage 1", short: "Stage 1", desc: "Martin Marietta's first core stage: Aerozine 50 and nitrogen tetroxide in two tanks, burning in an engine with two chambers. It sits idle at liftoff and lights high up, just before the solids burn out.", kv: [["Height", "19.2 m · 63 ft"], ["Diameter", "3.05 m · 10 ft"], ["Fuelled", "277,000 lb"], ["Empty", "15,000 lb"], ["Ignition", "T+1:51, in flight"], ["Burn", "146 s"]] },
  s1Eng: { name: "LR87-AJ-11", short: "LR87", desc: "Aerojet's twin-chamber engine for the Titan first stage, each chamber with its own turbopump.", kv: [["Thrust, vacuum", "520,000 lbf (2 × 260,000)"], ["Isp, vacuum", "301.1 s"], ["Mixture", "1.915 : 1"], ["Expansion", "15 : 1"]] },
  s2: { name: "Titan core stage 2", short: "Stage 2", desc: "The second core stage, with the same hypergolic propellants and one engine.", kv: [["Height", "7.0 m · 23 ft"], ["Diameter", "3.05 m"], ["Burn", "210 s"]] },
  s2Eng: { name: "LR91-AJ-11", short: "LR91", desc: "Aerojet's single-chamber second-stage engine.", kv: [["Thrust, vacuum", "101,000 lbf"], ["Isp, vacuum", "318.7 s"], ["Expansion", "49.2 : 1"]] },
  cen: { name: "Centaur D-1T", short: "Centaur", desc: "General Dynamics' hydrogen–oxygen upper stage, its stainless-steel tanks so thin they hold their shape only under pressure. On the Voyager flights it burned twice: once to reach a parking orbit and again to leave Earth.", kv: [["Length", "9.6 m · 31.5 ft with truss adapter"], ["Diameter", "3.05 m · 10 ft"], ["Liquid oxygen", "24,840 lb"], ["Liquid hydrogen", "4,910 lb"], ["Jettison mass", "4,400 lb"]] },
  cenEng: { name: "RL10A-3-3 × 2", short: "RL10", desc: "Pratt & Whitney's expander-cycle hydrogen engines, the first liquid-hydrogen rocket engines to fly.", kv: [["Thrust", "2 × 15,000 lbf vac"], ["Isp", "444 s"], ["Chamber", "400 psia"], ["Mixture", "5 : 1"]] },
  css: { name: "Centaur Standard Shroud", short: "Shroud", desc: "A 4.27 m fairing that covered both the Centaur and the spacecraft through the atmosphere, wider than the 3.05 m core so the 3.66 m antenna fits inside. It splits in two and falls away.", kv: [["Length", "17.7 m · 58 ft"], ["Cylinder", "4.27 × 12.8 m (14 × 42 ft)"], ["Nose", "4.88 m biconic"], ["Payload envelope", "3.81 × 8.74 m"], ["Jettisoned", "T+4:31 planned · 265 s on TC-7"]] },
  pm: { name: "Propulsion module", short: "Propulsion module", desc: "A truss under the spacecraft carrying a solid kick motor and hydrazine thrusters to steer during its burn. It gave the final push onto the Jupiter trajectory and was then thrown off.", kv: [["Module", "1 m × 0.9 m cylinder"], ["Mass", "1,220 kg incl. 1,060 kg propellant"], ["Hydrazine engines", "4 × 445 N · 4 × 22.2 N"], ["Jettisoned", "burnout + 11 min 17 s"]] },
  pmEng: { name: "TE-M-364-4 solid motor", short: "TE-364-4", desc: "Thiokol's spherical solid motor, the last stage of the launch.", kv: [["Thrust", "68,000 N average"], ["Isp", "283.6 s"], ["Burn", "43 s"], ["Diameter", "0.93 m"], ["Total impulse", "2,910 kN·s"]] },
  sV: { name: "Voyager, stowed for launch", short: "Voyager (stowed)", desc: "The spacecraft folded to fit the shroud: booms tucked down, the magnetometer mast coiled inside its canister, the radio antennas rolled up.", kv: [["Launch mass", "2,100 kg with propulsion module"], ["Mission module", "825 kg after injection"]] },
};
// rated engine data (per engine / per motor). thrustSL + thrustVac give the exit area;
// vacOnly engines run at their vacuum design point.
const ENGINES = {
  UA1205: { name: "UA1205 solid motor", code: "UA1205", solid: true, maker: "United Technology Center", thrustSL: 5293e3 / LBF, ispSL: 238, ispVac: 263, burn: "≈115–117 s", eps: "8 : 1", prop: "PBAN solid", tcs: "1,200,000 lb rated each, Isp 266 s, 117 s [Titan/Centaur summary]",
    note: "<b>A solid motor: once lit it burns to the end.</b> No throttle and no shutdown; what changes with altitude is only the pressure term. Sea-level thrust and Isp are rated; the vacuum figure follows from the same mass flow at the vacuum Isp. Steering came from nitrogen tetroxide sprayed into the nozzle from the tank on each motor's side." },
  LR87: { name: "LR87-AJ-11", code: "LR87", maker: "Aerojet", thrustVac: 260000, thrustSL: 968.4e3 / LBF, ispVac: 301.1, burn: "146 s", mr: "1.915 : 1", eps: "15 : 1", prop: "Aerozine 50 / N₂O₄",
    note: "<b>Air-started.</b> Its two chambers sit idle on the pad and light at T+1:51, when the solids tail off; fired here, the core climbs away from the spent solids until its whole plume clears the platform. Per chamber: 260,000 lbf in vacuum and 968.4 kN at sea level, which fixes the exit area at 1.86 m². Raise the altitude to watch the pressure term fall away." },
  LR91: { name: "LR91-AJ-11", code: "LR91", maker: "Aerojet", thrustVac: 101000, ispVac: 318.7, vacOnly: true, burn: "210 s", eps: "49.2 : 1", prop: "Aerozine 50 / N₂O₄",
    note: "<b>Stage II, in near-vacuum.</b> On TC-6, Voyager 1's launch, a hardware fault shut it down early with about 1,200 lb of propellant unburned. The Centaur made up the difference and finished with 3.4 s of propellant left." },
  RL10: { name: "RL10A-3-3", code: "RL10", maker: "Pratt & Whitney", thrustVac: 15000, ispVac: 444, vacOnly: true, burn: "≈101 s + ≈339 s (TC-7)", mr: "5 : 1", pc: "400 psia", prop: "LH₂ / LOX",
    note: "<b>Two burns.</b> The Centaur's RL10s burned once to reach a parking orbit and again, about 43 minutes later, to leave Earth. Both run at their vacuum design point." },
  TE364: { name: "TE-M-364-4", code: "TE-364-4", solid: true, maker: "Thiokol", thrustVac: 68000 / LBF, ispVac: 283.6, vacOnly: true, burn: "43 s", prop: "solid", impulse: "2,910 kN·s",
    note: "<b>The last push.</b> Fifteen seconds after the Centaur let go, this spherical solid motor fired for 43 s, steered by the propulsion module's hydrazine thrusters, then the module was thrown off. The 68,000 N is its average." },
};
// the solid's vacuum thrust: same mass flow at the vacuum Isp
ENGINES.UA1205.thrustVac = ENGINES.UA1205.thrustSL * ENGINES.UA1205.ispVac / ENGINES.UA1205.ispSL;
const LIFTOFF_KG = 632970;   // Titan IIIE-Centaur at liftoff [Wikipedia, Titan IIIE]
const STACK_GROUPS = {
  SRM: { set: "SRM", eng: "UA1205", code: "UA1205", label: "Stage 0", sub: "2 × UA1205", unit: "motor", unitPl: "motors", alt: 0, apart: false, item: "lSRM", exitR: TITAN_GEOM.srmExitR, plume: { len: 46, padLen: 3.9, sSL: 1.6, sVac: 6.0 }, twLabel: "T/W vs 632,970 kg at liftoff", twMax: 2.5, twMass: LIFTOFF_KG, flown: [["Burn", "≈115–117 s · ignition T−0.2 s"]], idle: "Hold-down · both motors safed" },
  S1: { set: "S1", eng: "LR87", code: "LR87", label: "Stage 1", sub: "LR87 · 2 chambers", unit: "chamber", unitPl: "chambers", alt: 0, apart: true, item: "lS1", exitR: TITAN_GEOM.lr87ExitR, plume: { len: 26, sSL: 1.4, sVac: 5.0 }, flown: [["Burn", "T+1:51 → T+4:20 · 146 s"]] },
  S2: { set: "S2", eng: "LR91", code: "LR91", label: "Stage 2", sub: "LR91", alt: 1e6, apart: true, item: "lS2", exitR: TITAN_GEOM.lr91ExitR, plume: { len: 20, sSL: 3.0, sVac: 3.0 }, flown: [["Burn", "T+4:21 → T+7:51 · 210 s"]] },
  CEN: { set: "CEN", eng: "RL10", code: "RL10", label: "Centaur", sub: "2 × RL10A-3-3", alt: 1e6, apart: true, item: "lCEN", exitR: TITAN_GEOM.rl10ExitR, plume: { len: 14, sSL: 3.2, sVac: 3.2 }, flown: [["Burns (TC-7)", "≈101 s to orbit · ≈339 s to leave Earth"]] },
  PM: { set: "PM", eng: "TE364", code: "TE-364-4", label: "Kick motor", sub: "TE-M-364-4", unit: "motor", alt: 1e6, apart: true, item: "lPM", exitR: TITAN_GEOM.te364ExitR, plume: { len: 8, sSL: 3, sVac: 3 }, flown: [["Burn", "43 s · 15 s after Centaur separation"], ["Total impulse", "2,910 kN·s"]] },
};
const STACK_MENU = [
  ["stack", "Titan IIIE-Centaur on LC-41", { root: true, frame: ["pad", "tower", "srmL", "srmR", "s1", "s1Eng", "s2", "s2Eng", "cen", "cenEng", "cssA", "cssB", "pm", "pmEng", "sV"], info: ["stackInfo"] }],
  ["lSRM", "Solid rocket motors", { mods: ["srmL", "srmR"], group: "SRM", info: ["srmR"], below: 4, belowFiring: 6 }],
  ["lS1", "Core stage 1 · LR87", { mods: ["s1", "s1Eng"], group: "S1", apart: true, info: ["s1", "s1Eng"], belowFiring: 14 }],
  ["lS2", "Stage 2 · LR91", { mods: ["s2", "s2Eng"], group: "S2", apart: true, info: ["s2", "s2Eng"], belowFiring: 10 }],
  ["lCEN", "Centaur D-1T · RL10", { mods: ["cen", "cenEng"], group: "CEN", apart: true, info: ["cen", "cenEng"], belowFiring: 8 }],
  ["lCSS", "Centaur Standard Shroud", { mods: ["cssA", "cssB"], info: ["cssA"] }],
  ["lPM", "Propulsion module · TE-364-4", { mods: ["pm", "pmEng"], group: "PM", apart: true, info: ["pm", "pmEng"], belowFiring: 5 }],
  ["lSV", "Voyager, stowed", { mods: ["sV"], apart: true }],
  ["lPad", "Launch platform and tower", { mods: ["pad", "tower"], info: ["pad", "tower"] }],
];
