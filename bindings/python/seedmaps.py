"""ctypes binding to the shared seed map engine.

Loads libseed_engine.{so,dylib,dll} — the same plain C ABI exposed to WASM,
Android/JNI, Swift and C#. Seeds travel as the full unsigned 64-bit value
(unlike the 32-bit-half FFI required by JS/WASM). Every function mirrors
engine/include/seed_engine.h exactly.
"""

import ctypes
import ctypes.util
import os

SEED_ENGINE_LIB = os.environ.get("SEED_ENGINE_LIB")


def _c_char_star_restype(fn):
    fn.restype = ctypes.c_char_p
    return fn


class SeedEngine:
    """Thin stateful wrapper over the engine's default handle API."""

    def __init__(self, path=None):
        if path is None:
            path = SEED_ENGINE_LIB or ctypes.util.find_library("seed_engine")
        if not path:
            raise OSError(
                "libseed_engine not found; set SEED_ENGINE_LIB or run via "
                "bindings/python/run.sh (which builds it and sets LD_LIBRARY_PATH)"
            )
        self.lib = ctypes.CDLL(path)
        self._bind_versions()
        self._bind_default_ctx()
        self._bind_handle_ctx()

    # -- versions ----------------------------------------------------------
    def _bind_versions(self):
        lib = self.lib
        lib.seed_engine_version_min.restype = ctypes.c_int
        lib.seed_engine_version_max.restype = ctypes.c_int
        lib.seed_engine_version_1_18.restype = ctypes.c_int
        lib.seed_engine_version_1_21.restype = ctypes.c_int
        lib.seed_engine_version_newest.restype = ctypes.c_int
        lib.seed_engine_version_from_string.argtypes = [ctypes.c_char_p]
        lib.seed_engine_version_from_string.restype = ctypes.c_int

    # -- default (single) context -------------------------------------------
    def _bind_default_ctx(self):
        lib = self.lib
        lib.seed_engine_init.argtypes = [ctypes.c_int, ctypes.c_int, ctypes.c_uint64]
        lib.seed_engine_init.restype = ctypes.c_int
        lib.seed_engine_get_biome.argtypes = [ctypes.c_int, ctypes.c_int, ctypes.c_int, ctypes.c_int]
        lib.seed_engine_get_biome.restype = ctypes.c_int
        lib.seed_engine_generate_biomes.argtypes = [
            ctypes.c_int, ctypes.c_int, ctypes.c_int, ctypes.c_int,
            ctypes.c_int, ctypes.c_int, ctypes.c_void_p,
        ]
        lib.seed_engine_generate_biomes.restype = ctypes.c_int
        lib.seed_engine_slime_chunk.argtypes = [ctypes.c_uint64, ctypes.c_int, ctypes.c_int]
        lib.seed_engine_slime_chunk.restype = ctypes.c_int
        _c_char_star_restype(lib.seed_engine_biome_name).argtypes = [ctypes.c_int, ctypes.c_int]
        _c_char_star_restype(lib.seed_engine_mc_name).argtypes = [ctypes.c_int]

    # -- handle (thread-safe) context --------------------------------------
    def _bind_handle_ctx(self):
        lib = self.lib
        lib.seed_engine_create.argtypes = [ctypes.c_int, ctypes.c_int, ctypes.c_uint64]
        lib.seed_engine_create.restype = ctypes.c_void_p
        lib.seed_engine_destroy.argtypes = [ctypes.c_void_p]
        lib.seed_engine_set_seed_ctx.argtypes = [ctypes.c_void_p, ctypes.c_uint64]
        lib.seed_engine_get_biome_ctx.argtypes = [
            ctypes.c_void_p, ctypes.c_int, ctypes.c_int, ctypes.c_int, ctypes.c_int,
        ]
        lib.seed_engine_get_biome_ctx.restype = ctypes.c_int
        lib.seed_engine_generate_biomes_ctx.argtypes = [
            ctypes.c_void_p, ctypes.c_int, ctypes.c_int, ctypes.c_int,
            ctypes.c_int, ctypes.c_int, ctypes.c_int, ctypes.c_void_p,
        ]
        lib.seed_engine_generate_biomes_ctx.restype = ctypes.c_int
        lib.seed_engine_get_spawn_ctx.argtypes = [ctypes.c_void_p, ctypes.POINTER(ctypes.c_int), ctypes.POINTER(ctypes.c_int)]
        lib.seed_engine_get_spawn_ctx.restype = ctypes.c_int
        lib.seed_engine_estimate_spawn_ctx.argtypes = [ctypes.c_void_p, ctypes.POINTER(ctypes.c_int), ctypes.POINTER(ctypes.c_int)]
        lib.seed_engine_estimate_spawn_ctx.restype = ctypes.c_int

    # -- helpers ------------------------------------------------------------
    @staticmethod
    def _label(s):
        return s.encode("ascii") if isinstance(s, str) else s

    def version_from_string(self, label):
        return self.lib.seed_engine_version_from_string(self._label(label))

    def mc_name(self, mc):
        p = self.lib.seed_engine_mc_name(mc)
        return p.decode("ascii") if p else None

    def init(self, mc, dim, seed):
        rc = self.lib.seed_engine_init(int(mc), int(dim), seed & 0xFFFFFFFFFFFFFFFF)
        if rc != 0:
            raise OSError(f"seed_engine_init rc={rc}")
        return rc

    def get_biome(self, scale, x, y, z):
        return self.lib.seed_engine_get_biome(int(scale), int(x), int(y), int(z))

    def biome_name(self, mc, biome_id):
        p = self.lib.seed_engine_biome_name(mc, biome_id)
        return p.decode("ascii") if p else None

    def generate_biomes(self, x, z, width, height, scale, y):
        out = (ctypes.c_int * (width * height))()
        rc = self.lib.seed_engine_generate_biomes(
            int(x), int(z), int(width), int(height), int(scale), int(y), out)
        if rc != 0:
            raise OSError(f"seed_engine_generate_biomes rc={rc}")
        return list(out)

    def create(self, mc, dim, seed):
        h = self.lib.seed_engine_create(int(mc), int(dim), seed & 0xFFFFFFFFFFFFFFFF)
        if not h:
            raise OSError("seed_engine_create returned NULL")
        return h

    def destroy(self, h):
        self.lib.seed_engine_destroy(h)

    def get_biome_ctx(self, h, scale, x, y, z):
        return self.lib.seed_engine_get_biome_ctx(h, int(scale), int(x), int(y), int(z))

    def generate_biomes_ctx(self, h, x, z, width, height, scale, y):
        out = (ctypes.c_int * (width * height))()
        rc = self.lib.seed_engine_generate_biomes_ctx(
            h, int(x), int(z), int(width), int(height), int(scale), int(y), out)
        if rc != 0:
            raise OSError(f"seed_engine_generate_biomes_ctx rc={rc}")
        return list(out)

    def get_spawn_ctx(self, h):
        ox, oz = ctypes.c_int(), ctypes.c_int()
        if self.lib.seed_engine_get_spawn_ctx(h, ctypes.byref(ox), ctypes.byref(oz)) != 1:
            raise OSError("seed_engine_get_spawn_ctx failed")
        return ox.value, oz.value

    def estimate_spawn_ctx(self, h):
        ox, oz = ctypes.c_int(), ctypes.c_int()
        if self.lib.seed_engine_estimate_spawn_ctx(h, ctypes.byref(ox), ctypes.byref(oz)) != 1:
            raise OSError("seed_engine_estimate_spawn_ctx failed")
        return ox.value, oz.value


def main():
    """Known-answer checks (mirrors the C#/Swift/Android samples)."""
    e = SeedEngine()
    ok = True

    mc18 = e.version_from_string("1.18")
    ok &= mc18 == 22
    print(f"version_from_string('1.18') = {mc18} ({e.mc_name(mc18)})")
    assert ok

    e.init(mc18, 0, 262)
    id_ = e.get_biome(1, 0, 63, 0)
    name = e.biome_name(mc18, id_)
    print(f"seed 262 1.18 (0,63,0) -> {id_} ({name})")
    assert id_ == 14 and name == "mushroom_fields"

    h = e.create(mc18, 0, 262)
    spawn = e.get_spawn_ctx(h)
    print(f"spawn (handle) = {spawn}")
    assert spawn[0] == 420 and spawn[1] == -92

    cells = e.generate_biomes_ctx(h, -96, -80, 64, 48, 4, 15)
    print(f"64x48 grid (ctx), cells[0] = {cells[0]} cells[63] = {cells[63]}")
    assert cells[0] == 49 and cells[63] == 49
    e.destroy(h)

    print("PYTHON SAMPLE PASSED")


if __name__ == "__main__":
    main()