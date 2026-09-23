#!/usr/bin/env node
/**
 * Minecraft Seed Tools CLI
 *
 * Usage:
 *   node apps/cli/src/index.js biome --seed 262 --version 1.18 --x 0 --y 63 --z 0
 *   node apps/cli/src/index.js map   --seed 262 --version 1.18 --size 64 --out map.ppm
 *   node apps/cli/src/index.js find  --version 1.18 --count 5 --structure village --radius 0
 */
import { writeFileSync } from "node:fs";
import { createWorldGenerator } from "../../../packages/core/create-world-generator.js";
import { unknownColor } from "../../../packages/core/biome-colors.js";
import { structureOverlay, LANDMARK_TYPES } from "../../../packages/core/structures.js";
import { runFind } from "./find.js";

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) args[key] = true;
      else {
        if (key in args) {
          if (!Array.isArray(args[key])) args[key] = [args[key]];
          args[key].push(next);
        } else args[key] = next;
        i++;
      }
    } else args._.push(a);
  }
  return args;
}

function parseSeed(text) {
  const t = String(text).trim();
  if (/^-?\d+$/.test(t)) return BigInt(t);
  let h = 0n;
  for (let i = 0; i < t.length; i++) h = (h * 31n + BigInt(t.charCodeAt(i))) & 0xffffffffffffffffn;
  return BigInt.asIntN(64, h);
}

function writePPM(path, width, height, rgb) {
  const header = Buffer.from(`P6\n${width} ${height}\n255\n`, "ascii");
  writeFileSync(path, Buffer.concat([header, Buffer.from(rgb)]));
}

const args = parseArgs(process.argv.slice(2));
const cmd = args._[0];

if (!cmd || args.help) {
  console.log(`Minecraft Seed Tools CLI

Commands:
  biome  --seed <s> --version <v> --x --y --z [--scale 1]
  map    --seed <s> --version <v> [--size 64] [--scale 4] [--out map.ppm]
         [--structures] (default on for overworld; pass --no-structures)
  find   --version <v> [--count 5] [--max-seeds 100000] [--workers 4]
         [--biome <name>...] [--biome-grid 3]
         [--structure <name>...] [--radius 1024] [--structure-viable]
         [--slime] [--slime-radius 4] [--distance <blocks>] [--near-spawn]
  versions`);
  process.exit(cmd ? 0 : 1);
}

const engine = await createWorldGenerator();
const registry = engine.versions;

if (cmd === "versions") {
  console.log(JSON.stringify(registry, null, 2));
  process.exit(0);
}

function versionEntry(label) {
  if (label === "newest") return registry.versions[registry.versions.length - 1];
  const found = registry.find(label);
  if (found) return found;
  // Fall back to Cubiomes' own parser (accepts "1.19.4", "1.20.6", ...).
  const parsed = engine.versionFromString(label);
  if (parsed > 0) return registry.find(parsed);
  console.error(`Unsupported version: ${label}`);
  console.error("Supported:", registry.versions.map((v) => v.label).join(", "));
  process.exit(2);
}

const version = versionEntry(args.version);
const seed = parseSeed(args.seed ?? "0");
const dimension = args.dimension === "nether" ? -1 : args.dimension === "end" ? 1 : 0;

if (cmd === "biome") {
  engine.initialize({ version: version.enumValue, seed, dimension });
  const scale = Number(args.scale ?? 1);
  const x = Number(args.x ?? 0);
  const y = Number(args.y ?? (scale === 1 ? 63 : 15));
  const z = Number(args.z ?? 0);
  const biomeId = engine.getBiome(x, y, z, scale);
  console.log(JSON.stringify({
    edition: "java",
    version: version.label,
    seed: seed.toString(),
    dimension: args.dimension ?? "overworld",
    position: { x, y, z, scale },
    biomeId,
    biome: engine.biomeName(biomeId),
  }, null, 2));
} else if (cmd === "map") {
  engine.initialize({ version: version.enumValue, seed, dimension });
  const size = Number(args.size ?? 64);
  const scale = Number(args.scale ?? (dimension === 0 ? 4 : 1)); // nether/end are 1:1
  const palette = engine.palette;
  const cells = engine.generateBiomes({
    x: Number(args.x ?? -size / 2),
    z: Number(args.z ?? -size / 2),
    width: size,
    height: size,
    scale,
    y: scale === 1 ? 63 : 15,
  });
  const rgb = Buffer.alloc(size * size * 3);
  for (let i = 0; i < cells.length; i++) {
    const c = cells[i] < 0 ? unknownColor() : palette.rgb(cells[i]);
    rgb[i * 3] = c[0];
    rgb[i * 3 + 1] = c[1];
    rgb[i * 3 + 2] = c[2];
  }
  const out = typeof args.out === "string" ? args.out : `map-${seed}.ppm`;
  writePPM(out, size, size, rgb);
  const report = { out, size, scale, seed: seed.toString(), version: version.label };

  // Optional structure overlay: stamp markers into the PPM and report them.
  if (args.structures !== false && dimension === 0) {
    const mapX = Number(args.x ?? -size / 2);
    const mapZ = Number(args.z ?? -size / 2);
    const markers = structureOverlay({
      engine,
      seed,
      mc: version.enumValue,
      box: { x0: mapX * scale, z0: mapZ * scale, x1: (mapX + size) * scale, z1: (mapZ + size) * scale },
    });
    for (const m of markers) {
      const px = Math.round((m.x - mapX * scale) / scale);
      const pz = Math.round((m.z - mapZ * scale) / scale);
      if (px < 0 || px >= size || pz < 0 || pz >= size) continue;
      const i = (pz * size + px) * 3;
      if (m.viable) {
        rgb[i] = 255; rgb[i + 1] = 255; rgb[i + 2] = 255; // blink white = viable
      } else {
        rgb[i] = 90; rgb[i + 1] = 90; rgb[i + 2] = 90;     // hollow grey = attempt only
      }
    }
    writePPM(out, size, size, rgb);
    report.structures = {
      enabled: LANDMARK_TYPES.map((t) => t.name),
      count: markers.length,
      viable: markers.filter((m) => m.viable).length,
      markers: markers.map(({ type, x, z, viable }) => ({ type, x, z, viable })),
    };
  }

  console.log(JSON.stringify(report));
} else if (cmd === "find") {
  await runFind({ args, registry, version });
} else {
  console.error(`Unknown command: ${cmd}`);
  process.exit(1);
}
