// Assembles src/ into one standalone page: dist/voyager.html.
// Every src/**/NN-*.js is concatenated in NN order into a single module script;
// src/page/ holds the stylesheet and the page markup.
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from "node:fs";
import { join, basename, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const srcDir = join(root, "src");
const out = join(root, "dist", "voyager.html");

const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]));
const jsFiles = walk(srcDir).filter((f) => /^\d\d-.*\.js$/.test(basename(f))).sort((a, b) => basename(a).localeCompare(basename(b)));
const js = jsFiles.map((f) => `// ---- ${basename(f)} ----\n` + readFileSync(f, "utf8")).join("\n");
const page = (f) => readFileSync(join(srcDir, "page", f), "utf8");
// Icons are inlined so the page stays one self-contained file.

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Voyager Anatomy</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="description" content="Interactive 3D technical drawing of Voyager 1 and 2: the spacecraft part by part, the Titan IIIE-Centaur that launched them, and both Grand Tours on a to-scale map of the solar system.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,300..900&family=IBM+Plex+Mono:wght@400;500;600&display=swap">
<style>
${page("style.css")}
</style>
</head>
<body>
${page("body.html")}
<script type="module">
${js}
</script>
</body>
</html>
`;
mkdirSync(join(root, "dist"), { recursive: true });
// the same page as an Artifact body: the host adds doctype, head and body
const frag = html.replace(/^<!doctype html>[\s\S]*?<head>\n/, "").replace(/<\/head>\n<body>\n/, "").replace(/<\/body>\n<\/html>\n$/, "").replace(/<meta charset="utf-8">\n<meta name="viewport"[^>]*>\n/, "");
writeFileSync(join(root, "dist", "artifact.html"), frag);
writeFileSync(out, html);
console.log(`wrote ${relative(root, out)}`, (html.length / 1024).toFixed(1) + " KB:", jsFiles.map((f) => relative(srcDir, f)).join(", "));
