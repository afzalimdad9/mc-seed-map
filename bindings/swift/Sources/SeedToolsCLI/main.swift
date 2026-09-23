import CSeedEngine

// Convenience helpers over the imported C ABI.
func str(_ p: UnsafePointer<CChar>?) -> String? {
    guard let p else { return nil }
    return String(cString: p)
}

// Version plumbing, mirroring the WASM enum discovery.
let mc18 = seed_engine_version_from_string("1.18")
print("version_from_string(\"1.18\") = \(mc18)")
precondition(mc18 == 22, "1.18 must be enum 22")

print("version range: [\(seed_engine_version_min()), \(seed_engine_version_max())]")

var labels: [String] = []
var found18 = false
var mc = seed_engine_version_min()
while mc <= seed_engine_version_max() {
    if let label = str(seed_engine_mc_name(mc)) {
        labels.append(label)
        if mc == mc18 { found18 = true }
    }
    mc += 1
}
precondition(found18, "enumeration contains 1.18")
print("enumerated \(labels.count) modelled versions (first: \(labels.prefix(6).joined(separator: ", ")))")

// The known-answer anchor from the WASM/CLI/Android tests.
let rc0 = seed_engine_init(mc18, 0, 262)
precondition(rc0 == 0, "engine init")
let id = seed_engine_get_biome(1, 0, 63, 0)
print("seed 262 1.18 (0,63,0) biome id = \(id)")
precondition(id == 14, "mushroom_fields(14)")

// Bulk generation into a Swift array.
var cells = [Int32](repeating: 0, count: 64 * 48)
let rc = cells.withUnsafeMutableBufferPointer { buf -> Int32 in
    seed_engine_generate_biomes(-96, -80, 64, 48, 4, 15, buf.baseAddress)
}
precondition(rc == 0, "generateBiomes")
print("64x48 @ scale 4 grid generated, cells[0] = \(cells[0])")

print("SWIFT EXAMPLE PASSED (native dice/cubiomes engine called from Swift)")