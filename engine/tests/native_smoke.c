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

    printf("Native smoke test passed.\n");
    return 0;
}
