/**
 * Render worker for the seed map. Each worker owns an independent WASM
 * instance so bands can be generated in parallel while the UI thread stays
 * responsive. The engine math is identical to the single-threaded path
 * (same facade, same WASM build), so banded rendering is bit-for-bit
 * equivalent — verified by the browser test suite.
 */
import { createWorldGenerator } from "../../../packages/core/create-world-generator.js";

let enginePromise = null;

self.onmessage = async (e) => {
  const { id, version, dimension, seed, x, z, width, height, scale, y } = e.data;
  try {
    if (!enginePromise) enginePromise = createWorldGenerator();
    const engine = await enginePromise;
    engine.initialize({ version, seed, dimension });
    const cells = engine.generateBiomes({ x, z, width, height, scale, y });
    self.postMessage({ id, ok: true, cells }, { transfer: [cells.buffer] });
  } catch (err) {
    self.postMessage({ id, ok: false, error: String((err && err.message) || err) });
  }
};