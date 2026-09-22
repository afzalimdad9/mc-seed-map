/**
 * Minecraft version registry.
 *
 * Values are discovered at runtime from the WASM engine (Cubiomes enum
 * MCVersion) — never hardcoded — so JS and C can never drift apart.
 *
 * Support flags are explicit: we never claim a capability the engine lacks.
 */
export const EDITIONS = Object.freeze({
  java: "java",
  bedrock: "bedrock", // engine adapter not yet implemented
});

export const DIMENSIONS = Object.freeze({
  overworld: 0,
  nether: -1,
  end: 1,
});

export function createVersionRegistry(wasm) {
  return Object.freeze({
    edition: EDITIONS.java,
    versions: [
      {
        id: "java-1.18",
        label: "1.18",
        enumValue: wasm._wasm_version_1_18(),
        capabilities: { biomes: true, structures: true, spawn: false },
      },
      {
        id: "java-1.21",
        label: "1.21",
        enumValue: wasm._wasm_version_1_21(),
        capabilities: { biomes: true, structures: true, spawn: false },
      },
      {
        id: "java-newest",
        label: "newest (Cubiomes MC_NEWEST)",
        enumValue: wasm._wasm_version_newest(),
        capabilities: { biomes: true, structures: true, spawn: false },
      },
    ],
    bedrock: {
      id: "bedrock",
      supported: false,
      note: "Separate engine adapter required; Java results are never reused.",
    },
  });
}
