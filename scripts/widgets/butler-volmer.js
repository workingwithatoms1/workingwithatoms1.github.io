/* ==========================================================================
   Butler-Volmer electrode kinetics widget
   Interactive plot of current density vs overpotential with anodic/cathodic
   Tafel approximations and linear kinetics region near η = 0.
   ========================================================================== */

import * as C from './chart-utils.js';

const F = 96485;   // Faraday constant, C/mol
const R = 8.314;   // Gas constant, J/(mol·K)

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
      j\u2080 <input type="range" min="-60" max="-10" value="-30" id="bv-j0"
              style="width:110px;accent-color:#2a2f7c;">
      <span id="bv-j0-val" style="min-width:80px;">10\u207B\u00B3 A/cm\u00B2</span>
    </label>
    <label style="display:flex;align-items:center;gap:6px;">
      \u03b1 <input type="range" min="10" max="90" value="50" step="1" id="bv-alpha"
              style="width:100px;accent-color:#2a2f7c;">
      <span id="bv-alpha-val" style="min-width:32px;">0.50</span>
    </label>
    <label style="display:flex;align-items:center;gap:6px;">
      T <input type="range" min="200" max="500" value="298" step="1" id="bv-T"
              style="width:100px;accent-color:#2a2f7c;">
      <span id="bv-T-val" style="min-width:40px;">298 K</span>
    </label>
  `;
  container.appendChild(controls);

  const j0Slider    = controls.querySelector('#bv-j0');
  const alphaSlider = controls.querySelector('#bv-alpha');
  const tSlider     = controls.querySelector('#bv-T');
  const j0Val       = controls.querySelector('#bv-j0-val');
  const alphaVal    = controls.querySelector('#bv-alpha-val');
  const tVal        = controls.querySelector('#bv-T-val');

  const pad = { l: 72, r: 20, t: 24, b: 50 };

  /* ---- Butler-Volmer equation ---- */
  function bv(eta, j0, alpha, T) {
    const fRT = F / (R * T);
    return j0 * (Math.exp(alpha * fRT * eta) - Math.exp(-(1 - alpha) * fRT * eta));
  }

  /* Anodic Tafel approximation (valid at large positive η) */
  function tafelAnodic(eta, j0, alpha, T) {
    return j0 * Math.exp(alpha * F * eta / (R * T));
  }

  /* Cathodic Tafel approximation (valid at large negative η) */
  function tafelCathodic(eta, j0, alpha, T) {
    return -j0 * Math.exp(-(1 - alpha) * F * eta / (R * T));
  }

  /* ---- Render ---- */
  function render() {
    const { ctx: c, w, h } = C.setupCanvas(canvas, container, 0.55);

    /* Read slider values */
    const logJ0 = parseFloat(j0Slider.value) / 10;   // -6.0 to -1.0
    const j0    = Math.pow(10, logJ0);
    const alpha = parseInt(alphaSlider.value) / 100;  // 0.10 to 0.90
    const T     = parseInt(tSlider.value);             // 200 to 500 K

    /* Update readouts */
    const exp = Math.round(logJ0);
    const mant = Math.pow(10, logJ0 - exp);
    if (Math.abs(logJ0 - exp) < 0.05) {
      j0Val.textContent = `10${superscript(exp)} A/cm\u00B2`;
    } else {
      j0Val.textContent = `${mant.toFixed(1)}\u00D710${superscript(exp)} A/cm\u00B2`;
    }
    alphaVal.textContent = alpha.toFixed(2);
    tVal.textContent = T + ' K';

    /* Fixed axes — curve reshapes, axes stay put */
    const jLim = 0.1;  // A/cm²

    const xS = C.scale(-0.5, 0.5, pad.l, w - pad.r);
    const yS = C.scale(-jLim, jLim, h - pad.b, pad.t);

    /* ---- Axes ---- */
    C.drawAxes(c, pad, w, h, '\u03b7 (V)', 'j (A/cm\u00B2)');

    /* Zero lines */
    c.strokeStyle = 'rgba(0,0,0,0.15)';
    c.lineWidth = 0.8;
    c.beginPath();
    c.moveTo(pad.l, yS(0));
    c.lineTo(w - pad.r, yS(0));
    c.stroke();
    c.beginPath();
    c.moveTo(xS(0), pad.t);
    c.lineTo(xS(0), h - pad.b);
    c.stroke();

    /* ---- Tick marks ---- */
    c.font = C.TICK_FONT;
    c.fillStyle = C.MUTED;

    /* x-axis ticks */
    c.textAlign = 'center';
    for (let eta = -0.4; eta <= 0.4; eta += 0.2) {
      if (Math.abs(eta) < 0.01) continue;
      c.fillText(eta.toFixed(1), xS(eta), h - pad.b + 14);
    }
    c.fillText('0', xS(0), h - pad.b + 14);

    /* y-axis ticks */
    c.textAlign = 'right';
    const yStep = niceStep(jLim, 3);
    for (let jt = -Math.floor(jLim / yStep) * yStep; jt <= jLim; jt += yStep) {
      const py = yS(jt);
      if (py < pad.t + 5 || py > h - pad.b - 5) continue;
      c.fillText(formatCurrent(jt), pad.l - 6, py + 4);
    }

    /* ---- Linear region shading near η = 0 ---- */
    /* Clip all curves to the plot area */
    c.save();
    c.beginPath();
    c.rect(pad.l, pad.t, w - pad.l - pad.r, h - pad.t - pad.b);
    c.clip();

    const linearLim = R * T / F * 0.8;   // ~0.8 × (RT/F), where linearization holds
    const linLeft  = Math.max(-0.5, -linearLim);
    const linRight = Math.min(0.5, linearLim);
    c.fillStyle = 'rgba(77, 92, 242, 0.07)';
    c.fillRect(xS(linLeft), pad.t, xS(linRight) - xS(linLeft), h - pad.b - pad.t);

    /* Label the linear region */
    c.font = C.TICK_FONT;
    c.fillStyle = C.LIGHT;
    c.textAlign = 'center';
    c.fillText('linear', xS(0), pad.t + 12);

    /* ---- Anodic Tafel approximation (dashed) ---- */
    const anodicPts = C.sampleCurve(xS, yS, eta => tafelAnodic(eta, j0, alpha, T), 400);
    c.setLineDash([6, 4]);
    C.strokeCurve(c, anodicPts, 'rgba(139, 34, 82, 0.6)', 1.3);
    c.setLineDash([]);

    /* ---- Cathodic Tafel approximation (dashed) ---- */
    const cathodicPts = C.sampleCurve(xS, yS, eta => tafelCathodic(eta, j0, alpha, T), 400);
    c.setLineDash([6, 4]);
    C.strokeCurve(c, cathodicPts, 'rgba(139, 34, 82, 0.6)', 1.3);
    c.setLineDash([]);

    /* ---- Full Butler-Volmer curve ---- */
    const bvPts = C.sampleCurve(xS, yS, eta => bv(eta, j0, alpha, T), 400);
    C.strokeCurve(c, bvPts, C.BLUE, 2.5);

    /* Restore clip */
    c.restore();

    /* ---- Tafel slope annotation ---- */
    const tafelSlopeAnodic  = 2.303 * R * T / (alpha * F);        // V/decade
    const tafelSlopeCathodic = 2.303 * R * T / ((1 - alpha) * F); // V/decade
    c.font = C.TICK_FONT;
    c.fillStyle = C.RED;
    c.textAlign = 'right';
    c.fillText(
      `b_a = ${(tafelSlopeAnodic * 1000).toFixed(0)} mV/dec`,
      w - pad.r - 4, pad.t + 14
    );
    c.fillText(
      `b_c = ${(tafelSlopeCathodic * 1000).toFixed(0)} mV/dec`,
      w - pad.r - 4, pad.t + 28
    );

    /* ---- Legend ---- */
    c.font = '500 11px "DM Sans", sans-serif';
    c.textAlign = 'left';

    const legX = pad.l + 8;
    const legY = pad.t + 14;

    /* Butler-Volmer (solid blue) */
    c.strokeStyle = C.BLUE;
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(legX, legY);
    c.lineTo(legX + 16, legY);
    c.stroke();
    c.fillStyle = C.BLUE;
    c.fillText('Butler\u2013Volmer', legX + 20, legY + 4);

    /* Tafel (dashed red) */
    c.setLineDash([4, 3]);
    c.strokeStyle = 'rgba(139, 34, 82, 0.6)';
    c.lineWidth = 1.3;
    c.beginPath();
    c.moveTo(legX, legY + 16);
    c.lineTo(legX + 16, legY + 16);
    c.stroke();
    c.setLineDash([]);
    c.fillStyle = C.RED;
    c.fillText('Tafel approx.', legX + 20, legY + 20);

    /* ---- Equation text ---- */
    c.font = C.LABEL_FONT;
    c.fillStyle = C.MUTED;
    c.textAlign = 'left';
    c.fillText(
      'j = j\u2080 [exp(\u03b1F\u03b7/RT) \u2013 exp(\u2013(1\u2013\u03b1)F\u03b7/RT)]',
      pad.l + 8, h - pad.b - 8
    );
  }

  /* ---- Helpers ---- */

  /** Unicode superscript for small negative integers */
  function superscript(n) {
    const sup = { '0': '\u2070', '1': '\u00B9', '2': '\u00B2', '3': '\u00B3',
                  '4': '\u2074', '5': '\u2075', '6': '\u2076', '7': '\u2077',
                  '8': '\u2078', '9': '\u2079', '-': '\u207B' };
    return String(n).split('').map(ch => sup[ch] || ch).join('');
  }

  /** Choose a nice round tick step for ~nTicks intervals over [0, max]. */
  function niceStep(max, nTicks) {
    const raw = max / nTicks;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const norm = raw / mag;
    if (norm < 1.5) return mag;
    if (norm < 3.5) return 2 * mag;
    if (norm < 7.5) return 5 * mag;
    return 10 * mag;
  }

  /** Format a current density value concisely. */
  function formatCurrent(j) {
    const absJ = Math.abs(j);
    if (absJ === 0) return '0';
    if (absJ >= 0.1)   return j.toFixed(2);
    if (absJ >= 0.001) return (j * 1000).toFixed(1) + 'm';
    return j.toExponential(1);
  }

  /* ---- Event wiring ---- */
  j0Slider.addEventListener('input', render);
  alphaSlider.addEventListener('input', render);
  tSlider.addEventListener('input', render);

  render();
  window.addEventListener('resize', render);
}
