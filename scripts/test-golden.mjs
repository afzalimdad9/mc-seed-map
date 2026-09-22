/**
 * Golden-file regression: replay the native-generated golden worlds through
 * WASM and require byte-identical biome grids.
 *
 * The golden file is produced by the native engine/tests/golden_dump.c
 * (npm run gen:golden) and committed under tests/golden/worlds.bin. Any change
 * in the C engine, the WASM build, or the JS bindings that shifts even one
 * biome id is caught here — native vs WASM parity is pinned forever.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { JavaWorldGenerator } from "../packages/java/engine.js";

const path = process.argv[2] ?? "tests/golden/worlds.bin";
const buf = readFileSync(path);
const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
let o = 0;
const u32 = () => {
  const v = dv.getUint32(o, true);
  o += 4;
  return v;
};
const i32 = () => {
  const v = dv.getInt32(o, true);
  o += 4;
  return v;
};
const u64 = () => {
  const lo = BigInt(u32());
  const hi = BigInt(u32());
  return (hi << 32n) | lo;
};

assert.equal(u32(), 0x474f4c44, "bad magic");
assert.equal(u32(), 1, "unexpected format version");
const n = u32();
const records = [];
for (let i = 0; i < n; i++) {
  const rec = {
    mc: i32(),
    dim: i32(),
    seed: u64(),
    scale: i32(),
    x: i32(),
    z: i32(),
    w: i32(),
    h: i32(),
    count: i32(),
  };
  rec.cells = new Int32Array(rec.count);
  for (let k = 0; k < rec.count; k++) rec.cells[k] = i32();
  records.push(rec);
}

console.log(`Loaded golden file ${path}: ${records.length} records`);

// Sanity: the splitSeed FFI path the whole stack uses is lossless for seed 262.
const [l, h] = JavaWorldGenerator.splitSeed(262n);
assert.deepEqual(BigInt(l) | (BigInt(h) << 32n), 262n);

const engine = await new JavaWorldGenerator().init();
let failures = 0;

for (const rec of records) {
  assert.ok(engine.versionName(rec.mc) !== undefined, `version enum ${rec.mc} unknown`);

  const handle = engine.createGenerator({ version: rec.mc, seed: rec.seed, dimension: rec.dim });
  const cells = handle.generateBiomes({
    x: rec.x,
    z: rec.z,
    width: rec.w,
    height: rec.h,
    scale: rec.scale,
    y: rec.scale === 1 ? 63 : 15,
  });

  let mismatches = 0;
  for (let i = 0; i < cells.length; i++) {
    if (cells[i] !== rec.cells[i]) mismatches++;
  }
  const tag = `${engine.versionName(rec.mc)} dim=${rec.dim} seed=${rec.seed} @${rec.x},${rec.z} scale=${rec.scale} ${rec.w}x${rec.h}`;
  if (mismatches === 0) {
    console.log(`PASS ${tag} (${rec.count} cells)`);
  } else {
    failures++;
    console.log(`FAIL ${tag}: ${mismatches}/${rec.count} cells differ`);
  }
  handle.destroy();
}

assert.equal(failures, 0, `${failures} golden record(s) diverged native vs WASM`);
console.log("GOLDEN FILES PASSED (native == WASM byte-identical)");