/**
 * Universal search worker.
 *
 * Works identically from Node `worker_threads` and browser `Web Worker`
 * (module type): listens for a `search` payload, scans an [from,to) seed
 * interval with the shared WASM engine, and streams progress/done messages.
 *
 * Wire protocol (both directions are `{ cmd, id, ... }`):
 *   -> { cmd:"search", id, payload:{ version, dimension, nearSpawn,
 *        count, from, to, filters:[descriptors] } }
 *   <- { cmd:"progress", id, scanned, found }
 *   <- { cmd:"done",     id, results, scanned }
 *   -> { cmd:"cancel",   id }
 */

import { JavaWorldGenerator } from "../java/engine.js";
import { buildFilters } from "./filters.js";
import { createFinderView, runSeedSearch } from "./search.js";

// In Node workers parentPort comes from node:worker_threads; in browsers the
// worker global is self. Detect Node (process exists) and pull the port.
const isNode = typeof process !== "undefined" && !!process.versions?.node;
const api = isNode
  ? (await import("node:worker_threads")).parentPort
  : globalThis.self;

if (!api) throw new Error("Unsupported worker environment");

const searchState = new Map(); // id -> { signal }

async function handleSearch(id, payload) {
  const {
    version, dimension = 0, nearSpawn = false, count = 1,
    from = 0, to = count * 100, filters: filterDescs = [],
  } = payload;

  const engine = await new JavaWorldGenerator().init();
  const view = createFinderView(engine, { version, dimension, nearSpawn });
  const filter = buildFilters(filterDescs);
  filter.init(view);

  const signal = { aborted: false };
  searchState.set(id, signal);

  try {
    const { results, scanned } = await runSeedSearch({
      view,
      filter,
      count,
      maxSeeds: Number(to) - Number(from),
      start: BigInt(from),
      signal,
      onProgress: ({ scanned: sc, found }) => {
        api.postMessage({ cmd: "progress", id, scanned: sc, found });
      },
    });
    api.postMessage({ cmd: "done", id, results, scanned });
  } catch (err) {
    api.postMessage({ cmd: "error", id, message: String(err && err.message || err) });
  } finally {
    view.destroy();
    searchState.delete(id);
  }
}

async function onMessage(msg) {
  if (!msg || typeof msg !== "object" || !msg.cmd) return;
  if (msg.cmd === "search") {
    await handleSearch(msg.id, msg.payload);
  } else if (msg.cmd === "cancel") {
    const st = searchState.get(msg.id);
    if (st) st.aborted = true;
  }
}

if (isNode) {
  api.on("message", onMessage);
} else {
  api.onmessage = async (event) => onMessage(event.data ?? event);
}