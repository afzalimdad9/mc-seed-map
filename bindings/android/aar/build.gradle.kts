plugins {
    id("com.android.application") version "8.13.2" apply false
    id("com.android.library") version "8.13.2" apply false
    id("org.jetbrains.kotlin.android") version "2.1.20" apply false
}

// Deterministic archives: fixed entry timestamps + stable ordering so
// assembleRelease output is byte-identical across machines/reruns and the
// committed AAR stays in sync (the CI "android" job asserts full-byte
// reproducibility with cmp).
subprojects {
    tasks.withType<AbstractArchiveTask>().configureEach {
        isPreserveFileTimestamps = false
        isReproducibleFileOrder = true
    }
}