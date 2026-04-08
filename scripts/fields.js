/* ==========================================================================
   Field functions — each returns a (x, y, w, h, time) => 0..1 closure
   ========================================================================== */

const { PI, sin, cos, pow, abs, sqrt, atan2, exp, max, min } = Math;

/* --- FCC lattice modulation (shared helper) ----------------------------- */

function fccModulation(x, y, scale = 30) {
  const g1 = pow(cos(x / scale * PI) * 0.5 + 0.5, 0.3)
           * pow(cos(y / scale * PI) * 0.5 + 0.5, 0.3);
  const g2 = pow(cos((x + scale / 2) / scale * PI) * 0.5 + 0.5, 0.3)
           * pow(cos((y + scale / 2) / scale * PI) * 0.5 + 0.5, 0.3);
  return 0.6 + max(g1, g2) * 0.4;
}

/* ========================================================================
   Hero & page-level fields
   ======================================================================== */

/* --- Hero: 3D ribbon with perspective ----------------------------------- */

export function heroField(x, y, w, h, t) {
  const nx = x / w;
  const ny = y / h;

  const curveY = 0.32 + sin(nx * 3 + t * 0.3) * 0.1;
  const dist = ny - curveY;

  const topEdge  = dist < 0 ? exp(-dist * dist * 80) : 0;
  const bodyFall = dist > 0 ? exp(-dist * dist * 15) : 0;
  const mainCurve = topEdge * 0.7 + bodyFall;

  const perspScale = 0.4 + nx * 0.8;
  const shaped = mainCurve * perspScale;

  const highlight = exp(-pow(dist + 0.02, 2) * 300) * 0.6;

  const curve2Y = curveY + 0.14 + sin(nx * 2.5 + t * 0.2 + 1) * 0.04;
  const dist2 = ny - curve2Y;
  const ribbon2 = exp(-dist2 * dist2 * 25) * 0.3 * (0.3 + nx * 0.7);

  const absDist = abs(ny - curveY);
  const scatter = exp(-absDist * 4) * 0.15 * (sin(x * 0.07 + y * 0.09 + t * 0.15) * 0.5 + 0.5);

  const fcc = fccModulation(x, y);

  const tdx = (nx - 0.22) / 0.28;
  const tdy = (ny - 0.82) / 0.2;
  const textFade = min(1, sqrt(tdx * tdx + tdy * tdy));

  return min(1, shaped + highlight + ribbon2 + scatter) * fcc * textFade * textFade;
}

/* --- Article background — multi-cluster composition -------------------- */

export function articleBgField(x, y, w, h, t) {
  const nx = x / w;
  const ny = y / h;

  const d1 = sqrt(pow(nx - 0.85, 2) + pow(ny - 0.12, 2));
  const g1x = sin(x * 0.06 + t * 0.5) * 0.5 + 0.5;
  const g1y = sin(y * 0.06 + t * 0.3) * 0.5 + 0.5;
  const lattice1 = g1x * g1y * exp(-d1 * 5) * 0.6;

  const angle2 = atan2(ny - 0.45, nx - 0.92);
  const dist2 = abs(sin(angle2 - 0.7)) * sqrt(pow(nx - 0.92, 2) + pow(ny - 0.45, 2));
  const streak = exp(-dist2 * 8) * 0.4;

  const d3x = nx - 0.75;
  const d3y = ny - 0.85;
  const d3 = sqrt(d3x * d3x + d3y * d3y);
  const a3 = atan2(d3y, d3x);
  const rays3 = pow(abs(sin(a3 * 4 + t * 0.3)), 4);
  const radial3 = rays3 * exp(-d3 * 6) * 0.35;

  const d4 = sqrt(pow(nx - 0.95, 2) + pow(ny - 0.55, 2));
  const cluster4 = exp(-d4 * 8) * 0.5;

  return max(lattice1, max(streak, max(radial3, cluster4)));
}

/* --- Nav background — hero ribbon clipped to nav height ----------------- */

