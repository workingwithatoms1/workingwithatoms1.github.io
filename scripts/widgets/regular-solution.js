/* ==========================================================================
   Regular solution model — THE interactive
   Slider for Ω/RT. Shows G_mix curve, spinodal/binodal, and builds
   a phase diagram alongside as you sweep temperature.
   ========================================================================== */

import * as C from './chart-utils.js';

export function create(container) {
  container.style.minHeight = 'auto';
  container.style.background = '#e1e0e8';
  container.style.maxWidth = '100%';

  // Two-panel layout
  const wrapper = document.createElement('div');
  wrapper.style.display = 'flex';
  wrapper.style.gap = '0';
  container.appendChild(wrapper);

  const canvasLeft = document.createElement('canvas');
  canvasLeft.className = 'widget-canvas';
  canvasLeft.style.width = '50%';
  wrapper.appendChild(canvasLeft);

  const canvasRight = document.createElement('canvas');
  canvasRight.className = 'widget-canvas';
  canvasRight.style.width = '50%';
  wrapper.appendChild(canvasRight);

  const controls = document.createElement('div');
  controls.className = 'widget-controls';
  controls.innerHTML = `
    <label class="widget-label">T / T<sub>c</sub></label>
    <input type="range" class="widget-slider" min="30" max="200" value="80" step="1">
    <span class="widget-value">0.80</span>
  `;
  container.appendChild(controls);
  const slider = controls.querySelector('input');
  const valSpan = controls.querySelector('.widget-value');

  const R = 8.314;
  const Omega = 20000; // fixed Omega, vary T
  const Tc = Omega / (2 * R);

  const pad = { l: 44, r: 12, t: 20, b: 36 };

  function Gmix(x, T) {
    if (x <= 0.001 || x >= 0.999) return 0;
    return Omega * x * (1 - x) + R * T * (x * Math.log(x) + (1 - x) * Math.log(1 - x));
  }

  function d2Gmix(x, T) {
    return -2 * Omega + R * T / (x * (1 - x));
  }

  // Find binodal by common tangent (symmetric for regular solution)
  function findBinodal(T) {
    // For symmetric regular solution, binodal is where G(x) = G(1-x) and tangent matches
    // Use bisection: find x < 0.5 where dG/dx = [G(0.5) - G(x)] / (0.5 - x) ...
    // Actually for symmetric, binodal x satisfies: dG/dx(x) = G(x)/(x - 0.5) * ...
    // Simpler: numerical search for x where dGmix/dx = [Gmix(1-x) - Gmix(x)] / (1 - 2x)
    if (T >= Tc) return null;
    let lo = 0.001, hi = 0.499;
    for (let i = 0; i < 50; i++) {
      const mid = (lo + hi) / 2;
      const dg = Omega * (1 - 2 * mid) + R * T * (Math.log(mid) - Math.log(1 - mid));
      const slope = (Gmix(1 - mid, T) - Gmix(mid, T)) / (1 - 2 * mid);
      if (dg < slope) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
  }

  function findSpinodal(T) {
    if (T >= Tc) return null;
    // d2G/dx2 = 0: -2Omega + RT/(x(1-x)) = 0 => x(1-x) = RT/(2Omega)
    const prod = R * T / (2 * Omega);
    if (prod >= 0.25) return null;
    const disc = Math.sqrt(0.25 - prod);
    return 0.5 - disc;
  }

  function render() {
    const dpr = Math.min(window.devicePixelRatio, C.MAX_DPR);
    const totalW = container.clientWidth;
    const halfW = Math.floor(totalW / 2);
    const h = Math.round(totalW * 0.35);

    // Setup both canvases
    for (const c of [canvasLeft, canvasRight]) {
      c.width = halfW * dpr;
      c.height = h * dpr;
      c.style.width = halfW + 'px';
      c.style.height = h + 'px';
    }
    const ctxL = canvasLeft.getContext('2d');
    const ctxR = canvasRight.getContext('2d');
    ctxL.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctxR.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctxL.clearRect(0, 0, halfW, h);
    ctxR.clearRect(0, 0, halfW, h);

    const ratio = parseInt(slider.value) / 100;
    valSpan.textContent = ratio.toFixed(2);
    const T = ratio * Tc;

    // === LEFT PANEL: G-x curve ===
    const xS = C.scale(0, 1, pad.l, halfW - pad.r);
    let gMin = 0, gMax = 0;
    for (let x = 0.01; x < 1; x += 0.01) {
      const g = Gmix(x, T);
      if (g < gMin) gMin = g;
      if (g > gMax) gMax = g;
    }
    const gMargin = Math.max(Math.abs(gMax - gMin) * 0.2, 500);
    const yS = C.scale(gMin - gMargin, gMax + gMargin, h - pad.b, pad.t);

    C.drawAxes(ctxL, pad, halfW, h, 'x_B', 'ΔG_mix');
    C.dashedHLine(ctxL, yS(0), pad.l, halfW - pad.r);

    const gPts = C.sampleCurve(xS, yS, x => Gmix(x, T), 200);
    C.strokeCurve(ctxL, gPts, C.BLUE, 2);

    // Spinodal points
    const xs = findSpinodal(T);
    if (xs !== null) {
      C.drawDot(ctxL, xS(xs), yS(Gmix(xs, T)), 4, C.LIGHT);
      C.drawDot(ctxL, xS(1 - xs), yS(Gmix(1 - xs, T)), 4, C.LIGHT);
    }

    // Binodal + common tangent
    const xb = findBinodal(T);
    if (xb !== null) {
      C.drawDot(ctxL, xS(xb), yS(Gmix(xb, T)), 4, C.RED);
      C.drawDot(ctxL, xS(1 - xb), yS(Gmix(1 - xb, T)), 4, C.RED);
      // Common tangent line
      ctxL.strokeStyle = C.RED;
      ctxL.lineWidth = 1;
      ctxL.setLineDash([4, 4]);
      ctxL.beginPath();
      ctxL.moveTo(xS(xb), yS(Gmix(xb, T)));
      ctxL.lineTo(xS(1 - xb), yS(Gmix(1 - xb, T)));
      ctxL.stroke();
      ctxL.setLineDash([]);
    }

    // Temperature label
    ctxL.font = C.TITLE_FONT;
    ctxL.fillStyle = C.DARK;
    ctxL.textAlign = 'right';
    ctxL.fillText(`T = ${Math.round(T)} K`, halfW - pad.r, pad.t + 14);
    ctxL.font = C.TICK_FONT;
    ctxL.fillStyle = C.MUTED;
    ctxL.fillText(`T/T_c = ${ratio.toFixed(2)}`, halfW - pad.r, pad.t + 28);

    // === RIGHT PANEL: Phase diagram (T vs x) ===
    const xS2 = C.scale(0, 1, pad.l, halfW - pad.r);
    const yS2 = C.scale(0, Tc * 1.15, h - pad.b, pad.t);

    C.drawAxes(ctxR, pad, halfW, h, 'x_B', 'T (K)');

    // Build binodal and spinodal curves
    const binodalPts = [];
    const spinodalPts = [];
    for (let tt = 50; tt < Tc; tt += 5) {
      const xbb = findBinodal(tt);
      const xss = findSpinodal(tt);
      if (xbb !== null) {
        binodalPts.push({ x: xS2(xbb), y: yS2(tt) });
        binodalPts.unshift({ x: xS2(1 - xbb), y: yS2(tt) });
      }
      if (xss !== null) {
        spinodalPts.push({ x: xS2(xss), y: yS2(tt) });
        spinodalPts.unshift({ x: xS2(1 - xss), y: yS2(tt) });
      }
    }
    // Close at top
    binodalPts.splice(binodalPts.length / 2, 0, { x: xS2(0.5), y: yS2(Tc) });
    spinodalPts.splice(spinodalPts.length / 2, 0, { x: xS2(0.5), y: yS2(Tc) });

    // Fill between binodal and spinodal
    if (binodalPts.length > 2) {
      C.fillUnder(ctxR, binodalPts, yS2(0), 'rgba(139, 34, 82, 0.06)');
    }

    C.strokeCurve(ctxR, binodalPts, C.RED, 2);
    ctxR.setLineDash([4, 4]);
    C.strokeCurve(ctxR, spinodalPts, C.LIGHT, 1.5);
    ctxR.setLineDash([]);

    // Tc marker
    C.dashedHLine(ctxR, yS2(Tc), pad.l, halfW - pad.r);
    ctxR.font = C.TICK_FONT;
    ctxR.fillStyle = C.MUTED;
    ctxR.textAlign = 'right';
    ctxR.fillText(`T_c = ${Math.round(Tc)} K`, halfW - pad.r, yS2(Tc) - 6);

    // Current temperature horizontal line
    ctxR.strokeStyle = C.DARK;
    ctxR.lineWidth = 2;
    ctxR.beginPath();
    ctxR.moveTo(pad.l, yS2(T));
    ctxR.lineTo(halfW - pad.r, yS2(T));
    ctxR.stroke();

    // Mark binodal compositions at current T on phase diagram
    if (xb !== null) {
      C.drawDot(ctxR, xS2(xb), yS2(T), 4, C.RED);
      C.drawDot(ctxR, xS2(1 - xb), yS2(T), 4, C.RED);
    }

    // Legend
    ctxR.font = C.TICK_FONT;
    ctxR.fillStyle = C.RED;
    ctxR.textAlign = 'left';
    ctxR.fillText('Binodal', pad.l + 6, pad.t + 12);
    ctxR.fillStyle = C.LIGHT;
    ctxR.fillText('Spinodal', pad.l + 6, pad.t + 26);
  }

  slider.addEventListener('input', render);
  render();
  window.addEventListener('resize', render);
}
