/**
 * Historical version validation matrix.
 *
 * Replicates Cubiomes' own known-answer test (vendor/cubiomes/tests.c
 * testBiomeGen1x1): the exact same seed/scan/hash loop over a 64x64 biome
 * grid must reproduce the upstream expected 32-bit hashes for every major
 * release 1.0..1.20. Passing this proves our WASM build, enum wiring and the
 * handle-based generator produce byte-identical results to upstream Cubiomes
 * across versions.
 */
import assert from "node:assert/strict";
import { JavaWorldGenerator } from "../packages/java/engine.js";

function hash32(x) {
  x = (x ^ (x >>> 15)) >>> 0;
  x = Math.imul(x, 0xd168aaad) >>> 0;
  x = (x ^ (x >>> 15)) >>> 0;
  x = Math.imul(x, 0xaf723597) >>> 0;
  x = (x ^ (x >>> 15)) >>> 0;
  return x;
}

// Upstream expected hashes (tests.c b6_hashes, dim 0, bits 6, scale 4).
const MATRIX = [
  { mc: "1.20", expect: 0x0f8888ab },
  { mc: "1.19", expect: 0x391c36ec },
  { mc: "1.19.2", expect: 0xea3e8c1c },
  { mc: "1.18", expect: 0xade7f891 },
  { mc: "1.16", expect: 0xde9a6574 },
  { mc: "1.15", expect: 0x3a568a6d },
  { mc: "1.13", expect: 0x96c97323 },
  { mc: "1.12", expect: 0xbc75e996 },
  { mc: "1.9", expect: 0xe27a45a2 },
  { mc: "1.7", expect: 0xbc75e996 },
  { mc: "1.6", expect: 0x15b47206 },
  { mc: "1.2", expect: 0x2d7e0fed },
  { mc: "1.1", expect: 0x5cbf4709 },
  { mc: "1.0", expect: 0xbd794adb },
];

// Same loop as getRef(): bits=6 -> r=64, scan x,z in [-32,32).
function runRefHash(engine, mcEnum) {
  const bits = 6;
  const r = 1 << (bits - 1);
  const handle = engine.createGenerator({ version: mcEnum, seed: 0n, dimension: 0 });
  let h = 0;
  for (let x = -r; x < r; x++) {
    for (let z = -r; z < r; z++) {
      const s32 = (z << bits) ^ x; // int32 like C
      const s = BigInt.asIntN(64, BigInt(s32));
      handle.setSeed(s);
      const y = ((hash32(s32) & 0x7fffffff) % 384 - 64) >> 2;
      const id = handle.getBiome(x, y, z, 4);
      h ^= hash32(s32 ^ (id << (2 * bits)));
    }
  }
  handle.destroy();
  return h >>> 0;
}

console.log("Loading engine...");
const engine = await new JavaWorldGenerator().init();

let failed = 0;
for (const row of MATRIX) {
  const mcEnum = engine.versionFromString(row.mc);
  assert.ok(mcEnum > 0, `resolve ${row.mc}`);
  const got = runRefHash(engine, mcEnum);
  const ok = got === row.expect;
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"} MC ${row.mc} (enum ${mcEnum}): got ${"0x" + got.toString(16).padStart(8, "0")} expect ${"0x" + row.expect.toString(16).padStart(8, "0")}`);
}

assert.equal(failed, 0, `${failed} version(s) diverged from upstream Cubiomes`);
console.log("VERSION MATRIX PASSED (native-to-WASM parity across 1.0..1.20)");