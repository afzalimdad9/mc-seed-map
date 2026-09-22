/**
 * Composable seed-finder filters.
 *
 * Every filter is a plain object with:
 *   kind        - unique tag (for diagnostics/UI)
 *   needsGen    - true when it must touch the Cubiomes Generator handle
 *   init(view)  - resolve names to ids, precompute scan geometry; may throw
 *                 if a requested name is unknown (the engine never silently
 *                 claims support for something it cannot do)
 *   test(view)  - evaluate the current seed; returns { ok, detail }
 *
 * `view` is a FinderView (see search.js): wraps the WASM engine, the reusable
 * generator handle and the shared resolution cache, plus `target` (block
 * coords where the seed is evaluated, default the world origin - spawn by
 * default unless `nearSpawn` is requested).
 */
export const TARGET_ORIGIN = 0;
export const TARGET_SPAWN = 1;

export function biomeFilter(opts = {}) {
  const names = opts.biomes ?? opts.names ?? [];
  const match = opts.match ?? "any"; // 'any' | 'all'
  const grid = opts.grid ?? 3; // n x n biome cells sampled (scale 4)
  const scale = 4;
  const step = scale * 4; // one biome cell = 4 blocks at scale 4
  const y = scale === 1 ? 63 : 15; // vertical is 1:1 only at block scale
  return {
    kind: "biome",
    needsGen: true,
    match,
    grid,
    init(view) {
      if (!names.length) throw new Error("biomeFilter: no biomes given");
      this.ids = names.map((n) => {
        const id = view.resolveBiomeId(n);
        if (id < 0) throw new Error(`Unknown biome: ${n}`);
        return id;
      });
      const k = Math.floor(grid / 2); // half-extent in cells
      this.offsets = [];
      for (let dz = -k; dz <= k; dz++)
        for (let dx = -k; dx <= k; dx++) this.offsets.push([dx * step, dz * step]);
      return this;
    },
    test(view) {
      const { x, z } = view.target;
      const found = [];
      for (const [ox, oz] of this.offsets) {
        const id = view.getBiomeAt(x + ox, z + oz, y, scale);
        if (this.ids.includes(id)) found.push([x + ox, z + oz, id]);
      }
      const ok = this.match === "all" ? found.length === this.offsets.length : found.length > 0;
      return { ok, detail: { count: found.length, total: this.offsets.length, found } };
    },
    // Helpers for UI/diagnostics
    describe() { return `biome ${names.join("+")} (${match}, ${grid}x${grid})`; },
  };
}

/**
 * Requires a structure of `name` within `radius` blocks of the target.
 * When `viable` is true the expensive biome-viability check is also applied
 * (this also makes `needsGen` true).
 */
export function structureFilter(opts = {}) {
  const name = opts.name ?? opts.structure;
  if (!name) throw new Error("structureFilter: no structure name given");
  const radius = opts.radius ?? 512;
  const viable = !!opts.viable;
  return {
    kind: "structure",
    needsGen: viable,
    name,
    radius,
    viable,
    init(view) {
      this.type = view.resolveStructureType(name);
      if (this.type === undefined)
        throw new Error(`Unsupported structure: ${name}`);
      const regionChunks = view.structureRegionSize(this.type);
      if (!regionChunks) throw new Error(`${name} is not available at this version`);
      const regionBlocks = regionChunks * 16;
      // Region coordinates spanning +/-radius around target, in this structure's grid.
      this.regionRadius = Math.max(0, Math.ceil(radius / regionBlocks) - 1);
      return this;
    },
    test(view) {
      const { x, z } = view.target;
      let nearest = null;
      for (let rx = -this.regionRadius; rx <= this.regionRadius; rx++) {
        for (let rz = -this.regionRadius; rz <= this.regionRadius; rz++) {
          const pos = view.structurePos(this.type, rx, rz);
          if (!pos) continue;
          const dist = Math.hypot(pos.x - x, pos.z - z);
          if (dist > radius) continue;
          if (viable && !view.structureViable(this.type, pos.x, pos.z)) continue;
          if (!nearest || dist < nearest.dist) nearest = { x: pos.x, z: pos.z, dist, region: [rx, rz] };
        }
      }
      return { ok: !!nearest, detail: nearest ?? null };
    },
    describe() { return `${name} within ${radius} blocks${viable ? " (viable)" : ""}`; },
  };
}

