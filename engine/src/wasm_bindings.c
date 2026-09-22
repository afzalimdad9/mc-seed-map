#include "seed_engine.h"

#include <emscripten/emscripten.h>
#include <stdint.h>

/*
 * 64-bit seeds are passed from JS as two unsigned 32-bit halves (low, high)
 * to avoid JS Number precision loss across the WASM boundary.
 */
static inline uint64_t join_seed(double seed_low, double seed_high)
{
    uint64_t low = (uint32_t)seed_low;
    uint64_t high = (uint32_t)seed_high;
    return low | (high << 32);
}

EMSCRIPTEN_KEEPALIVE
int wasm_init(int mc, int dim, double seed_low, double seed_high)
{
    return seed_engine_init(mc, dim, join_seed(seed_low, seed_high));
}

EMSCRIPTEN_KEEPALIVE
int wasm_get_biome(int scale, int x, int y, int z)
{
    return seed_engine_get_biome(scale, x, y, z);
}

EMSCRIPTEN_KEEPALIVE
int wasm_generate_biomes(int x, int z, int width, int height, int scale, int y,
                         int output_ptr)
{
    return seed_engine_generate_biomes(x, z, width, height, scale, y,
                                       (int *)output_ptr);
}

EMSCRIPTEN_KEEPALIVE
int wasm_biome_name_length(int mc, int biome_id)
{
    const char *name = seed_engine_biome_name(mc, biome_id);
    if (!name)
        return 0;
    int len = 0;
    while (name[len] != '\0')
        len++;
    return len;
}

EMSCRIPTEN_KEEPALIVE
const char *wasm_biome_name_ptr(int mc, int biome_id)
{
    return seed_engine_biome_name(mc, biome_id);
}

EMSCRIPTEN_KEEPALIVE
int wasm_mc_name_length(int mc)
{
    const char *name = seed_engine_mc_name(mc);
    if (!name)
        return 0;
    int len = 0;
    while (name[len] != '\0')
        len++;
    return len;
}

EMSCRIPTEN_KEEPALIVE
const char *wasm_mc_name_ptr(int mc)
{
    return seed_engine_mc_name(mc);
}

EMSCRIPTEN_KEEPALIVE
int wasm_structure_pos(int struct_type, int mc, double seed_low,
                       double seed_high, int reg_x, int reg_z, int out_ptr)
{
    int *out = (int *)out_ptr;
    return seed_engine_structure_pos(struct_type, mc,
                                     join_seed(seed_low, seed_high),
                                     reg_x, reg_z, &out[0], &out[1]);
}

EMSCRIPTEN_KEEPALIVE
int wasm_structure_viable(int struct_type, int block_x, int block_z)
{
    return seed_engine_structure_viable(struct_type, block_x, block_z);
}

EMSCRIPTEN_KEEPALIVE
int wasm_slime_chunk(double seed_low, double seed_high, int chunk_x,
                     int chunk_z)
{
    return seed_engine_slime_chunk(join_seed(seed_low, seed_high), chunk_x,
                                   chunk_z);
}

EMSCRIPTEN_KEEPALIVE
int wasm_version_1_18(void) { return seed_engine_version_1_18(); }

EMSCRIPTEN_KEEPALIVE
int wasm_version_1_21(void) { return seed_engine_version_1_21(); }

EMSCRIPTEN_KEEPALIVE
int wasm_version_newest(void) { return seed_engine_version_newest(); }

EMSCRIPTEN_KEEPALIVE
int wasm_structure_village(void) { return seed_engine_structure_village(); }

EMSCRIPTEN_KEEPALIVE
int wasm_structure_desert_pyramid(void)
{
    return seed_engine_structure_desert_pyramid();
}

EMSCRIPTEN_KEEPALIVE
int wasm_structure_ancient_city(void)
{
    return seed_engine_structure_ancient_city();
}