export function createNavField() {
  return function navField(x, y, w, fullH, t) {
    const nx = x / w;
    const ny = y / fullH;

    const curveY = 0.32 + sin(nx * 3 + t * 0.3) * 0.1;
    const dist = ny - curveY;

    const topEdge  = dist < 0 ? exp(-dist * dist * 80) : 0;
    const bodyFall = dist > 0 ? exp(-dist * dist * 15) : 0;
    const perspScale = 0.4 + nx * 0.8;
    const shaped = (topEdge * 0.7 + bodyFall) * perspScale;

    const highlight = exp(-pow(dist + 0.02, 2) * 300) * 0.6;

    const curve2Y = curveY + 0.14 + sin(nx * 2.5 + t * 0.2 + 1) * 0.04;
    const dist2 = ny - curve2Y;
    const ribbon2 = exp(-dist2 * dist2 * 25) * 0.3 * (0.3 + nx * 0.7);

    const absDist = abs(ny - curveY);
    const scatter = exp(-absDist * 4) * 0.15 * (sin(x * 0.07 + y * 0.09 + t * 0.15) * 0.5 + 0.5);

    const fcc = fccModulation(x, y);

    return min(1, shaped + highlight + ribbon2 + scatter) * fcc;
  };
}

/* ========================================================================
   Curriculum card fields — Part I: Foundations
   ======================================================================== */

/* Introduction — gentle radial glow with subtle texture */
export function fieldIntro(x, y, w, h, t) {
  const cx = x / w - 0.45, cy = y / h - 0.4;
  const d = sqrt(cx * cx + cy * cy);
  const glow = exp(-d * d * 8);
  const texture = sin(x * 0.04 + t * 0.3) * sin(y * 0.04 + t * 0.2) * 0.3 + 0.7;
  return glow * texture;
}

/* Atomic Bonding — electron orbital lobes */
export function fieldOrbital(x, y, w, h, t) {
  const cx = x / w - 0.5, cy = y / h - 0.5;
  const r = sqrt(cx * cx + cy * cy);
  const angle = atan2(cy, cx);
  const lobe1 = exp(-pow(r - 0.22, 2) * 80) * pow(cos(angle + t * 0.3), 2);
  const lobe2 = exp(-pow(r - 0.22, 2) * 80) * pow(sin(angle + t * 0.3), 2);
  const core = exp(-r * r * 30) * 0.6;
  return max(lobe1, max(lobe2 * 0.7, core));
}

/* Crystallography — overlapping sine grids with radial falloff */
export function fieldLattice(x, y, w, h, t) {
  const gx = sin(x * 0.05 + t) * 0.5 + 0.5;
  const gy = sin(y * 0.05 + t * 0.7) * 0.5 + 0.5;
  const grid = gx * gy;
  const cx = x / w - 0.5;
  const cy = y / h - 0.5;
  const radial = 1 - sqrt(cx * cx + cy * cy) * 1.4;
  return grid * max(0, radial);
}

/* Defects — regular grid disrupted by a dislocation line */
export function fieldDefects(x, y, w, h, t) {
  const nx = x / w, ny = y / h;
  const s = 22;
  const grid = pow(cos(x / s * PI) * 0.5 + 0.5, 0.4) * pow(cos(y / s * PI) * 0.5 + 0.5, 0.4);
  const line = exp(-pow(ny - nx * 0.6 - 0.2, 2) * 100);
  const cx = nx - 0.5, cy = ny - 0.5;
  const fade = max(0, 1 - sqrt(cx * cx + cy * cy) * 1.4);
  return max(grid * fade * 0.7, line * 0.8 * fade);
}

/* Thermodynamics — dual flowing phase-boundary curves */
export function fieldPhaseFlow(x, y, w, h, t) {
  const nx = x / w, ny = y / h;
  const curve1 = exp(-pow(ny - (sin(nx * 4 + t * 0.4) * 0.15 + 0.35), 2) * 40);
  const curve2 = exp(-pow(ny - (sin(nx * 3 + t * 0.3 + 1) * 0.12 + 0.65), 2) * 40);
  const fade = sin(nx * PI) * 0.8 + 0.2;
  return max(curve1, curve2) * fade;
}

/* Diffusion — concentration gradient dissolving left to right */
export function fieldDiffusion(x, y, w, h, t) {
  const nx = x / w, ny = y / h;
  const gradient = 1 - nx;
  const noise = sin(x * 0.15 + y * 0.12 + t) * sin(x * 0.08 - y * 0.1 + t * 0.7);
  const scatter = pow(noise * 0.5 + 0.5, 2);
  const vignette = sin(ny * PI);
  return gradient * scatter * vignette * 0.9;
}

