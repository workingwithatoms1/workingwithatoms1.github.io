/* ==========================================================================
   Hall-Petch plot — yield stress vs inverse square root of grain size
   sigma_y = sigma_0 + k_y * d^(-1/2)
   Sliders for friction stress sigma_0 and Hall-Petch slope k_y.
   Presets for common engineering alloys.
   ========================================================================== */

import * as C from './chart-utils.js';

const PRESETS = [
  { label: 'Low carbon steel', sigma0: 70,  ky: 0.74 },
  { label: 'Cu',               sigma0: 25,  ky: 0.11 },
  { label: 'Ti',               sigma0: 80,  ky: 0.40 },
];

/* Reference grain sizes to mark on the line (in metres) */
const REF_GRAINS_UM = [1, 5, 10, 25, 50, 100];

export function create(container) {
  const canvas = C.createWidgetShell(container, 0.55);
  const ctx = canvas.getContext('2d');

  let sigma0 = 70;   // MPa  (friction stress)
  let ky     = 0.74;  // MPa·m^{1/2}

  /* ---- Controls ---- */
  const controls = document.createElement('div');
  controls.style.cssText =
    'padding: 8px 16px; display: flex; flex-wrap: wrap; gap: 12px; ' +
    'align-items: center; font-family: "DM Sans", sans-serif; ' +
    'font-size: 12px; color: #3a3d5a;';
  controls.innerHTML = `
    <label style="display:flex;align-items:center;gap:6px;">
      \u03c3\u2080 <input type="range" min="20" max="200" value="${sigma0}" step="1" id="hp-sigma0"
              style="width:100px;accent-color:#2a2f7c;">
      <span id="hp-sigma0-val" style="min-width:70px;">${sigma0} MPa</span>
    </label>
    <label style="display:flex;align-items:center;gap:6px;">
      k\u1d67 <input type="range" min="10" max="100" value="${Math.round(ky * 100)}" step="1" id="hp-ky"
              style="width:100px;accent-color:#2a2f7c;">
      <span id="hp-ky-val" style="min-width:90px;">${ky.toFixed(2)} MPa\u00b7m\u00bd</span>
    </label>
    <select id="hp-preset" style="padding:3px 6px;font-size:11px;border:1px solid #c8c6d0;background:#fff;color:#3a3d5a;">
      <option value="">Preset...</option>
      ${PRESETS.map((p, i) => `<option value="${i}">${p.label}</option>`).join('')}
    </select>
  `;
  container.appendChild(controls);

  const sigma0Slider = controls.querySelector('#hp-sigma0');
  const kySlider     = controls.querySelector('#hp-ky');
  const sigma0Val    = controls.querySelector('#hp-sigma0-val');
  const kyVal        = controls.querySelector('#hp-ky-val');
  const presetSel    = controls.querySelector('#hp-preset');

  const pad = { l: 60, r: 20, t: 20, b: 50 };

  /* ---- Hall-Petch: sigma_y as function of d^{-1/2} ---- */
  function sigmaY(dInvSqrt) {
    return sigma0 + ky * dInvSqrt;
  }

  /* ---- Render ---- */
  function render() {
    const { w, h } = C.setupCanvas(canvas, container, 0.55);

    const xMin = 0, xMax = 1000;    // d^{-1/2} in m^{-1/2}
    const yMin = 0, yMax = 800;     // sigma_y in MPa

    const xS = C.scale(xMin, xMax, pad.l, w - pad.r);
    const yS = C.scale(yMin, yMax, h - pad.b, pad.t);

    /* Axes */
    C.drawAxes(ctx, pad, w, h,
      'd\u207b\u00b9\u02f2  (m\u207b\u00b9\u02f2)',
      '\u03c3\u1d67  (MPa)');

    /* Grid lines */
    ctx.strokeStyle = 'rgba(0,0,0,0.05)';
    ctx.lineWidth = 0.6;
    for (let y = 0; y <= yMax; y += 200) {
      ctx.beginPath();
      ctx.moveTo(pad.l, yS(y));
      ctx.lineTo(w - pad.r, yS(y));
      ctx.stroke();
    }
    for (let x = 0; x <= xMax; x += 200) {
      ctx.beginPath();
      ctx.moveTo(xS(x), pad.t);
      ctx.lineTo(xS(x), h - pad.b);
      ctx.stroke();
    }

    /* Y-axis ticks */
    ctx.font = C.TICK_FONT;
    ctx.fillStyle = C.MUTED;
    ctx.textAlign = 'right';
    for (let y = 0; y <= yMax; y += 200) {
      ctx.fillText(y.toString(), pad.l - 6, yS(y) + 4);
    }

    /* X-axis ticks */
    ctx.textAlign = 'center';
    for (let x = 0; x <= xMax; x += 200) {
      ctx.fillText(x.toLocaleString(), xS(x), h - pad.b + 14);
    }

    /* Clip to plot area */
    ctx.save();
    ctx.beginPath();
    ctx.rect(pad.l, pad.t, w - pad.l - pad.r, h - pad.t - pad.b);
    ctx.clip();

    /* Hall-Petch line */
    const pts = C.sampleCurve(xS, yS, sigmaY, 200);
    C.strokeCurve(ctx, pts, C.BLUE, 2.5);

    /* Reference grain-size markers */
    for (const dUm of REF_GRAINS_UM) {
      const dMetres = dUm * 1e-6;
      const dInvSqrt = 1 / Math.sqrt(dMetres);
      if (dInvSqrt < xMin || dInvSqrt > xMax) continue;
      const sy = sigmaY(dInvSqrt);
      if (sy < yMin || sy > yMax) continue;

      const px = xS(dInvSqrt);
      const py = yS(sy);

      C.drawDot(ctx, px, py, 4, C.BLUE);

      /* Dashed lines to axes */
      C.dashedVLine(ctx, px, h - pad.b, py, C.MUTED);
      C.dashedHLine(ctx, py, pad.l, px, C.MUTED);

      /* Grain size label above dot */
      ctx.font = C.TICK_FONT;
      ctx.fillStyle = C.DARK;
      ctx.textAlign = 'center';
      ctx.fillText(dUm + ' \u00b5m', px, py - 10);
    }

    ctx.restore();

    /* Annotation (top-right) */
    ctx.font = C.TITLE_FONT;
    ctx.fillStyle = C.DARK;
    ctx.textAlign = 'right';
    ctx.fillText('Hall\u2013Petch', w - pad.r, pad.t + 14);
    ctx.font = C.TICK_FONT;
    ctx.fillStyle = C.MUTED;
    ctx.fillText(`\u03c3\u2080 = ${sigma0} MPa`, w - pad.r, pad.t + 30);
    ctx.fillText(`k\u1d67 = ${ky.toFixed(2)} MPa\u00b7m\u00bd`, w - pad.r, pad.t + 44);
  }

  /* ---- Event wiring ---- */
  function update() {
    sigma0 = parseInt(sigma0Slider.value);
    ky     = parseInt(kySlider.value) / 100;
    sigma0Val.textContent = sigma0 + ' MPa';
    kyVal.textContent     = ky.toFixed(2) + ' MPa\u00b7m\u00bd';
    render();
  }

  sigma0Slider.addEventListener('input', update);
  kySlider.addEventListener('input', update);

  presetSel.addEventListener('change', () => {
    if (presetSel.value === '') return;
    const p = PRESETS[parseInt(presetSel.value)];
    sigma0 = p.sigma0;
    ky     = p.ky;
    sigma0Slider.value = sigma0;
    kySlider.value     = Math.round(ky * 100);
    sigma0Val.textContent = sigma0 + ' MPa';
    kyVal.textContent     = ky.toFixed(2) + ' MPa\u00b7m\u00bd';
    render();
    presetSel.value = '';
  });

  render();
  window.addEventListener('resize', render);
}
