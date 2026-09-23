# Bedrock Edition — concrete evaluation of `cubiomes-bedrock` + roadmap

Status: **explicitly unsupported** (engine models Java Edition only). This
document records the concrete, verified findings about the Bedrock ecosystem
and what it would take to land Bedrock support honestly.

## Verified evaluation of `cubiomes-bedrock` (2026-09-23)

The only public project matching the name is
[fragrantresult186/cubiomes-bedrock](https://github.com/FragrantResult186/cubiomes-bedrock)
(MIT, fork of Cubitect/cubiomes, 11 stars). We cloned and audited it:

**Conclusion: it is NOT a Bedrock implementation.** It is upstream Java
Cubiomes with the README re-worded ("Java Edition" -> "Bedrock Edition").

Evidence:

1. Its `generator.h` commit history is entirely Cubitect's (upstream) history;
   the fork owner's commits repeatedly *cherry-pick upstream Cubitect commits*
   (e.g. "credit: https://github.com/Cubitect/cubiomes/commit/4168027…").
2. `biomes.h` defines only the normal Java `MCVersion` enum
   (`MC_1_18 … MC_1_21_50/60`); there is no `MC_BEDROCK*` or seed-type change.
3. The only "Bedrock" content in the whole tree are incidental code comments in
   `finders.c/finders.h` (golem cage "in Bedrock", "z->y->x in bedrock",
   chorus-plant pre-RNG for "Bedrock End Gateway"). None change behavior.
4. Its extra files (`cave.c`, `mt.c`, `tables/btree*.h`) are upstream/master
   or xpple-fork features, not Bedrock support.

**Do not adopt this repo.** Vendoring it would silently claim Bedrock support
that the code does not provide — exactly the failure mode this project refuses.

## Can we do Bedrock at all? (state of the art)

- Upstream Cubitect/cubiomes **refuses** Bedrock by design
  (Cubitect, issue #48: "I won't add support for non-Java versions… can't
  validate the code"). No official branch exists.
- No other maintained C/JS/Rust library implements Bedrock biome or structure
  generation. What exists in the Bedrock space is *data*, not generation:
  `pmmp/BedrockData` (biome id maps / network blobs), `bedrock-samples` /
  BDS dumps, and closed-source apps (Chunkbase) which reuse **Java** Cubiomes.
- The reason tools like `MZEEN2424/ChunkBiomesGUI` reuse Java Cubiomes for
  Bedrock is defensible only for **1.18+ biomes**: since 1.18 both editions
  use the same multi-noise biome source, so for an equal numeric seed the
  overworld/nether biome layout is identical. Bedrock seeds are signed 32-bit;
  a Bedrock seed used numerically in the Java generator gives the Java 1.18
  layout, which matches Bedrock 1.18+.
- **Structures** do NOT match between editions (different salts, spacing,
  structure sets, and Bedrock-only placement rules) and have **no public
  implementation**. Any structure output would be pure candidates.
- **Pre-1.18 Bedrock** used its own generator with no public model at all.

## What this project does today

- `createWorldGenerator({ platform: "bedrock" })` throws an explicit
  descriptive error (covered by `scripts/test-interface.mjs`).
- `packages/java/versions.js` exports `EDITIONS.bedrock` and a registry note
  `{ supported: false }`; Java results are never presented as Bedrock results.
- Bedrock requests fail loudly and immediately. This stays until a backend
  verifiably produces Bedrock-correct output.

## Roadmap (land Bedrock honestly)

### Phase A — Bedrock 1.18+ biome map only (low effort, honest scope)

The one thing that is genuinely correct to ship: overworld/nether **biomes**
for Bedrock seeds on versions where Bedrock shares the Java multi-noise source.

1. `packages/java/seed32.js`: derive the Bedrock 64-bit seed from the user's
   signed 32-bit Bedrock seed using the documented rule
   (sign-extend the i32 into the uint64 seed; Bedrock world-type bit handling
   documented per version).
2. `createWorldGenerator({ platform: "bedrock", version: "1.18" })` returns a
   `BedrockWorldGenerator` that REUSES the existing Java engine/wasm with that
   seed, tagged `edition: "bedrock"`, and a biome-only contract. `getSpawn`,
   structures, slime-chunk and terrain must **throw** (not silently differ).
3. Version gate: only versions where the shared biome source applies
   (1.18.x – newest); other versions fail loudly.
4. UI/CLI: `--edition bedrock` / edition toggle unlocks the biome map only,
   with a visible "biomes match, structures/spawn not supported" notice.

### Phase B — Structure candidates + verification harness

1. Reverse-engineer Bedrock structure configs (salts, region scales, validity
   rules) — this is the long pole and has no published source.
2. Optional BDS harness: run `locate structure <type>` (or `locate` task via a
   Bedrock Dedicated Server) against generated candidates to promote
   "candidate" → "confirmed"; everything unverified stays candidate.

### Phase C — Pre-1.18 Bedrock / spawn / slime chunks

No public model exists; treat as non-goal unless independently
reverse-engineered.

## Decision

Ship Phase A only if a validation fixture (a handful of Bedrock-world biome
screenshots or a BDS world diff) is captured first; otherwise keep the loud
`unsupported` error. Lands no sooner than after M6; tracked in MILESTONES.