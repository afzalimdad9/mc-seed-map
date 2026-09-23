import { createWorldGenerator } from "../../../packages/core/create-world-generator.js";

const statusEl = document.getElementById("status");
const progressEl = document.getElementById("progress");
const resultsEl = document.getElementById("results");
const startBtn = document.getElementById("start");
const stopBtn = document.getElementById("stop");

// ---- engine bootstrap ----
const workspace = await createWorldGenerator();
const engine = workspace;
const registry = workspace.versions;
statusEl.textContent = "Engine ready";

const versionSel = document.getElementById("version");
for (const v of registry.versions) {
  const opt = document.createElement("option");
  opt.value = v.label;
  opt.textContent = v.label;
  if (v.label === "1.18") opt.selected = true;
  versionSel.appendChild(opt);
}

// Enumerate structures (all Cubiomes types) as labelled checkboxes.
const structOl = document.getElementById("structList");
const structureNames = Object.keys(engine.structures).sort();
for (const name of structureNames) {
  const label = document.createElement("label");
  const cb = document.createElement("input");
  cb.type = "checkbox";
  cb.name = "struct";
  cb.value = name;
  if (name === "village") cb.checked = true; // valid on every supported version
  label.append(cb, document.createTextNode(name));
  structOl.appendChild(label);
}

// ---- filter descriptor from the form ----
function buildFilters() {
  const children = [];
  const biomes = document.getElementById("biomes").value
    .split(/[\s,]+/).map((s) => s.trim()).filter(Boolean);
  if (biomes.length) {
    children.push({ t: "biome", opts: { biomes, grid: Number(document.getElementById("biomeGrid").value) } });
  }
  const structures = [...document.querySelectorAll("input[name=struct]:checked")].map((c) => c.value);
  const radius = Number(document.getElementById("radius").value);
  const viable = document.getElementById("viable").checked;
  if (structures.length) {
    const fs = structures.map((name) => ({ t: "structure", opts: { name, radius, viable } }));
    children.push(structures.length > 1 ? { t: "or", children: fs } : fs[0]);
  }
  if (document.getElementById("slime").checked) {
    children.push({ t: "slime", opts: { radius: Number(document.getElementById("slimeRadius").value) } });
  }
  const dist = Number(document.getElementById("distance").value);
  if (dist) children.push({ t: "distance", opts: { max: dist } });
  if (!children.length) throw new Error("Select at least one filter");
  return children.length === 1 ? children[0] : { t: "and", children };
}

function selectedVersion() {
  const label = document.getElementById("version").value;
  const entry = label === "newest" ? registry.versions[registry.versions.length - 1] : registry.find(label);
  if (!entry) throw new Error(`Version not supported: ${label}`);
  return entry;
}

// ---- worker pool ----
let workers = [];
let cancelled = false;
let timer = null;
let results = [];
let finished = 0;

function stopAll(type) {
  cancelled = true;
  for (const w of workers) {
    try { w.postMessage({ cmd: "cancel", id: w._id }); } catch { /* noop */ }
    if (type === "terminate") w.terminate();
  }
}

function fmt(seedBig) {
  const asSigned = BigInt.asIntN(64, BigInt(seedBig));
  return { seed: seedBig, signed: asSigned.toString() };
}

function startSearch() {
  cancelled = false;
  results = [];
  finished = 0;
  stopBtn.disabled = false;
  startBtn.disabled = true;

  const version = selectedVersion();
  const filters = buildFilters();
  const count = Number(document.getElementById("count").value);
  const maxSeeds = Number(document.getElementById("maxSeeds").value);
  const nWorkers = Number(document.getElementById("workers").value);
  const nearSpawn = document.getElementById("nearSpawn").checked;

  resultsEl.innerHTML = "";
  progressEl.textContent = `Starting ${nWorkers} workers over ${maxSeeds} seeds…`;

  // Even split of the [0, maxSeeds) interval across workers.
  const width = Math.floor(maxSeeds / nWorkers);
  const pool = [];
  for (let i = 0; i < nWorkers; i++) {
    const from = BigInt(i * width);
    const to = i === nWorkers - 1 ? BigInt(maxSeeds) : BigInt((i + 1) * width);
    pool.push({ from, to });
  }
  workers = pool.map((slice, i) => spawnWorker(i, slice, {
    version: version.enumValue, dimension: 0, nearSpawn, count, filters,
    maxSeeds, onProgress: renderProgress, onResult: (r) => appendResult(r),
    onDone: () => maybeFinish(),
  }));
  timer = setInterval(maybeFinish, 100);
}

