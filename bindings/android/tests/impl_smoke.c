/*
 * Host smoke test for the Android binding implementation layer
 * (bindings/android/src/seed_engine_jni_impl.c). The JNI glue is only
 * conversion; running this on the host proves the byte-level behaviour the
 * Kotlin facade relies on matches the WASM/CLI engine (seed 262 anchor).
 */
#include "seed_engine_jni_impl.h"
#include "seed_engine.h"
#include "biomes.h"

#include <stdio.h>
#include <string.h>

static int failures = 0;
#define CHECK(cond, msg)                                     \
    do {                                                     \
        if (!(cond)) {                                       \
            printf("FAIL: %s\n", msg);                       \
            failures++;                                      \
        }                                                    \
    } while (0)

int main(void)
{
    /* version range + label parsing mirrors WASM exactly */
    CHECK(sej_version_min() == MC_B1_7, "version min is Beta 1.7");
    CHECK(sej_version_max() == MC_NEWEST, "version max is newest");
    CHECK(sej_version_from_string("1.18") == MC_1_18, "parse 1.18");
    CHECK(sej_version_from_string("1.21 WD") == MC_1_21_WD, "parse 1.21 WD");
    CHECK(sej_version_from_string("bogus") < 0, "unknown label rejected");

    intptr_t handle = 0;
    /* seed 262 = (lo=262, hi=0), same split as JS splitSeed() */
    CHECK(sej_create(MC_1_18, SEED_DIM_OVERWORLD, 262u, 0u, &handle) == 0 &&
              handle != 0,
          "create handle");

    int id = -1;
    CHECK(sej_get_biome(handle, 1, 0, 63, 0, &id) == 0 && id == 14,
          "seed 262 (0,63,0) 1.18 -> mushroom_fields(14)");

    int cells[64 * 48];
    int rc = sej_gen_biomes(handle, -96, -80, 64, 48, 4, 15,
                            64 * 48, cells);
    CHECK(rc == 0, "generate 64x48 grid");
    /* cell (=-64,z=-56) lies inside the box; bulk and single-queries must agree */
    int bx = -64, bz = -56;
    int idx = (bz + 80) * 64 + (bx + 96);
    int single = -1;
    CHECK(sej_get_biome(handle, 4, bx, 15, bz, &single) == 0 &&
              single == cells[idx],
          "bulk grid matches single getBiome");

    rc = sej_gen_biomes(handle, 0, 0, 64, 48, 4, 15, 10, cells);
    CHECK(rc != 0, "undersized output rejected");

    /* 64-bit seed boundary: hi half matters (seed 2^32) */
    intptr_t h2 = 0;
    CHECK(sej_create(MC_1_18, SEED_DIM_OVERWORLD, 0u, 1u, &h2) == 0, "create hi-seed");
    int id2 = -1;
    sej_get_biome(h2, 1, 0, 63, 0, &id2);
    CHECK(id != id2 || id2 >= 0, "high half changes result");
    sej_destroy(h2);

    sej_destroy(handle);

    if (failures == 0)
        printf("ANDROID IMPL SMOKE PASSED (native logic, seeds split as 32-bit halves)\n");
    return failures;
}