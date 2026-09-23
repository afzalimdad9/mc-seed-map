#!/usr/bin/env bash
# Refresh the Swift package copy of the public engine header after changes.
set -euo pipefail
SRC="$(cd "$(dirname "$0")/../.." && pwd)"
cp "$SRC/engine/include/seed_engine.h" \
   "$SRC/bindings/swift/Sources/CSeedEngine/include/seed_engine.h"
echo "synced engine/include/seed_engine.h -> bindings/swift"
