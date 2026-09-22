/*
 * Platform-neutral implementation behind the Android JNI layer.
 *
 * Kept free of <jni.h> so the exact marshal logic runs in ordinary C tests on
 * the host (bindings/android/tests/impl_smoke.c) while the JNI glue in
 * seed_engine_android.c is only argument conversion. Seeds cross the ABI as
 * two uint32 halves (lo, hi) — the same convention as the WASM binding and the
 * JS splitSeed() helper, so any consumer can reproduce a seed identically.
 */
#ifndef SEED_ENGINE_JNI_IMPL_H
#define SEED_ENGINE_JNI_IMPL_H

#include <stddef.h>
#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

/* Returns 0 on success, nonzero error code otherwise. */
int sej_create(int mc, int dim, uint32_t seed_lo, uint32_t seed_hi,
               intptr_t *out_handle);
void sej_destroy(intptr_t handle);
int sej_set_seed(intptr_t handle, uint32_t seed_lo, uint32_t seed_hi);
int sej_get_biome(intptr_t handle, int scale, int x, int y, int z,
                  int *out_id);
/* out_capacity is the available int slots in out (must be >= w*h). */
int sej_gen_biomes(intptr_t handle, int x, int z, int w, int h, int scale,
                   int y, int out_capacity, int *out_ids);

int sej_get_biome_count(intptr_t handle);
int sej_version_min(void);
int sej_version_max(void);
/* Returns the Cubiomes MCVersion enum or a negative value when unknown. */
int sej_version_from_string(const char *label);

#ifdef __cplusplus
}
#endif

#endif /* SEED_ENGINE_JNI_IMPL_H */