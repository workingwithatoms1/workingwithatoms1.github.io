/* ==========================================================================
   Rule of mixtures widget — composite modulus bounds
   Upper bound (Voigt, iso-strain) and lower bound (Reuss, iso-stress)
   as a function of fibre volume fraction.
   Sliders for fibre and matrix modulus. Presets for common composites.
   ========================================================================== */

import * as C from './chart-utils.js';

const PRESETS = [
  { label: 'CFRP',   Ef: 230, Em: 3.5  },
  { label: 'GFRP',   Ef: 73,  Em: 3.5  },
  { label: 'Al-SiC', Ef: 410, Em: 70   },
];

export function create(container) {
  const canvas = C.createWidgetShell(container, 0.55);
  const ctx = canvas.getContext('2d');

  let Ef = 230;   // GPa (fibre modulus)
  let Em = 3.5;   // GPa (matrix modulus)

  /* ---- Controls ---- */
  const controls = document.createElement('div');
  controls.style.cssText =
    'padding: 8px 16px; display: flex; flex-wrap: wrap; gap: 12px; ' +
    'align-items: center; font-family: "DM Sans", sans-serif; ' +
    'font-size: 12px; color: #3a3d5a;';
  controls.innerHTML = `
    <label style="display:flex;align-items:center;gap:6px;">
      E\u1DA0 <input type="range" min="50" max="500" value="${Ef}" step="1" id="rom-ef"
              style="width:100px;accent-color:#2a2f7c;">
      <span id="rom-ef-val" style="min-width:70px;">${Ef} GPa</span>
    </label>
    <label style="display:flex;align-items:center;gap:6px;">
      E\u2098 <input type="range" min="1" max="100" value="${Em}" step="0.5" id="rom-em"
              style="width:100px;accent-color:#2a2f7c;">
      <span id="rom-em-val" style="min-width:70px;">${Em} GPa</span>
    </label>
    <select id="rom-preset" style="padding:3px 6px;font-size:11px;border:1px solid #c8c6d0;background:#fff;color:#3a3d5a;">
      <option value="">Preset...</option>
      ${PRESETS.map((p, i) => `<option value="${i}">${p.label}</option>`).join('')}
    </select>
  `;
  container.appendChild(controls);

  const efSlider  = controls.querySelector('#rom-ef');
  const emSlider  = controls.querySelector('#rom-em');
  const efVal     = controls.querySelector('#rom-ef-val');
  const emVal     = controls.querySelector('#rom-em-val');
  const presetSel = controls.querySelector('#rom-preset');

  const pad = { l: 60, r: 20, t: 20, b: 50 };

  /* ---- Voigt (upper bound, iso-strain) ---- */
  function voigt(Vf) {
    return Vf * Ef + (1 - Vf) * Em;
  }

  /* ---- Reuss (lower bound, iso-stress) ---- */
  function reuss(Vf) {
    return 1 / (Vf / Ef + (1 - Vf) / Em);
  }

  /* ---- Render ---- */
  function render() {
    const { w, h } = C.setupCanvas(canvas, container, 0.55);

    const xS = C.scale(0, 1, pad.l, w - pad.r);
    const yS = C.scale(0, 500, h - pad.b, pad.t);

    /* Axes */
    C.drawAxes(ctx, pad, w, h, 'V\u1DA0  (fibre volume fraction)', 'E\u1D04  (GPa)');

    /* Grid lines */
    ctx.strokeStyle = 'rgba(0,0,0,0.05)';
    ctx.lineWidth = 0.6;
    for (let y = 0; y <= 500; y += 100) {
      ctx.beginPath();
      ctx.moveTo(pad.l, yS(y));
      ctx.lineTo(w - pad.r, yS(y));
      ctx.stroke();
    }
    for (let x = 0; x <= 1; x += 0.2) {
      ctx.beginPath();
      ctx.moveTo(xS(x), pad.t);
      ctx.lineTo(xS(x), h - pad.b);
      ctx.stroke();
    }

    /* Y-axis ticks */
    ctx.font = C.TICK_FONT;
    ctx.fillStyle = C.MUTED;
    ctx.textAlign = 'right';
    for (let y = 0; y <= 500; y += 100) {
      ctx.fillText(y.toString(), pad.l - 6, yS(y) + 4);
    }

    /* X-axis ticks */
    ctx.textAlign = 'center';
    for (let x = 0; x <= 1.01; x += 0.2) {
      ctx.fillText(x.toFixed(1), xS(x), h - pad.b + 14);
    }

    /* Clip to plot area */
    ctx.save();
    ctx.beginPath();
    ctx.rect(pad.l, pad.t, w - pad.l - pad.r, h - pad.t - pad.b);
    ctx.clip();

    /* Sample both curves */
    const voigtPts = C.sampleCurve(xS, yS, voigt, 200);
    const reussPts = C.sampleCurve(xS, yS, reuss, 200);

    /* Fill between bounds */
    C.fillBetween(ctx, voigtPts, reussPts, 'rgba(77, 92, 242, 0.08)');

    /* Upper bound (Voigt) — solid blue */
    C.strokeCurve(ctx, voigtPts, C.BLUE, 2.5);

    /* Lower bound (Reuss) — solid red */
    C.strokeCurve(ctx, reussPts, C.RED, 2.5);

    ctx.restore();

    /* Curve labels on chart */
    ctx.font = C.LABEL_FONT;

    /* Voigt label — positioned along upper curve at Vf = 0.5 */
    const voigtY = voigt(0.5);
    ctx.fillStyle = C.BLUE;
    ctx.textAlign = 'left';
    const vlx = xS(0.5) + 6;
    const vly = yS(voigtY) - 8;
    ctx.fillText('Voigt (iso-strain)', vlx, vly);

    /* Reuss label — positioned along lower curve at Vf = 0.5 */
    const reussY = reuss(0.5);
    ctx.fillStyle = C.RED;
    const rlx = xS(0.5) + 6;
    const rly = yS(reussY) + 14;
    ctx.fillText('Reuss (iso-stress)', rlx, rly);

    /* Parameter annotation (top-right) */
    ctx.font = C.TITLE_FONT;
    ctx.fillStyle = C.DARK;
    ctx.textAlign = 'right';
    ctx.fillText('Rule of Mixtures', w - pad.r, pad.t + 14);
    ctx.font = C.TICK_FONT;
    ctx.fillStyle = C.MUTED;
    ctx.fillText(`E\u1DA0 = ${Ef} GPa`, w - pad.r, pad.t + 30);
    ctx.fillText(`E\u2098 = ${Em} GPa`, w - pad.r, pad.t + 44);
  }

  /* ---- Event wiring ---- */
  function update() {
    Ef = parseFloat(efSlider.value);
    Em = parseFloat(emSlider.value);
    efVal.textContent = Ef + ' GPa';
    emVal.textContent = Em + ' GPa';
    render();
  }

  efSlider.addEventListener('input', update);
  emSlider.addEventListener('input', update);

  presetSel.addEventListener('change', () => {
    if (presetSel.value === '') return;
    const p = PRESETS[parseInt(presetSel.value)];
    Ef = p.Ef;
    Em = p.Em;
    efSlider.value = Ef;
    emSlider.value = Em;
    efVal.textContent = Ef + ' GPa';
    emVal.textContent = Em + ' GPa';
    render();
    presetSel.value = '';
  });

  render();
  window.addEventListener('resize', render);
}
