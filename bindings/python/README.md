# Python binding

ctypes wrapper around the shared seed map engine (`libseed_engine.so`), the
same plain C ABI the C# P/Invoke sample consumes. Unlike the JS/WASM facade
(which must pass seeds as two uint32 halves), unmanaged ABI uses the full
unsigned 64-bit seed.

## Run

    bash bindings/python/run.sh

`run.sh` builds `bindings/python/lib/libseed_engine.so` from the same sources
and cc line as the C# binding, then runs the known-answer checks:

* `version_from_string("1.18") == 22`
* seed 262 at (0,63,0) -> biome 14 `mushroom_fields`
* handle spawn == (420,-92)
* 64x48 grid at (-96,-80) scale 4 -> `cells[0] == cells[63] == 49`
* `PYTHON SAMPLE PASSED`

## Use

```python
from seedmaps import SeedEngine

e = SeedEngine()                    # or SeedEngine("/path/to/libseed_engine.so")
mc = e.version_from_string("1.18")
e.init(mc, 0, 262)                  # default (single) context
assert e.get_biome(1, 0, 63, 0) == 14

h = e.create(mc, 0, 262)            # thread-safe handle API
assert e.get_spawn_ctx(h) == (420, -92)
e.destroy(h)
```

The wrapper currently binds version helpers, the default-context query API,
and the handle-based thread-safe API. Structure helpers
(`seed_engine_structure_pos` etc.) follow the same pattern if needed.