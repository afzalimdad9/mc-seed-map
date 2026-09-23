import { createWorldGenerator } from "../../../packages/core/create-world-generator.js";
import { unknownColor } from "../../../packages/core/biome-colors.js";
import { structureOverlay, LANDMARK_TYPES, blockToPixel } from "../../../packages/core/structures.js";

const canvas = document.getElementById("map");
const ctx = canvas.getContext("2d");
const statusEl = document.getElementById("status");
const posEl = document.getElementById("pos");
const legendEl = document.getElementById("legend");
const structuresEl = document.getElementById("structures");
const structLegendEl = document.getElementById("structLegend");
const hoverEl = document.getElementById("hover");
const overlayToggles = document.getElementById("overlayToggles");
const findTypeEl = document.getElementById("findType");
const findRadiusEl = document.getElementById("findRadius");
const landmarkResultEl = document.getElementById("landmarkResult");

const { engine, registry, palette } = await (async () => {
  const e = await createWorldGenerator();
  return { engine: e, registry: e.versions, palette: e.palette };
})();
statusEl.textContent = "Engine ready";

const versionSelect = document.getElementById("version");
versionSelect.replaceChildren();
for (const v of registry.versions) {
  const opt = document.createElement("option");
  opt.value = v.label;
  opt.textContent = v.label;
  if (v.label === "1.18") opt.selected = true;
  versionSelect.appendChild(opt);
}
{
  const opt = document.createElement("option");
  opt.value = "newest";
  opt.textContent = "newest";
  versionSelect.appendChild(opt);
}

// Map view state (block coordinates of top-left corner at current scale)
const view = {
  scale: 4,          // Cubiomes scale
  blockPerCell: 4,    // world blocks represented by one pixel cell
  originX: -192,      // top-left in scaled coords
  originZ: -128,
  spawn: null,        // { x, z } block coords of spawn (overworld only)
};
const SCALES = [1, 4, 16]; // wheel zoom cycle (up to less detail on Ctrl+down)

// ---- parallel rendering: biome bands computed in Web Workers ------------
// Each worker runs its own WASM instance over a horizontal band of the map;
// results are bit-for-bit identical to the single-threaded path. The pool is
// reused across renders; a stale render whose epoch no longer matches simply
// stops drawing (a newer generate() supersedes it).
let renderPool = null;
let renderEpoch = 0;
const MAX_RENDER_WORKERS = 4;

class RenderPool {
  constructor(size) {
    this.size = size;
    this.workers = [];
    this.next = 0;
    this.pending = new Map();
    for (let i = 0; i < size; i++) {
      const w = new Worker(new URL("./render-worker.js", import.meta.url), { type: "module" });
      w.onmessage = (e) => {
        const { id, ok, cells, error } = e.data;
        const p = this.pending.get(id);
        if (!p) return;
        this.pending.delete(id);
        if (ok) p.resolve(Int32Array.from(cells));
        else p.reject(new Error(error || "render worker failed"));
      };
      this.workers.push(w);
    }
  }

  render(params) {
    const id = ++renderEpochId;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.workers[this.next % this.size].postMessage({ id, ...params });
      this.next++;
    });
  }

  terminate() {
    for (const w of this.workers) w.terminate();
    this.workers = [];
    this.pending.clear();
  }
}
let renderEpochId = 0;

function ensurePool(nWorkers) {
  const supported = typeof Worker !== "undefined" && typeof URL !== "undefined";
  if (!supported) return null;
  if (renderPool && renderPool.size === nWorkers) return renderPool;
  if (renderPool) renderPool.terminate();
  renderPool = new RenderPool(nWorkers);
  return renderPool;
}

function fillBand(img, counts, band, cells) {
  const w = img.width;
  const data = img.data;
  for (let r = 0; r < band.rows; r++) {
    const rowStart = (band.start + r) * w;
    const src = r * w;
    for (let col = 0; col < w; col++) {
      const id = cells[col];
      counts.set(id, (counts.get(id) || 0) + 1);
      const color = id < 0 ? unknownColor() : palette.rgb(id);
      const o = (rowStart + col) * 4;
      data[o] = color[0];
      data[o + 1] = color[1];
      data[o + 2] = color[2];
      data[o + 3] = 255;
    }
    cells = cells.subarray(w);
  }
}

