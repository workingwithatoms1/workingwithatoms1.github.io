/* ==========================================================================
   Tangent construction — G-x curve with draggable composition
   Shows tangent line and chemical potential intercepts.
   ========================================================================== */

import * as C from './chart-utils.js';

export function create(container, config) {
  const canvas = C.createWidgetShell(container);
  const ctx = canvas.getContext('2d');

  const Omega = config.Omega || -10000; // negative for compound-forming
  const T = config.T || 1000;
  const R = 8.314;

  const controls = document.createElement('div');
  controls.className = 'widget-controls';
  controls.innerHTML = `
    <label class="widget-label">Composition x<sub>B</sub></label>
    <input type="range" class="widget-slider" min="5" max="95" value="30" step="1">
    <span class="widget-value">0.30</span>
  `;
  container.appendChild(controls);
  const slider = controls.querySelector('input');
  const valSpan = controls.querySelector('.widget-value');

  const pad = { l: 60, r: 52, t: 24, b: 50 };

  function Gmix(x) {
    if (x <= 0.001 || x >= 0.999) return 0;
    return Omega * x * (1 - x) + R * T * (x * Math.log(x) + (1 - x) * Math.log(1 - x));
  }

  function dGmix(x) {
    // Analytical derivative
    return Omega * (1 - 2 * x) + R * T * (Math.log(x) - Math.log(1 - x));
  }

  function render() {
    const { w, h } = C.setupCanvas(canvas, container);
    const xB = parseInt(slider.value) / 100;
    valSpan.textContent = xB.toFixed(2);

    const xScale = C.scale(0, 1, pad.l, w - pad.r);
    // Find G range
    let gMin = 0, gMax = 0;
    for (let x = 0.01; x <= 0.99; x += 0.01) {
      const g = Gmix(x);
      if (g < gMin) gMin = g;
      if (g > gMax) gMax = g;
    }
    const margin = (gMax - gMin) * 0.25 || 2000;
    const yScale = C.scale(gMin - margin, gMax + margin, h - pad.b, pad.t);

    C.drawAxes(ctx, pad, w, h, 'x_B', 'ΔG_mix (J/mol)');

    // Zero line
    C.dashedHLine(ctx, yScale(0), pad.l, w - pad.r);

    // G-x curve
    const pts = C.sampleCurve(xScale, yScale, Gmix, 200);
    C.strokeCurve(ctx, pts, C.BLUE, 2);

    // Tangent at xB
    const g = Gmix(xB);
    const dg = dGmix(xB);
    // Tangent line: G = g + dg * (x - xB)
    const tangentAt = x => g + dg * (x - xB);
    const muA = tangentAt(0); // intercept at xB = 0
    const muB = tangentAt(1); // intercept at xB = 1

    // Clip drawing to plot area
    ctx.save();
    ctx.beginPath();
    ctx.rect(pad.l, pad.t, w - pad.l - pad.r, h - pad.t - pad.b);
    ctx.clip();

    // Draw tangent line (clipped)
    ctx.strokeStyle = C.LIGHT;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(xScale(0), yScale(muA));
    ctx.lineTo(xScale(1), yScale(muB));
    ctx.stroke();

    // Intercept dots (clipped to visible range)
    const yTop = yScale.domain[1], yBot = yScale.domain[0];
    if (muA >= yBot && muA <= yTop) C.drawDot(ctx, xScale(0), yScale(muA), 4, C.LIGHT);
    if (muB >= yBot && muB <= yTop) C.drawDot(ctx, xScale(1), yScale(muB), 4, C.LIGHT);

    // Dot on curve
    C.drawDot(ctx, xScale(xB), yScale(g), 5, C.BLUE);

    ctx.restore(); // remove clip

    // Dashed drop line
    C.dashedVLine(ctx, xScale(xB), yScale(g), yScale(gMin - margin));

    // Chemical potential labels (clamped to visible area)
    ctx.font = C.VALUE_FONT;
    ctx.fillStyle = C.LIGHT;
    const muAy = Math.max(pad.t + 12, Math.min(h - pad.b - 4, yScale(muA)));
    const muBy = Math.max(pad.t + 12, Math.min(h - pad.b - 4, yScale(muB)));
    ctx.textAlign = 'left';
    ctx.fillText(`μ_A = ${(muA).toFixed(0)} J/mol`, pad.l + 6, muAy + 4);
    ctx.textAlign = 'right';
    ctx.fillText(`μ_B = ${(muB).toFixed(0)} J/mol`, w - pad.r - 6, muBy + 4);

    // Axis end labels
    ctx.font = C.LABEL_FONT;
    ctx.fillStyle = C.DARK;
    ctx.textAlign = 'center';
    ctx.fillText('A', xScale(0), yScale(gMin - margin) + 14);
    ctx.fillText('B', xScale(1), yScale(gMin - margin) + 14);
  }

  slider.addEventListener('input', render);
  render();
  window.addEventListener('resize', render);
}
