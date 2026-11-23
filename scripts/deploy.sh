#!/usr/bin/env bash
# Deploy the committed HEAD to the Hostinger VPS, or roll back to the previous release.
#
#   npm run deploy              # build HEAD on the server, swap it in, restart, health-check
#   npm run deploy -- --rollback  # swap the previous release back in
#
# The new release is built in /var/www/dunebuddy.new while the old one keeps serving, so the
# only downtime is the pm2 restart. If the health check fails, it rolls back automatically.
# Override the target with DEPLOY_HOST / DEPLOY_URL.
set -euo pipefail

HOST="${DEPLOY_HOST:-root@72.61.65.153}"
URL="${DEPLOY_URL:-https://srv1307055.hstgr.cloud}"
APP_DIR=/var/www/dunebuddy
PM2_NAME=dunebuddy-api

cd "$(dirname "$0")/.."

health_check() {
  for _ in $(seq 1 15); do
    if [ "$(curl -s -m 5 "$URL/health")" = '{"status":"ok"}' ] &&
      [ "$(curl -s -m 5 -o /dev/null -w '%{http_code}' "$URL/")" = 200 ]; then
      return 0
    fi
    sleep 2
  done
  return 1
}

remote_rollback() {
  ssh -o BatchMode=yes "$HOST" "set -euo pipefail
    test -d $APP_DIR.prev || { echo 'No previous release to roll back to.'; exit 1; }
    rm -rf $APP_DIR.failed
    mv $APP_DIR $APP_DIR.failed
    mv $APP_DIR.prev $APP_DIR
    pm2 restart $PM2_NAME --update-env >/dev/null && pm2 save >/dev/null
    echo \"Rolled back to \$(cat $APP_DIR/REVISION 2>/dev/null || echo unknown)\""
}

if [ "${1:-}" = "--rollback" ]; then
  remote_rollback
  health_check && echo "Live and healthy: $URL" || { echo "Health check failed after rollback."; exit 1; }
  exit 0
fi

if [ -n "$(git status --porcelain)" ]; then
  echo "Uncommitted changes. Commit or stash first; the deploy ships the committed HEAD." >&2
  exit 1
fi

SHA="$(git rev-parse --short HEAD)"
if git fetch -q origin 2>/dev/null && [ "$(git rev-parse HEAD)" != "$(git rev-parse '@{u}' 2>/dev/null)" ]; then
  echo "Note: $SHA isn't pushed to GitHub yet. Deploying it anyway."
fi

echo "Uploading ${SHA}…"
git archive --format=tar HEAD | ssh -o BatchMode=yes "$HOST" "cat > /tmp/dunebuddy-$SHA.tar"

echo "Building on the server (the current release keeps serving)…"
ssh -o BatchMode=yes "$HOST" "set -euo pipefail
  NEW=$APP_DIR.new
  rm -rf \$NEW && mkdir -p \$NEW
  tar -xf /tmp/dunebuddy-$SHA.tar -C \$NEW && rm -f /tmp/dunebuddy-$SHA.tar
  install -m 600 $APP_DIR/.env \$NEW/.env
  cd \$NEW
  npm ci --include=dev --no-audit --no-fund --loglevel=error
  npm run build --silent >/dev/null
  npm run migrate 2>&1 | tail -1
  echo $SHA > REVISION
  rm -rf $APP_DIR.prev
  mv $APP_DIR $APP_DIR.prev
  mv \$NEW $APP_DIR
  pm2 restart $PM2_NAME --update-env >/dev/null && pm2 save >/dev/null
  echo 'Swapped in and restarted.'"

if health_check; then
  echo "Deployed $SHA. Live and healthy: $URL"
else
  echo "Health check failed for $SHA. Rolling back…" >&2
  remote_rollback
  health_check && echo "Rollback is live: $URL" >&2
  exit 1
fi
