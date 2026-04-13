/* ==========================================================================
   Diffusion profile evolution widget — Fick's second law
   Concentration step function evolves via erfc solution:
     C(x,t) = 0.5 * erfc(x / (2 * sqrt(D * t)))
   Sliders for time and diffusivity.
   ========================================================================== */

import * as C from './chart-utils.js';

/**
 * Complementary error function (Abramowitz & Stegun approximation).
 */
function erfc(x) {
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const poly = t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
  const result = poly * Math.exp(-x * x);
  return x >= 0 ? result : 2 - result;
}

export function create(container) {
  const canvas = C.createWidgetShell(container, 0.55);

  /* ---- Controls ---- */
  const controls = document.createElement('div');
  controls.style.cssText =
    'padding: 8px 16px; display: flex; flex-wrap: wrap; gap: 12px; ' +
    'align-items: center; font-family: "DM Sans", sans-serif; ' +
    'font-size: 12px; color: #3a3d5a;';
  controls.innerHTML = `
    <label style="display:flex;align-items:center;gap:6px;">
      t <input type="range" min="0" max="1000" value="0" id="diff-t"
              style="width:120px;accent-color:#2a2f7c;">
      <span id="diff-t-val" style="min-width:52px;">0</span>
    </label>
    <label style="display:flex;align-items:center;gap:6px;">
      D <input type="range" min="1" max="100" value="10" id="diff-d"
              style="width:100px;accent-color:#2a2f7c;">
      <span id="diff-d-val" style="min-width:36px;">0.10</span>
    </label>
  `;
  container.appendChild(controls);

  const tSlider = controls.querySelector('#diff-t');
  const dSlider = controls.querySelector('#diff-d');
  const tVal   = controls.querySelector('#diff-t-val');
  const dVal   = controls.querySelector('#diff-d-val');

  const pad = { l: 60, r: 20, t: 20, b: 50 };

  /* ---- Concentration function ---- */
  function concentration(x, D, t) {
    if (t <= 0) return x <= 0 ? 1 : 0;           // perfect step
    return 0.5 * erfc(x / (2 * Math.sqrt(D * t)));
  }

  /* ---- Render ---- */
  function render() {
    const { ctx, w, h } = C.setupCanvas(canvas, container, 0.55);
    const t = parseFloat(tSlider.value) / 10;     // 0 -- 100 arb. units
    const D = parseFloat(dSlider.value) / 100;    // 0.01 -- 1.00

    tVal.textContent = t.toFixed(1);
    dVal.textContent = D.toFixed(2);

    /* Domain: x from -5 to +5 (symmetric around junction) */
    const xMin = -5, xMax = 5;
    const xS = C.scale(xMin, xMax, pad.l, w - pad.r);
    const yS = C.scale(0, 1, h - pad.b, pad.t);

    /* Axes */
    C.drawAxes(ctx, pad, w, h, 'Position, x', 'Concentration, C');

    /* Tick marks -- x axis */
    ctx.font = C.TICK_FONT;
    ctx.fillStyle = C.MUTED;
    ctx.textAlign = 'center';
    for (let xv = xMin; xv <= xMax; xv += 1) {
      ctx.fillText(xv, xS(xv), h - pad.b + 14);
    }

    /* Tick marks -- y axis */
    ctx.textAlign = 'right';
    for (let yv = 0; yv <= 1; yv += 0.25) {
      ctx.fillText(yv.toFixed(2), pad.l - 6, yS(yv) + 4);
    }

    /* Dashed line at C = 0.5, x = 0 */
    C.dashedHLine(ctx, yS(0.5), pad.l, w - pad.r, C.MUTED);
    C.dashedVLine(ctx, xS(0), pad.t, h - pad.b, C.MUTED);

    /* Concentration profile */
    const pts = C.sampleCurve(xS, yS, x => concentration(x, D, t), 300);
    C.strokeCurve(ctx, pts, C.BLUE, 2.5);

    /* Label showing current D and t on the chart */
    ctx.font = C.VALUE_FONT;
    ctx.fillStyle = C.BLUE;
    ctx.textAlign = 'left';
    ctx.fillText(
      `D = ${D.toFixed(2)}, t = ${t.toFixed(1)}`,
      pad.l + 10,
      pad.t + 16
    );

    /* Subtitle: the equation */
    ctx.font = C.LABEL_FONT;
    ctx.fillStyle = C.MUTED;
    ctx.fillText(
      'C(x,t) = \u00BD erfc( x / 2\u221A(Dt) )',
      pad.l + 10,
      pad.t + 32
    );
  }

  /* ---- Event wiring ---- */
  tSlider.addEventListener('input', render);
  dSlider.addEventListener('input', render);

  render();
  window.addEventListener('resize', render);
}