/* Phase Transformations — starburst with radial rays */
export function fieldBurst(x, y, w, h, t) {
  const dx = x / w - 0.6;
  const dy = y / h - 0.35;
  const d = sqrt(dx * dx + dy * dy);
  const angle = atan2(dy, dx);
  const rays = pow(abs(sin(angle * 6 + t)), 3);
  const falloff = exp(-d * 4);
  const pulse = sin(d * 20 - t * 3) * 0.3 + 0.7;
  return rays * falloff * pulse;
}

/* ========================================================================
   Curriculum card fields — Part II: Properties & Behaviour
   ======================================================================== */

/* Mechanical Properties — shear stress wave */
export function fieldStress(x, y, w, h, t) {
  const nx = x / w, ny = y / h;
  const wave = sin(nx * 15 + ny * 5 + t) * 0.5 + 0.5;
  const focus = exp(-pow(nx - 0.5, 2) * 6 - pow(ny - 0.5, 2) * 6);
  const shear = abs(sin(atan2(ny - 0.5, nx - 0.5) * 3 + t * 0.4));
  return wave * focus * 0.7 + shear * exp(-pow(nx - 0.5, 2) * 4 - pow(ny - 0.5, 2) * 4) * 0.3;
}

/* Electronic, Optical & Magnetic — two-source wave interference */
export function fieldInterference(x, y, w, h, t) {
  const d1 = sqrt(pow(x / w - 0.25, 2) + pow(y / h - 0.35, 2));
  const d2 = sqrt(pow(x / w - 0.75, 2) + pow(y / h - 0.65, 2));
  const w1 = sin(d1 * 30 - t) * 0.5 + 0.5;
  const w2 = sin(d2 * 30 - t * 0.8) * 0.5 + 0.5;
  return w1 * w2 * exp(-min(d1, d2) * 2.5);
}

/* Electrochemistry & Corrosion — edge dissolution */
export function fieldDissolution(x, y, w, h, t) {
  const nx = x / w, ny = y / h;
  const edge = exp(-pow(nx - 0.5, 2) * 3);
  const noise = sin(x * 0.05 + y * 0.03 + t * 0.5) * sin(x * 0.03 - y * 0.05 + t * 0.3) * 0.5 + 0.5;
  const gradient = 1 - abs(ny - 0.5) * 1.8;
  return edge * noise * max(0, gradient);
}

/* ========================================================================
   Curriculum card fields — Part III: Material Classes
   ======================================================================== */

/* Metals & Alloys — tight crystalline repeating grid */
export function fieldCrystalline(x, y, w, h, t) {
  const s = 20;
  const g1 = pow(cos(x / s * PI) * 0.5 + 0.5, 0.5) * pow(cos(y / s * PI) * 0.5 + 0.5, 0.5);
  const g2 = pow(cos((x + s / 2) / s * PI) * 0.5 + 0.5, 0.5) * pow(cos((y + s / 2) / s * PI) * 0.5 + 0.5, 0.5);
  const crystal = max(g1, g2);
  const cx = x / w - 0.5, cy = y / h - 0.5;
  const fade = 1 - sqrt(cx * cx + cy * cy) * 1.3;
  return crystal * max(0, fade);
}

/* Ceramics & Glasses — overlapping amorphous wavefronts */
export function fieldAmorphous(x, y, w, h, t) {
  const nx = x / w, ny = y / h;
  const c1 = sin(sqrt(pow(nx - 0.3, 2) + pow(ny - 0.3, 2)) * 20 + t) * 0.5 + 0.5;
  const c2 = sin(sqrt(pow(nx - 0.7, 2) + pow(ny - 0.6, 2)) * 20 - t * 0.7) * 0.5 + 0.5;
  const c3 = sin(sqrt(pow(nx - 0.5, 2) + pow(ny - 0.85, 2)) * 20 + t * 0.5) * 0.5 + 0.5;
  return c1 * c2 * 0.7 + c3 * 0.3;
}