function renderResults() {
  results.sort((a, b) => Number(a.seed) - Number(b.seed));
  resultsEl.replaceChildren();
  const count = Number(document.getElementById("count").value);
  for (const [i, rr] of results.slice(0, count).entries()) {
    const li = document.createElement("li");
    const { seed, signed } = fmt(rr.seed);
    const a = document.createElement("a");
    a.href = `./index.html#seed=${signed}`;
    a.textContent = "map";
    a.className = "open-in-map";
    li.append(
      document.createTextNode(`#${i + 1}  seed ${signed} (${seed})` +
        (rr.dist != null ? `  · structure ${Math.round(rr.dist)} blocks` : "")),
      a,
    );
    resultsEl.appendChild(li);
  }
  if (!results.length) resultsEl.innerHTML = "<li>No matches yet…</li>";
}

function appendResult(r) {
  results.push(r);
  renderResults();
  if (results.length >= Number(document.getElementById("count").value)) maybeFinish();
}

function spawnWorker(i, slice, ctx) {
  const w = new Worker(new URL("../../../packages/finder/worker.js", import.meta.url), { type: "module" });
  w._id = String(i);
  w.postMessage({
    cmd: "search",
    id: w._id,
    payload: {
      version: ctx.version,
      dimension: ctx.dimension,
      nearSpawn: ctx.nearSpawn,
      count: ctx.count,
      from: slice.from.toString(),
      to: slice.to.toString(),
      filters: ctx.filters,
    },
  });
  let scanned = 0;
  w.onmessage = (e) => {
    const msg = e.data;
    if (msg.cmd === "progress") {
      scanned = Math.max(scanned, msg.scanned);
      if (msg.found) for (const r of msg.results || []) ctx.onResult && ctx.onResult(r);
      ctx.onProgress && ctx.onProgress(scanned, msg.found);
    } else if (msg.cmd === "done") {
      for (const r of msg.results || []) ctx.onResult && ctx.onResult(r);
      finished++;
      ctx.onDone && ctx.onDone();
      w.terminate();
    } else if (msg.cmd === "error") {
      ctx.onProgress && ctx.onProgress(0, 0, msg.message);
    }
  };
  return w;
}

function renderProgress(scanned, found, err) {
  const donePct = finished / Math.max(1, workers.length);
  progressEl.textContent = err
    ? `Error: ${err}`
    : `scanned ${scanned} · found ${results.length} · workers done ${Math.round(donePct * 100)}%`;
}

function maybeFinish() {
  const count = Number(document.getElementById("count").value);
  if (cancelled) return;
  if (workers.length && finished >= workers.length) {
    stopAll("terminate");
    clearInterval(timer);
    finishUi(`Search complete: ${results.length} seed(s) found.`);
  } else if (results.length >= count) {
    stopAll("terminate");
    clearInterval(timer);
    finishUi(`Reached target: ${results.length} seed(s) found.`);
  }
}

function finishUi(msg) {
  stopBtn.disabled = true;
  startBtn.disabled = false;
  progressEl.textContent = msg;
}

startBtn.addEventListener("click", () => {
  try { startSearch(); } catch (err) { progressEl.textContent = `Error: ${err.message}`; }
});

stopBtn.addEventListener("click", () => {
  stopAll("terminate");
  clearInterval(timer);
  stopBtn.disabled = true;
  startBtn.disabled = false;
  progressEl.textContent = "Stopped.";
});