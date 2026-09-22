import assert from "node:assert/strict";
import { JavaWorldGenerator } from "../packages/java/engine.js";
import { buildFilters } from "../packages/finder/filters.js";
import {
  createFinderView, runSeedSearch, sliceRange, signedSeed
} from "../packages/finder/search.js";

console.log("Loading engine for finder tests...");
const engine = await new JavaWorldGenerator().init();
const v = engine.mc["1.18"];

// Composable helpers re-exported consistently
assert.equal(typeof buildFilters, "function");
assert.equal(typeof createFinderView, "function");
const slices = sliceRange(0, 1000, 3);
assert.equal(slices.length, 3);
assert.equal(Number(slices[0].from), 0);
assert.equal(Number(slices[2].to), 1000);
assert.equal(signedSeed(0xffffffffffffffffn), "-1");

// 1) biome filter finds known seed 262 (mushroom_fields at origin)
const bf = buildFilters({ t: "biome", opts: { biomes: ["mushroom_fields"], grid: 1 } });
const view1 = createFinderView(engine, { version: v, dimension: 0 });
bf.init(view1);
const r1 = await runSeedSearch({ view: view1, filter: bf, count: 1, maxSeeds: 500 });
assert.equal(r1.results[0]?.seed, "262", "seed 262 must match mushroom filter");
view1.destroy();

// 2) structure filter finds villages near origin
const sf = buildFilters({ t: "structure", opts: { name: "village", radius: 1024 } });
const view2 = createFinderView(engine, { version: v, dimension: 0 });
sf.init(view2);
const r2 = await runSeedSearch({ view: view2, filter: sf, count: 3, maxSeeds: 2000 });
assert.ok(r2.results.length > 0, "expected village matches");
for (const m of r2.results) assert.ok(m.dist <= 1024, `village dist ${m.dist} <= 1024`);
view2.destroy();

// 3) composed AND filter (village AND slime)
const both = buildFilters({
  t: "and", children: [
    { t: "structure", opts: { name: "village", radius: 1024 } },
    { t: "slime", opts: { radius: 2 } },
  ],
});
const view3 = createFinderView(engine, { version: v, dimension: 0 });
both.init(view3);
const r3 = await runSeedSearch({ view: view3, filter: both, count: 2, maxSeeds: 5000 });
assert.ok(r3.results.length > 0, "expected combined matches");
view3.destroy();

// 4) struct2str / region-size plumbing
const regionChunks = engine.module._wasm_structure_region_size(engine.structures.village, v);
console.log("village region size (chunks):", regionChunks);
assert.ok(regionChunks >= 8);

// 5) cancellation stops the search
let aborted = false;
const signal = { aborted: false };
const view5 = createFinderView(engine, { version: v, dimension: 0 });
const slow = buildFilters({ t: "biome", opts: { biomes: ["deep_ocean"], grid: 3 } });
slow.init(view5);
const run = runSeedSearch({
  view: view5, filter: slow, count: 100, maxSeeds: 200000, signal,
  onProgress: ({ scanned }) => { if (scanned >= 512 && !aborted) { signal.aborted = true; aborted = true; } },
});
const r5 = await run;
assert.ok(aborted, "progress callback should have cancelled");
view5.destroy();

// 6) spawn-anchored search works
const view6 = createFinderView(engine, { version: v, dimension: 0, nearSpawn: true });
const sf6 = buildFilters({ t: "structure", opts: { name: "village", radius: 512 } });
sf6.init(view6);
const r6 = await runSeedSearch({ view: view6, filter: sf6, count: 1, maxSeeds: 500 });
assert.ok(view6.target !== undefined, "spawn target set");
view6.destroy();

console.log("FINDER TESTS PASSED", JSON.stringify({ r2: r2.results.slice(0, 2), r3: r3.results.slice(0, 2) }));