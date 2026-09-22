import assert from "node:assert/strict";
import { JavaWorldGenerator } from "../packages/java/engine.js";
import { createVersionRegistry } from "../packages/java/versions.js";

console.log("Loading WASM engine...");
const engine = await new JavaWorldGenerator().init();

const registry = createVersionRegistry(engine.module);
const v118 = registry.versions.find((v) => v.id === "java-1.18");
console.log("MC_1_18 enum:", v118.enumValue);
assert.equal(typeof v118.enumValue, "number");

// Official Cubiomes example: seed 262 @ (0,63,0) = mushroom_fields
engine.initialize({ version: v118.enumValue, seed: 262n, dimension: 0 });
const biome = engine.getBiome(0, 63, 0, 1);
const name = engine.biomeName(biome);
console.log("Biome at (0, 63, 0):", biome, name);
assert.notEqual(biome, -1, "Biome query failed");
assert.equal(name, "mushroom_fields");

// Region generation must return width*height valid cells
const width = 16, height = 16;
const area = engine.generateBiomes({ x: -8, z: -8, width, height, scale: 4, y: 15 });
assert.equal(area.length, width * height);
for (const id of area) assert.notEqual(id, -1);
console.log("Generated biome cells:", area.length);

// Structure + slime helpers
const village = engine.structurePos(engine.structures.village, 262n, 0, 0);
console.log("Village attempt (0,0):", village);
assert.ok(village === null || (Number.isInteger(village.x) && Number.isInteger(village.z)));
const slime = engine.isSlimeChunk(262n, 0, 0);
assert.equal(typeof slime, "boolean");
console.log("Slime chunk (0,0):", slime);

// Determinism: same seed twice → same biome
const biome2 = engine.getBiome(0, 63, 0, 1);
assert.equal(biome, biome2);

// Different seed → re-init works
engine.initialize({ version: v118.enumValue, seed: 1n, dimension: 0 });
const biomeOther = engine.getBiome(0, 63, 0, 1);
console.log("Seed 1 biome at origin:", biomeOther, engine.biomeName(biomeOther));

console.log("WASM smoke test passed.");
