#!/usr/bin/env bash
#
# Sync one staged Trailhead example site up to a jwt-auth-gateway S3 bucket.
#
# Run examples/build-for-gateway.sh FIRST — it produces examples/.deploy/<site>/, laid out to
# match the gateway's APP_BASE_PATH (default /app). This script uploads that folder to
# s3://<bucket>/app with the same flags the gateway's own runbook uses:
#   --delete           remove bucket objects no longer in the build (clean releases)
#   --cache-control no-cache   let a release go live at once; CloudFront still revalidates
#
# IMPORTANT
# - APP_BASE_PATH here MUST match the gateway's .env APP_BASE_PATH and the base the site was built
#   with (build-for-gateway.sh). Default /app on both. Pass APP_BASE_PATH= to deploy at the root.
# - Only ONE Trailhead shell can own a given APP_BASE_PATH in a bucket — the two example sites
#   (webawesome, cloudscape) collide if synced to the same bucket+prefix. Use separate buckets,
#   or deploy one at a time and accept that the second overwrites the first.
# - A --delete sync is destructive to anything already under <bucket>/app. The script prints a
#   dry-run diff and asks for confirmation unless -y / YES=1 is given.
#
# Usage:
#   examples/deploy-to-gateway.sh <site> <bucket> [region]
#   AWS_PROFILE=myprofile examples/deploy-to-gateway.sh webawesome my-bucket us-east-1
#   YES=1 examples/deploy-to-gateway.sh cloudscape my-bucket    # skip the confirm prompt
#
# Optional:
#   APP_BASE_PATH=/app   bucket key prefix to sync into (match the build + the gateway .env)
#   DISTRIBUTION_ID=...   if set, create a CloudFront invalidation for the prefix after syncing
#
set -euo pipefail

EXAMPLES_DIR="$(cd "$(dirname "$0")" && pwd)"
OUT="$EXAMPLES_DIR/.deploy"
APP_BASE_PATH="${APP_BASE_PATH-/app}"

site="${1:?Usage: deploy-to-gateway.sh <site> <bucket> [region]  (site: webawesome|cloudscape)}"
bucket="${2:?Usage: deploy-to-gateway.sh <site> <bucket> [region]}"
region="${3:-${AWS_REGION:-}}"

src="$OUT/$site"
[[ -d "$src" ]] || { echo "No staged build at $src — run examples/build-for-gateway.sh $site first." >&2; exit 1; }
[[ -f "$src/index.html" ]] || { echo "$src has no index.html — the build looks incomplete." >&2; exit 1; }

# s3://<bucket><APP_BASE_PATH>  (APP_BASE_PATH already starts with / or is empty for root)
dest="s3://${bucket}${APP_BASE_PATH}"

profile_args=(); [[ -n "${AWS_PROFILE:-}" ]] && profile_args=(--profile "$AWS_PROFILE")
region_args=();  [[ -n "$region" ]] && region_args=(--region "$region")

echo "==> Site:        $site"
echo "==> Source:      $src"
echo "==> Destination: $dest"
echo "==> Flags:       --delete --cache-control no-cache"
echo

# Dry run first so a --delete can never surprise.
echo "==> Dry run (no changes):"
aws s3 sync "$src/" "$dest/" "${profile_args[@]}" "${region_args[@]}" \
  --delete --cache-control no-cache --dryrun

if [[ "${YES:-0}" != "1" ]]; then
  echo
  read -r -p "Proceed with the real sync (this will --delete removed objects under ${APP_BASE_PATH:-/})? [y/N] " ans
  [[ "$ans" == "y" || "$ans" == "Y" ]] || { echo "Aborted."; exit 1; }
fi

echo
echo "==> Syncing..."
aws s3 sync "$src/" "$dest/" "${profile_args[@]}" "${region_args[@]}" \
  --delete --cache-control no-cache

if [[ -n "${DISTRIBUTION_ID:-}" ]]; then
  echo
  echo "==> Invalidating CloudFront ${APP_BASE_PATH:-/}* on $DISTRIBUTION_ID"
  aws cloudfront create-invalidation \
    --distribution-id "$DISTRIBUTION_ID" \
    --paths "${APP_BASE_PATH:-}/*" \
    "${profile_args[@]}" --output text --query 'Invalidation.Id'
fi

echo
echo "Done. Through CloudFront (not the bucket URL):"
echo "  ${APP_BASE_PATH:-}/           the shell (redirects to the first app)"
echo "  ${APP_BASE_PATH:-}/_auth/signin   sign-in (gateway)"
echo "Sign out link in the shell nav points at /_auth/signout."