function parseSeed(text) {
  const t = text.trim();
  if (/^-?\d+$/.test(t)) return BigInt(t);
  // String seed → JavahashCode
  let h = 0n;
  for (let i = 0; i < t.length; i++) h = (h * 31n + BigInt(t.charCodeAt(i))) & 0xffffffffffffffffn;
  return BigInt.asIntN(64, h);
}

function selectedVersion() {
  const id = document.getElementById("version").value;
  const entry = id === "newest" ? registry.versions[registry.versions.length - 1] : registry.find(id);
  if (!entry) throw new Error(`Version not supported: ${id}`);
  return entry;
}

function renderLegend(counts) {
  legendEl.innerHTML = "";
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  for (const [id, n] of sorted.slice(0, 16)) {
    const li = document.createElement("li");
    const sw = document.createElement("span");
    sw.className = "swatch";
    const [r, g, b] = palette.rgb(id);
    sw.style.background = `rgb(${r},${g},${b})`;
    const name = engine.biomeName(id);
    li.append(sw, document.createTextNode(`${name} (${n})`));
    legendEl.appendChild(li);
  }
}

function buildOverlayToggles() {
  overlayToggles.innerHTML = "";
  for (const spec of LANDMARK_TYPES) {
    const label = document.createElement("label");
    label.className = "ovl";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.value = spec.name;
    input.checked = true;
    label.append(input, document.createTextNode(spec.name));
    overlayToggles.appendChild(label);
  }
  findTypeEl.replaceChildren();
  for (const spec of LANDMARK_TYPES) {
    const opt = document.createElement("option");
    opt.value = spec.name;
    opt.textContent = spec.name;
    findTypeEl.appendChild(opt);
  }
  renderStructLegend();
}

function renderStructLegend() {
  structLegendEl.innerHTML = "";
  const chips = document.createElement("li");
  chips.className = "solid";
  chips.textContent = "viable";
  chips.title = "Generation-viable position (terrain/biome pass)";
  const outlines = document.createElement("li");
  outlines.className = "hollow";
  outlines.textContent = "attempt only";
  outlines.title = "Attempted generation position that could not generate here";
  const spawn = document.createElement("li");
  spawn.className = "spawn";
  spawn.textContent = "spawn";
  spawn.title = "Actual spawn position for the seed";
  structLegendEl.append(chips, outlines, spawn);
}

function selectedOverlayTypes() {
  const types = [];
  for (const spec of LANDMARK_TYPES) {
    const input = overlayToggles.querySelector(`input[value="${spec.name}"]`);
    if (input && input.checked) types.push(spec);
  }
  return types;
}

// @state markers kept from the last generate() so hover can label structures.
let lastMarkers = [];
let overlayVisible = 0;

function drawSpawnMarker() {
  if (!view.spawn) return;
  const { px, pz } = blockToPixel(view.spawn.x, view.spawn.z, view.blockBox, view.scale);
  if (px < -8 || px > canvas.width + 8 || pz < -8 || pz > canvas.height + 8) return;
  const s = Math.max(3, Math.round(6 + view.scale / 2));
  const cx = px, cy = pz;
  // 4-point star with white outline (spawn)
  ctx.beginPath();
  ctx.moveTo(cx, cy - s);
  ctx.lineTo(cx + s * 0.35, cy - s * 0.35);
  ctx.lineTo(cx + s, cy);
  ctx.lineTo(cx + s * 0.35, cy + s * 0.35);
  ctx.lineTo(cx, cy + s);
  ctx.lineTo(cx - s * 0.35, cy + s * 0.35);
  ctx.lineTo(cx - s, cy);
  ctx.lineTo(cx - s * 0.35, cy - s * 0.35);
  ctx.closePath();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = "#ffcc00";
  ctx.fill();
}

let targetRing = null; // { x, z } found by the landmark finder

