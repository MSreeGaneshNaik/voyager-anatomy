// ============================================================================
// 10 · TRUTH — every number shown on the page comes from here (sources in
// SOURCES). Anything derived is computed with standard physics, never tuned.
// ============================================================================
const LBF = 4.4482216152605;      // N per lbf (exact)
const LB = 0.45359237;            // kg per lb (exact)
const FT = 0.3048;                // m per ft (exact)
const G0 = 9.80665;               // standard gravity, m/s² (exact)
const P0 = 101325;                // sea-level standard pressure, Pa
const AU = 149597870.7;           // km (IAU 2012, exact)
const C_KMS = 299792.458;         // speed of light, km/s (exact)

// --- U.S. Standard Atmosphere 1976, geopotential layers to 86 km -------------
const ATM_LAYERS = [[0, 288.15, -0.0065], [11000, 216.65, 0], [20000, 216.65, 0.001], [32000, 228.65, 0.0028], [47000, 270.65, 0], [51000, 270.65, -0.0028], [71000, 214.65, -0.002], [84852, 186.946, 0]];
const ATM_P = (() => { const R = 287.05287, out = [P0]; for (let i = 0; i < ATM_LAYERS.length - 1; i++) { const [h0, T0, L] = ATM_LAYERS[i], h1 = ATM_LAYERS[i + 1][0], p = out[i]; out.push(L === 0 ? p * Math.exp(-G0 * (h1 - h0) / (R * T0)) : p * Math.pow((T0 + L * (h1 - h0)) / T0, -G0 / (L * R))); } return out; })();
function pressureAt(hGeometric) { // Pa
  const r0 = 6356766, h = (r0 * Math.max(0, hGeometric)) / (r0 + Math.max(0, hGeometric)), R = 287.05287;
  let i = ATM_LAYERS.length - 1; while (i > 0 && h < ATM_LAYERS[i][0]) i--;
  const [h0, T0, L] = ATM_LAYERS[i], p0 = ATM_P[i];
  if (h > 86000) return 0.3734 * Math.exp(-(h - 86000) / 6000);
  return L === 0 ? p0 * Math.exp(-G0 * (h - h0) / (R * T0)) : p0 * Math.pow((T0 + L * (h - h0)) / T0, -G0 / (L * R));
}

const MODULES_PRE = {};
// --- The spacecraft (identical twins) ------------------------------------------
const PROBE = {
  tankR: 0.71 / 2,       // hydrazine tank, 0.71 m titanium sphere [PK]
  recordCoverR: 0.165,   // record cover, drawn around the 12-inch record
  rtgLen: 0.5831, rtgFinR: 0.3973 / 2,   // MHW-RTG 58.31 cm long, 39.73 cm across the fins [BEN]
  magLen: 13, lfm: [7],  // inner low-field sensor 6 m in from the tip [PK]
  praLen: 10,
  sciLen: 2.3,           // science boom [PK]
};

