#!/bin/bash
set -e
MYSTERY_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# The demo runs under pm2 on the servers but is started by hand on a laptop —
# only bounce pm2 if it's installed and actually managing this process.
# Otherwise stop your running `npm start` before resetting so the copy is clean.
manages_demo() { command -v pm2 >/dev/null 2>&1 && pm2 describe mystery-demo >/dev/null 2>&1; }

if manages_demo; then pm2 stop mystery-demo; fi

cp "$MYSTERY_DIR/examples/Chinook_Sqlite.sqlite" "$MYSTERY_DIR/examples/chinook-demo.sqlite"
echo "Reset chinook-demo.sqlite from pristine Chinook_Sqlite.sqlite"

if manages_demo; then pm2 start mystery-demo; fi
