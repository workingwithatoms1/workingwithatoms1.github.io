/* ==========================================================================
   Kirkendall effect widget — asymmetric interdiffusion
   Two species A and B with D_A > D_B diffuse across an interface.
   The net vacancy flux causes marker plane drift toward the
   faster-diffusing side.

   C_A(x,t) = 0.5 * erfc(x / (2 * sqrt(D_A * t)))
   C_B(x,t) = 1 - 0.5 * erfc(x / (2 * sqrt(D_B * t)))

   Marker velocity: v = (D_A - D_B) * (dC/dx) at marker position.
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
      t <input type="range" min="0" max="1000" value="0" id="kirk-t"
              style="width:120px;accent-color:#2a2f7c;">
      <span id="kirk-t-val" style="min-width:40px;">0</span>
    </label>
    <label style="display:flex;align-items:center;gap:6px;">
      D\u2090/D\u1D47 <input type="range" min="10" max="100" value="30" id="kirk-ratio"
              style="width:100px;accent-color:#2a2f7c;">
      <span id="kirk-ratio-val" style="min-width:36px;">3.0</span>
    </label>
  `;
  container.appendChild(controls);

  const tSlider     = controls.querySelector('#kirk-t');
  const ratioSlider = controls.querySelector('#kirk-ratio');
  const tVal        = controls.querySelector('#kirk-t-val');
  const ratioVal    = controls.querySelector('#kirk-ratio-val');

  const pad = { l: 60, r: 20, t: 20, b: 50 };

  /* ---- Concentration functions ---- */
  function concA(x, DA, t) {
    if (t <= 0) return x <= 0 ? 1 : 0;
    return 0.5 * erfc(x / (2 * Math.sqrt(DA * t)));
  }

  function concB(x, DB, t) {
    if (t <= 0) return x <= 0 ? 0 : 1;
    return 1 - 0.5 * erfc(x / (2 * Math.sqrt(DB * t)));
  }

  /* ---- Marker position by numerical integration ---- */
  // dC_A/dx at position xm for marker velocity calculation
  function dCAdx(xm, DA, t) {
    if (t <= 0) return 0;
    const arg = xm / (2 * Math.sqrt(DA * t));
    // d/dx [0.5 * erfc(x/(2*sqrt(DA*t)))] = -1/(2*sqrt(pi*DA*t)) * exp(-arg^2)
    return -1 / (2 * Math.sqrt(Math.PI * DA * t)) * Math.exp(-arg * arg);
  }

  function computeMarkerPosition(DA, DB, t) {
    // Integrate marker velocity v = (D_A - D_B) * dC_A/dx from 0 to t
    // using simple Euler integration
    if (t <= 0) return 0;
    const nSteps = 500;
    const dt = t / nSteps;
    let xm = 0;
    for (let i = 0; i < nSteps; i++) {
      const tCur = (i + 0.5) * dt; // midpoint
      if (tCur <= 0) continue;
      const v = (DA - DB) * dCAdx(xm, DA, tCur);
      xm += v * dt;
    }
    return xm;
  }

  /* ---- Render ---- */
  function render() {
    const { ctx, w, h } = C.setupCanvas(canvas, container, 0.55);
    const t     = parseFloat(tSlider.value) / 10;       // 0 -- 100
    const ratio = parseFloat(ratioSlider.value) / 10;   // 1.0 -- 10.0

    tVal.textContent     = t.toFixed(1);
    ratioVal.textContent = ratio.toFixed(1);

    // Fix D_B = 0.05, vary D_A
    const DB = 0.05;
    const DA = DB * ratio;

    /* Fixed domain: x from -5 to +5, C from 0 to 1 */
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

    /* Clip rect around plot area */
    ctx.save();
    ctx.beginPath();
    ctx.rect(pad.l, pad.t, w - pad.l - pad.r, h - pad.t - pad.b);
    ctx.clip();

    /* Original interface -- dashed vertical line at x = 0 */
    C.dashedVLine(ctx, xS(0), pad.t, h - pad.b, C.MUTED);

    /* Species A profile (blue) */
    const ptsA = C.sampleCurve(xS, yS, x => concA(x, DA, t), 300);
    C.strokeCurve(ctx, ptsA, C.BLUE, 2.5);

    /* Species B profile (red) */
    const ptsB = C.sampleCurve(xS, yS, x => concB(x, DB, t), 300);
    C.strokeCurve(ctx, ptsB, C.RED, 2.5);

    /* Kirkendall marker position */
    const xMarker = computeMarkerPosition(DA, DB, t);
    const markerPx = xS(xMarker);
    const markerBaseY = h - pad.b;

    // Draw marker triangle (pointing up from x-axis)
    const triH = 12;
    const triW = 8;
    ctx.fillStyle = '#d4600a';
    ctx.beginPath();
    ctx.moveTo(markerPx, markerBaseY - triH);
    ctx.lineTo(markerPx - triW / 2, markerBaseY);
    ctx.lineTo(markerPx + triW / 2, markerBaseY);
    ctx.closePath();
    ctx.fill();

    // Dashed line from marker up through plot
    ctx.strokeStyle = '#d4600a';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(markerPx, markerBaseY - triH);
    ctx.lineTo(markerPx, pad.t);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.restore(); // end clip

    /* Curve labels */
    ctx.font = C.TITLE_FONT;
    // Label A near left side of plot
    ctx.fillStyle = C.BLUE;
    ctx.textAlign = 'left';
    const labelAx = pad.l + 10;
    const labelAy = yS(concA(xS.inv(labelAx), DA, Math.max(t, 0.5)));
    ctx.fillText('A', labelAx, Math.min(labelAy - 8, yS(0.85)));

    // Label B near right side of plot
    ctx.fillStyle = C.RED;
    ctx.textAlign = 'right';
    const labelBx = w - pad.r - 10;
    const labelBy = yS(concB(xS.inv(labelBx), DB, Math.max(t, 0.5)));
    ctx.fillText('B', labelBx, Math.min(labelBy - 8, yS(0.85)));

    /* Annotation: original interface label */
    ctx.font = C.LABEL_FONT;
    ctx.fillStyle = C.MUTED;
    ctx.textAlign = 'center';
    ctx.fillText('original', xS(0), pad.t + 14);
    ctx.fillText('interface', xS(0), pad.t + 26);

    /* Marker label */
    if (t > 0) {
      ctx.fillStyle = '#d4600a';
      ctx.font = C.LABEL_FONT;
      ctx.textAlign = 'center';
      const mkLabelY = h - pad.b + 14;
      ctx.fillText('marker', markerPx, mkLabelY);
    }

    /* Info text */
    ctx.font = C.VALUE_FONT;
    ctx.fillStyle = C.DARK;
    ctx.textAlign = 'left';
    ctx.fillText(
      `D\u2090/D\u1D47 = ${ratio.toFixed(1)}, t = ${t.toFixed(1)}`,
      pad.l + 10,
      pad.t + 44
    );

    ctx.font = C.LABEL_FONT;
    ctx.fillStyle = C.MUTED;
    ctx.fillText(
      `Marker shift: ${xMarker >= 0 ? '+' : ''}${xMarker.toFixed(3)}`,
      pad.l + 10,
      pad.t + 60
    );
  }

  /* ---- Event wiring ---- */
  tSlider.addEventListener('input', render);
  ratioSlider.addEventListener('input', render);

  render();
  window.addEventListener('resize', render);
}