// Assembly sheets. kv rows are shown on hover, in the parts index and under the figure.
const PARTINFO = {
  frame: { name: "Bus structure", short: "Bus", by: "JPL", desc: "A ten-sided aluminium framework of electronics bays between two decks, 29.5 kg, with the hydrazine tank in its central cavity. Two Canopus star trackers sit side by side on the upper ring. Everything else hangs off it.", kv: [["Shape", "decagon, 10 bays"], ["Across flats", "1.78 m · 5.8 ft"], ["Height", "47 cm · 18.5 in"], ["Frame mass", "29.5 kg"], ["Mission module", "825 kg after injection"], ["Science payload", "105 kg"]] },
  tank: { name: "Hydrazine tank", short: "Tank", desc: "One 0.71 m titanium sphere in the middle of the bus, with a rubber bladder. Helium pressurant blows the hydrazine down to all sixteen thrusters; none is pumped.", kv: [["Diameter", "0.71 m · 28 in"], ["Hydrazine at launch", "105 kg"], ["Helium", "420 → ≈130 psi blow-down"], ["Feeds", "16 × 0.89 N thrusters"]] },
  bay: { desc: "One of ten bays round the bus, numbered 1 to 10 clockwise as seen from Earth. Bay 1 holds the radio transmitter and one bay the magnetometer electronics; four carry thermal-control louvres. Each is a box of electronics behind a cover plate and a black thermal blanket.", kv: [["Bays", "10, clockwise from Earth"], ["Louvred bays", "4"]] },
  record: { name: "The Golden Record", short: "Golden Record", desc: "A 12-inch gold-plated copper record of sounds, music, greetings in 55 languages and 115 encoded images, in an aluminium cover engraved with instructions for playing it and a pulsar map to the Sun. A 2 cm spot of uranium-238 on the cover is a clock: its decay dates the record.", kv: [["Record", "30 cm gold-plated copper"], ["Speed", "16⅔ rpm"], ["Music", "90 minutes"], ["Languages", "55"], ["Images", "115"], ["Packed with", "a cartridge and stylus"]] },
  cover: { name: "Golden Record cover", desc: "The aluminium jacket over the record, engraved with how to play it and where it came from. Upper left, the record and stylus seen from above and side-on, with one turn (3.6 s) and the playing time in binary; upper right, how to rebuild the pictures; lower left, the Sun's position as distances to fourteen pulsars, each with its period in binary; lower right, the hydrogen atom whose 0.704 ns transition is the unit of time for every number on it. An ultra-pure uranium-238 source plated on the cover is a clock for its age.", kv: [["Unit of time", "0.704 ns (hydrogen, 21 cm)"], ["Pulsars mapped", "14"], ["One turn", "3.6 s"], ["Per side", "≈53.8 min"], ["U-238", "0.00026 µCi on a 2 cm area"]] },
  hga: { name: "High-gain antenna", short: "HGA", by: "JPL", desc: "A 3.66 m dish of aluminium honeycomb in graphite-epoxy skins on a 1.78 m support ring, pointed at Earth for the whole mission. X-band runs as a Cassegrain off a frequency-selective subreflector; S-band passes through it to a feed behind, which carries the low-gain antenna on its back. The Sun sensor looks through a slot in the dish.", kv: [["Diameter", "3.66 m · 12 ft"], ["Gain", "≈48 dBi X · ≈36 dBi S"], ["Beamwidth", "0.6° X · 2.3° S"], ["Downlink", "8.4 GHz X · 2.3 GHz S"], ["Low-gain antenna", "≈7 dBi"], ["Data rate at Jupiter", "115.2 kbit/s"], ["Data rate today", "160 bit/s"]] },
  sci: { name: "Science boom", short: "Science boom", desc: "A 2.3 m boom of graphite-epoxy tubing. The cosmic-ray and low-energy particle instruments sit on opposite sides at its middle, the plasma instrument farther out, and the scan platform at the tip, as far from the RTGs as the spacecraft allows.", kv: [["Length", "2.3 m · 7.5 ft"], ["Material", "graphite-epoxy tubing"], ["To nearest RTG", "4.9 m (boom) · 6.7 m (platform)"]] },
  crs: { name: "Cosmic Ray Subsystem", short: "CRS", desc: "Solid-state telescopes that count and identify cosmic-ray nuclei and electrons: two high-energy telescopes and four low-energy telescopes looking in different directions.", kv: [["Mass", "7.5 kg"], ["Power", "8.25 W"]] },
  lecp: { name: "Low-Energy Charged Particle instrument", short: "LECP", desc: "Two particle telescopes on a stepper-motor platform that turns them through a full circle, sampling particles from every direction. On Voyager 1 the stepper still turns, though the detectors are off, because it keeps the motor warm; it draws a 15.7 W pulse every 192 s.", kv: [["Mass", "7.5 kg"], ["Power", "9.46 W"], ["Stepper", "15.7 W pulse every 192 s"]] },
  pls: { name: "Plasma Science", short: "PLS", desc: "Faraday cups that catch the charged particles of the solar wind: the main sensor, equivalent to three cups, faces the Sun and Earth; a fourth cup looks out at a right angle.", kv: [["Mass", "9.9 kg"], ["Power", "9.9 W"]] },
  scan: { name: "Scan platform", short: "Scan platform", desc: "A two-axis platform at the tip of the science boom that aims the remote-sensing instruments without turning the spacecraft: a full turn in azimuth and 210° in elevation, at four slew rates.", kv: [["Gimballed mass", "107 kg"], ["Azimuth", "360°"], ["Elevation", "210°"], ["Slew rates", "1 · 0.33 · 0.083 · 0.0052 °/s"]] },
  iss: { name: "Imaging Science Subsystem", short: "ISS cameras", desc: "Two vidicon cameras. The narrow-angle camera sits behind a 1,500 mm catadioptric Cassegrain telescope; the wide-angle camera has a 200 mm lens. Each frame is 800 × 800 pixels.", kv: [["Narrow angle", "1,500 mm f/8.5 · 0.424°"], ["Aperture", "176.5 mm"], ["Wide angle", "200 mm · 3.169°"], ["Frame", "800 × 800 vidicon"], ["NA camera", "22.06 kg · 0.98 m long"], ["ISS total", "38.2 kg · 41.7 W"]] },
  iris: { name: "Infrared Interferometer Spectrometer", short: "IRIS", desc: "A 50 cm Cassegrain telescope feeding a Michelson interferometer that reads temperature and composition from infrared spectra between 4 and 55 µm.", kv: [["Telescope", "50 cm Cassegrain"], ["Field of view", "0.25°"], ["Range", "4–55 µm"]] },
  uvs: { name: "Ultraviolet Spectrometer", short: "UVS", desc: "A grating spectrometer behind a slatted collimator that reads the ultraviolet glow of atmospheres and the gas between the planets.", kv: [["Mass", "4.5 kg"], ["Power", "2.5 W"]] },
  pps: { name: "Photopolarimeter Subsystem", short: "PPS", desc: "A small Cassegrain telescope with filter and analyser wheels that measures how bright and how polarised light is, to probe hazes, rings and surfaces.", kv: [["Mass", "4.4 kg"], ["Power", "2.6 W"], ["Field of view", "3.5° to 1/16°"]] },
  rtgBoom: { name: "RTG boom", short: "RTG boom", desc: "A deployable steel and titanium boom, hinged on outrigger struts, that holds the three power sources end to end, well away from the instruments their radiation would disturb.", kv: [["Material", "steel and titanium"], ["Carries", "3 MHW-RTGs in tandem"]] },
  rtg: { desc: "A multi-hundred-watt radioisotope thermoelectric generator in a beryllium case. Plutonium-238 oxide heats silicon–germanium thermocouples; six fins radiate the waste heat. Output falls about 4 W a year as the plutonium decays and the thermocouples age.", kv: [["Length", "58.3 cm"], ["Across fins", "39.7 cm"], ["Mass", "37.7 kg"], ["Heat", "≈2,400 W"], ["Electrical, at launch", "≈158 W"]] },
  mag: { name: "Magnetometer boom", short: "MAG boom", desc: "A 13 m epoxy-glass Astromast that stood coiled in a 23 × 66 cm aluminium canister for launch and sprang out into a triangular mast. Low-field magnetometers ride at its tip and 6 m in from it; two high-field units stay on the spacecraft.", kv: [["Length", "13 m"], ["Mast mass", "2.3 kg"], ["Canister", "23 cm × 66 cm"], ["Sensors", "2 low-field on the boom · 2 high-field on the body"]] },
  pra: { name: "PRA / PWS antennas", short: "PRA · PWS antennas", desc: "Two 10 m beryllium-copper whips at right angles, run out by small motors. The radio astronomy receiver uses them as two monopoles, the plasma wave receiver as one V-shaped dipole.", kv: [["Length", "2 × 10 m"], ["Material", "beryllium copper"]] },
  thr: { name: "Hydrazine thrusters", short: "Thrusters", desc: "Sixteen 0.89 N hydrazine thrusters: four for trajectory correction and twelve for attitude, in two redundant branches of six. Clogging propellant lines have forced several branch swaps since 2002, the latest in 2024 and 2025.", kv: [["Thrusters", "16 × 0.89 N (0.2 lbf)"], ["Trajectory correction", "4"], ["Attitude", "2 branches × 6"]], },
};

