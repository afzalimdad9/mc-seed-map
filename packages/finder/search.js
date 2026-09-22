/**
 * Seed search engine shared by the CLI, Node worker threads and browser
 * Web Workers. The heavy lifting runs inside a WASM generator handle that is
 * re-seeded per candidate (cheap) instead of being created/destroyed per
 * seed (expensive).
 */

export function signedSeed(seed) {
  return BigInt.asIntN(64, seed).toString();
}

export function createFinderView(engine, options = {}) {
  const { version, dimension = 0, nearSpawn = false } = options;
  if (version === undefined) throw new Error("createFinderView: version required");

  // Set version context for name/structure lookups that use mcCurrent.
  engine.initialize({ version, seed: 0n, dimension });

  const handle = engine.createGenerator({ version, dimension, seed: 0n });

  const view = {
    engine,
    version,
    dimension,
    handle,
    nearSpawn,
    currentSeed: 0n,
    target: { x: 0, z: 0 },

    setSeed(seed) {
      this.currentSeed = seed;
      handle.setSeed(seed);
      if (nearSpawn) {
        this.target = handle.estimateSpawn() ?? { x: 0, z: 0 };
      }
    },
    destroy() {
      handle.destroy();
    },

    resolveBiomeId(name) {
      return this.engine.biomeId(name, this.version);
    },
    getBiomeAt(x, y, z, scale) {
      return this.handle.getBiome(x, y, z, scale);
    },
    resolveStructureType(name) {
      return this.engine.resolveStructure(name);
    },
    structureRegionSize(type) {
      return this.engine.module._wasm_structure_region_size(type, this.version);
    },
    structurePos(type, rx, rz) {
      return this.engine.structurePos(type, this.currentSeed, rx, rz);
    },
    structureViable(type, x, z) {
      return this.handle.structureViable(type, x, z);
    },
    slimeChunk(cx, cz) {
      return this.engine.isSlimeChunk(this.currentSeed, cx, cz);
    },
  };
  return view;
}

/**
 * Scan the seed interval [start, start+maxSeeds) for `count` matches.
 *
 * @param {object} param0
 * @param {object} param0.view     FinderView (already initialized/filtered)
 * @param {object} param0.filter   composable filter (see filters.js)
 * @param {number} param0.count    stop after this many matches
 * @param {number} param0.maxSeeds max seeds to scan
 * @param {bigint|string} param0.start start seed (inclusive)
 * @param {object} [param0.signal] { aborted: boolean }
 * @param {function} [param0.onProgress] ({scanned, found, done}) throttled
 * @returns {Promise<{results:Array, scanned:number}>}
 */
export async function runSeedSearch({ view, filter, count = 1, maxSeeds = 100000, start = 0n, signal, onProgress }) {
  const results = [];
  let scanned = 0;
  const from = typeof start === "bigint" ? start : BigInt(start);
  const to = from + BigInt(maxSeeds);

  for (let s = from; s < to && results.length < count; s++) {
    if (signal && signal.aborted) break;
    view.setSeed(s);
    const r = filter.test(view);
    scanned++;
    if (r.ok) {
      results.push({ seed: s.toString(), seedSigned: signedSeed(s), dist: r.detail?.dist ?? null });
    }
    if (onProgress && (scanned % 256 === 0 || results.length >= count || s === to - 1n)) {
      onProgress({ scanned, found: results.length, done: results.length >= count || s === to - 1n });
    }
  }
  return { results, scanned };
}

/** Split a contiguous seed range across n workers, returning equal slices. */
export function sliceRange(from, to, n) {
  const start = BigInt(from);
  const end = BigInt(to);
  const total = end - start;
  const width = total / BigInt(n);
  const slices = [];
  for (let i = 0; i < n; i++) {
    const a = start + width * BigInt(i);
    const b = i === n - 1 ? end : start + width * BigInt(i + 1);
    slices.push({ from: a, to: b });
  }
  return slices;
}