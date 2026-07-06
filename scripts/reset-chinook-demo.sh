#!/bin/bash
set -e
MYSTERY_DIR="$(cd "$(dirname "$0")/.." && pwd)"
pm2 stop mystery-demo
cp "$MYSTERY_DIR/examples/Chinook_Sqlite.sqlite" "$MYSTERY_DIR/examples/chinook-demo.sqlite"
pm2 start mystery-demo
