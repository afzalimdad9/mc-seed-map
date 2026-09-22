import { JavaWorldGenerator } from "../java/engine.js";
import { createVersionRegistry, EDITIONS } from "../java/versions.js";
import { paletteFromEngine } from "./biome-colors.js";

/**
 * Unified WorldGenerator facade consumed by every JS surface: web app, CLI,
 * finder workers, tests. Platform is explicit — only "java" is implemented;
 * requesting any other edition fails loudly instead of silently mapping seeds
 * through the wrong algorithm.
 *
 * Contract (asserted by scripts/test-interface.mjs):
 *   platform        "java"
 *   versionRange    { min, max } (Cubiomes enum ints, discovered at runtime)
 *   versions        version registry with .find(label)
 *   structures      { [name]: enumValue }
 *   palette         { [biomeId]: "#rrggbb" } full Cubiomes palette
 *   + every JavaWorldGenerator method (initialize, generateBiomes, getBiome,
 *     biomeName, biomeId, createGenerator, structurePos, isSlimeChunk, ...)
 */
export async function createWorldGenerator({ platform = EDITIONS.java } = {}) {
  if (platform !== EDITIONS.java) {
    throw new Error(
      `createWorldGenerator: platform="${platform}" is not implemented. ` +
        "Only the Java engine exists; Bedrock uses a separate world generation " +
        "algorithm and seed space (see docs/bedrock.md). Refusing to run.",
    );
  }

  const engine = await new JavaWorldGenerator().init();
  return Object.assign(engine, {
    platform: EDITIONS.java,
    versions: createVersionRegistry(engine),
    palette: paletteFromEngine(engine),
  });
}