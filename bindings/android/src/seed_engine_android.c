/*
 * JNI glue for the seed map engine (Android).
 *
 * Thin conversions only; all logic lives in seed_engine_jni_impl.c so the
 * exact behaviour is host-tested (bindings/android/tests/impl_smoke.c).
 * Exported symbols are Java_<package>_NativeEngine_* — the package must match
 * the Kotlin `NativeEngine` declaration in this folder.
 */
#include <jni.h>
#include <stdlib.h>

#include "seed_engine_jni_impl.h"

JNIEXPORT jlong JNICALL Java_com_seedmaps_NativeEngine_nativeCreate(
    JNIEnv *env, jobject thiz, jint mc, jint dim, jint seedLo, jint seedHi)
{
    (void)env; (void)thiz;
    intptr_t handle = 0;
    if (sej_create(mc, dim, (uint32_t)seedLo, (uint32_t)seedHi, &handle) != 0)
        return 0;
    return (jlong)handle;
}

JNIEXPORT void JNICALL Java_com_seedmaps_NativeEngine_nativeDestroy(
    JNIEnv *env, jobject thiz, jlong handle)
{
    (void)env; (void)thiz;
    sej_destroy((intptr_t)handle);
}

JNIEXPORT void JNICALL Java_com_seedmaps_NativeEngine_nativeSetSeed(
    JNIEnv *env, jobject thiz, jlong handle, jint seedLo, jint seedHi)
{
    (void)env; (void)thiz;
    sej_set_seed((intptr_t)handle, (uint32_t)seedLo, (uint32_t)seedHi);
}

JNIEXPORT jint JNICALL Java_com_seedmaps_NativeEngine_nativeGetBiome(
    JNIEnv *env, jobject thiz, jlong handle, jint scale, jint x, jint y,
    jint z)
{
    (void)env; (void)thiz;
    int id = -1;
    sej_get_biome((intptr_t)handle, scale, x, y, z, &id);
    return id;
}

JNIEXPORT jintArray JNICALL
Java_com_seedmaps_NativeEngine_nativeGenerateBiomes(JNIEnv *env, jobject thiz,
                                                    jlong handle, jint x,
                                                    jint z, jint w, jint h,
                                                    jint scale, jint y)
{
    (void)thiz;
    jint *out = (jint *)malloc((size_t)(w * h) * sizeof(jint));
    if (!out)
        return NULL;
    int rc = sej_gen_biomes((intptr_t)handle, x, z, w, h, scale, y, w * h,
                            (int *)out);
    if (rc != 0) {
        free(out);
        return NULL;
    }
    jintArray arr = (*env)->NewIntArray(env, w * h);
    if (arr)
        (*env)->SetIntArrayRegion(env, arr, 0, w * h, out);
    free(out);
    return arr;
}

JNIEXPORT jint JNICALL Java_com_seedmaps_NativeEngine_nativeVersionMin(
    JNIEnv *env, jobject thiz)
{
    (void)env; (void)thiz;
    return (jint)sej_version_min();
}

JNIEXPORT jint JNICALL Java_com_seedmaps_NativeEngine_nativeVersionMax(
    JNIEnv *env, jobject thiz)
{
    (void)env; (void)thiz;
    return (jint)sej_version_max();
}

JNIEXPORT jint JNICALL Java_com_seedmaps_NativeEngine_nativeVersionFromString(
    JNIEnv *env, jobject thiz, jstring label)
{
    (void)thiz;
    if (!label)
        return -1;
    const char *utf = (*env)->GetStringUTFChars(env, label, NULL);
    if (!utf)
        return -1;
    int mc = sej_version_from_string(utf);
    (*env)->ReleaseStringUTFChars(env, label, utf);
    return (jint)mc;
}