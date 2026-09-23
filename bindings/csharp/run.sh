#!/usr/bin/env bash
# Build plain libseed_engine.so/.dylib/seed_engine.dll (no JNI) for the C#
# P/Invoke binding, then run the .NET sample. Skips cleanly when no .NET SDK
# is installed. Portable across Linux/macOS (ELF/Mach-O .so) and MSYS2/MinGW
# Windows (PE seed_engine.dll with exported symbols).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

DOTNET="${DOTNET_ROOT:-/home/afzalimdad9/.local/share/dotnet}/dotnet"
if [[ ! -x "$DOTNET" ]]; then
  echo "dotnet not found (set DOTNET_ROOT); skipping C# sample"
  exit 0
fi

LIB="bindings/csharp/lib"
mkdir -p "$LIB"
case "$(uname -s)" in
  MINGW*|MSYS*|CYGWIN*)
    LIBFILE="seed_engine.dll"; EXPORT_FLAG="-Wl,--export-all-symbols";;
  Darwin)
    LIBFILE="libseed_engine.so"; EXPORT_FLAG="";;
  *)
    LIBFILE="libseed_engine.so"; EXPORT_FLAG="";;
esac

"${CC:-cc}" -shared -fPIC -fwrapv -O2 $EXPORT_FLAG -I engine/include -I vendor/cubiomes \
  engine/src/seed_engine.c \
  vendor/cubiomes/{biomenoise,biomes,finders,generator,layers,noise,quadbase,util}.c \
  -lm -o "$LIB/$LIBFILE"

export PATH="$ROOT/$LIB:$PATH"
export LD_LIBRARY_PATH="$ROOT/$LIB${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
export DYLD_LIBRARY_PATH="$ROOT/$LIB${DYLD_LIBRARY_PATH:+:$DYLD_LIBRARY_PATH}"
exec "$DOTNET" run --project bindings/csharp -v q