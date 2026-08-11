#!/bin/sh
set -eu
cd /workspace

if curl -sf -o /dev/null --max-time 2 http://127.0.0.1:8080/ && curl -sf -o /dev/null --max-time 2 http://127.0.0.1:3001/api/health; then
  exit 0
fi

# Ensure deps (workspaces)
if [ ! -d apps/api/node_modules ] || [ ! -d apps/web/node_modules ]; then
  npm install --workspaces --include-workspace-root >>/tmp/app-startup.log 2>&1 || true
fi

export PORT=3001
export HOST=0.0.0.0
export JWT_SECRET="${JWT_SECRET:-clientforge-dev-secret-change-me}"

# API on 3001
if ! curl -sf -o /dev/null --max-time 2 http://127.0.0.1:3001/api/health; then
  (cd apps/api && npm run start:dev >>/tmp/clientforge-api.log 2>&1 &)
  # wait for API
  i=0
  while [ "$i" -lt 60 ]; do
    if curl -sf -o /dev/null --max-time 2 http://127.0.0.1:3001/api/health; then
      break
    fi
    i=$((i + 1))
    sleep 1
  done
fi

# Angular dev server on 8080 (proxies /api → 3001)
if ! curl -sf -o /dev/null --max-time 2 http://127.0.0.1:8080/; then
  (cd apps/web && npx ng serve --host 0.0.0.0 --port 8080 --proxy-config proxy.conf.json >>/tmp/clientforge-web.log 2>&1 &)
fi
