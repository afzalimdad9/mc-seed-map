using System;
using System.Runtime.InteropServices;

namespace SeedMaps;

/// <summary>
/// P/Invoke binding to the shared seed map engine (the same C ABI exposed to
/// WASM, Android/JNI and Swift). Seeds are the full unsigned 64-bit Minecraft
/// seed — unlike the 32-bit-half FFI needed by JS/WASM, unmanaged ABI is wide.
///
/// STATUS: source-only. No .NET SDK/Runtime is present in this repository's
/// build environment, so this file and the matching .csproj have NOT been
/// compiled here. The signatures mirror engine/include/seed_engine.h exactly;
/// compile + run the included Sample once a `dotnet` SDK is available.
/// </summary>
public static class SeedEngine
{
    private const string Lib = "seed_engine"; // libseed_engine.{so,dylib,dll}

    // --- versions ---------------------------------------------------------
    [DllImport(Lib, CallingConvention = CallingConvention.Cdecl, ExactSpelling = true)]
    public static extern int seed_engine_version_min();

    [DllImport(Lib, CallingConvention = CallingConvention.Cdecl, ExactSpelling = true)]
    public static extern int seed_engine_version_max();

    [DllImport(Lib, CallingConvention = CallingConvention.Cdecl, ExactSpelling = true)]
    public static extern int seed_engine_version_1_18();

    [DllImport(Lib, CallingConvention = CallingConvention.Cdecl, ExactSpelling = true)]
    public static extern int seed_engine_version_from_string(
        [MarshalAs(UnmanagedType.LPStr)] string label);

    [DllImport(Lib, CallingConvention = CallingConvention.Cdecl, ExactSpelling = true)]
    private static extern IntPtr seed_engine_mc_name(int mc);

    /// <summary>Human label for a Cubiomes MCVersion enum, or null.</summary>
    public static string? McName(int mc)
    {
        IntPtr p = seed_engine_mc_name(mc);
        return p == IntPtr.Zero ? null : Marshal.PtrToStringAnsi(p);
    }

    // --- global generator lifecycle (single default context) --------------
    [DllImport(Lib, CallingConvention = CallingConvention.Cdecl, ExactSpelling = true)]
    public static extern int seed_engine_init(int mc, int dimension, ulong seed);

    [DllImport(Lib, CallingConvention = CallingConvention.Cdecl, ExactSpelling = true)]
    public static extern int seed_engine_get_biome(int scale, int x, int y, int z);

    [DllImport(Lib, CallingConvention = CallingConvention.Cdecl, ExactSpelling = true)]
    private static extern int seed_engine_generate_biomes(
        int x, int z, int width, int height, int scale, int y, int[] output);

    /// <summary>Row-major biome ids covering a rectangular block area.</summary>
    public static int[] GenerateBiomes(int x, int z, int w, int h, int scale, int y)
    {
        var cells = new int[w * h];
        int rc = seed_engine_generate_biomes(x, z, w, h, scale, y, cells);
        if (rc != 0)
            throw new InvalidOperationException($"seed_engine_generate_biomes rc={rc}");
        return cells;
    }

    // --- biome names -------------------------------------------------------
    [DllImport(Lib, CallingConvention = CallingConvention.Cdecl, ExactSpelling = true)]
    private static extern IntPtr seed_engine_biome_name(int mc, int biomeId);

    public static string? BiomeName(int mc, int biomeId)
    {
        IntPtr p = seed_engine_biome_name(mc, biomeId);
        return p == IntPtr.Zero ? null : Marshal.PtrToStringAnsi(p);
    }
}

/// <summary>The 1.18 known-answer used across every other binding.</summary>
public static class Sample
{
    public static void Run()
    {
        int mc18 = SeedEngine.seed_engine_version_from_string("1.18");
        if (mc18 != 22)
            throw new InvalidOperationException($"1.18 should be enum 22, got {mc18}");

        if (SeedEngine.seed_engine_init(mc18, 0, 262UL) != 0)
            throw new InvalidOperationException("init failed");

        int id = SeedEngine.seed_engine_get_biome(1, 0, 63, 0);
        Console.WriteLine($"seed 262 1.18 (0,63,0) -> {id} ({SeedEngine.BiomeName(mc18, id)})");
        if (id != 14)
            throw new InvalidOperationException("expected mushroom_fields(14)");

        int[] cells = SeedEngine.GenerateBiomes(-96, -80, 64, 48, 4, 15);
        Console.WriteLine($"64x48 grid, cells[0] = {cells[0]}");
        Console.WriteLine("C# SAMPLE PASSED");
    }
}