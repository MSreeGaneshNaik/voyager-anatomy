#!/bin/sh
# Builds dist/voyager.html and publishes it to the gh-pages branch, which GitHub Pages serves:
# the page as index.html (and voyager.html), plus status.json. status.json on gh-pages belongs to the
# DSN watcher (.github/workflows/dsn-watch.yml), so a deploy keeps it and only seeds it the first time.
set -e
cd "$(dirname "$0")/.."
repo=$(pwd)
node scripts/build.mjs
site=$(mktemp -d)
if git fetch -q origin gh-pages 2>/dev/null; then
  git worktree add -q --detach "$site" origin/gh-pages
else
  git worktree add -q --detach "$site" HEAD && (cd "$site" && git checkout -q --orphan gh-pages && git rm -rqf .)
fi
cd "$site"
[ -f status.json ] && cp status.json /tmp/voyager-status.json || cp "$repo/status.json" /tmp/voyager-status.json
git rm -rq --ignore-unmatch . >/dev/null 2>&1 || true
cp "$repo/dist/voyager.html" index.html
cp "$repo/dist/voyager.html" voyager.html
cp /tmp/voyager-status.json status.json
touch .nojekyll
git add -A
if git commit -q -m "Deploy $(git -C "$repo" rev-parse --short HEAD)"; then git push -q origin HEAD:gh-pages && echo "deployed"; else echo "site already up to date"; fi
cd "$repo"
git worktree remove --force "$site"
