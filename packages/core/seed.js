/**
 * Shared, edition-agnostic world generation interface.
 * Java (WASM) and future Bedrock engines both implement this.
 */
export const DIMENSIONS = Object.freeze({ overworld: 0, nether: -1, end: 1 });

/**
 * @typedef {object} WorldGenerator
 * @property {(opts:{version:string|number, seed:bigint|number|string, dimension?:number})=>void} initialize
 * @property {(x:number,y:number,z:number,scale?:number)=>number} getBiome
 * @property {(opts:{x:number,z:number,width:number,height:number,scale?:number,y?:number})=>Int32Array} generateBiomes
 * @property {(biomeId:number)=>string} biomeName
 */

/** Parse numeric or Java string-hash seeds into BigInt (signed 64-bit). */
export function parseSeed(text) {
  const t = String(text).trim();
  if (/^-?\d+$/.test(t)) return BigInt(t);
  let h = 0n;
  for (let i = 0; i < t.length; i++) {
    h = (h * 31n + BigInt(t.charCodeAt(i))) & 0xffffffffffffffffn;
  }
  return BigInt.asIntN(64, h);
}

/** Split/join 64-bit seeds for FFI (never pass >2^53 through Number). */
export function splitSeed64(seed) {
  const v = BigInt(seed);
  return [
    Number(BigInt.asUintN(32, v)),
    Number(BigInt.asUintN(32, v >> 32n)),
  ];
}

export function joinSeed64(low, high) {
  return (
    BigInt(BigInt.asUintN(32, low)) | (BigInt(BigInt.asUintN(32, high)) << 32n)
  );
}
