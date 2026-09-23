package com.seedmaps.test

import android.app.Activity
import android.os.Bundle
import android.util.Log
import com.seedmaps.SeedWorldGen

/**
 * On-device known-answer check through the PUBLIC Kotlin facade + real JNI
 * glue + NDK libseed_engine.so bundled as jniLibs. Result is asserted from a
 * test harness via logcat tag SeedMapsOnDevice.
 */
class MainActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        var pass = false
        var hi = -1
        try {
            val g = SeedWorldGen(SeedWorldGen.MC_1_18, SeedWorldGen.DIM_OVERWORLD, 262)
            try {
                val r1 = g.biome(1, 0, 63, 0)          // (0,63,0) -> mushroom_fields(14)
                val cells = g.biomes(-96, -80, 64, 48, 4, 15)
                val first = cells?.getOrNull(0) ?: -1
                val sizeOk = cells?.size == 64 * 48
                pass = r1 == 14 && first == 49 && sizeOk
                Log.i("SeedMapsOnDevice", "r1=$r1 first=$first sizeOk=$sizeOk pass=$pass")
            } finally {
                g.close()
            }

            val ht = SeedWorldGen(SeedWorldGen.MC_1_18, SeedWorldGen.DIM_OVERWORLD, 4294967296L)
            try {
                hi = ht.biome(1, 0, 63, 0)            // hi seed half must differ from 14
            } finally {
                ht.close()
            }
            pass = pass && hi in 0..256 && hi != 14
            Log.i("SeedMapsOnDevice", "hi=$hi hiDiffers=${hi != 14}")
        } catch (t: Throwable) {
            Log.e("SeedMapsOnDevice", "exception", t)
        } finally {
            Log.i("SeedMapsOnDevice", if (pass) "SEEDMAPS_ONDEVICE=PASS" else "SEEDMAPS_ONDEVICE=FAIL")
        }
        finish()
        android.os.Process.killProcess(android.os.Process.myPid())
    }
}