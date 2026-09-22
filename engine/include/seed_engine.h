#ifndef SEED_ENGINE_H
#define SEED_ENGINE_H

#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

/* Dimensions (matches Cubiomes enum Dimension) */
#define SEED_DIM_NETHER    (-1)
#define SEED_DIM_OVERWORLD 0
#define SEED_DIM_END       1

/*
 * Initializes a Cubiomes generator.
 * mc: Cubiomes MCVersion enum value (use seed_engine_* version helpers).
 * dim: SEED_DIM_* .
 * seed: full unsigned 64-bit Minecraft seed.
 * Returns 0 on success.
 */
int seed_engine_init(int mc, int dim, uint64_t seed);

/*
 * Query a biome at scaled coordinates.
 * scale: 1 = block scale, 4 = biome scale (see Cubiomes Range).
 * Returns Cubiomes biome ID, or -1 on failure.
 */
int seed_engine_get_biome(int scale, int x, int y, int z);

/*
 * Generate a rectangular biome area into a caller-provided int buffer of
 * width*height elements. Coordinates are in the selected scale.
 * y: vertical coordinate (1:1 iff scale==1, else 1:4).
 * Returns 0 on success, negative on failure.
 */
int seed_engine_generate_biomes(int x, int z, int width, int height,
                                int scale, int y, int *output);

/* Resource-id name for a biome at a given MC version (static storage). */
const char *seed_engine_biome_name(int mc, int biome_id);

/* Human-readable MC version string (static storage), or NULL. */
const char *seed_engine_mc_name(int mc);

/*
 * Structure generation attempt position for a region.
 * struct_type: Cubiomes enum StructureType value.
 * reg_x/reg_z: region coordinates.
 * out_x/out_z: block position output.
 * Returns non-zero on success, 0 if no position.
 */
int seed_engine_structure_pos(int struct_type, int mc, uint64_t seed,
                              int reg_x, int reg_z, int *out_x, int *out_z);

/* Returns 1 if the structure could generate at the block position, else 0. */
int seed_engine_structure_viable(int struct_type, int block_x, int block_z);

/* Returns 1 if the chunk is a slime chunk, else 0. */
int seed_engine_slime_chunk(uint64_t seed, int chunk_x, int chunk_z);

/* Version constant helpers (avoid hardcoding enum values in JS). */
int seed_engine_version_1_18(void);
int seed_engine_version_1_21(void);
int seed_engine_version_newest(void);
int seed_engine_structure_village(void);
int seed_engine_structure_desert_pyramid(void);
int seed_engine_structure_ancient_city(void);

#ifdef __cplusplus
}
#endif

#endif /* SEED_ENGINE_H */
