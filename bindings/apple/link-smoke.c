/*
 * Links against a slice of seed_engine.xcframework and executes on the
 * runner, proving the packaged static library actually links and runs (not
 * just that the archive exists). The CI "macos" job compiles this against the
 * macOS slice, runs it, and also compiles it (unlinked) against the iOS
 * device slice to prove the header + ABI are consumable from an iOS target.
 */
#include <stdio.h>
#include <string.h>
#include "seed_engine.h"

int main(void) {
    int mc = seed_engine_version_from_string("1.18");
    if (mc < 0) {
        fprintf(stderr, "seed_engine_version_from_string(\"1.18\") failed\n");
        return 1;
    }
    if (seed_engine_init(mc, SEED_DIM_OVERWORLD, 0) != 0) {
        fprintf(stderr, "seed_engine_init failed\n");
        return 1;
    }
    int plains = seed_engine_biome_id(mc, "plains");
    if (plains < 0) {
        fprintf(stderr, "no minecraft:plains at this version\n");
        return 1;
    }
    int biome = seed_engine_get_biome(4, 0, 63, 0);
    if (biome < 0) {
        fprintf(stderr, "seed_engine_get_biome failed\n");
        return 1;
    }
    int buf[4 * 4];
    if (seed_engine_generate_biomes(-8, -8, 4, 4, 4, 63, buf) != 0) {
        fprintf(stderr, "seed_engine_generate_biomes failed\n");
        return 1;
    }
    for (int i = 0; i < 16; i++) {
        if (buf[i] < 0) {
            fprintf(stderr, "negative biome id %d in output[%d]\n", buf[i], i);
            return 1;
        }
    }
    if (strcmp(seed_engine_biome_name(mc, plains), "plains") != 0) {
        fprintf(stderr, "seed_engine_biome_name mismatch\n");
        return 1;
    }
    printf("XCFRAMEWORK macOS slice: linked and ran (plains=%d, biome(4,0,63,0)=%d)\n",
           plains, biome);
    return 0;
}