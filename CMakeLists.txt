cmake_minimum_required(VERSION 3.20)
project(minecraft_seed_tools LANGUAGES C)

set(CMAKE_C_STANDARD 11)
set(CMAKE_C_STANDARD_REQUIRED ON)

# Cubiomes emulates Java's wrapping signed arithmetic.
add_compile_options(-fwrapv)

include_directories(
  ${CMAKE_SOURCE_DIR}/vendor/cubiomes
  ${CMAKE_SOURCE_DIR}/engine/include
)

# Source manifest pinned to vendored cubiomes revision
# (matches upstream vendor/cubiomes/CMakeLists.txt).
set(CUBIOMES_SOURCES
  vendor/cubiomes/finders.c
  vendor/cubiomes/generator.c
  vendor/cubiomes/layers.c
  vendor/cubiomes/biomenoise.c
  vendor/cubiomes/biomes.c
  vendor/cubiomes/noise.c
  vendor/cubiomes/util.c
  vendor/cubiomes/quadbase.c
)

add_library(cubiomes STATIC ${CUBIOMES_SOURCES})
target_link_libraries(cubiomes PUBLIC m)

add_library(seed_engine STATIC engine/src/seed_engine.c)
target_link_libraries(seed_engine PUBLIC cubiomes)

add_executable(native_smoke engine/tests/native_smoke.c)
target_link_libraries(native_smoke PRIVATE seed_engine cubiomes m)

add_executable(golden_dump engine/tests/golden_dump.c)
target_link_libraries(golden_dump PRIVATE seed_engine cubiomes m)
