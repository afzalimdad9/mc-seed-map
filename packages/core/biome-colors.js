/**
 * Bi-format biome palette populated from the Cubiomes engine at runtime, so
 * web and CLI always render with the exact same colors the engine reports.
 */

export function paletteFromEngine(engine) {
  const byId = engine.biomeColors(); // { [id]: "#rrggbb" }
  const DEFAULT = [120, 120, 120];

  function hexToRgb(hex) {
    if (!hex || hex.length !== 7) return DEFAULT;
    return [
      parseInt(hex.slice(1, 3), 16),
      parseInt(hex.slice(3, 5), 16),
      parseInt(hex.slice(5, 7), 16),
    ];
  }

  return {
    byId,
    /** [r,g,b] for a biome id, or a neutral gray fallback. */
    rgb(id) {
      const hex = byId[id];
      return hex ? hexToRgb(hex) : DEFAULT;
    },
  };
}

export const unknownColor = () => [40, 40, 40];