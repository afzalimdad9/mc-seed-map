#include "seed_engine.h"

#include "biomes.h"
#include "finders.h"

#include <assert.h>
#include <stdio.h>
#include <stdlib.h>

int main(void)
{
    /* Official Cubiomes README example: MC 1.18, seed 262, Overworld origin
     * must be Mushroom Fields at block (0, 0). */
    int rc = seed_engine_init(MC_1_18, SEED_DIM_OVERWORLD, 262ULL);
    assert(rc == 0);

    int biome = seed_engine_get_biome(1, 0, 63, 0);
    printf("Seed 262 biome at (0, 63, 0): %d (%s)\n", biome,
           seed_engine_biome_name(MC_1_18, biome));
    assert(biome == mushroom_fields);

    /* Rectangular generation at biome scale (scale 4). */
    const int width = 16, height = 16;
    int *output = malloc(sizeof(int) * (size_t)(width * height));
    assert(output != NULL);
    rc = seed_engine_generate_biomes(-8, -8, width, height, 4, 15, output);
    assert(rc == 0);
    int valid = 1;
    for (int i = 0; i < width * height; i++) {
        if (output[i] < 0)
            valid = 0;
    }
    assert(valid);
    printf("Generated %d biome cells successfully.\n", width * height);
    free(output);

    /* Structure helpers must not crash and must return sane values. */
    int sx = 0, sz = 0;
    int found = seed_engine_structure_pos(Village, MC_1_18, 262ULL, 0, 0,
                                          &sx, &sz);
    printf("Village attempt near origin: found=%d pos=(%d, %d)\n", found, sx,
           sz);

    int slime = seed_engine_slime_chunk(262ULL, 0, 0);
    printf("Chunk (0,0) slime=%d\n", slime);

    /* Version helpers must round-trip into names. */
    int mc = seed_engine_version_1_18();
    const char *name = seed_engine_mc_name(mc);
    printf("MC_1_18 enum=%d name=%s\n", mc, name ? name : "(null)");
    assert(name != NULL);

    /* Handle-based API: spawn, estimate, biome colors, structure names. */
    SeedEngineCtx *ctx = seed_engine_create(MC_1_18, SEED_DIM_OVERWORLD,
                                            262ULL);
    assert(ctx != NULL);

    int biome2 = seed_engine_get_biome_ctx(ctx, 1, 0, 63, 0);
    printf("Handle biome at (0, 63, 0): %d\n", biome2);
    assert(biome2 == mushroom_fields);

    int wxs = 0, wzs = 0;
    int have = seed_engine_get_spawn_ctx(ctx, &wxs, &wzs);
    printf("World spawn: have=%d pos=(%d, %d)\n", have, wxs, wzs);
    assert(have == 1);

    int ex = 0, ez = 0;
    have = seed_engine_estimate_spawn_ctx(ctx, &ex, &ez);
    printf("Estimated spawn: have=%d pos=(%d, %d)\n", have, ex, ez);
    assert(have == 1);

    const char *vname = seed_engine_structure_name(Village);
    printf("Structure name Village=%s\n", vname ? vname : "(null)");
    assert(vname != NULL);

    const char *aname = seed_engine_structure_name(Ancient_City);
    printf("Structure name Ancient_City=%s\n", aname ? aname : "(null)");
    assert(aname != NULL);

    unsigned char colors[768];
    rc = seed_engine_biome_colors(colors);
    assert(rc == 0);
    int nonZero = 0;
    for (int i = 0; i < 768; i++)
        if (colors[i] != 0)
            nonZero++;
    printf("Biome color palette bytes set: %d/768\n", nonZero);
    assert(nonZero > 0);

    seed_engine_destroy(ctx);
    ctx = NULL;

    printf("Native smoke test passed.\n");
    return 0;
}
