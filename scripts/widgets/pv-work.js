/* ==========================================================================
   PV Work diagram — isothermal expansion with shaded work area
   Slider for temperature. Draggable V2 endpoint.
   ========================================================================== */

import * as C from './chart-utils.js';

export function create(container) {
  const canvas = C.createWidgetShell(container);
  const ctx = canvas.getContext('2d');

  const controls = document.createElement('div');
  controls.className = 'widget-controls';
  controls.innerHTML = `
    <label class="widget-label">Temperature</label>
    <input type="range" class="widget-slider" min="200" max="800" value="400" step="10">
    <span class="widget-value">400 K</span>
  `;
  container.appendChild(controls);
  const slider = controls.querySelector('input');
  const valSpan = controls.querySelector('.widget-value');

  const pad = { l: 60, r: 20, t: 20, b: 50 };

  function render() {
    const { w, h } = C.setupCanvas(canvas, container);
    const T = parseInt(slider.value);
    valSpan.textContent = T + ' K';

    const V1 = 1, V2 = 4;
    const Pmax = 1000 / V1 * 1.1;
    const xS = C.scale(0.5, 5, pad.l, w - pad.r);
    const yS = C.scale(0, Pmax, h - pad.b, pad.t);

    C.drawAxes(ctx, pad, w, h, 'V (arbitrary units)', 'P');

    // Isotherm P = nRT/V (nR = 1 for display)
    const isoPts = C.sampleCurve(xS, yS, V => T / V, 120);
    // Shaded work area between V1 and V2
    const workPts = isoPts.filter(p => p.vx >= V1 && p.vx <= V2);
    C.fillUnder(ctx, workPts, yS(0), C.FILL_BLUE);
    C.strokeCurve(ctx, isoPts, C.BLUE, 2);

    // V1 and V2 dashed lines
    C.dashedVLine(ctx, xS(V1), yS(T / V1), yS(0));
    C.dashedVLine(ctx, xS(V2), yS(T / V2), yS(0));

    // Dots at V1 and V2 on isotherm
    C.drawDot(ctx, xS(V1), yS(T / V1));
    C.drawDot(ctx, xS(V2), yS(T / V2));

    // Labels
    ctx.font = C.LABEL_FONT;
    ctx.fillStyle = C.DARK;
    ctx.textAlign = 'center';
    ctx.fillText('V₁', xS(V1), yS(0) + 14);
    ctx.fillText('V₂', xS(V2), yS(0) + 14);

    // Work value
    const W = T * Math.log(V2 / V1);
    ctx.font = C.VALUE_FONT;
    ctx.fillStyle = C.BLUE;
    ctx.textAlign = 'left';
    ctx.fillText(`W = nRT ln(V₂/V₁) = ${W.toFixed(0)} J/mol`, xS(V1) + 20, yS(T / V1 * 0.5));

    // T label on curve
    ctx.font = C.LABEL_FONT;
    ctx.fillStyle = 'rgba(42,47,124,0.5)';
    ctx.textAlign = 'right';
    ctx.fillText(`T = ${T} K`, xS(4.8), yS(T / 4.8) - 8);
  }

  slider.addEventListener('input', render);
  render();
  window.addEventListener('resize', render);
}
