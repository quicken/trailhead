#!/usr/bin/env bash
#
# Build both Trailhead example sites and assemble gateway-ready static assets.
#
# Produces, under the git-ignored examples/.deploy/ folder, one subfolder per site laid out
# EXACTLY as the jwt-auth-gateway expects to find a Trailhead deployment under its APP_BASE_PATH:
#
#   .deploy/<site>/
#     index.html                 the shell page (APP_CONFIG injected: apiUrl + authMode)
#     shell.js  shell.css        the shell bundle
#     shell.json                 nav + app manifest
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

# Inject a window.APP_CONFIG <script> into the <head> of a built index.html, so the shell's
# runtime reads apiUrl + authMode. Idempotent-ish: strips any prior injected block first.
inject_app_config() {
  local html="$1"
  [[ -f "$html" ]] || die "index.html not found at $html"
  local cfg
  cfg=$(cat <<EOF
<script>window.APP_CONFIG = { apiUrl: "${API_URL}", authMode: "${AUTH_MODE}" };</script>
EOF
)
  # Remove a previously injected block (between the markers) if re-run on the same file.
  perl -0pi -e 's{<!-- APP_CONFIG:start -->.*?<!-- APP_CONFIG:end -->\n?}{}gs' "$html"
  # Insert right after <head ...> (first occurrence).
  perl -0pi -e "s{(<head[^>]*>)}{\$1\n    <!-- APP_CONFIG:start -->\n    ${cfg}    <!-- APP_CONFIG:end -->}s" "$html"
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

  # 2) Each app named in the shell's shell.json -> built and placed at <basePath>/app.js + CSS.
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
  done < <(node -e '
    const m = require(process.argv[1]);
    for (const a of (m.apps || [])) process.stdout.write(`${a.id}\t${a.basePath}\t${a.src}\n`);
  ' "$manifest")

  # 3) Inject APP_CONFIG into the shell index.html copy.
  inject_app_config "$dest/index.html"

  log "[$site] staged at $dest"
}

command -v node >/dev/null || die "node is required"
command -v npm  >/dev/null || die "npm is required"
command -v perl >/dev/null || die "perl is required (used to inject APP_CONFIG)"

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
