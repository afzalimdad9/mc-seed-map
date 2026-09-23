package com.seedmaps

/**
 * Host JVM test of the REAL Kotlin facade + REAL JNI glue
 * (Java_com_seedmaps_NativeEngine_*), run against libseed_engine.so built by
 * build-host.sh. Mirrors the WASM/CLI known-answer contract:
 *
 *   - version label "1.18" parses to enum 22, range is [MC_B1_7, MC_NEWEST]
 *   - seed 262 @ 1.18 overworld (0,63,0) -> mushroom_fields (id 14)
 *   - bulk 64x48 grid @ scale 4 starts with cell 49 (golden file first cell)
 *   - bulk/single queries agree inside the box
 *   - 64-bit seed halves are honoured (hi!=0 changes the answer)
 */
object SeedWorldGenHostTest {
    private fun check(cond: Boolean, msg: String) {
        if (!cond) throw AssertionError("FAIL: $msg")
    }

    @JvmStatic
    fun main(args: Array<String>) {
        check(NativeEngine.versionMin == 1, "version min is Beta 1.7")
        check(NativeEngine.versionMax >= 28, "version max covers newest")
        check(NativeEngine.versionFromString("1.18") == 22, "1.18 -> enum 22")
        check(NativeEngine.versionFromString("bogus") < 0, "unknown label rejected")

        SeedWorldGen(SeedWorldGen.MC_1_18, SeedWorldGen.DIM_OVERWORLD, 262).use { g ->
            check(g.biome(1, 0, 63, 0) == 14, "seed 262 (0,63,0) -> mushroom_fields(14)")

            val cells = g.biomes(-96, -80, 64, 48, 4, 15)!!
            check(cells.size == 64 * 48, "bulk grid size")
            check(cells[0] == 49, "grid cells[0] == 49 (golden first cell)")

            val bx = -64; val bz = -56
            val idx = (bz + 80) * 64 + (bx + 96)
            check(cells[idx] == g.biome(4, bx, 15, bz), "bulk/single agreement in-grid")
        }

        // high seed half changes the generator (2^32 != 262 -> lo=0, hi=1)
        val hi = NativeEngine.create(22, 0, 4294967296L) // splitSeed -> (0, 1)
        val hiId = NativeEngine.biome(hi, 1, 0, 63, 0)
        NativeEngine.destroy(hi)
        check(hiId >= 0 && hiId != 14, "hi seed half changes result from seed 262")

        println("ANDROID KOTLIN + JNI TEST PASSED (host JVM loads the real JNI glue)")
    }
}