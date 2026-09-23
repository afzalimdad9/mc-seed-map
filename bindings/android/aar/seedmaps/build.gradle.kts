plugins {
    id("com.android.library")
    id("org.jetbrains.kotlin.android")
}

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

dependencies {
    // no external deps: binder uses java.nio / kotlin.stdlib only
}