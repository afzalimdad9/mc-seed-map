/**
 * M4a — Unified WorldGenerator interface contract.
 *
 * Every JS surface (web app, CLI, finder workers) must boot through the same
 * createWorldGenerator() facade and satisfy the same contract shape. This test
 * pins that contract and proves the platform seam fails loudly for unsupported
 * editions (Bedrock) instead of silently mapping seeds through Java math.
 */
import assert from "node:assert/strict";
import { createWorldGenerator } from "../packages/core/create-world-generator.js";
import { EDITIONS } from "../packages/java/versions.js";

const REQUIRED_METHODS = [
  "initialize", "getBiome", "generateBiomes", "biomeName", "biomeId",
  "createGenerator", "structurePos", "structureName", "resolveStructure",
  "isSlimeChunk", "versionFromString", "versionName",
];

console.log("Creating unified WorldGenerator facade...");
const wg = await createWorldGenerator();

assert.equal(wg.platform, EDITIONS.java);
assert.equal(wg.platform, "java");

// versions registry: dynamically discovered, no hardcoded lists
assert.ok(wg.versions.find("1.18"), "registry.find('1.18')");
assert.ok(wg.versions.find("1.21 WD") ?? wg.versions.find("latest"), "alias/newest resolution");
assert.ok(wg.versions.versions.length >= 20, `expected ~28 modelled versions, got ${wg.versions.versions.length}`);

// structures & palette from the engine, not curated
assert.ok(Object.keys(wg.structures).length >= 20, "structure enum populated");
assert.ok(wg.palette.byId && Object.keys(wg.palette.byId).length >= 50, "palette populated");

// full method surface
for (const m of REQUIRED_METHODS) {
  assert.equal(typeof wg[m], "function", `WorldGenerator.${m}`);
}

// real generation through the facade (known answer, M1/M2 anchor)
wg.initialize({ version: wg.versions.find("1.18").enumValue, seed: 262n, dimension: 0 });
const id = wg.getBiome(0, 63, 0, 1);
assert.equal(id, 14, `seed 262 (0,63,0) 1.18 is mushroom_fields, got ${id} (${wg.biomeName(id)})`);

// platform seam: unsupported editions must be an explicit, descriptive error
for (const bad of ["bedrock", "java:bedrock", EDITIONS.bedrock]) {
  await assert.rejects(
    createWorldGenerator({ platform: bad }),
    /not implemented.*[Bb]edrock/i,
    `platform "${bad}" must fail loudly`,
  );
}

console.log("UNIFIED INTERFACE PASSED (platform=java, contract + known-answer + seam)");
console.log(`  editions: ${Object.values(EDITIONS).join(", ")}; requiring "${EDITIONS.bedrock}" throws`);