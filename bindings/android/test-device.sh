#!/usr/bin/env bash
# ON-DEVICE verification: builds the test APK (which bundles the AAR's jniLibs
# + Kotlin facade), installs it on a running emulator/device and asserts the
# known-answer PASS line from logcat. Skips when no device is attached.
#
# Requires: a booted device via adb, JDK + Android SDK, the NDK .so already
# built (build-android.sh) and the platform symlink described in aar/README.md.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
BIN="$(cd "$(dirname "$0")" && pwd)"
ADB="${ADB:-$ANDROID_HOME/platform-tools/adb}"

if ! "$ADB" get-state >/dev/null 2>&1; then
  echo "no Android device/emulator attached; skipping on-device test"
  exit 0
fi

JAVA_HOME="${JAVA_HOME:-/home/afzalimdad9/.local/share/jdk}"
export JAVA_HOME PATH="$JAVA_HOME/bin:$PATH"
export ANDROID_SDK_ROOT="${ANDROID_SDK_ROOT:-$ANDROID_HOME}"

"$ANDROID_HOME"/platform-tools/adb install -r \
  "$BIN/aar/app/build/outputs/apk/debug/app-debug.apk" >/dev/null
"$ANDROID_HOME"/platform-tools/adb logcat -c
"$ANDROID_HOME"/platform-tools/adb shell am start -n com.seedmaps.test/.MainActivity >/dev/null
sleep 7

if "$ANDROID_HOME"/platform-tools/adb logcat -d -s SeedMapsOnDevice | grep -q "SEEDMAPS_ONDEVICE=PASS"; then
  echo "ANDROID ON-DEVICE TEST PASSED (NDK lib vs Kotlin facade, emulator real run)"
else
  "$ANDROID_HOME"/platform-tools/adb logcat -d -s SeedMapsOnDevice | tail -20
  echo "ANDROID ON-DEVICE TEST FAILED" >&2
  exit 1
fi