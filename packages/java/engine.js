import createModule from "../../wasm/dist/seed_engine.js";

/**
 * JS wrapper over the Cubiomes WASM engine.
 * Seeds are full 64-bit values; we split into two uint32 halves at the ABI.
 */
export class JavaWorldGenerator {
  constructor() {
    this.module = null;
    this.mc = null;
    this.initialized = false;
  }

  async init() {
    this.module = await createModule();
    this.mc = {
      "1.18": this.module._wasm_version_1_18(),
      "1.21": this.module._wasm_version_1_21(),
      newest: this.module._wasm_version_newest(),
    };
    this.structures = {
      village: this.module._wasm_structure_village(),
      desert_pyramid: this.module._wasm_structure_desert_pyramid(),
      ancient_city: this.module._wasm_structure_ancient_city(),
    };
    return this;
  }

  static splitSeed(seed) {
    const v = BigInt(seed);
    return [
      Number(BigInt.asUintN(32, v)),
      Number(BigInt.asUintN(32, v >> 32n)),
    ];
  }

  initialize({ version, seed, dimension = 0 }) {
    if (!this.module) throw new Error("WASM module not loaded");
    const [low, high] = JavaWorldGenerator.splitSeed(seed);
    const mc = typeof version === "number" ? version : this.mc[version];
    if (mc === undefined) throw new Error(`Unknown version: ${version}`);
    const rc = this.module._wasm_init(mc, dimension, low, high);
    if (rc !== 0) throw new Error(`Engine init failed: ${rc}`);
    this.mcCurrent = mc;
    this.initialized = true;
  }

  getBiome(x, y, z, scale = 1) {
    this.#assertInit();
    return this.module._wasm_get_biome(scale, x, y, z);
  }

  generateBiomes({ x, z, width, height, scale = 4, y = 15 }) {
    this.#assertInit();
    const count = width * height;
    const ptr = this.module._malloc(count * 4);
    if (!ptr) throw new Error("WASM malloc failed");
    try {
      const rc = this.module._wasm_generate_biomes(
        x, z, width, height, scale, y, ptr,
      );
      if (rc !== 0) throw new Error(`generateBiomes failed: ${rc}`);
      const heap = new Int32Array(this.module.HEAP32.buffer, ptr, count);
      return Int32Array.from(heap);
    } finally {
      this.module._free(ptr);
    }
  }

  biomeName(biomeId) {
    this.#assertInit();
    const len = this.module._wasm_biome_name_length(this.mcCurrent, biomeId);
    if (len <= 0) return "unknown";
    const ptr = this.module._wasm_biome_name_ptr(this.mcCurrent, biomeId);
    return this.module.UTF8ToString(ptr, len);
  }

  structurePos(structureType, seed, regX, regZ) {
    if (!this.module) throw new Error("WASM module not loaded");
    const [low, high] = JavaWorldGenerator.splitSeed(seed);
    const ptr = this.module._malloc(8);
    if (!ptr) throw new Error("WASM malloc failed");
    try {
      const mc =
        typeof structureType === "number" ? this.mcCurrent : undefined;
      const ok = this.module._wasm_structure_pos(
        typeof structureType === "object" ? structureType.type : structureType,
        this.mcCurrent,
        low,
        high,
        regX,
        regZ,
        ptr,
      );
      if (!ok) return null;
      return {
        x: this.module.getValue(ptr, "i32"),
        z: this.module.getValue(ptr + 4, "i32"),
      };
    } finally {
      this.module._free(ptr);
    }
  }

  isSlimeChunk(seed, chunkX, chunkZ) {
    if (!this.module) throw new Error("WASM module not loaded");
    const [low, high] = JavaWorldGenerator.splitSeed(seed);
    return this.module._wasm_slime_chunk(low, high, chunkX, chunkZ) === 1;
  }

  #assertInit() {
    if (!this.module) throw new Error("WASM module not loaded");
    if (!this.initialized) throw new Error("World generator not initialized");
  }
}
