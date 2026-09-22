#include "seed_engine.h"

#include "biomenoise.h"
#include "biomes.h"
#include "finders.h"
#include "generator.h"
#include "util.h"

#include <stddef.h>

static Generator g_generator;
static int g_initialized = 0;
static int g_mc = 0;
static int g_dim = 0;

int seed_engine_init(int mc, int dim, uint64_t seed)
{
    setupGenerator(&g_generator, mc, 0);
    applySeed(&g_generator, dim, seed);
    g_mc = mc;
    g_dim = dim;
    g_initialized = 1;
    return 0;
}

int seed_engine_get_biome(int scale, int x, int y, int z)
{
    if (!g_initialized)
        return -1;
    return getBiomeAt(&g_generator, scale, x, y, z);
}

int seed_engine_generate_biomes(int x, int z, int width, int height,
                                int scale, int y, int *output)
{
    if (!g_initialized || output == NULL)
        return -1;
    if (width <= 0 || height <= 0)
        return -2;

    Range r;
    r.scale = scale;
    r.x = x;
    r.z = z;
    r.sx = width;
    r.sz = height;
    r.y = y;
    r.sy = 1;

    return genBiomes(&g_generator, output, r);
}

const char *seed_engine_biome_name(int mc, int biome_id)
{
    const char *name = biome2str(mc, biome_id);
    return name ? name : "unknown";
}

const char *seed_engine_mc_name(int mc)
{
    const char *name = mc2str(mc);
    return name;
}

int seed_engine_structure_pos(int struct_type, int mc, uint64_t seed,
                              int reg_x, int reg_z, int *out_x, int *out_z)
{
    Pos pos;
    if (!out_x || !out_z)
        return 0;
    if (!getStructurePos(struct_type, mc, seed, reg_x, reg_z, &pos))
        return 0;
    *out_x = pos.x;
    *out_z = pos.z;
    return 1;
}

int seed_engine_structure_viable(int struct_type, int block_x, int block_z)
{
    if (!g_initialized)
        return 0;
    return isViableStructurePos(struct_type, &g_generator, block_x, block_z, 0);
}

int seed_engine_slime_chunk(uint64_t seed, int chunk_x, int chunk_z)
{
    return isSlimeChunk(seed, chunk_x, chunk_z);
}

int seed_engine_version_1_18(void) { return MC_1_18; }
int seed_engine_version_1_21(void) { return MC_1_21; }
int seed_engine_version_newest(void) { return MC_NEWEST; }
int seed_engine_structure_village(void) { return Village; }
int seed_engine_structure_desert_pyramid(void) { return Desert_Pyramid; }
int seed_engine_structure_ancient_city(void) { return Ancient_City; }
