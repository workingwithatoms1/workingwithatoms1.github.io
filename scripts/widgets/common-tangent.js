/* ==========================================================================
   Common tangent construction — G-x for solid and liquid at adjustable T
   Shows common tangent, marks phase boundaries, builds phase diagram.
   ========================================================================== */

import * as C from './chart-utils.js';

export function create(container) {
  container.style.minHeight = 'auto';
  container.style.background = '#e1e0e8';
  container.style.maxWidth = '100%';

  const R = 8.314;
  // A-B lens system: TmA = 1356 (Cu), TmB = 1728 (Ni-like)
  const TmA = 1356, TmB = 1728;
  const dHA = 13300, dHB = 17500;
  const dSA = dHA / TmA, dSB = dHB / TmB;
  const OmegaS = 8000, OmegaL = 4000;

  const wrapper = document.createElement('div');
  wrapper.style.display = 'flex';
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
    <label class="widget-label">Temperature (K)</label>
    <input type="range" class="widget-slider" min="${TmA - 100}" max="${TmB + 100}" value="${Math.round((TmA + TmB) / 2)}" step="5">
    <span class="widget-value">${Math.round((TmA + TmB) / 2)} K</span>
  `;
  container.appendChild(controls);
  const slider = controls.querySelector('input');
  const valSpan = controls.querySelector('.widget-value');

  const pad = { l: 44, r: 12, t: 20, b: 36 };

  function Gmix(x, T) {
    if (x <= 0.001 || x >= 0.999) return 0;
    return R * T * (x * Math.log(x) + (1 - x) * Math.log(1 - x));
  }

  function Gsolid(x, T) {
    return OmegaS * x * (1 - x) + Gmix(x, T);
  }

  function Gliquid(x, T) {
    const dGA = dHA - T * dSA;
    const dGB = dHB - T * dSB;
    const ref = (1 - x) * dGA + x * dGB;
    return ref + OmegaL * x * (1 - x) + Gmix(x, T);
  }

  function dG(fn, x, T) {
    const dx = 0.0001;
    const xlo = Math.max(0.0001, x - dx);
    const xhi = Math.min(0.9999, x + dx);
    return (fn(xhi, T) - fn(xlo, T)) / (xhi - xlo);
  }

  // Grid search + local refinement for common tangent.
  // Tangent goes from liquid (low xB) to solid (high xB).
  function findCommonTangent(T) {
    // Coarse pass
    const N = 100;
    let bestXs = -1, bestXl = -1, bestErr = Infinity;

    for (let i = 1; i < N; i++) {
      const xl = i / N;
      const gl = Gliquid(xl, T);
      const dgl = dG(Gliquid, xl, T);

      for (let j = i + 1; j < N; j++) {
        const xs = j / N;
        const gs = Gsolid(xs, T);
        const slope = (gs - gl) / (xs - xl);
        const dgs = dG(Gsolid, xs, T);

        const err = Math.abs(dgl - slope) + Math.abs(dgs - slope);
        if (err < bestErr) { bestErr = err; bestXs = xs; bestXl = xl; }
      }
    }

    if (bestXl < 0) return null;

    // Fine refinement around the best coarse result
    const step = 0.001;
    const range = 0.03;
    for (let xl = Math.max(0.002, bestXl - range); xl <= Math.min(0.998, bestXl + range); xl += step) {
      const gl = Gliquid(xl, T);
      const dgl = dG(Gliquid, xl, T);
      for (let xs = Math.max(xl + 0.002, bestXs - range); xs <= Math.min(0.998, bestXs + range); xs += step) {
        const gs = Gsolid(xs, T);
        const slope = (gs - gl) / (xs - xl);
        const dgs = dG(Gsolid, xs, T);
        const err = Math.abs(dgl - slope) + Math.abs(dgs - slope);
        if (err < bestErr) { bestErr = err; bestXs = xs; bestXl = xl; }
      }
    }

    if (bestErr > 500 || bestXs - bestXl < 0.003) return null;
    return { xs: bestXs, xl: bestXl };
  }

  // Pre-compute phase diagram
  const phaseDiagram = [{ T: TmA, xs: 0, xl: 0 }];
  for (let T = TmA + 15; T < TmB - 10; T += 15) {
    const ct = findCommonTangent(T);
    if (ct) phaseDiagram.push({ T, ...ct });
  }
  phaseDiagram.push({ T: TmB, xs: 1, xl: 1 });

  function render() {
    const dpr = Math.min(window.devicePixelRatio, C.MAX_DPR);
    const totalW = container.clientWidth;
    const halfW = Math.floor(totalW / 2);
    const h = Math.round(totalW * 0.35);

    for (const c of [canvasLeft, canvasRight]) {
      c.width = halfW * dpr; c.height = h * dpr;
      c.style.width = halfW + 'px'; c.style.height = h + 'px';
    }
    const ctxL = canvasLeft.getContext('2d');
    const ctxR = canvasRight.getContext('2d');
    ctxL.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctxR.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctxL.clearRect(0, 0, halfW, h);
    ctxR.clearRect(0, 0, halfW, h);

    const T = parseInt(slider.value);
    valSpan.textContent = T + ' K';

    // === LEFT: G-x curves ===
    const xS = C.scale(0, 1, pad.l, halfW - pad.r);
    let gMin = 1e9, gMax = -1e9;
    for (let x = 0.01; x < 1; x += 0.01) {
      for (const g of [Gsolid(x, T), Gliquid(x, T)]) {
        if (g < gMin) gMin = g;
        if (g > gMax) gMax = g;
      }
    }
    const gM = Math.max((gMax - gMin) * 0.15, 500);
    const yS = C.scale(gMin - gM, gMax + gM, h - pad.b, pad.t);

    C.drawAxes(ctxL, pad, halfW, h, 'x_B', 'G (J/mol)');

    const sPts = C.sampleCurve(xS, yS, x => Gsolid(x, T), 150);
    const lPts = C.sampleCurve(xS, yS, x => Gliquid(x, T), 150);
    C.strokeCurve(ctxL, sPts, C.BLUE, 2);
    C.strokeCurve(ctxL, lPts, C.LIGHT, 2);

    ctxL.font = C.LABEL_FONT;
    ctxL.textAlign = 'left';
    ctxL.fillStyle = C.BLUE;
    ctxL.fillText('Solid', pad.l + 6, pad.t + 14);
    ctxL.fillStyle = C.LIGHT;
    ctxL.fillText('Liquid', pad.l + 6, pad.t + 28);

    // Common tangent at current T
    const ct = (T > TmA && T < TmB) ? findCommonTangent(T) : null;
    if (ct) {
      const gs = Gsolid(ct.xs, T), gl = Gliquid(ct.xl, T);
      ctxL.strokeStyle = C.RED;
      ctxL.lineWidth = 1.5;
      ctxL.setLineDash([5, 3]);
      ctxL.beginPath();
      ctxL.moveTo(xS(ct.xs), yS(gs));
      ctxL.lineTo(xS(ct.xl), yS(gl));
      ctxL.stroke();
      ctxL.setLineDash([]);
      C.drawDot(ctxL, xS(ct.xs), yS(gs), 4, C.RED);
      C.drawDot(ctxL, xS(ct.xl), yS(gl), 4, C.RED);
    }

    ctxL.font = C.TITLE_FONT;
    ctxL.fillStyle = C.DARK;
    ctxL.textAlign = 'right';
    ctxL.fillText(`T = ${T} K`, halfW - pad.r, pad.t + 14);

    // === RIGHT: Phase diagram ===
    const xS2 = C.scale(0, 1, pad.l, halfW - pad.r);
    const yS2 = C.scale(TmA - 100, TmB + 100, h - pad.b, pad.t);

    C.drawAxes(ctxR, pad, halfW, h, 'x_B', 'T (K)');

    const liquidusPts = phaseDiagram.map(d => ({ x: xS2(d.xl), y: yS2(d.T) }));
    const solidusPts = phaseDiagram.map(d => ({ x: xS2(d.xs), y: yS2(d.T) }));

    if (liquidusPts.length > 2 && solidusPts.length > 2) {
      C.fillBetween(ctxR, liquidusPts, solidusPts, 'rgba(77,92,242,0.08)');
    }
    C.strokeCurve(ctxR, liquidusPts, C.LIGHT, 2);
    C.strokeCurve(ctxR, solidusPts, C.BLUE, 2);

    ctxR.font = C.TICK_FONT;
    ctxR.fillStyle = C.LIGHT;
    ctxR.textAlign = 'left';
    if (liquidusPts.length > 3) ctxR.fillText('Liquidus', liquidusPts[3].x + 4, liquidusPts[3].y - 6);
    ctxR.fillStyle = C.BLUE;
    if (solidusPts.length > 3) ctxR.fillText('Solidus', solidusPts[3].x - 40, solidusPts[3].y + 14);

    // Current T line
    ctxR.strokeStyle = C.DARK;
    ctxR.lineWidth = 2;
    ctxR.beginPath();
    ctxR.moveTo(pad.l, yS2(T));
    ctxR.lineTo(halfW - pad.r, yS2(T));
    ctxR.stroke();

    if (ct) {
      C.drawDot(ctxR, xS2(ct.xs), yS2(T), 4, C.RED);
      C.drawDot(ctxR, xS2(ct.xl), yS2(T), 4, C.RED);
    }
  }

  slider.addEventListener('input', render);
  render();
  window.addEventListener('resize', render);
}
