/* ==========================================================================
   Edge dislocation glide widget

   Atoms displaced according to the isotropic elastic displacement field
   of an edge dislocation. Drag the slider to move the core across the
   slip plane.

   Displacement field (Volterra solution, plane strain):
     u_x = (b/2π)[arctan(y/x) + xy / 2(1-ν)(x²+y²)]
     u_y = -(b/2π)[(1-2ν)/4(1-ν) ln(x²+y²) + (x²-y²)/4(1-ν)(x²+y²)]

   where b = Burgers vector magnitude (= 1 lattice spacing),
   ν = Poisson's ratio (≈ 0.33), core at origin, slip plane y = 0.
   ========================================================================== */

import * as C from './chart-utils.js';

const ROWS = 10;
const COLS = 16;
const NU = 0.33;

export function create(container) {
  const canvas = C.createWidgetShell(container, 0.48);
  const ctx = canvas.getContext('2d');

  let coreCol = 4; // core position in lattice units

  // Controls
  const controls = document.createElement('div');
  controls.style.cssText = 'padding: 8px 16px; display: flex; align-items: center; gap: 12px; font-family: "DM Sans", sans-serif; font-size: 12px; color: #3a3d5a;';
  controls.innerHTML = `
    <span>Applied shear \u03c4</span>
    <input type="range" min="0" max="100" value="0" style="flex:1; accent-color: #2a2f7c;">
  `;
  container.appendChild(controls);
  const slider = controls.querySelector('input');

  /**
   * Displacement of an atom at (x, y) relative to the dislocation core.
   * b = 1 (one lattice spacing). Returns [ux, uy].
   */
  function displacement(x, y) {
    const r2 = x * x + y * y;
    if (r2 < 0.01) return [0, 0]; // avoid singularity at core

    const b = 1;
    const pi2 = 2 * Math.PI;
    const om = 1 - NU;

    const ux = (b / pi2) * (
      Math.atan2(y, x) + (x * y) / (2 * om * r2)
    );

    const uy = -(b / pi2) * (
      ((1 - 2 * NU) / (4 * om)) * Math.log(r2) +
      (x * x - y * y) / (4 * om * r2)
    );

    return [ux, uy];
  }

  function render() {
    const { ctx: c, w, h } = C.setupCanvas(canvas, container, 0.48);

    const pad = { l: 16, r: 16, t: 16, b: 16 };
    const plotW = w - pad.l - pad.r;
    const plotH = h - pad.t - pad.b;
    const sp = Math.min(plotW / (COLS - 1), plotH / (ROWS - 1));
    const ox = pad.l + (plotW - sp * (COLS - 1)) / 2;
    const oy = pad.t + (plotH - sp * (ROWS - 1)) / 2;
    const atomR = sp * 0.28;

    // Slip plane row: the core sits between row slipRow-1 (above) and slipRow (below)
    const slipRow = Math.floor(ROWS / 2);

    c.fillStyle = '#e1e0e8';
    c.fillRect(0, 0, w, h);

    // Compute displaced positions for all atoms
    const atoms = [];

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        // Position relative to core (in lattice units)
        // Core is at (coreCol, slipRow - 0.5) — between the two central rows
        const rx = col - coreCol;
        const ry = row - (slipRow - 0.5);

        const [ux, uy] = displacement(rx, ry);

        const px = ox + (col + ux) * sp;
        const py = oy + (row + uy) * sp;

        const distFromCore = Math.sqrt(rx * rx + ry * ry);

        atoms.push({ px, py, row, col, distFromCore });
      }
    }

    // Slip plane line
    const slipY = oy + (slipRow - 0.5) * sp;
    c.strokeStyle = 'rgba(42, 47, 124, 0.12)';
    c.lineWidth = 1;
    c.setLineDash([4, 4]);
    c.beginPath();
    c.moveTo(pad.l, slipY);
    c.lineTo(w - pad.r, slipY);
    c.stroke();
    c.setLineDash([]);
    c.font = '400 10px "DM Sans", sans-serif';
    c.fillStyle = 'rgba(42, 47, 124, 0.3)';
    c.textAlign = 'right';
    c.fillText('slip plane', w - pad.r - 4, slipY - 6);

    // Draw bonds between nearest neighbours
    c.strokeStyle = 'rgba(42, 47, 124, 0.07)';
    c.lineWidth = 0.8;
    for (let i = 0; i < atoms.length; i++) {
      const a = atoms[i];
      // Connect to right neighbour
      if (a.col < COLS - 1) {
        const b = atoms[i + 1];
        c.beginPath();
        c.moveTo(a.px, a.py);
        c.lineTo(b.px, b.py);
        c.stroke();
      }
      // Connect to below neighbour
      if (a.row < ROWS - 1) {
        const b = atoms[i + COLS];
        c.beginPath();
        c.moveTo(a.px, a.py);
        c.lineTo(b.px, b.py);
        c.stroke();
      }
    }

    // Draw atoms
    for (const a of atoms) {
      c.beginPath();
      c.arc(a.px, a.py, atomR, 0, Math.PI * 2);
      c.fillStyle = a.distFromCore < 1.5 ? '#4d5cf2' : C.BLUE;
      c.fill();
      c.strokeStyle = 'rgba(255,255,255,0.2)';
      c.lineWidth = 0.5;
      c.stroke();
    }

    // Dislocation symbol (inverted T)
    const symX = ox + coreCol * sp;
    c.strokeStyle = '#4d5cf2';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(symX - 6, slipY + 14);
    c.lineTo(symX + 6, slipY + 14);
    c.moveTo(symX, slipY + 14);
    c.lineTo(symX, slipY + 6);
    c.stroke();

    // Shear arrows
    const shear = (coreCol - 2) / (COLS - 5);
    if (shear > 0.05) {
      const len = Math.min(shear * 30, 30);
      c.strokeStyle = C.RED;
      c.fillStyle = C.RED;
      c.lineWidth = 1.5;

      // Top: rightward
      const tY = pad.t + 4;
      c.beginPath();
      c.moveTo(w - pad.r - len - 8, tY);
      c.lineTo(w - pad.r - 8, tY);
      c.stroke();
      c.beginPath();
      c.moveTo(w - pad.r - 5, tY);
      c.lineTo(w - pad.r - 11, tY - 3);
      c.lineTo(w - pad.r - 11, tY + 3);
      c.fill();

      // Bottom: leftward
      const bY = h - pad.b - 4;
      c.beginPath();
      c.moveTo(pad.l + len + 8, bY);
      c.lineTo(pad.l + 8, bY);
      c.stroke();
      c.beginPath();
      c.moveTo(pad.l + 5, bY);
      c.lineTo(pad.l + 11, bY - 3);
      c.lineTo(pad.l + 11, bY + 3);
      c.fill();
    }
  }

  slider.addEventListener('input', (e) => {
    coreCol = 2 + (parseFloat(e.target.value) / 100) * (COLS - 5);
    render();
  });

  render();
  window.addEventListener('resize', render);
}