/* Polymers — double-strand chain */
export function fieldChain(x, y, w, h, t) {
  const ny = y / h;
  const path1 = sin(ny * 10 + t) * 0.12 + 0.4;
  const path2 = sin(ny * 10 + t + PI) * 0.12 + 0.6;
  const d1 = abs(x / w - path1);
  const d2 = abs(x / w - path2);
  const strand1 = exp(-d1 * d1 * 120);
  const strand2 = exp(-d2 * d2 * 120);
  const links = sin(ny * 20 + t) * 0.3 + 0.7;
  return max(strand1, strand2) * links;
}

/* Composites — layered strata with undulation */
export function fieldStrata(x, y, w, h, t) {
  const nx = x / w, ny = y / h;
  const band1 = exp(-pow(sin(ny * 8 + sin(nx * 2 + t * 0.2) * 0.3), 2) * 3);
  const band2 = exp(-pow(cos(ny * 6 + sin(nx * 3 + t * 0.15) * 0.2 + 1), 2) * 3);
  const fade = sin(nx * PI);
  return max(band1, band2) * fade * 0.8;
}

/* ========================================================================
   Curriculum card fields — Part IV: Practice
   ======================================================================== */

/* Characterisation Techniques — diffraction rings with central peak */
export function fieldDiffraction(x, y, w, h, t) {
  const cx = x / w - 0.45, cy = y / h - 0.45;
  const d = sqrt(cx * cx + cy * cy);
  const rings = pow(sin(d * 35 - t) * 0.5 + 0.5, 4);
  const central = exp(-d * d * 30);
  return max(rings * exp(-d * 3), central * 0.7);
}

/* Manufacturing — cascading diagonal flow streams */
export function fieldCascade(x, y, w, h, t) {
  const nx = x / w, ny = y / h;
  const s1 = exp(-pow(sin(ny * 8 + t * 0.4) * 0.2 + nx - 0.35, 2) * 50);
  const s2 = exp(-pow(sin(ny * 6 + t * 0.3 + 2) * 0.15 + nx - 0.65, 2) * 50);
  const s3 = exp(-pow(sin(ny * 10 + t * 0.5 + 4) * 0.1 + nx - 0.5, 2) * 60);
  const fade = sin(ny * PI);
  return max(s1, max(s2, s3)) * fade;
}

/* Computational Materials Science — pulsing node grid */
export function fieldMatrix(x, y, w, h, t) {
  const nx = x / w, ny = y / h;
  const gridX = pow(sin(nx * PI * 6) * 0.5 + 0.5, 8);
  const gridY = pow(sin(ny * PI * 6) * 0.5 + 0.5, 8);
  const grid = max(gridX, gridY);
  const pulse = sin(nx * 10 + ny * 10 - t * 2) * 0.3 + 0.7;
  const fade = exp(-pow(nx - 0.5, 2) * 3 - pow(ny - 0.5, 2) * 3);
  return grid * pulse * fade;
}

/* ========================================================================
   Curriculum card fields — Supporting Modules
   ======================================================================== */

/* Quantum Mechanics — p/d orbital lobes */
export function fieldQuantum(x, y, w, h, t) {
  const cx = x / w - 0.5, cy = y / h - 0.5;
  const r = sqrt(cx * cx + cy * cy);
  const angle = atan2(cy, cx);
  const pOrbital = pow(abs(cos(angle + t * 0.2)), 3);
  const radial = 4 * r * exp(-r * 6);
  const dOrbital = pow(abs(sin(angle * 2 + t * 0.15)), 2) * exp(-r * 5) * 0.3;
  return max(pOrbital * radial, dOrbital);
}

/* Mathematical Methods — Lissajous-like geometric curves */
export function fieldLissajous(x, y, w, h, t) {
  const nx = x / w, ny = y / h;
  let val = 0;
  for (let i = 0; i < 6; i++) {
    const px = sin(i * 1.3 + t * 0.2) * 0.3 + 0.5;
    const py = cos(i * 1.7 + t * 0.15) * 0.3 + 0.5;
    const d = sqrt(pow(nx - px, 2) + pow(ny - py, 2));
    val = max(val, exp(-d * d * 60));
  }
  const curve = exp(-pow(sin(ny * 4 + nx * 4 + t * 0.3) * 0.3 + nx - 0.5, 2) * 30) * 0.5;
  return max(val, curve);
}
