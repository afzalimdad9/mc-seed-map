/**
 * `find` command: parallel seed search across a worker pool.
 *
 * Composition mirrors the finder descriptor format (packages/finder), so the
 * exact same filters work in the browser UI and the CLI.
 */
import { Worker } from "node:worker_threads";
import { availableParallelism } from "node:os";
import { sliceRange } from "../../../packages/finder/search.js";

function buildFilterDescriptors(args) {
  const children = [];

  const biomes = Array.isArray(args.biome) ? args.biome : (args.biome ? [args.biome] : []);
  if (biomes.length) {
    children.push({ t: "biome", opts: { biomes, grid: Number(args["biome-grid"] ?? 3) } });
  }

  let structures = Array.isArray(args.structure) ? args.structure : (args.structure ? [args.structure] : []);
  structures = structures.map(String);
  const radius = Number(args.radius ?? 1024);
  const viable = !!args["structure-viable"];
  if (structures.length) {
    const fs = structures.map((name) => ({ t: "structure", opts: { name, radius, viable } }));
    children.push(structures.length > 1 ? { t: "or", children: fs } : fs[0]);
  }

  if (args.slime) children.push({ t: "slime", opts: { radius: Number(args["slime-radius"] ?? 4) } });

  const dist = args.distance !== undefined && args.distance !== true ? Number(args.distance) : null;
  if (dist) children.push({ t: "distance", opts: { max: dist } });

  if (!children.length) throw new Error("find requires at least one filter: --biome, --structure, --slime or --distance");
  return children.length === 1 ? children[0] : { t: "and", children };
}

function progressBar(scanned, found, done) {
  return `scanned ${scanned}, found ${found}${done ? " (done)" : ""}`;
}

export async function runFind({ args, registry, version }) {
  const count = Number(args.count ?? 5);
  const maxSeeds = Number(args["max-seeds"] ?? 100000);
  const workers = Math.max(1, Math.min(availableParallelism?.() ?? 4, Number(args.workers ?? Math.min(4, availableParallelism?.() ?? 4))));
  const nearSpawn = !!args["near-spawn"];

  const filters = buildFilterDescriptors(args);
  const slices = sliceRange(0, maxSeeds, workers);

  const workerUrl = new URL("../../../packages/finder/worker.js", import.meta.url);
  const results = [];
  let scannedTotal = 0;
  let done = 0;
  let canceled = false;
  const started = Date.now();

  const jobs = slices.map((slice, i) =>
    new Promise((resolve, reject) => {
      const w = new Worker(workerUrl, { type: "module" });
      const id = String(i);
      w.postMessage({
        cmd: "search",
        id,
        payload: {
          version: version.enumValue,
          dimension: 0,
          nearSpawn,
          count,
          from: slice.from.toString(),
          to: slice.to.toString(),
          filters,
        },
      });
      w.on("message", (msg) => {
        if (msg.cmd === "progress") {
          scannedTotal = Math.max(scannedTotal, msg.scanned);
          if (!canceled) process.stderr.write(`\r${progressBar(scannedTotal, results.length, false)}`);
        } else if (msg.cmd === "done") {
          results.push(...msg.results);
          if (!canceled) process.stderr.write(`\rworker ${id} done (${msg.results.length} matches)\n`);
          resolve();
        } else if (msg.cmd === "error") {
          reject(new Error(msg.message));
        }
      });
      w.on("error", reject);
      w.on("exit", (code) => {
        if (code !== 0) reject(new Error(`worker ${id} exited ${code}`));
      });
    }).finally(() => {
      done++;
    }),
  );

  const cancelOthers = () => {
    canceled = true;
  };

  const watchdog = setInterval(() => {
    if (!canceled && results.length >= count) {
      cancelOthers();
    }
  }, 50);

  try {
    await Promise.all(jobs);
  } finally {
    clearInterval(watchdog);
    process.stderr.write("\n");
  }

  results.sort((a, b) => Number(a.seed) - Number(b.seed));
  const top = results.slice(0, count);
  console.log(JSON.stringify({
    edition: "java",
    version: version.label,
    filters,
    nearSpawn,
    workers,
    scanned: scannedTotal,
    found: top.length,
    elapsedMs: Date.now() - started,
    results: top,
  }, null, 2));
  process.exit(0);
}