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
import { JavaWorldGenerator } from "../../../packages/java/engine.js";
import { createVersionRegistry } from "../../../packages/java/versions.js";
import { paletteFromEngine, unknownColor } from "../../../packages/core/biome-colors.js";
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

function versionEntry(registry, label) {
  const id = label ?? "1.18";
  const found =
    registry.versions.find((v) => v.label === id) ||
    registry.versions.find((v) => v.id === `java-${id}`);
  if (!found) {
    console.error(`Unsupported version: ${id}`);
    console.error("Supported:", registry.versions.map((v) => v.label).join(", "));
    process.exit(2);
  }
  return found;
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
  find   --version <v> [--count 5] [--max-seeds 100000] [--workers 4]
         [--biome <name>...] [--biome-grid 3]
         [--structure <name>...] [--radius 1024] [--structure-viable]
         [--slime] [--slime-radius 4] [--distance <blocks>] [--near-spawn]
  versions`);
  process.exit(cmd ? 0 : 1);
}

const engine = await new JavaWorldGenerator().init();
const registry = createVersionRegistry(engine.module);

if (cmd === "versions") {
  console.log(JSON.stringify(registry, null, 2));
  process.exit(0);
}

const version = versionEntry(registry, args.version);
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
  const scale = Number(args.scale ?? 4);
  const palette = paletteFromEngine(engine);
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
  console.log(JSON.stringify({ out, size, scale, seed: seed.toString(), version: version.label }));
} else if (cmd === "find") {
  await runFind({ args, registry, version });
} else {
  console.error(`Unknown command: ${cmd}`);
  process.exit(1);
}
