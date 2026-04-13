/* ==========================================================================
   Arrhenius plot — log10(D) vs 1000/T for diffusion
   Sliders for activation energy Ea and pre-exponential D0.
   Presets for common diffusion couples.
   ========================================================================== */

import * as C from './chart-utils.js';

const R = 8.314; // J/(mol·K)

const PRESETS = [
  { label: 'C in \u03b1-Fe',  Ea: 80,  D0: 6.2e-7 },
  { label: 'C in \u03b3-Fe',  Ea: 148, D0: 2.3e-5 },
  { label: 'Ni in Cu', Ea: 256, D0: 2.7e-5 },
];

const REF_TEMPS = [300, 500, 1000, 1500]; // K

export function create(container) {
  const canvas = C.createWidgetShell(container, 0.55);
  const ctx = canvas.getContext('2d');

  let Ea  = 148;     // kJ/mol (default: C in gamma-Fe)
  let D0  = 2.3e-5;  // m²/s

  // Map D0 to a slider integer: slider value = log10(D0) * 100
  // Range: 10^-6 to 10^-2 => slider -600 to -200
  function d0ToSlider(d0) { return Math.round(Math.log10(d0) * 100); }
  function sliderToD0(v)  { return Math.pow(10, v / 100); }

  // Controls
  const controls = document.createElement('div');
  controls.style.cssText = 'padding: 8px 16px; display: flex; flex-wrap: wrap; gap: 12px; align-items: center; font-family: "DM Sans", sans-serif; font-size: 12px; color: #3a3d5a;';
  controls.innerHTML = `
    <label style="display:flex;align-items:center;gap:6px;">
      E\u2090 <input type="range" min="50" max="300" value="${Ea}" step="1" id="arr-ea" style="width:100px;accent-color:#2a2f7c;">
      <span id="arr-ea-val" style="min-width:70px;">${Ea} kJ/mol</span>
    </label>
    <label style="display:flex;align-items:center;gap:6px;">
      D\u2080 <input type="range" min="-600" max="-200" value="${d0ToSlider(D0)}" step="1" id="arr-d0" style="width:100px;accent-color:#2a2f7c;">
      <span id="arr-d0-val" style="min-width:80px;">${D0.toExponential(1)} m\u00b2/s</span>
    </label>
    <select id="arr-preset" style="padding:3px 6px;font-size:11px;border:1px solid #c8c6d0;background:#fff;color:#3a3d5a;">
      <option value="">Preset...</option>
      ${PRESETS.map((p, i) => `<option value="${i}">${p.label}</option>`).join('')}
    </select>
  `;
  container.appendChild(controls);

  const eaSlider  = controls.querySelector('#arr-ea');
  const d0Slider  = controls.querySelector('#arr-d0');
  const eaVal     = controls.querySelector('#arr-ea-val');
  const d0Val     = controls.querySelector('#arr-d0-val');
  const presetSel = controls.querySelector('#arr-preset');

  const pad = { l: 60, r: 20, t: 24, b: 50 };

  // Arrhenius: D = D0 * exp(-Ea / (R * T))
  // log10(D) = log10(D0) - Ea / (R * T * ln(10))
  // x-axis is 1000/T so T = 1000/x
  function log10D(invKT) {
    const T = 1000 / invKT;
    return Math.log10(D0) - (Ea * 1000) / (R * T * Math.LN10);
  }

  function render() {
    const { w, h } = C.setupCanvas(canvas, container, 0.55);

    const xMin = 0.5, xMax = 3.5;   // 1000/T (K⁻¹)
    const yMin = -20,  yMax = -5;    // log10(D)

    const xS = C.scale(xMin, xMax, pad.l, w - pad.r);
    const yS = C.scale(yMin, yMax, h - pad.b, pad.t);

    C.drawAxes(ctx, pad, w, h, '1000 / T  (K\u207b\u00b9)', 'log\u2081\u2080 D  (m\u00b2/s)');

    // Grid lines
    ctx.strokeStyle = 'rgba(0,0,0,0.05)';
    ctx.lineWidth = 0.6;
    for (let y = -20; y <= -5; y += 5) {
      ctx.beginPath();
      ctx.moveTo(pad.l, yS(y));
      ctx.lineTo(w - pad.r, yS(y));
      ctx.stroke();
    }
    for (let x = 0.5; x <= 3.5; x += 0.5) {
      ctx.beginPath();
      ctx.moveTo(xS(x), pad.t);
      ctx.lineTo(xS(x), h - pad.b);
      ctx.stroke();
    }

    // Y-axis ticks
    ctx.font = C.TICK_FONT;
    ctx.fillStyle = C.MUTED;
    ctx.textAlign = 'right';
    for (let y = -20; y <= -5; y += 5) {
      ctx.fillText(y.toString(), pad.l - 6, yS(y) + 4);
    }

    // X-axis ticks
    ctx.textAlign = 'center';
    for (let x = 0.5; x <= 3.5; x += 0.5) {
      ctx.fillText(x.toFixed(1), xS(x), h - pad.b + 14);
    }

    // Clip to plot area
    ctx.save();
    ctx.beginPath();
    ctx.rect(pad.l, pad.t, w - pad.l - pad.r, h - pad.t - pad.b);
    ctx.clip();

    // Arrhenius line
    const pts = C.sampleCurve(xS, yS, log10D, 200);
    C.strokeCurve(ctx, pts, C.BLUE, 2.5);

    // Reference temperature markers
    for (const T of REF_TEMPS) {
      const invKT = 1000 / T;
      if (invKT < xMin || invKT > xMax) continue;
      const logD = log10D(invKT);
      if (logD < yMin || logD > yMax) continue;

      const px = xS(invKT);
      const py = yS(logD);

      C.drawDot(ctx, px, py, 4, C.BLUE);

      // Dashed lines to axes
      C.dashedVLine(ctx, px, h - pad.b, py, C.MUTED);
      C.dashedHLine(ctx, py, pad.l, px, C.MUTED);

      // Temperature label above dot
      ctx.font = C.TICK_FONT;
      ctx.fillStyle = C.DARK;
      ctx.textAlign = 'center';
      ctx.fillText(T + ' K', px, py - 10);
    }

    ctx.restore();

    // Slope annotation (top-right)
    ctx.font = C.TITLE_FONT;
    ctx.fillStyle = C.DARK;
    ctx.textAlign = 'right';
    ctx.fillText('Arrhenius Plot', w - pad.r, pad.t + 14);
    ctx.font = C.TICK_FONT;
    ctx.fillStyle = C.MUTED;
    ctx.fillText(`E\u2090 = ${Ea} kJ/mol`, w - pad.r, pad.t + 30);
    ctx.fillText(`D\u2080 = ${D0.toExponential(1)} m\u00b2/s`, w - pad.r, pad.t + 44);
    const slope = -(Ea * 1000) / (R * Math.LN10);
    ctx.fillText(`slope = ${(slope / 1000).toFixed(1)}\u00d710\u00b3 K`, w - pad.r, pad.t + 58);
  }

  function update() {
    Ea = parseInt(eaSlider.value);
    D0 = sliderToD0(parseInt(d0Slider.value));
    eaVal.textContent = Ea + ' kJ/mol';
    d0Val.textContent = D0.toExponential(1) + ' m\u00b2/s';
    render();
  }

  eaSlider.addEventListener('input', update);
  d0Slider.addEventListener('input', update);

  presetSel.addEventListener('change', () => {
    if (presetSel.value === '') return;
    const p = PRESETS[parseInt(presetSel.value)];
    Ea = p.Ea;
    D0 = p.D0;
    eaSlider.value = Ea;
    d0Slider.value = d0ToSlider(D0);
    eaVal.textContent = Ea + ' kJ/mol';
    d0Val.textContent = D0.toExponential(1) + ' m\u00b2/s';
    render();
    presetSel.value = '';
  });

  render();
  window.addEventListener('resize', render);
}