// --- The eleven investigations ----------------------------------------------------
// status: [Voyager 1, Voyager 2] — "on" or the date it was switched off (NASA, 15 Oct 2026)
const INSTRUMENTS = [
  { id: "iISS", short: "Imaging · ISS", name: "Imaging Science Subsystem", mods: ["iss"], what: "Pictures: narrow- and wide-angle vidicon cameras", mass: "38.2 kg", power: "41.7 W", status: ["14 Feb 1990", "Oct–Dec 1989"] },
  { id: "iIRIS", short: "Infrared · IRIS", name: "Infrared Interferometer Spectrometer", mods: ["iris"], what: "Temperatures and composition from infrared spectra, 4–55 µm", mass: "", power: "", status: ["3 Jun 1998", "1 Feb 2007"] },
  { id: "iUVS", short: "Ultraviolet · UVS", name: "Ultraviolet Spectrometer", mods: ["uvs"], what: "Ultraviolet spectra of atmospheres and interplanetary gas", mass: "4.5 kg", power: "2.5 W", status: ["19 Apr 2016", "12 Nov 1998"] },
  { id: "iPPS", short: "Photopolarimeter · PPS", name: "Photopolarimeter Subsystem", mods: ["pps"], what: "Brightness and polarisation of light from hazes, rings and surfaces", mass: "4.4 kg", power: "2.6 W", status: ["29 Jan 1980", "3 Apr 1991"] },
  { id: "iMAG", short: "Magnetometers · MAG", name: "Magnetometers", mods: ["mag"], what: "Magnetic fields of the planets, the solar wind and interstellar space", mass: "5.6 kg", power: "2.1 W", status: ["on", "on"] },
  { id: "iCRS", short: "Cosmic rays · CRS", name: "Cosmic Ray Subsystem", mods: ["crs"], what: "Cosmic-ray nuclei and electrons", mass: "7.5 kg", power: "8.25 W", status: ["25 Feb 2025", "on"] },
  { id: "iLECP", short: "Charged particles · LECP", name: "Low-Energy Charged Particle instrument", mods: ["lecp"], what: "Low-energy ions and electrons from every direction", mass: "7.5 kg", power: "9.46 W", status: ["17 Apr 2026", "24 Mar 2025"] },
  { id: "iPLS", short: "Plasma · PLS", name: "Plasma Science", mods: ["pls"], what: "Speed, density and temperature of the solar wind", mass: "9.9 kg", power: "9.9 W", status: ["1 Feb 2007", "26 Sep 2024"] },
  { id: "iPRA", short: "Radio astronomy · PRA", name: "Planetary Radio Astronomy", mods: ["pra"], what: "Radio emission from planets and the Sun, 20.4 kHz–40.5 MHz", mass: "7.7 kg", power: "6.7 W", status: ["15 Jan 2008", "21 Feb 2008"] },
  { id: "iPWS", short: "Plasma waves · PWS", name: "Plasma Wave Subsystem", mods: ["pra"], what: "Waves in the plasma around the spacecraft, 10 Hz–56 kHz", mass: "1.4 kg", power: "1.6 W", status: ["on", "on"] },
  { id: "iRSS", short: "Radio science · RSS", name: "Radio Science", mods: ["hga"], what: "Atmospheres, rings and masses from the radio link itself", mass: "", power: "", status: ["—", "—"] },
];
for (const I of INSTRUMENTS) {
  const st = (x) => (x === "on" ? "On" : x === "—" ? "Uses the radio" : "Off since " + x);
  MODULES_PRE[I.id] = { name: I.name, desc: I.what + ".", kv: [...(I.mass ? [["Mass", I.mass]] : []), ...(I.power ? [["Power", I.power]] : []), ["Voyager 1", st(I.status[0])], ["Voyager 2", st(I.status[1])]] };
}
const MODULES = MODULES_PRE;   // module key → { name, short, desc, kv, by } — filled as parts are built
const SOURCES = [];   // [title, url] — filled from the research

