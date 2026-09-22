import assert from "node:assert/strict";
import { JavaWorldGenerator } from "../packages/java/engine.js";
import { createVersionRegistry } from "../packages/java/versions.js";

console.log("Loading WASM engine...");
const engine = await new JavaWorldGenerator().init();

const registry = createVersionRegistry(engine);
const v118 = registry.find("1.18");
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

// Handle-based API: spawn, estimate, colors, structure names
const h = engine.createGenerator({ version: v118.enumValue, seed: 262n, dimension: 0 });
const hBiome = h.getBiome(0, 63, 0, 1);
assert.equal(hBiome, 14, "handle biome should match spawn world");
const spawn = h.getSpawn();
const est = h.estimateSpawn();
console.log("Handle spawn:", spawn, "estimate:", est);
assert.ok(spawn && Number.isInteger(spawn.x) && Number.isInteger(spawn.z));
assert.ok(est && Number.isInteger(est.x) && Number.isInteger(est.z));
assert.equal(engine.structureName(engine.structures.village), "village");
assert.equal(engine.structureName(engine.structures.ancient_city), "ancient_city");
const enumCount = Object.keys(engine.structures).length;
console.log("Structures enumerated:", enumCount);
assert.ok(enumCount >= 20, "expected full Cubiomes structure enum");
assert.equal(engine.resolveStructure("village"), engine.structures.village);

engine.initialize({ version: v118.enumValue, seed: 262n, dimension: 0 });
const mid = engine.biomeId("mushroom_fields");
console.log("biomeId(mushroom_fields):", mid);
assert.equal(mid, 14);
assert.equal(engine.biomeId("not_a_biome"), -1);

const colors = engine.biomeColors();
const set = Object.keys(colors).length;
console.log("Biome colors mapped:", set, "e.g. mushroom_fields(14):", colors[14]);
assert.ok(set > 0, "expected biome color palette");
assert.ok(/^#[0-9a-f]{6}$/.test(colors[14] ?? ""), "mushroom_fields should have an RGB hex color");
h.destroy();

console.log("WASM smoke test passed.");
