#!/bin/sh
set -e
if [ -f /app/deploy_version.txt ]; then
  export METRIX_DEPLOY_VERSION="$(tr -d '\r\n' < /app/deploy_version.txt)"
fi
export AGENT_MODE="${AGENT_MODE:-sim}"

export PORT=8787
npm run start -w apps/agent &

i=0
while [ "$i" -lt 60 ]; do
  if node -e "fetch('http://127.0.0.1:8787/healthz').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"; then
    break
  fi
  i=$((i + 1))
  sleep 1
done

export PORT=3000
export HOSTNAME=127.0.0.1
npm run start -w apps/web &

j=0
while [ "$j" -lt 90 ]; do
  if node -e "fetch('http://127.0.0.1:3000/').then(()=>process.exit(0)).catch(()=>process.exit(1))"; then
    break
  fi
  j=$((j + 1))
  sleep 1
done

export PROXY_PORT=7860
export WEB_PORT=3000
export AGENT_PORT=8787
exec node /app/studio-proxy.mjs
