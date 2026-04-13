/* ==========================================================================
   Maxwell-Boltzmann speed distribution widget
   Interactive plot of the probability distribution of molecular speeds
   at different temperatures, with most probable, mean, and RMS speeds.

   f(v) = 4pi * (m/(2pi*kT))^(3/2) * v^2 * exp(-mv^2/(2kT))
   ========================================================================== */

import * as C from './chart-utils.js';

const kB = 1.381e-23;   // Boltzmann constant, J/K
const u  = 1.661e-27;   // atomic mass unit, kg

export function create(container) {
  const canvas = C.createWidgetShell(container, 0.55);

  /* ---- State ---- */
  let T    = 300;   // temperature, K
  let mass = 28;    // molecular mass, u

  /* ---- Controls ---- */
  const controls = document.createElement('div');
  controls.style.cssText =
    'padding: 8px 16px; display: flex; flex-wrap: wrap; gap: 12px; ' +
    'align-items: center; font-family: "DM Sans", sans-serif; ' +
    'font-size: 12px; color: #3a3d5a;';
  controls.innerHTML = `
    <label style="display:flex;align-items:center;gap:6px;">
      T <input type="range" min="100" max="2000" value="300" step="10" id="mb-T"
              style="width:120px;accent-color:#2a2f7c;">
      <span id="mb-T-val" style="min-width:48px;">300 K</span>
    </label>
    <label style="display:flex;align-items:center;gap:6px;">
      m <input type="range" min="1" max="200" value="28" step="1" id="mb-m"
              style="width:100px;accent-color:#2a2f7c;">
      <span id="mb-m-val" style="min-width:36px;">28 u</span>
    </label>
    <select id="mb-preset" style="padding:3px 6px;font-size:11px;border:1px solid #c8c6d0;background:#fff;color:#3a3d5a;">
      <option value="">Preset\u2026</option>
      <option value="28,300">N\u2082 at 300 K</option>
      <option value="4,300">He at 300 K</option>
      <option value="40,300">Ar at 300 K</option>
    </select>
  `;
  container.appendChild(controls);

  const tSlider = controls.querySelector('#mb-T');
  const mSlider = controls.querySelector('#mb-m');
  const tVal    = controls.querySelector('#mb-T-val');
  const mVal    = controls.querySelector('#mb-m-val');
  const preset  = controls.querySelector('#mb-preset');

  const pad = { l: 60, r: 20, t: 20, b: 50 };

  /* ---- Maxwell-Boltzmann distribution ---- */
  function fMB(v, m_kg, T_K) {
    const a = m_kg / (2 * Math.PI * kB * T_K);
    return 4 * Math.PI * Math.pow(a, 1.5) * v * v * Math.exp(-m_kg * v * v / (2 * kB * T_K));
  }

  /* Characteristic speeds */
  function vMostProbable(m_kg, T_K) { return Math.sqrt(2 * kB * T_K / m_kg); }
  function vMean(m_kg, T_K)         { return Math.sqrt(8 * kB * T_K / (Math.PI * m_kg)); }
  function vRMS(m_kg, T_K)          { return Math.sqrt(3 * kB * T_K / m_kg); }

  /* ---- Render ---- */
  function render() {
    const { ctx, w, h } = C.setupCanvas(canvas, container, 0.55);

    /* Read current state */
    T    = parseInt(tSlider.value);
    mass = parseInt(mSlider.value);
    tVal.textContent = T + ' K';
    mVal.textContent = mass + ' u';

    const m_kg = mass * u;

    /* Fixed x axis: 0 to 2000 m/s */
    const vMax = 2000;
    const xS = C.scale(0, vMax, pad.l, w - pad.r);

    /* Determine y-axis maximum from peak value, with some headroom */
    const vp   = vMostProbable(m_kg, T);
    const fMax = fMB(vp, m_kg, T) * 1.25;
    const yS   = C.scale(0, fMax, h - pad.b, pad.t);

    /* ---- Axes ---- */
    C.drawAxes(ctx, pad, w, h, 'Speed v (m/s)', 'f(v)');

    /* x-axis ticks */
    ctx.font = C.TICK_FONT;
    ctx.fillStyle = C.MUTED;
    ctx.textAlign = 'center';
    for (let v = 0; v <= vMax; v += 400) {
      ctx.fillText(v, xS(v), h - pad.b + 14);
    }

    /* y-axis ticks (skip zero, show a few nice values) */
    ctx.textAlign = 'right';
    const yStep = niceStep(fMax, 4);
    for (let yv = 0; yv <= fMax; yv += yStep) {
      if (yv === 0) { ctx.fillText('0', pad.l - 6, yS(0) + 4); continue; }
      const py = yS(yv);
      if (py < pad.t + 5 || py > h - pad.b - 5) continue;
      ctx.fillText(yv.toExponential(1), pad.l - 6, py + 4);
    }

    /* ---- Clip to plot area ---- */
    ctx.save();
    ctx.beginPath();
    ctx.rect(pad.l, pad.t, w - pad.l - pad.r, h - pad.t - pad.b);
    ctx.clip();

    /* ---- Distribution curve ---- */
    const pts = C.sampleCurve(xS, yS, v => fMB(v, m_kg, T), 400);

    /* Shade under the curve */
    C.fillUnder(ctx, pts, yS(0), C.FILL_BLUE);

    /* Stroke the curve */
    C.strokeCurve(ctx, pts, C.BLUE, 2.5);

    /* ---- Characteristic speed markers ---- */
    const vpVal   = vMostProbable(m_kg, T);
    const vmVal   = vMean(m_kg, T);
    const vrmsVal = vRMS(m_kg, T);

    /* Most probable speed -- dashed line */
    drawSpeedMarker(ctx, xS, yS, vpVal, m_kg, T, fMax, C.BLUE, [5, 4]);
    /* Mean speed -- dashed line (different dash pattern) */
    drawSpeedMarker(ctx, xS, yS, vmVal, m_kg, T, fMax, '#8b2252', [8, 4]);
    /* RMS speed -- dashed line (yet another pattern) */
    drawSpeedMarker(ctx, xS, yS, vrmsVal, m_kg, T, fMax, '#2a7c3a', [3, 3]);

    /* Restore clip */
    ctx.restore();

    /* ---- Legend ---- */
    const legX = w - pad.r - 8;
    const legY = pad.t + 14;
    ctx.font = '500 10px "DM Sans", sans-serif';
    ctx.textAlign = 'right';

    drawLegendLine(ctx, legX, legY,      C.BLUE,    [5, 4], `v_p = ${vpVal.toFixed(0)} m/s`);
    drawLegendLine(ctx, legX, legY + 15, '#8b2252',  [8, 4], `v_avg = ${vmVal.toFixed(0)} m/s`);
    drawLegendLine(ctx, legX, legY + 30, '#2a7c3a',  [3, 3], `v_rms = ${vrmsVal.toFixed(0)} m/s`);

    /* ---- Equation ---- */
    ctx.font = C.LABEL_FONT;
    ctx.fillStyle = C.MUTED;
    ctx.textAlign = 'left';
    ctx.fillText(
      'f(v) = 4\u03c0 (m/2\u03c0kT)\u00B3\u02F2 v\u00B2 exp(\u2013mv\u00B2/2kT)',
      pad.l + 8, h - pad.b - 8
    );
  }

  /* ---- Helpers ---- */

  /** Draw a dashed vertical line at a characteristic speed. */
  function drawSpeedMarker(ctx, xS, yS, v, m_kg, T_K, fMax, color, dash) {
    const px = xS(v);
    const fAtV = fMB(v, m_kg, T_K);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.2;
    ctx.setLineDash(dash);
    ctx.beginPath();
    ctx.moveTo(px, yS(0));
    ctx.lineTo(px, yS(fAtV));
    ctx.stroke();
    ctx.setLineDash([]);
  }

  /** Draw a legend entry: coloured dashed line + text, right-aligned. */
  function drawLegendLine(ctx, x, y, color, dash, label) {
    const lineLen = 18;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.setLineDash(dash);
    ctx.beginPath();
    ctx.moveTo(x - 60 - lineLen, y);
    ctx.lineTo(x - 60, y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = color;
    ctx.fillText(label, x, y + 4);
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

  /* ---- Preset handling ---- */
  preset.addEventListener('change', () => {
    if (!preset.value) return;
    const [m, t] = preset.value.split(',').map(Number);
    mass = m;
    T = t;
    mSlider.value = m;
    tSlider.value = t;
    mVal.textContent = m + ' u';
    tVal.textContent = t + ' K';
    render();
    preset.value = '';
  });

  /* ---- Event wiring ---- */
  tSlider.addEventListener('input', render);
  mSlider.addEventListener('input', render);

  render();
  window.addEventListener('resize', render);
}
