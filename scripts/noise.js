/* ==========================================================================
   Noise utilities — fast, deterministic, no dependencies
   ========================================================================== */

/**
 * Integer-hashed pseudo-random noise.
 * Returns a value in [0, 1) for any (x, y) pair. Deterministic.
 */
export function hashNoise(x, y) {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

/**
 * Bicubic-interpolated smooth noise built on hashNoise.
 * Gives organic-feeling continuous noise from integer samples.
 */
export function smoothNoise(x, y) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;

  // Hermite interpolation weights
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);

  const a = hashNoise(ix, iy);
  const b = hashNoise(ix + 1, iy);
  const c = hashNoise(ix, iy + 1);
  const d = hashNoise(ix + 1, iy + 1);

  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}
