/*
 * Host/NDK-shared implementation for the Android binding. See header.
 */
#include "seed_engine_jni_impl.h"

#include "seed_engine.h"

#include <string.h>

static SeedEngineCtx *as_ctx(intptr_t h)
{
    return (SeedEngineCtx *)(void *)h;
}

int sej_create(int mc, int dim, uint32_t seed_lo, uint32_t seed_hi,
               intptr_t *out_handle)
{
    if (!out_handle)
        return -1;
    uint64_t seed = ((uint64_t)seed_hi << 32) | (uint64_t)seed_lo;
    SeedEngineCtx *ctx = seed_engine_create(mc, dim, seed);
    if (!ctx)
        return -2;
    *out_handle = (intptr_t)(void *)ctx;
    return 0;
}

void sej_destroy(intptr_t handle)
{
    if (handle)
        seed_engine_destroy(as_ctx(handle));
}

int sej_set_seed(intptr_t handle, uint32_t seed_lo, uint32_t seed_hi)
{
    if (!handle)
        return -1;
    uint64_t seed = ((uint64_t)seed_hi << 32) | (uint64_t)seed_lo;
    seed_engine_set_seed_ctx(as_ctx(handle), seed);
    return 0;
}

int sej_get_biome(intptr_t handle, int scale, int x, int y, int z,
                  int *out_id)
{
    if (!handle || !out_id)
        return -1;
    int id = seed_engine_get_biome_ctx(as_ctx(handle), scale, x, y, z);
    if (id < 0)
        return -2;
    *out_id = id;
    return 0;
}

int sej_gen_biomes(intptr_t handle, int x, int z, int w, int h, int scale,
                   int y, int out_capacity, int *out_ids)
{
    if (!handle || !out_ids)
        return -1;
    if (out_capacity < w * h)
        return -3;
    return seed_engine_generate_biomes_ctx(as_ctx(handle), x, z, w, h, scale,
                                           y, out_ids);
}

int sej_version_min(void)
{
    return seed_engine_version_min();
}

int sej_version_max(void)
{
    return seed_engine_version_max();
}

int sej_version_from_string(const char *label)
{
    if (!label)
        return -1;
    return seed_engine_version_from_string(label);
}