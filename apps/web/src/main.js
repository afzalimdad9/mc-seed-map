import { JavaWorldGenerator } from "../../../packages/java/engine.js";
import { createVersionRegistry } from "../../../packages/java/versions.js";
import { biomeColor, unknownColor } from "./biome-colors.js";

const canvas = document.getElementById("map");
const ctx = canvas.getContext("2d");
const statusEl = document.getElementById("status");
const posEl = document.getElementById("pos");
const legendEl = document.getElementById("legend");
const structuresEl = document.getElementById("structures");
const hoverEl = document.getElementById("hover");

const engine = await new JavaWorldGenerator().init();
const registry = createVersionRegistry(engine.module);
statusEl.textContent = "Engine ready";

// Map view state (block coordinates of top-left corner at current scale)
const view = {
  scale: 4,          // Cubiomes scale
  blockPerCell: 4,    // world blocks represented by one pixel cell
  originX: -192,      // top-left in scaled coords
  originZ: -128,
};

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
  const entry = registry.versions.find((v) => v.id === `java-${id}`) ||
    registry.versions.find((v) => v.label === id);
  if (!entry) throw new Error(`Version not supported: ${id}`);
  return entry;
}

function renderLegend(counts) {
  legendEl.innerHTML = "";
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  for (const [name, n] of sorted.slice(0, 16)) {
    const li = document.createElement("li");
    const sw = document.createElement("span");
    sw.className = "swatch";
    const [r, g, b] = biomeColor(name);
    sw.style.background = `rgb(${r},${g},${b})`;
    li.append(sw, document.createTextNode(`${name} (${n})`));
    legendEl.appendChild(li);
  }
}

function generate() {
  const seed = parseSeed(document.getElementById("seed").value);
  const version = selectedVersion();
  const scale = Number(document.getElementById("scale").value);
  view.scale = scale;

  // pixels: canvas size; each pixel = one biome cell at this scale
  const w = canvas.width;
  const h = canvas.height;

  statusEl.textContent = `Generating ${w}×${h} @ scale ${scale}…`;
  const t0 = performance.now();

  engine.initialize({ version: version.enumValue, seed, dimension: 0 });
  const cells = engine.generateBiomes({
    x: view.originX,
    z: view.originZ,
    width: w,
    height: h,
    scale,
    y: scale === 1 ? 63 : 15,
  });

  const img = ctx.createImageData(w, h);
  const counts = new Map();
  for (let i = 0; i < cells.length; i++) {
    const name = engine.biomeName(cells[i]);
    counts.set(name, (counts.get(name) || 0) + 1);
    const color = cells[i] < 0 ? unknownColor() : biomeColor(name);
    const o = i * 4;
    img.data[o] = color[0];
    img.data[o + 1] = color[1];
    img.data[o + 2] = color[2];
    img.data[o + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);

  const ms = Math.round(performance.now() - t0);
  statusEl.textContent = `Done in ${ms} ms · seed ${seed} · ${version.label}`;
  renderLegend(counts);
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
    const biome = engine.getBiome(blockX, view.scale === 1 ? 63 : 63, blockZ, view.scale);
    label += ` · ${engine.biomeName(biome)} [${biome}]`;
  } catch { /* not initialized yet */ }

  posEl.textContent = label;
  hoverEl.style.display = "block";
  hoverEl.style.left = `${e.clientX - rect.left + 12}px`;
  hoverEl.style.top = `${e.clientY - rect.top + 12}px`;
  hoverEl.textContent = label;
});

canvas.addEventListener("mouseleave", () => { hoverEl.style.display = "none"; });

document.getElementById("generate").addEventListener("click", () => {
  try { generate(); } catch (err) { statusEl.textContent = String(err.message || err); }
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

generate();
