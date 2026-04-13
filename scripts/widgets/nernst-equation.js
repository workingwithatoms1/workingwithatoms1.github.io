/* ==========================================================================
   Nernst equation widget
   Interactive plot of cell potential E vs log10(Q) with sliders for
   standard potential E0, electron count n, temperature T, and log10(Q).
   E = E0 - (2.303 * R * T / (n * F)) * log10(Q)
   ========================================================================== */

import * as C from './chart-utils.js';

const R = 8.314;   // Gas constant, J/(mol·K)
const F = 96485;   // Faraday constant, C/mol

export function create(container) {
  const canvas = C.createWidgetShell(container, 0.55);
  const ctx = canvas.getContext('2d');

  /* ---- Controls ---- */
  const controls = document.createElement('div');
  controls.style.cssText =
    'padding: 8px 16px; display: flex; flex-wrap: wrap; gap: 12px; ' +
    'align-items: center; font-family: "DM Sans", sans-serif; ' +
    'font-size: 12px; color: #3a3d5a;';
  controls.innerHTML = `
    <label style="display:flex;align-items:center;gap:6px;">
      E\u00b0 <input type="range" min="-200" max="200" value="77" step="1" id="ne-e0"
              style="width:100px;accent-color:#2a2f7c;">
      <span id="ne-e0-val" style="min-width:52px;">0.77 V</span>
    </label>
    <label style="display:flex;align-items:center;gap:6px;">
      n <input type="range" min="1" max="4" value="2" step="1" id="ne-n"
              style="width:70px;accent-color:#2a2f7c;">
      <span id="ne-n-val" style="min-width:16px;">2</span>
    </label>
    <label style="display:flex;align-items:center;gap:6px;">
      T <input type="range" min="200" max="500" value="298" step="1" id="ne-T"
              style="width:100px;accent-color:#2a2f7c;">
      <span id="ne-T-val" style="min-width:40px;">298 K</span>
    </label>
    <label style="display:flex;align-items:center;gap:6px;">
      log\u2081\u2080Q <input type="range" min="-60" max="60" value="0" step="1" id="ne-logQ"
              style="width:100px;accent-color:#2a2f7c;">
      <span id="ne-logQ-val" style="min-width:32px;">0.0</span>
    </label>
  `;
  container.appendChild(controls);

  const e0Slider   = controls.querySelector('#ne-e0');
  const nSlider    = controls.querySelector('#ne-n');
  const tSlider    = controls.querySelector('#ne-T');
  const logQSlider = controls.querySelector('#ne-logQ');
  const e0Val      = controls.querySelector('#ne-e0-val');
  const nVal       = controls.querySelector('#ne-n-val');
  const tVal       = controls.querySelector('#ne-T-val');
  const logQVal    = controls.querySelector('#ne-logQ-val');

  const pad = { l: 60, r: 20, t: 20, b: 50 };

  /* ---- Nernst equation ---- */
  function nernstE(logQ, E0, n, T) {
    return E0 - (2.303 * R * T / (n * F)) * logQ;
  }

  /* ---- Render ---- */
  function render() {
    const { ctx: c, w, h } = C.setupCanvas(canvas, container, 0.55);

    /* Read slider values */
    const E0   = parseInt(e0Slider.value) / 100;    // -2.00 to +2.00 V
    const n    = parseInt(nSlider.value);            // 1 to 4
    const T    = parseInt(tSlider.value);            // 200 to 500 K
    const logQ = parseInt(logQSlider.value) / 10;   // -6.0 to +6.0

    /* Update readouts */
    e0Val.textContent   = E0.toFixed(2) + ' V';
    nVal.textContent    = n;
    tVal.textContent    = T + ' K';
    logQVal.textContent = logQ.toFixed(1);

    /* Fixed axes */
    const xMin = -6, xMax = 6;   // log10(Q)
    const yMin = -1.5, yMax = 1.5;   // E (V)

    const xS = C.scale(xMin, xMax, pad.l, w - pad.r);
    const yS = C.scale(yMin, yMax, h - pad.b, pad.t);

    /* ---- Axes ---- */
    C.drawAxes(c, pad, w, h, 'log\u2081\u2080 Q', 'E (V)');

    /* ---- Grid lines ---- */
    c.strokeStyle = 'rgba(0,0,0,0.05)';
    c.lineWidth = 0.6;
    for (let y = yMin; y <= yMax; y += 0.5) {
      c.beginPath();
      c.moveTo(pad.l, yS(y));
      c.lineTo(w - pad.r, yS(y));
      c.stroke();
    }
    for (let x = xMin; x <= xMax; x += 2) {
      c.beginPath();
      c.moveTo(xS(x), pad.t);
      c.lineTo(xS(x), h - pad.b);
      c.stroke();
    }

    /* ---- Tick marks ---- */
    c.font = C.TICK_FONT;
    c.fillStyle = C.MUTED;

    /* x-axis ticks */
    c.textAlign = 'center';
    for (let x = xMin; x <= xMax; x += 2) {
      c.fillText(x.toString(), xS(x), h - pad.b + 14);
    }

    /* y-axis ticks */
    c.textAlign = 'right';
    for (let y = yMin; y <= yMax; y += 0.5) {
      c.fillText(y.toFixed(0), pad.l - 6, yS(y) + 4);
    }

    /* ---- Clip to plot area ---- */
    c.save();
    c.beginPath();
    c.rect(pad.l, pad.t, w - pad.l - pad.r, h - pad.t - pad.b);
    c.clip();

    /* ---- Dashed horizontal line at E = E0 (where Q = 1, log Q = 0) ---- */
    const e0ScreenY = yS(E0);
    if (e0ScreenY >= pad.t && e0ScreenY <= h - pad.b) {
      C.dashedHLine(c, e0ScreenY, pad.l, w - pad.r, C.RED);

      /* Label E0 on the right side */
      c.font = C.TICK_FONT;
      c.fillStyle = C.RED;
      c.textAlign = 'right';
      c.fillText('E\u00b0 = ' + E0.toFixed(2) + ' V', w - pad.r - 4, e0ScreenY - 6);
    }

    /* ---- Nernst line (E vs log10 Q) ---- */
    const pts = C.sampleCurve(xS, yS, lq => nernstE(lq, E0, n, T), 200);
    C.strokeCurve(c, pts, C.BLUE, 2.5);

    /* ---- Operating point dot ---- */
    const Eop = nernstE(logQ, E0, n, T);
    const dotX = xS(logQ);
    const dotY = yS(Eop);
    C.drawDot(c, dotX, dotY, 5, C.BLUE);

    /* Dashed lines from dot to axes */
    C.dashedVLine(c, dotX, h - pad.b, dotY, C.MUTED);
    C.dashedHLine(c, dotY, pad.l, dotX, C.MUTED);

    /* Restore clip */
    c.restore();

    /* ---- Computed E value (prominent text, top-right) ---- */
    c.font = C.TITLE_FONT;
    c.fillStyle = C.DARK;
    c.textAlign = 'right';
    c.fillText('Nernst Equation', w - pad.r, pad.t + 14);

    c.font = '500 14px "DM Sans", sans-serif';
    c.fillStyle = C.BLUE;
    c.fillText('E = ' + Eop.toFixed(4) + ' V', w - pad.r, pad.t + 34);

    /* Slope annotation */
    const slope = 2.303 * R * T / (n * F);   // V per decade
    c.font = C.TICK_FONT;
    c.fillStyle = C.MUTED;
    c.textAlign = 'right';
    c.fillText('slope = \u2013' + (slope * 1000).toFixed(1) + ' mV/decade', w - pad.r, pad.t + 50);
    c.fillText('n = ' + n + ',  T = ' + T + ' K', w - pad.r, pad.t + 64);

    /* ---- Equation text (bottom-left) ---- */
    c.font = C.LABEL_FONT;
    c.fillStyle = C.MUTED;
    c.textAlign = 'left';
    c.fillText(
      'E = E\u00b0 \u2013 (2.303 RT / nF) log\u2081\u2080 Q',
      pad.l + 8, h - pad.b - 8
    );
  }

  /* ---- Event wiring ---- */
  e0Slider.addEventListener('input', render);
  nSlider.addEventListener('input', render);
  tSlider.addEventListener('input', render);
  logQSlider.addEventListener('input', render);

  render();
  window.addEventListener('resize', render);
}
