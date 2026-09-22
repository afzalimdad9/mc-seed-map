/**
 * Minecraft version registry.
 *
 * Values are discovered at runtime from the WASM engine (Cubiomes enum
 * MCVersion) — never hardcoded — so JS (web + CLI) and C can never drift
 * apart. Every version listed is a real generation algorithm the engine
 * models; no snapshot versions are claimed because Cubiomes has none.
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

/** Labels Cubiomes' mc2str leaves unreferenced (not really modelled). */
function isUnreferenced(label) {
  return label === "?" || label === null || label.trim() === "";
}

export function createVersionRegistry(engine) {
  const min = engine.versionRange.min;
  const max = engine.versionRange.max;
  const versions = [];
  const seen = new Set();

  for (let mc = min; mc <= max; mc++) {
    const label = engine.versionName(mc);
    if (isUnreferenced(label)) continue;
    versions.push({
      id: `java-${mc}`,
      label,
      enumValue: mc,
      capabilities: { biomes: true, structures: true, spawn: true },
    });
    seen.add(label);
  }

  return Object.freeze({
    edition: EDITIONS.java,
    versions: Object.freeze(versions),
    find(label) {
      return (
        this.versions.find((v) => v.label === label) ||
        this.versions.find((v) => v.id === `java-${label}`) ||
        this.versions.find((v) => v.enumValue === Number(label))
      );
    },
    bedrock: {
      id: "bedrock",
      supported: false,
      note: "Separate engine adapter required; Java results are never reused.",
    },
  });
}