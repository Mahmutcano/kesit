#!/usr/bin/env sh
cd "$(dirname "$0")"
node scripts/setup.js
( sleep 1.5; (command -v open >/dev/null && open http://127.0.0.1:5178) || (command -v xdg-open >/dev/null && xdg-open http://127.0.0.1:5178) ) >/dev/null 2>&1 &
node server.js
