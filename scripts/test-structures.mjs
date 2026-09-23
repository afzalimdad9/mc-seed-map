/**
 * Known-answer regression test for the structure overlay (M5).
 *
 * Box view in block space: x ∈ [-1280, 0), z ∈ [0, 1440), seed 262, Java 1.18.
 * Expected values were produced once from the Cubiomes engine and are frozen
 * here so any change to the C code, the WASM bridge or the overlay loop fails
 * loudly. Markers mirror Chunkbase semantics: every attempted generation
 * position is listed; `viable` tells whether terrain/biome filtering would
 * actually let it generate.
 */
import assert from "node:assert/strict";
import { createWorldGenerator } from "../packages/core/create-world-generator.js";

// {type, x, z, viable} sorted by x, z, type
const EXPECTED = require_expected();

function require_expected() {
  const raw = [
    ["village",-1232,208,0],["swamp_hut",-1232,1296,0],["desert_pyramid",-1216,640,0],
    ["monument",-1200,736,0],["igloo",-1184,96,0],["village",-1040,1232,1],
    ["igloo",-992,720,1],["pillager_outpost",-976,336,0],["monument",-928,1408,0],
    ["swamp_hut",-912,864,0],["igloo",-832,1392,0],["village",-816,240,0],
    ["monument",-816,832,0],["monument",-800,160,1],["desert_pyramid",-768,592,0],
    ["village",-768,704,0],["desert_pyramid",-752,1248,0],["desert_pyramid",-736,48,0],
    ["igloo",-736,176,0],["mansion",-720,208,0],["swamp_hut",-672,1120,0],
    ["swamp_hut",-656,48,0],["desert_pyramid",-432,128,0],["village",-416,832,0],
    ["igloo",-384,800,1],["igloo",-336,256,0],["monument",-336,1264,0],
    ["swamp_hut",-304,672,0],["igloo",-304,1024,0],["monument",-288,176,1],
    ["village",-272,160,0],["swamp_hut",-256,128,0],["desert_pyramid",-240,1024,0],
    ["monument",-224,768,0],["village",-176,1248,0],["desert_pyramid",-160,800,0],
    ["swamp_hut",-160,1280,0],
  ];
  return raw.map(([type, x, z, viable]) => ({ type, x, z, viable: viable === 1 }));
}

const engine = await createWorldGenerator();
const mc = engine.versions.find("1.18").enumValue;
engine.initialize({ version: mc, seed: 262n });

const probeBox = { x0: -1280, z0: 0, x1: 0, z1: 1440 };
const markers = (await import("../packages/core/structures.js"))
  .structureOverlay({ engine, seed: 262n, mc, box: probeBox });

function plain(m) {
  return m.map(({ type, x, z, viable }) => ({ type, x, z, viable }));
}

assert.equal(markers.length, EXPECTED.length, "marker count must not change");
assert.deepEqual(plain(markers), EXPECTED, "markers must match frozen known-answer data");

const viable = markers.filter((m) => m.viable).length;
assert.equal(viable, 5, "viable landmark count");

// Determinism: computing twice yields an identical list (no scratch corruption).
const again = (await import("../packages/core/structures.js"))
  .structureOverlay({ engine, seed: 262n, mc, box: probeBox });
assert.deepEqual(plain(again), plain(markers), "overlay must be reproducible");

// Version-dependence: the village region size changes between 1.11 (32) and
// 1.18 (34), so the same seed/box must produce different overlay positions.
const mc11 = engine.versions.find("1.11").enumValue;
engine.initialize({ version: mc11, seed: 262n });
const m11 = (await import("../packages/core/structures.js"))
  .structureOverlay({ engine, seed: 262n, mc: mc11, box: probeBox });
assert.ok(
  engine.module._wasm_structure_region_size(engine.structures.village, mc11) !==
    engine.module._wasm_structure_region_size(engine.structures.village, mc),
  "village region size differs between 1.11 and 1.18",
);
assert.ok(m11.length > 0, "1.11 overlay must still find structures");
assert.notDeepEqual(plain(m11), EXPECTED, "region sizes differ across versions");

console.log(
  `STRUCTURE OVERLAY OK (seed 262, 1.18): ${markers.length} positions, ${viable} viable; ` +
    `${m11.length} positions on 1.11`,
);