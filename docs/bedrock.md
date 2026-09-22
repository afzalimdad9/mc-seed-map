# Bedrock Edition — adapter plan (not implemented)

Status: **explicitly unsupported**. The engine models Java Edition only
(Cubiomes). This document records why, what the correct seam is, and how to
land Bedrock support honestly later.

## Why Java code cannot be reused for Bedrock

1. **Different seed space.**
   - Java: signed 64-bit seed; strings hashed with `String.hashCode()` over
     UTF-16, widened to 64 bits.
   - Bedrock: signed **32-bit** seed; text seeds are `String.hashCode()` over
     UTF-16 truncated to i32 (plus world-type bit in some cases).
   The same world-name string produces *different* numerical seeds on the two
   editions.

2. **Algorithm divergence.**
   - Pre-1.18 Bedrock used its own layered generator; Java and Bedrock terrain
     and biome layout only converge starting with 1.18's multi-noise biome
     source (shared world defaults).
   - Even when biomes match, **structure placement, spawn, and terrain features
     differ** (salts, region sizes, RNG consumption, biome-validity rules).

3. **Verification gap.** Without a ground-truth oracle (Bedrock Dedicated
   Server or `/locate` fixtures) structure positions can only be *candidates*.

Therefore: seed-for-seed Bedrock mapping through the Java engine is wrong
produces wrong terrain, wrong structures, wrong spawns. The project treats this
as a **non-goal** (see `docs/MILESTONES.md`).

## Current behavior

- `createWorldGenerator({ platform: "bedrock" })` throws an explicit
  descriptive error. Verified by `scripts/test-interface.mjs`.
- `packages/java/versions.js` exports `EDITIONS.bedrock` and a registry note
  `{ supported: false }`; Java results are never presented as Bedrock results.
- Nowhere in the UI/CLI can a Bedrock seed be selected.

## Roadmap (if Bedrock support is wanted)

1. **Second C engine behind the same enum-idiom.** Vendor a Bedrock-capable
   generator, e.g. `cubiomes-bedrock` (MIT fork) or a Bedrock port, as
   `engine-bedrock/` exposing a compatible ABI (`seed_engine_*`) plus a
   `SEED_PLATFORM_BEDROCK` tag and i32 seed ABI.
2. **JS adapter.** `packages/bedrock/BedrockWorldGenerator.js` implementing the
   identical `WorldGenerator` contract; `createWorldGenerator` dispatches on
   `platform`. WASM build optional second artifact (`seed_engine_bedrock.wasm`).
3. **Edition-aware UI/CLI.** `--edition java|bedrock`, dimension/version
   selects that only show versions the backend models.
4. **Verification harness.** Optional BDS step that `/locate`s a candidate and
   promotes it to "confirmed"; everything else stays "candidate".

Until then: Bedrock requests fail loudly and immediately.