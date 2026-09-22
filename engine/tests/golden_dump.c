/*
 * Golden-file generator.
 *
 * Reproduces a fixed spec of (version, dimension, seed, area) grids using the
 * native Cubiomes engine and writes the byte-exact results to a binary file.
 * scripts/test-golden.mjs replays the identical queries through WASM and
 * asserts byte-for-byte equality. Update the golden file by rebuilding and
 * re-running this tool whenever the engine changes.
 */
#include "seed_engine.h"

#include "biomes.h"

#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

typedef struct {
    int mc;
    int dim;
    uint64_t seed;
    int scale;
    int x, z, w, h, y;
} Record;

/* The golden spec. Keep in sync with scripts/test-golden.mjs. */
static const Record SPEC[] = {
    { MC_1_7,  SEED_DIM_OVERWORLD, 262ULL,        4, -96, -80, 64, 48, 15 },
    { MC_1_7,  SEED_DIM_OVERWORLD, 0xdeadbeefULL, 4, -96, -80, 64, 48, 15 },
    { MC_1_12, SEED_DIM_OVERWORLD, 262ULL,        4, -96, -80, 64, 48, 15 },
    { MC_1_16, SEED_DIM_OVERWORLD, 262ULL,        4, -96, -80, 64, 48, 15 },
    { MC_1_16, SEED_DIM_OVERWORLD, 1ULL,          4, -96, -80, 64, 48, 15 },
    { MC_1_18, SEED_DIM_OVERWORLD, 262ULL,        4, -96, -80, 64, 48, 15 },
    { MC_1_18, SEED_DIM_OVERWORLD, 0xdeadbeefULL, 4, -96, -80, 64, 48, 15 },
    { MC_1_18, SEED_DIM_NETHER,    1ULL,          1, -96, -80, 64, 48, 63 },
    { MC_1_18, SEED_DIM_END,       1ULL,          1, -96, -80, 64, 48, 63 },
    { MC_1_20, SEED_DIM_OVERWORLD, 262ULL,        4, -96, -80, 64, 48, 15 },
};

static void wr32(FILE *fp, uint32_t v)
{
    uint8_t b[4];
    b[0] = (uint8_t)(v & 0xff);
    b[1] = (uint8_t)((v >> 8) & 0xff);
    b[2] = (uint8_t)((v >> 16) & 0xff);
    b[3] = (uint8_t)((v >> 24) & 0xff);
    fwrite(b, 1, 4, fp);
}

static void wr64(FILE *fp, uint64_t v)
{
    wr32(fp, (uint32_t)(v & 0xffffffffULL));
    wr32(fp, (uint32_t)(v >> 32));
}

int main(int argc, char **argv)
{
    const char *out = argc > 1 ? argv[1] : "tests/golden/worlds.bin";
    const int n = (int)(sizeof(SPEC) / sizeof(SPEC[0]));
    FILE *fp = fopen(out, "wb");
    if (!fp) {
        fprintf(stderr, "cannot open %s\n", out);
        return 1;
    }

    wr32(fp, 0x474f4c44); /* "GOLD" */
    wr32(fp, 1);
    wr32(fp, (uint32_t)n);

    for (int i = 0; i < n; i++) {
        const Record *r = &SPEC[i];
        int *cells = malloc(sizeof(int) * (size_t)(r->w * r->h));
        if (!cells) return 2;
        SeedEngineCtx *ctx = seed_engine_create(r->mc, r->dim, r->seed);
        if (!ctx) return 3;
        int rc = seed_engine_generate_biomes_ctx(ctx, r->x, r->z, r->w, r->h,
                                                 r->scale, r->y, cells);
        seed_engine_destroy(ctx);
        if (rc != 0) {
            fprintf(stderr, "record %d failed\n", i);
            return 4;
        }

        wr32(fp, (uint32_t)r->mc);
        wr32(fp, (uint32_t)r->dim);
        wr64(fp, r->seed);
        wr32(fp, (uint32_t)r->scale);
        wr32(fp, (uint32_t)r->x);
        wr32(fp, (uint32_t)r->z);
        wr32(fp, (uint32_t)r->w);
        wr32(fp, (uint32_t)r->h);
        wr32(fp, (uint32_t)(r->w * r->h));
        for (int k = 0; k < r->w * r->h; k++)
            wr32(fp, (uint32_t)cells[k]);
        free(cells);
    }

    fclose(fp);
    printf("golden file written: %s (%d records)\n", out, n);
    return 0;
}