#!/bin/sh
set -eu

mkdir -p /data
pnpm exec wrangler d1 migrations apply DB --local --persist-to /data --config dist/server/wrangler.json

set -- pnpm exec wrangler dev --config dist/server/wrangler.json --persist-to /data --ip 0.0.0.0 --port "${PORT:-3000}" --var DOCKER_TRUST_PROXY:true

if [ -n "${RESEND_API_KEY:-}" ]; then
  set -- "$@" --var "RESEND_API_KEY:${RESEND_API_KEY}"
fi

exec "$@"
