#!/usr/bin/env bash
# Build + run the Swift package (single-source C engine from Swift).
# Tolerates the Swift-on-Linux libxml2.so.2 soname quirk by shimming to the
# system libxml2 when present; skips silently if no Swift toolchain exists.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

if ! command -v swift >/dev/null 2>&1; then
  echo "swift not found; skipping Swift package test"
  exit 0
fi

SHIM=""
if ! ldconfig -p 2>/dev/null | grep -q "libxml2.so.2"; then
  for cand in /usr/lib/x86_64-linux-gnu/libxml2.so.16 /usr/lib64/libxml2.so.*; do
    if [[ -e $cand ]]; then
      SHIM="$(mktemp -d)"
      ln -sf "$cand" "$SHIM/libxml2.so.2"
      break
    fi
  done
fi

export LD_LIBRARY_PATH="${SHIM:+$SHIM:}${LD_LIBRARY_PATH:-}"
exec swift run SeedToolsCLI