export function slimeFilter(opts = {}) {
  const chunkRadius = opts.radius ?? 8; // chunk Manhattan radius to scan
  return {
    kind: "slime",
    needsGen: false,
    init(view) {
      this.offsets = [];
      for (let dz = -chunkRadius; dz <= chunkRadius; dz++)
        for (let dx = -chunkRadius; dx <= chunkRadius; dx++) this.offsets.push([dx, dz]);
      return this;
    },
    test(view) {
      const { x, z } = view.target;
      const cx = Math.floor(x / 16);
      const cz = Math.floor(z / 16);
      let hit = null;
      for (const [ox, oz] of this.offsets) {
        if (view.slimeChunk(cx + ox, cz + oz)) { hit = [cx + ox, cz + oz]; break; }
      }
      return { ok: !!hit, detail: hit ? { chunk: hit } : {} };
    },
    describe() { return "slime chunk within " + chunkRadius + " chunks"; },
  };
}

export function distanceFilter(opts = {}) {
  const max = opts.max ?? opts.distance; // max blocks from target centre
  if (max == null) throw new Error("distanceFilter: max distance required");
  return {
    kind: "distance",
    needsGen: false,
    max,
    test(_view, extra) {
      const d = (extra && extra.dist) ?? 0;
      return { ok: d <= max, detail: { dist: d } };
    },
    describe() { return `within ${max} blocks of target`; },
  };
}

/* Composers */
export function and(...filters) {
  const fs = filters.flat();
  const distanceFilters = fs.filter((f) => f.kind === "distance");
  const others = fs.filter((f) => f.kind !== "distance");
  return {
    kind: "and",
    needsGen: fs.some((f) => f.needsGen),
    init(view) { fs.forEach((f) => f.init(view)); return this; },
    test(view, extra) {
      let dist = (extra && extra.dist) ?? null;
      const results = others.map((f) => {
        const r = f.test(view, { ...(extra ?? {}) });
        if (r.detail && typeof r.detail === "object" && "dist" in r.detail) {
          const d = Number(r.detail.dist);
          if (Number.isFinite(d)) dist = Math.min(dist ?? Infinity, d);
        }
        return r;
      });
      const distanceOk = distanceFilters.every((f) => f.test(view, { dist }).ok);
      const ok = distanceOk && results.every((r) => r.ok);
      return { ok, detail: { dist } };
    },
    describe() { return fs.map((f) => f.describe()).join(" AND "); },
  };
}

export function or(...filters) {
  const fs = filters.flat();
  return {
    kind: "or",
    needsGen: fs.some((f) => f.needsGen),
    init(view) { fs.forEach((f) => f.init(view)); return this; },
    test(view, extra) {
      const details = fs.map((f) => f.test(view, extra));
      return { ok: details.some((d) => d.ok), detail: details.map((d) => d.detail) };
    },
    describe() { return `(${fs.map((f) => f.describe()).join(" OR ")})`; },
  };
}

export function not(filter) {
  return {
    kind: "not",
    needsGen: filter.needsGen,
    init(view) { filter.init(view); return this; },
    test(view, extra) {
      const r = filter.test(view, extra);
      return { ok: !r.ok, detail: r.detail };
    },
    describe() { return `NOT (${filter.describe()})`; },
  };
}

/* Descriptor -> filter for portable worker/CLI/UI payloads. */
export function buildFilters(descriptors) {
  if (Array.isArray(descriptors)) return and(...descriptors.map(buildFilters));
  const d = descriptors;
  switch (d.t) {
    case "biome": return biomeFilter(d.opts ?? {});
    case "structure": return structureFilter(d.opts ?? {});
    case "slime": return slimeFilter(d.opts ?? {});
    case "distance": return distanceFilter(d.opts ?? {});
    case "and": return and(d.children.map(buildFilters));
    case "or": return or(d.children.map(buildFilters));
    case "not": return not(buildFilters(d.child));
    default: throw new Error(`Unknown filter descriptor: ${d && d.t}`);
  }
}

export function describeFilters(f) {
  return f ? f.describe() : "(none)";
}