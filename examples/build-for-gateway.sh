#!/usr/bin/env bash
#
# Build both Trailhead example sites and assemble gateway-ready static assets.
#
# Produces, under the git-ignored examples/.deploy/ folder, one subfolder per site laid out
# EXACTLY as the jwt-auth-gateway expects to find a Trailhead deployment under its APP_BASE_PATH:
#
#   .deploy/<site>/
#     index.html                 the shell page (no inline script, so CSP script-src 'self' works)
#     shell.js  shell.css        the shell bundle
#     shell.json                 nav + app manifest, plus this deployment's apiUrl + auth
#     webawesome/                design-system assets (webawesome site only)
#     <app>/app.js  <app>/<app>.css   each SPA, at the basePath the shell's shell.json names
#
# The shell is built with base = <APP_BASE_PATH>/ so every asset URL, the shell.json nav hrefs
# and %BASE_URL% in index.html resolve under that prefix. The matching gateway .env must set the
# SAME APP_BASE_PATH (default /app) and the shell's appBasePath is driven from it here.
#
# Usage:
#   examples/build-for-gateway.sh                 # both sites, APP_BASE_PATH=/app, authMode=cognito
#   APP_BASE_PATH=/app examples/build-for-gateway.sh
#   API_URL=/api AUTH_MODE=cognito examples/build-for-gateway.sh webawesome
#   examples/build-for-gateway.sh cloudscape      # just one site
#
# Env knobs (all optional, shown with defaults):
#   APP_BASE_PATH=/app   bucket prefix the shell is served under. "" = bucket root.
#   API_URL=/api         shell.http base; the gateway's same-origin proxy. "" = none.
#   AUTH_MODE=cognito    "cognito" (redirect/refresh recovery) or "credentials".
#
set -euo pipefail

# examples/ dir (this script's location)
EXAMPLES_DIR="$(cd "$(dirname "$0")" && pwd)"
OUT="$EXAMPLES_DIR/.deploy"

APP_BASE_PATH="${APP_BASE_PATH-/app}"
API_URL="${API_URL-/api}"
AUTH_MODE="${AUTH_MODE-cognito}"

# Which sites to build: args, or both by default.
SITES=("$@")
if [[ ${#SITES[@]} -eq 0 ]]; then
  SITES=(webawesome cloudscape)
fi

log()  { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m!!\033[0m %s\n' "$*" >&2; }
die()  { printf '\033[1;31mxx\033[0m %s\n' "$*" >&2; exit 1; }

# Write this deployment's apiUrl + auth strategy into the staged shell.json, which core reads at
# start-up. This replaces the old inline window.APP_CONFIG <script>: a script-src 'self' CSP blocks
# inline scripts, and node serialises the values as JSON, so nothing is spliced into markup.
write_shell_config() {
  local manifest="$1"
  [[ -f "$manifest" ]] || die "shell.json not found at $manifest"
  [[ "$AUTH_MODE" == "cognito" || "$AUTH_MODE" == "credentials" ]] \
    || die "AUTH_MODE must be cognito or credentials (got '$AUTH_MODE')"
  API_URL="$API_URL" AUTH_MODE="$AUTH_MODE" node -e '
    const fs = require("fs");
    const file = process.argv[1];
    const m = JSON.parse(fs.readFileSync(file, "utf8"));
    if (process.env.API_URL) m.apiUrl = process.env.API_URL; else delete m.apiUrl;
    m.auth = { strategy: process.env.AUTH_MODE };
    fs.writeFileSync(file, JSON.stringify(m, null, 2) + "\n");
  ' "$manifest"
}

build_site() {
  local site="$1"
  local site_dir="$EXAMPLES_DIR/${site}-site"
  [[ -d "$site_dir" ]] || die "unknown site '$site' (expected $site_dir)"
  local dest="$OUT/$site"

  log "[$site] building shell (base=${APP_BASE_PATH:-/})"
  rm -rf "$dest"
  mkdir -p "$dest"

  # 1) Shell — built with the gateway base path so all URLs resolve under APP_BASE_PATH.
  ( cd "$site_dir/shell" && VITE_APP_BASE_PATH="$APP_BASE_PATH" npm run build >/dev/null )
  cp -R "$site_dir/shell/dist/." "$dest/"

  # 2) Write the deployment config (apiUrl + auth) into the staged shell.json. Every route's
  #    index.html is the same shell page and reads this one file.
  write_shell_config "$dest/shell.json"

  # 3) Each app named in the shell's shell.json -> built and placed at <basePath>/.
  #    CRITICAL: the gateway gate rewrites an extensionless deep link `<APP_BASE_PATH>/<app>` to
  #    the S3 key `<APP_BASE_PATH>/<app>/index.html` (resolveAppShell in the gate's routing.ts).
  #    S3-behind-OAC has no directory index, so without that object CloudFront returns 403 Access
  #    Denied. Trailhead's model is "every route has its own index.html" — a copy of the shell
  #    page; the shell boots there, reads the URL and loads the matching app. So each app folder
  #    gets: app.js, <src>.css, AND a copy of the (configured) shell index.html.
  local manifest="$site_dir/shell/public/shell.json"
  [[ -f "$manifest" ]] || die "[$site] shell.json not found at $manifest"

  # Read apps as "id<TAB>basePath<TAB>src" via node (no jq dependency).
  while IFS=$'\t' read -r id basePath src; do
    [[ -z "$id" ]] && continue
    local app_dir="$site_dir/apps/$src"
    [[ -d "$app_dir" ]] || { warn "[$site] app src '$src' (id=$id) has no dir at $app_dir — skipping"; continue; }
    log "[$site] building app '$id' -> ${APP_BASE_PATH}${basePath}"
    ( cd "$app_dir" && npm run build >/dev/null )
    # Shell loads <basePath>/app.js and <basePath>/<src>.css. dest already has APP_BASE_PATH
    # stripped (it IS the app root), so place under <basePath> relative to dest.
    local app_out="$dest${basePath}"
    mkdir -p "$app_out"
    cp "$app_dir/dist/app.js" "$app_out/app.js"
    # The shell requests "<src>.css"; the app may emit a differently-named css — normalise it.
    local css
    css=$(find "$app_dir/dist" -maxdepth 1 -name '*.css' | head -1 || true)
    [[ -n "$css" ]] && cp "$css" "$app_out/${src}.css"
    # The deep-link index.html the gate rewrites to — a copy of the configured shell page.
    cp "$dest/index.html" "$app_out/index.html"
  done < <(node -e '
    const m = require(process.argv[1]);
    for (const a of (m.apps || [])) process.stdout.write(`${a.id}\t${a.basePath}\t${a.src}\n`);
  ' "$manifest")

  log "[$site] staged at $dest"
}

command -v node >/dev/null || die "node is required"
command -v npm  >/dev/null || die "npm is required"

mkdir -p "$OUT"
for site in "${SITES[@]}"; do
  build_site "$site"
done

echo
log "Done. Staged under: $OUT"
for site in "${SITES[@]}"; do
  echo "  $site  ->  $OUT/$site   (apiUrl=${API_URL:-none}, authMode=${AUTH_MODE})"
done
echo
echo "Next: sync one site to your gateway bucket:"
echo "  examples/deploy-to-gateway.sh <site> <BucketName> [region]"
echo "  (set APP_BASE_PATH on the gateway's .env to match: ${APP_BASE_PATH:-<root>})"
