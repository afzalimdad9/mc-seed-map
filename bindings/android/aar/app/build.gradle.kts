plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.seedmaps.test"
    compileSdk = 37

    defaultConfig {
        applicationId = "com.seedmaps.test"
        minSdk = 24
        targetSdk = 37
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_1_8
        targetCompatibility = JavaVersion.VERSION_1_8
    }
    kotlinOptions {
        jvmTarget = "1.8"
    }
}

dependencies {
    implementation(project(":seedmaps"))
}