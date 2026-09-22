#include "seed_engine.h"

#include "biomenoise.h"
#include "biomes.h"
#include "finders.h"
#include "generator.h"
#include "util.h"

#include <stddef.h>
#include <stdlib.h>
#include <string.h>

struct SeedEngineCtx {
    Generator gen;
    int mc;
    int dim;
    int initialized;
};

SeedEngineCtx *seed_engine_create(int mc, int dim, uint64_t seed)
{
    SeedEngineCtx *ctx = (SeedEngineCtx *)malloc(sizeof(SeedEngineCtx));
    if (!ctx)
        return NULL;
    setupGenerator(&ctx->gen, mc, 0);
    applySeed(&ctx->gen, dim, seed);
    ctx->mc = mc;
    ctx->dim = dim;
    ctx->initialized = 1;
    return ctx;
}

void seed_engine_destroy(SeedEngineCtx *ctx)
{
    free(ctx);
}

int seed_engine_get_biome_ctx(SeedEngineCtx *ctx, int scale, int x, int y,
                              int z)
{
    if (!ctx || !ctx->initialized)
        return -1;
    return getBiomeAt(&ctx->gen, scale, x, y, z);
}

int seed_engine_generate_biomes_ctx(SeedEngineCtx *ctx, int x, int z,
                                    int width, int height, int scale, int y,
                                    int *output)
{
    if (!ctx || !ctx->initialized || output == NULL)
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

    return genBiomes(&ctx->gen, output, r);
}

int seed_engine_structure_viable_ctx(SeedEngineCtx *ctx, int struct_type,
                                     int block_x, int block_z)
{
    if (!ctx || !ctx->initialized)
        return 0;
    return isViableStructurePos(struct_type, &ctx->gen, block_x, block_z, 0);
}

void seed_engine_set_seed_ctx(SeedEngineCtx *ctx, uint64_t seed)
{
    if (ctx && ctx->initialized)
        applySeed(&ctx->gen, ctx->dim, seed);
}

int seed_engine_get_spawn_ctx(SeedEngineCtx *ctx, int *out_x, int *out_z)
{
    if (!ctx || !ctx->initialized || !out_x || !out_z)
        return 0;
    Pos pos = getSpawn(&ctx->gen);
    *out_x = pos.x;
    *out_z = pos.z;
    return 1;
}

int seed_engine_estimate_spawn_ctx(SeedEngineCtx *ctx, int *out_x,
                                   int *out_z)
{
    if (!ctx || !ctx->initialized || !out_x || !out_z)
        return 0;
    Pos pos = estimateSpawn(&ctx->gen, NULL);
    *out_x = pos.x;
    *out_z = pos.z;
    return 1;
}

/* Legacy global API: thin wrapper over a default handle. */
static SeedEngineCtx *g_default = NULL;

int seed_engine_init(int mc, int dim, uint64_t seed)
{
    seed_engine_destroy(g_default);
    g_default = seed_engine_create(mc, dim, seed);
    return g_default ? 0 : -1;
}

int seed_engine_get_biome(int scale, int x, int y, int z)
{
    if (!g_default)
        return -1;
    return seed_engine_get_biome_ctx(g_default, scale, x, y, z);
}

int seed_engine_generate_biomes(int x, int z, int width, int height,
                                int scale, int y, int *output)
{
    if (!g_default)
        return -1;
    return seed_engine_generate_biomes_ctx(g_default, x, z, width, height,
                                           scale, y, output);
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
    if (!g_default)
        return 0;
    return seed_engine_structure_viable_ctx(g_default, struct_type, block_x,
                                            block_z);
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

const char *seed_engine_structure_name(int struct_type)
{
    return struct2str(struct_type);
}

int seed_engine_structure_type_count(void)
{
    return FEATURE_NUM;
}

int seed_engine_structure_region_size(int struct_type, int mc)
{
    StructureConfig conf;
    if (getStructureConfig(struct_type, mc, &conf))
        return conf.regionSize;
    return 0; /* structure not available at this version */
}

int seed_engine_biome_id(int mc, const char *name)
{
    if (!name)
        return -1;
    for (int id = 0; id < 256; id++) {
        const char *n = biome2str(mc, id);
        if (n && strcmp(n, name) == 0)
            return id;
    }
    return -1;
}

int seed_engine_biome_colors(unsigned char *out)
{
    if (!out)
        return -1;
    initBiomeColors((unsigned char(*)[3])out);
    return 0;
}