function drawTargetRing() {
  if (!targetRing) return;
  const { px, pz } = blockToPixel(targetRing.x, targetRing.z, view.blockBox, view.scale);
  if (px < -8 || px > canvas.width + 8 || pz < -8 || pz > canvas.height + 8) return;
  const r = Math.max(5, Math.round(12 / Math.sqrt(view.scale)));
  ctx.beginPath();
  ctx.arc(px, pz, r, 0, Math.PI * 2);
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(px, pz, Math.max(2, Math.round(r / 2.5)), 0, Math.PI * 2);
  ctx.strokeStyle = "#ff3366";
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawOverlay(markers, box) {
  const w = canvas.width;
  const h = canvas.height;
  window.__seedmapOverlay = markers;
  lastMarkers = markers;
  let visible = 0;
  let viableCount = 0;
  for (const m of markers) {
    const { px, pz } = blockToPixel(m.x, m.z, box, view.scale);
    if (px < -8 || px > w + 8 || pz < -8 || pz > h + 8) continue;
    visible++;
    const s = Math.max(2, Math.min(8, Math.round(2 + view.scale / 3)));
    const cx = px, cy = pz;
    ctx.beginPath();
    ctx.moveTo(cx, cy - s);
    ctx.lineTo(cx + s, cy);
    ctx.lineTo(cx, cy + s);
    ctx.lineTo(cx - s, cy);
    ctx.closePath();
    if (m.viable) {
      viableCount++;
      ctx.fillStyle = m.color;
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      const hs = s / 3;
      ctx.fillRect(cx - hs / 2, cy - hs / 2, hs, hs);
    } else {
      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = m.color;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
  overlayVisible = visible;
  drawSpawnMarker();
  drawTargetRing();
  return { visible, viableCount };
}

function nearestLandmark() {
  const seed = parseSeed(document.getElementById("seed").value);
  const version = selectedVersion();
  const name = findTypeEl.value;
  const radius = Math.max(128, Number(findRadiusEl.value) || 4000);
  landmarkResultEl.textContent = "—";
  targetRing = null;
  window.__seedmapNearest = null;
  if (view.spawn === null) {
    landmarkResultEl.textContent = "Generate the overworld map first.";
    return;
  }
  const types = LANDMARK_TYPES.filter((s) => s.name === name);
  const box = {
    x0: view.spawn.x - radius, z0: view.spawn.z - radius,
    x1: view.spawn.x + radius, z1: view.spawn.z + radius,
  };
  const all = structureOverlay({ engine, seed, mc: version.enumValue, box, types });
  const byDist = (a, b) => {
    const da = (a.x - view.spawn.x) ** 2 + (a.z - view.spawn.z) ** 2;
    const db = (b.x - view.spawn.x) ** 2 + (b.z - view.spawn.z) ** 2;
    return da - db;
  };
  const viable = all.filter((m) => m.viable).sort(byDist);
  const pool = viable.length ? viable : all;
  pool.sort(byDist);
  const nearest = pool[0];
  if (!nearest) {
    landmarkResultEl.textContent = `No ${name} within ${radius} blocks of spawn.`;
    return;
  }
  const dist = Math.round(Math.hypot(nearest.x - view.spawn.x, nearest.z - view.spawn.z));
  window.__seedmapNearest = {
    type: name, x: nearest.x, z: nearest.z, viable: nearest.viable, dist,
  };
  targetRing = { x: nearest.x, z: nearest.z };
  landmarkResultEl.textContent = `${name} at (${nearest.x}, ${nearest.z}) · ${dist} blocks from spawn` +
    (nearest.viable ? "" : " (attempt only)");
  drawOverlay(lastMarkers, view.blockBox);
}

async function generate() {
  const seed = parseSeed(document.getElementById("seed").value);
  const version = selectedVersion();
  const scale = view.scale;
  const dimension = { overworld: 0, nether: -1, end: 1 }[document.getElementById("dimension").value] ?? 0;

  // pixels: canvas size; each pixel = one biome cell at this scale
  const w = canvas.width;
  const h = canvas.height;
  const y = scale === 1 ? 63 : 15; // vertical is 1:1 only at block scale

  const epoch = ++renderEpoch;
  statusEl.textContent = `Rendering ${w}×${h} @ scale ${scale} (dim ${dimension})…`;
  const t0 = performance.now();

  engine.initialize({ version: version.enumValue, seed, dimension });

  view.spawn = null;
  const box = {
    x0: view.originX * view.scale,
    z0: view.originZ * view.scale,
    x1: (view.originX + w) * view.scale,
    z1: (view.originZ + h) * view.scale,
  };
  view.blockBox = box;
  window.__seedmapOrigin = { x: view.originX, z: view.originZ, scale: view.scale };
  if (dimension === 0) {
    const g = engine.createGenerator({ version: version.enumValue, seed, dimension: 0 });
    try { view.spawn = g.getSpawn(); } finally { g.destroy(); }
  }
  window.__seedmapSpawn = view.spawn;
  window.__seedmapOverlay = [];

  const img = ctx.createImageData(w, h);
  const counts = new Map();

  // Split the height into horizontal bands, one per worker.
  const nBands = Math.min(MAX_RENDER_WORKERS, h);
  const pool = ensurePool(nBands);
  const bands = [];
  for (let i = 0; i < nBands; i++) {
    const start = Math.floor((h * i) / nBands);
    const end = Math.floor((h * (i + 1)) / nBands);
    if (end > start) bands.push({ start, rows: end - start });
  }

  const renderBand = (band) => {
    const params = {
      version: version.enumValue,
      dimension,
      seed,
      x: view.originX,
      z: view.originZ + band.start,
      width: w,
      height: band.rows,
      scale,
      y,
    };
    return pool ? pool.render(params) : engine.generateBiomes(params);
  };

  await Promise.all(bands.map(async (band) => {
    let cells = await renderBand(band);
    if (epoch !== renderEpoch) return; // superseded by a newer generate()
    fillBand(img, counts, band, cells);
    ctx.putImageData(img, 0, 0);
    statusEl.textContent = `Rendered ${band.start + band.rows}/${h} rows…`;
  }));

  if (epoch !== renderEpoch) return;

  // Structure overlay (overworld only — region generation is overworld-only).
  let overlayNote = "";
  lastMarkers = [];
  overlayVisible = 0;
  if (dimension === 0) {
    const types = selectedOverlayTypes();
    if (types.length) {
      const markers = structureOverlay({ engine, seed, mc: version.enumValue, box, types });
      const { visible, viableCount } = drawOverlay(markers, box);
      overlayNote = ` · ${visible} struct${visible === 1 ? "" : "s"} (${viableCount} viable)`;
    }
  }
  window.__seedmapOverlay = lastMarkers;

  const ms = Math.round(performance.now() - t0);
  statusEl.textContent = `Done in ${ms} ms · seed ${seed} · ${version.label}${overlayNote}`;
  renderLegend(counts);
}

function safeGenerate() {
  generate().catch((err) => {
    statusEl.textContent = `Error: ${String((err && err.message) || err)}`;
  });
}

canvas.addEventListener("mousemove", (e) => {
  const rect = canvas.getBoundingClientRect();
  const px = Math.floor((e.clientX - rect.left) * (canvas.width / rect.width));
  const pz = Math.floor((e.clientY - rect.top) * (canvas.height / rect.height));
  const scaledX = view.originX + px;
  const scaledZ = view.originZ + pz;
  const blockX = scaledX * view.scale;
  const blockZ = scaledZ * view.scale;

  let label = `block (${blockX}, ${blockZ})`;
  try {
    const biome = engine.getBiome(blockX, view.scale === 1 ? 63 : 15, blockZ, view.scale);
    label += ` · ${engine.biomeName(biome)} [${biome}]`;
  } catch { /* not initialized yet */ }

  const m = lastMarkers.find((mm) => mm.x === blockX && mm.z === blockZ);
  if (m) label += ` · ${m.type}${m.viable ? "" : " (attempt only)"}`;
  if (view.spawn && view.spawn.x === blockX && view.spawn.z === blockZ) label += " · spawn";

  posEl.textContent = label;
  hoverEl.style.display = "block";
  hoverEl.style.left = `${e.clientX - rect.left + 12}px`;
  hoverEl.style.top = `${e.clientY - rect.top + 12}px`;
  hoverEl.textContent = label;
});

canvas.addEventListener("mouseleave", () => { hoverEl.style.display = "none"; });

// Pan: drag with the primary button; redraw on release.
const drag = { active: false, startX: 0, startY: 0, originX: 0, originZ: 0, moved: false, lastX: 0, lastY: 0 };
canvas.addEventListener("mousedown", (e) => {
  const rect = canvas.getBoundingClientRect();
  drag.active = true;
  drag.moved = false;
  drag.startX = (e.clientX - rect.left) * (canvas.width / rect.width);
  drag.startY = (e.clientY - rect.top) * (canvas.height / rect.height);
  drag.lastX = drag.startX;
  drag.lastY = drag.startY;
  drag.originX = view.originX;
  drag.originZ = view.originZ;
  canvas.style.cursor = "grabbing";
});
window.addEventListener("mousemove", (e) => {
  if (!drag.active) return;
  const rect = canvas.getBoundingClientRect();
  const px = (e.clientX - rect.left) * (canvas.width / rect.width);
  const pz = (e.clientY - rect.top) * (canvas.height / rect.height);
  drag.lastX = px;
  drag.lastY = pz;
  if (!drag.moved && Math.hypot(px - drag.startX, pz - drag.startY) < 3) return;
  drag.moved = true;
});
window.addEventListener("mouseup", () => {
  if (!drag.active) return;
  drag.active = false;
  canvas.style.cursor = "crosshair";
  if (!drag.moved) return;
  const dx = drag.lastX - drag.startX;
  const dy = drag.lastY - drag.startY;
  if (dx === 0 && dy === 0) return;
  view.originX = Math.round(drag.originX - dx);
  view.originZ = Math.round(drag.originZ - dy);
  safeGenerate();
});

// Wheel: zoom to the cursor, keeping the block under it stationary.
canvas.addEventListener("wheel", (e) => {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const px = (e.clientX - rect.left) * (canvas.width / rect.width);
  const pz = (e.clientY - rect.top) * (canvas.height / rect.height);
  const i = SCALES.indexOf(view.scale);
  const next = e.deltaY < 0 ? SCALES[Math.max(0, i - 1)] : SCALES[Math.min(SCALES.length - 1, i + 1)];
  if (next === view.scale) return;
  const blockX = (view.originX + px) * view.scale;
  const blockZ = (view.originZ + pz) * view.scale;
  view.scale = next;
  view.blockPerCell = next;
  document.getElementById("scale").value = String(next);
  view.originX = Math.round(blockX / next - px);
  view.originZ = Math.round(blockZ / next - pz);
  safeGenerate();
}, { passive: false });

document.getElementById("generate").addEventListener("click", () => {
  safeGenerate();
});

overlayToggles.addEventListener("change", () => {
  safeGenerate();
});

document.getElementById("findNearest").addEventListener("click", () => {
  try { nearestLandmark(); } catch (err) { landmarkResultEl.textContent = String(err.message || err); }
});

document.getElementById("scale").addEventListener("change", () => {
  const v = Number(document.getElementById("scale").value);
  if (!SCALES.includes(v)) return;
  view.scale = v;
  view.blockPerCell = v;
  safeGenerate();
});

document.getElementById("findStructures").addEventListener("click", () => {
  try {
    const seed = parseSeed(document.getElementById("seed").value);
    const version = selectedVersion();
    engine.initialize({ version: version.enumValue, seed, dimension: 0 });
    structuresEl.innerHTML = "";
    const vt = engine.structures.village;
    let n = 0;
    for (let rx = -8; rx <= 8 && n < 12; rx++) {
      for (let rz = -8; rz <= 8 && n < 12; rz++) {
        const pos = engine.structurePos(vt, seed, rx, rz);
        if (pos) {
          const li = document.createElement("li");
          li.textContent = `village region (${rx},${rz}) → (${pos.x}, ${pos.z})`;
          structuresEl.appendChild(li);
          n++;
        }
      }
    }
    if (n === 0) {
      structuresEl.innerHTML = "<li>No villages in searched regions</li>";
    }
  } catch (err) {
    structuresEl.innerHTML = `<li>${err.message}</li>`;
  }
});

buildOverlayToggles();
const hashSeed = location.hash.match(/#seed=([^&]+)/);
if (hashSeed) document.getElementById("seed").value = hashSeed[1];
safeGenerate();
