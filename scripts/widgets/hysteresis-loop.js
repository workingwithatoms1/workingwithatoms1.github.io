/* ==========================================================================
   Magnetic hysteresis loop widget — B-H (M-H) curve
   Tanh model: upper branch M = Ms * tanh((H - Hc) / a)
               lower branch M = Ms * tanh((H + Hc) / a)
   Sliders for Hc (coercivity, log scale) and Ms (saturation magnetisation).
   Presets for common ferromagnetic materials.
   ========================================================================== */

import * as C from './chart-utils.js';

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
      H<sub>c</sub>
      <input type="range" min="0" max="1000" value="782" id="hyst-hc"
             style="width:120px;accent-color:#2a2f7c;">
      <span id="hyst-hc-val" style="min-width:72px;">80 A/m</span>
    </label>
    <label style="display:flex;align-items:center;gap:6px;">
      M<sub>s</sub>
      <input type="range" min="10" max="200" value="100" id="hyst-ms"
             style="width:100px;accent-color:#2a2f7c;">
      <span id="hyst-ms-val" style="min-width:42px;">1.70 T</span>
    </label>
    <select id="hyst-preset" style="padding:3px 6px;font-size:11px;border:1px solid #c8c6d0;background:#fff;color:#3a3d5a;">
      <option value="">Preset\u2026</option>
      <option value="80,1.7">Soft iron</option>
      <option value="50000,1.2">Alnico</option>
      <option value="900000,1.3">NdFeB</option>
      <option value="1,0.87">Permalloy</option>
    </select>
  `;
  container.appendChild(controls);

  const hcSlider = controls.querySelector('#hyst-hc');
  const msSlider = controls.querySelector('#hyst-ms');
  const hcVal    = controls.querySelector('#hyst-hc-val');
  const msVal    = controls.querySelector('#hyst-ms-val');
  const preset   = controls.querySelector('#hyst-preset');

  /* ---- Log-scale mapping for Hc: slider 0..1000 -> 10..10 000 000 A/m ---- */
  const HC_MIN_LOG = Math.log10(1);       // 10^0 = 1
  const HC_MAX_LOG = Math.log10(10000000); // 10^7
  function sliderToHc(v) {
    const frac = parseFloat(v) / 1000;
    return Math.pow(10, HC_MIN_LOG + frac * (HC_MAX_LOG - HC_MIN_LOG));
  }
  function hcToSlider(hc) {
    const frac = (Math.log10(hc) - HC_MIN_LOG) / (HC_MAX_LOG - HC_MIN_LOG);
    return Math.round(frac * 1000);
  }

  /* ---- State ---- */
  let Hc = sliderToHc(hcSlider.value);
  let Ms = parseFloat(msSlider.value) / 100;

  const pad = { l: 60, r: 20, t: 20, b: 50 };

  /* ---- Format H value with SI prefix ---- */
  function fmtH(h) {
    const abs = Math.abs(h);
    if (abs >= 1e6)  return (h / 1e6).toPrecision(3)  + ' MA/m';
    if (abs >= 1e3)  return (h / 1e3).toPrecision(3)  + ' kA/m';
    return h.toPrecision(3) + ' A/m';
  }

  /* ---- Render ---- */
  function render() {
    const { ctx: c, w, h } = C.setupCanvas(canvas, container, 0.55);

    /* Steepness parameter: a controls slope at coercivity.
       Set a = Hc / 2 so the loop is nicely shaped. */
    const a = Hc / 2;

    /* Fixed axes — curve reshapes, axes stay put */
    const Hmax = 1e6;
    const Hmin = -Hmax;

    const xS = C.scale(Hmin, Hmax, pad.l, w - pad.r);
    const yS = C.scale(-2.2, 2.2, h - pad.b, pad.t);

    /* Axes through origin */
    c.strokeStyle = C.MUTED;
    c.lineWidth = 1;
    /* Vertical axis at H=0 */
    c.beginPath();
    c.moveTo(xS(0), pad.t);
    c.lineTo(xS(0), h - pad.b);
    c.stroke();
    /* Horizontal axis at M=0 */
    c.beginPath();
    c.moveTo(pad.l, yS(0));
    c.lineTo(w - pad.r, yS(0));
    c.stroke();

    /* Outer axes (frame) */
    C.drawAxes(c, pad, w, h, 'H (A/m)', 'M (T)');

    /* Tick marks -- H axis */
    c.font = C.TICK_FONT;
    c.fillStyle = C.MUTED;
    c.textAlign = 'center';
    const hTicks = niceTicksSymmetric(Hmax, 4);
    for (const ht of hTicks) {
      if (Math.abs(ht) < Hmax * 0.01) continue; // skip origin
      c.fillText(fmtTickH(ht), xS(ht), h - pad.b + 14);
    }
    /* Tick marks -- M axis */
    c.textAlign = 'right';
    const mTicks = niceTicksSymmetric(Ms * 1.15, 4);
    for (const mt of mTicks) {
      if (Math.abs(mt) < Ms * 0.01) continue;
      c.fillText(mt.toFixed(2), pad.l - 6, yS(mt) + 4);
    }

    /* Clip curves to plot area */
    c.save();
    c.beginPath();
    c.rect(pad.l, pad.t, w - pad.l - pad.r, h - pad.t - pad.b);
    c.clip();

    /* Upper branch: M = Ms * tanh((H - Hc) / a) — traced left to right */
    const upperPts = [];
    const lowerPts = [];
    const steps = 300;
    for (let i = 0; i <= steps; i++) {
      const H = Hmin + (Hmax - Hmin) * i / steps;
      const mUp  = Ms * Math.tanh((H - Hc) / a);
      const mLow = Ms * Math.tanh((H + Hc) / a);
      upperPts.push({ x: xS(H), y: yS(mUp),  vx: H, vy: mUp  });
      lowerPts.push({ x: xS(H), y: yS(mLow), vx: H, vy: mLow });
    }

    /* Fill between upper and lower branches */
    C.fillBetween(c, upperPts, lowerPts, 'rgba(77, 92, 242, 0.10)');

    /* Stroke curves */
    C.strokeCurve(c, upperPts, C.BLUE, 2);
    C.strokeCurve(c, lowerPts, C.BLUE, 2);

    c.restore();

    /* --- Key points --- */

    /* Coercivity: upper branch crosses M=0 at H = +Hc,
       lower branch crosses M=0 at H = -Hc  */
    const hcUpperX = Hc;
    const hcLowerX = -Hc;
    C.drawDot(c, xS(hcUpperX), yS(0), 5, C.RED);
    C.drawDot(c, xS(hcLowerX), yS(0), 5, C.RED);

    /* Remanence: M at H=0
       Lower branch at H=0: M = Ms*tanh(Hc/a) > 0  (positive remanence)
       Upper branch at H=0: M = Ms*tanh(-Hc/a) < 0  (negative remanence) */
    const MrPos = Ms * Math.tanh(Hc / a);
    const MrNeg = Ms * Math.tanh(-Hc / a);

    C.drawDot(c, xS(0), yS(MrPos), 5, C.LIGHT);
    C.drawDot(c, xS(0), yS(MrNeg), 5, C.LIGHT);

    /* Saturation: dashed reference lines at +/- Ms */
    C.dashedHLine(c, yS(Ms), pad.l, w - pad.r, 'rgba(42,47,124,0.2)');
    C.dashedHLine(c, yS(-Ms), pad.l, w - pad.r, 'rgba(42,47,124,0.2)');

    /* Labels */
    c.font = C.VALUE_FONT;

    /* Hc labels */
    c.fillStyle = C.RED;
    c.textAlign = 'center';
    c.fillText('H\u1d04', xS(hcUpperX), yS(0) + 16);
    c.fillText('\u2013H\u1d04', xS(hcLowerX), yS(0) + 16);

    /* Mr labels */
    c.fillStyle = C.LIGHT;
    c.textAlign = 'left';
    c.fillText('M\u1d63', xS(0) + 8, yS(MrPos) - 6);
    c.fillText('\u2013M\u1d63', xS(0) + 8, yS(MrNeg) + 14);

    /* Ms labels */
    c.fillStyle = 'rgba(42,47,124,0.45)';
    c.textAlign = 'right';
    c.fillText('M\u209b', w - pad.r - 4, yS(Ms) - 4);
    c.fillText('\u2013M\u209b', w - pad.r - 4, yS(-Ms) + 14);

    /* Readout in top-left */
    c.font = C.TITLE_FONT;
    c.fillStyle = C.DARK;
    c.textAlign = 'left';
    c.fillText('Magnetic Hysteresis Loop', pad.l + 8, pad.t + 14);

    c.font = C.TICK_FONT;
    c.fillStyle = C.MUTED;
    c.fillText(
      `H\u1d04 = ${fmtH(Hc)}   M\u209b = ${Ms.toFixed(2)} T   M\u1d63 = ${Math.abs(MrPos).toFixed(2)} T`,
      pad.l + 8,
      pad.t + 30
    );
  }

  /* ---- Nice symmetric tick generation ---- */
  function niceTicksSymmetric(maxVal, approxCount) {
    const raw = maxVal / approxCount;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    let step;
    const norm = raw / mag;
    if (norm < 1.5) step = mag;
    else if (norm < 3.5) step = 2 * mag;
    else if (norm < 7.5) step = 5 * mag;
    else step = 10 * mag;
    const ticks = [];
    for (let t = -Math.floor(maxVal / step) * step; t <= maxVal * 1.01; t += step) {
      ticks.push(t);
    }
    return ticks;
  }

  /* ---- Format tick label for H axis ---- */
  function fmtTickH(h) {
    const abs = Math.abs(h);
    if (abs >= 1e6)  return (h / 1e6) + 'M';
    if (abs >= 1e3)  return (h / 1e3) + 'k';
    return String(h);
  }

  /* ---- Slider updates ---- */
  function update() {
    Hc = sliderToHc(hcSlider.value);
    Ms = parseFloat(msSlider.value) / 100;
    hcVal.textContent = fmtH(Hc);
    msVal.textContent = Ms.toFixed(2) + ' T';
    render();
  }

  hcSlider.addEventListener('input', update);
  msSlider.addEventListener('input', update);

  /* ---- Presets ---- */
  preset.addEventListener('change', () => {
    if (!preset.value) return;
    const [hc, ms] = preset.value.split(',').map(Number);
    Hc = hc;
    Ms = ms;
    hcSlider.value = hcToSlider(hc);
    msSlider.value = Math.round(ms * 100);
    hcVal.textContent = fmtH(hc);
    msVal.textContent = ms.toFixed(2) + ' T';
    render();
    preset.value = '';
  });

  /* ---- Initial render ---- */
  update();
  window.addEventListener('resize', render);
}
