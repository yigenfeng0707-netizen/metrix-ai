#!/usr/bin/env bash
# Sync this GitHub checkout into the ModelScope Studio Git repo, POST deploy, poll Running.
# Requires: MODELSCOPE_API_TOKEN, MS_STUDIO_OWNER, MS_STUDIO_NAME
# Never echo secrets.

set -euo pipefail

: "${MODELSCOPE_API_TOKEN:?MODELSCOPE_API_TOKEN is required}"
: "${MS_STUDIO_OWNER:?MS_STUDIO_OWNER is required}"
: "${MS_STUDIO_NAME:?MS_STUDIO_NAME is required}"

MS_ENDPOINT="${MODELSCOPE_ENDPOINT:-https://modelscope.cn}"
SRC="$(cd "$(dirname "$0")/.." && pwd)"
COMMIT_MSG="${DEPLOY_COMMIT_MSG:-deploy: ${GITHUB_SHA:-manual}}"
SHA="${GITHUB_SHA:-$(git -C "$SRC" rev-parse HEAD 2>/dev/null || echo unknown)}"

git_clone_url="https://oauth2:${MODELSCOPE_API_TOKEN}@www.modelscope.cn/studios/${MS_STUDIO_OWNER}/${MS_STUDIO_NAME}.git"

workdir="$(mktemp -d)"
trap 'rm -rf "$workdir"' EXIT

printf '%s\n' "$SHA" > "$SRC/deploy_version.txt"

echo "Cloning ModelScope Studio repo (master)..."
git -c advice.detachedHead=false clone --depth 1 --branch master "$git_clone_url" "$workdir/repo" \
  || git clone "$git_clone_url" "$workdir/repo"

repo="$workdir/repo"
cd "$repo"
git checkout -B master
git config user.email "github-actions[bot]@users.noreply.github.com"
git config user.name "github-actions[bot]"

echo "Syncing GitHub tree into Studio git..."
# Keep .git; replace working tree.
find "$repo" -mindepth 1 -maxdepth 1 ! -name '.git' -exec rm -rf {} +
rsync -a \
  --exclude '.git/' \
  --exclude 'node_modules/' \
  --exclude '.next/' \
  --exclude '.env' \
  --exclude '.env.local' \
  --exclude '.env.*.local' \
  --exclude 'ml/weights.pt' \
  --exclude 'ml/__pycache__/' \
  "$SRC/" "$repo/"

git add -A
if git diff --staged --quiet; then
  echo "No file changes; still triggering deploy."
else
  git commit -m "$COMMIT_MSG"
  echo "Pushing to ModelScope master (no force push)..."
  git push origin master
fi

echo "POST OpenAPI deploy..."
deploy_http="$(curl -sS -o "$workdir/deploy.json" -w '%{http_code}' \
  -X POST "${MS_ENDPOINT}/openapi/v1/studios/${MS_STUDIO_OWNER}/${MS_STUDIO_NAME}/deploy" \
  -H "Authorization: Bearer ${MODELSCOPE_API_TOKEN}" \
  -H "Accept: application/json")"

if [[ "$deploy_http" != "200" ]]; then
  echo "ERROR: deploy HTTP $deploy_http" >&2
  cat "$workdir/deploy.json" >&2
  exit 1
fi

echo "Polling status (Docker build can take >4 min)..."
for i in $(seq 1 90); do
  curl -sS \
    "${MS_ENDPOINT}/openapi/v1/studios/${MS_STUDIO_OWNER}/${MS_STUDIO_NAME}" \
    -H "Authorization: Bearer ${MODELSCOPE_API_TOKEN}" \
    -H "Accept: application/json" \
    -o "$workdir/status.json"

  status="$(python3 -c "import json; d=json.load(open('$workdir/status.json')); x=d.get('Data') or d.get('data') or {}; print(x.get('Status') or x.get('status') or '')" 2>/dev/null || true)"
  url="$(python3 -c "import json; d=json.load(open('$workdir/status.json')); x=d.get('Data') or d.get('data') or {}; print(x.get('IndependentUrl') or x.get('independent_url') or '')" 2>/dev/null || true)"
  failed_msg="$(python3 -c "import json; d=json.load(open('$workdir/status.json')); x=d.get('Data') or d.get('data') or {}; print(x.get('FailedMessage') or x.get('failed_message') or '')" 2>/dev/null || true)"

  echo "  [$i/90] Status: ${status:-unknown}"

  case "$status" in
    Running)
      demo="${url:-https://${MS_STUDIO_OWNER}-${MS_STUDIO_NAME}.ms.show}"
      echo "Deploy succeeded. Demo: $demo"
      exit 0
      ;;
    Failed|Error)
      echo "ERROR: deploy failed — ${failed_msg:-see studio logs}" >&2
      curl -sS "${MS_ENDPOINT}/openapi/v1/studios/${MS_STUDIO_OWNER}/${MS_STUDIO_NAME}/logs/build" \
        -H "Authorization: Bearer ${MODELSCOPE_API_TOKEN}" | head -c 4000 >&2 || true
      exit 1
      ;;
  esac
  sleep 10
done

echo "ERROR: timed out waiting for Running" >&2
exit 1
