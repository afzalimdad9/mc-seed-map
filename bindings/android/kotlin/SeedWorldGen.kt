package com.seedmaps

import kotlin.math.floor
import kotlin.math.abs

/**
 * Low-level JNI bridge to the seed map C engine.
 *
 * The native library is `libseed_engine.so` built by build-android.sh for each
 * ABI under jniLibs. Seeds are full 64-bit values split into two 32-bit
 * halves — exact match to the WASM binding so a seed reproduced here equals a
 * seed reproduced in the web app / CLI.
 */
internal object NativeEngine {
    init {
        System.loadLibrary("seed_engine")
    }

    private external fun nativeCreate(mc: Int, dim: Int, seedLo: Int, seedHi: Int): Long
    private external fun nativeDestroy(handle: Long)
    private external fun nativeSetSeed(handle: Long, seedLo: Int, seedHi: Int)
    private external fun nativeGetBiome(handle: Long, scale: Int, x: Int, y: Int, z: Int): Int
    private external fun nativeGenerateBiomes(handle: Long, x: Int, z: Int, w: Int, h: Int, scale: Int, y: Int): IntArray?
    private external fun nativeVersionMin(): Int
    private external fun nativeVersionMax(): Int
    private external fun nativeVersionFromString(label: String): Int

    /** Split a full seed into (lo, hi) as Java int halves: hi<<32 | lo. */
    internal fun splitSeed(seed: Long): Pair<Int, Int> {
        val lo = (seed and 0xffffffffL).toInt()
        val hi = (seed ushr 32).toInt()
        return lo to hi
    }

    internal fun create(mc: Int, dim: Int, seed: Long): Long {
        val (lo, hi) = splitSeed(seed)
        return nativeCreate(mc, dim, lo, hi)
    }

    internal fun destroy(handle: Long) = nativeDestroy(handle)

    internal fun setSeed(handle: Long, seed: Long) {
        val (lo, hi) = splitSeed(seed)
        nativeSetSeed(handle, lo, hi)
    }

    internal fun biome(handle: Long, scale: Int, x: Int, y: Int, z: Int): Int =
        nativeGetBiome(handle, scale, x, y, z)

    internal fun biomes(handle: Long, x: Int, z: Int, w: Int, h: Int, scale: Int, y: Int): IntArray? =
        nativeGenerateBiomes(handle, x, z, w, h, scale, y)

    internal val versionMin: Int get() = nativeVersionMin()
    internal val versionMax: Int get() = nativeVersionMax()
    internal fun versionFromString(label: String): Int = nativeVersionFromString(label)
}

/** High-level, allocation-safe WorldGenerator over the native engine. */
class SeedWorldGen(private val mc: Int, private val dim: Int, seed: Long) : AutoCloseable {
    private val handle: Long = NativeEngine.create(mc, dim, seed)
    var seed: Long = seed
        set(value) {
            field = value
            NativeEngine.setSeed(handle, value)
        }

    /** Single biome id at block (x, z) with the given vertical y and scale. */
    fun biome(scale: Int, x: Int, y: Int, z: Int): Int =
        NativeEngine.biome(handle, scale, x, y, z)

    /** row-major biome ids covering a rectangular block area. */
    fun biomes(x: Int, z: Int, w: Int, h: Int, scale: Int, y: Int): IntArray? =
        NativeEngine.biomes(handle, x, z, w, h, scale, y)

    override fun close() = NativeEngine.destroy(handle)

    companion object {
        const val DIM_OVERWORLD = 0
        const val DIM_NETHER = -1
        const val DIM_END = 1

        /** Cubiomes struct2str-valid sidebar: 1.18 is enum 22. */
        const val MC_1_18 = 22
    }
}