// Reads NASA's Deep Space Network "DSN Now" feed and records, in status.json, the last time a DSN dish
// was hearing Voyager 1 (VGR1) or Voyager 2 (VGR2): when, which dish, and the range the network reports.
// Run by .github/workflows/dsn-watch.yml every half hour; no dependencies (Node 20+).
//   node scripts/dsn-watch.mjs path/to/status.json
// It never declares a mission over: "silent" and "ended" stay a person's call (edit status.json).
// The page itself flags a probe the network hasn't heard for weeks.
import { readFileSync, writeFileSync } from "node:fs";

const FILE = process.argv[2] || "status.json";
const FEED = "https://eyes.nasa.gov/dsn/data/dsn.xml";
const IDS = { VGR1: "V1", VGR2: "V2" };
const STATIONS = { gdscc: "Goldstone", mdscc: "Madrid", cdscc: "Canberra" };

const res = await fetch(`${FEED}?r=${Date.now()}`, { headers: { "user-agent": "voyager-anatomy status check (github.com/MSreeGaneshNaik/voyager-anatomy)" } });
if (!res.ok) { console.log(`DSN Now answered ${res.status}; leaving status.json as it is`); process.exit(0); }
const xml = await res.text();

// walk the feed in order: each <station> is followed by its dishes
const attrs = (tag) => Object.fromEntries([...tag.matchAll(/(\w+)="([^"]*)"/g)].map((m) => [m[1], m[2]]));
const heard = {};
let station = "";
for (const m of xml.matchAll(/<station\b[^>]*>|<dish\b[^>]*>([\s\S]*?)<\/dish>/g)) {
  if (m[0].startsWith("<station")) { station = STATIONS[attrs(m[0]).name] || attrs(m[0]).friendlyName || ""; continue; }
  const dish = attrs(m[0].slice(0, m[0].indexOf(">") + 1)).name, body = m[1];
  for (const d of body.matchAll(/<downSignal\b[^>]*>/g)) {
    const a = attrs(d[0]), k = IDS[(a.spacecraft || "").toUpperCase()];
    if (!k || a.active !== "true") continue;
    const t = [...body.matchAll(/<target\b[^>]*>/g)].map((x) => attrs(x[0])).find((x) => (x.name || "").toUpperCase() === a.spacecraft.toUpperCase()) || {};
    heard[k] = { dish: dish.replace(/^DSS(\d+)$/, "DSS-$1"), station, rangeKm: +t.downlegRange > 0 ? Math.round(+t.downlegRange) : null, rtltS: +t.rtlt > 0 ? +t.rtlt : null, signal: a.signalType || "" };
  }
}

const now = new Date(), iso = now.toISOString().slice(0, 16) + "Z", day = iso.slice(0, 10);
const S = JSON.parse(readFileSync(FILE, "utf8"));
// refresh a probe's record when a new pass starts (another dish) or every three hours during one,
// so the repo gets a handful of commits a day rather than one every half hour
for (const [k, h] of Object.entries(heard)) {
  S[k] = S[k] || { state: "operating" };
  const prev = S[k].dsn, age = prev?.at ? (now - new Date(prev.at)) / 3.6e6 : Infinity;
  if (!prev || prev.dish !== h.dish || age >= 3) S[k].dsn = { at: iso, ...h };
  S[k].lastContact = day;
}
// the date of the check, so the page can tell a running watcher from a stopped one
S.checked = day;
S.source = "NASA Deep Space Network, DSN Now feed";
writeFileSync(FILE, JSON.stringify(S, null, 2) + "\n");
console.log(Object.keys(heard).length ? `heard ${Object.entries(heard).map(([k, h]) => `${k} on ${h.dish} ${h.station}`).join(", ")}` : "neither Voyager on a dish right now");
