plugins {
    id("com.android.library")
    id("org.jetbrains.kotlin.android")
}

import org.gradle.api.tasks.bundling.Zip

// Single source of truth: the Kotlin facade and the NDK-built per-ABI .so
// (dist/{arm64-v8a,armeabi-v7a,x86_64}/libseed_engine.so) live in the binding
// directory, not copied into this module.
android {
    namespace = "com.seedmaps"
    compileSdk = 37

    defaultConfig {
        minSdk = 24
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_1_8
        targetCompatibility = JavaVersion.VERSION_1_8
    }
    kotlinOptions {
        jvmTarget = "1.8"
    }

    sourceSets {
        getByName("main") {
            java.srcDirs("../../kotlin")
            jniLibs.srcDirs("../../dist")
        }
    }
}

// AGP packages the AAR zip itself (not an AbstractArchiveTask), so the wrapper
// zip would otherwise carry live timestamps. Re-zip it through a Gradle Zip
// task with the deterministic flags, giving a byte-reproducible AAR across
// machines and reruns (the CI "android" job asserts full-byte reproducibility
// vs the committed artifact).
afterEvaluate {
    val bundleReleaseAar = tasks.named("bundleReleaseAar")
    tasks.register<Zip>("normalizeReleaseAar") {
        dependsOn(bundleReleaseAar)
        isPreserveFileTimestamps = false
        isReproducibleFileOrder = true
        archiveFileName.set("seedmaps-release.normalized.aar")
        destinationDirectory.set(layout.buildDirectory.dir("outputs/aar"))
        from(zipTree(layout.buildDirectory.file("outputs/aar/seedmaps-release.aar")))
    }
}

dependencies {
    // no external deps: binder uses java.nio / kotlin.stdlib only
}