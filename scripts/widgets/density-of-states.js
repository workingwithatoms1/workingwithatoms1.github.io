/* ==========================================================================
   Free-electron density of states widget
   g(E) = (4pi (2m)^{3/2} / h^3) * sqrt(E)   for E >= 0

   Sliders:  Ef  (Fermi energy, 1--15 eV)
             T   (temperature, 0--2000 K)
   At T = 0 the filled region has a sharp cutoff at Ef.
   At T > 0 the filling follows the Fermi-Dirac distribution f(E).
   ========================================================================== */

import * as C from './chart-utils.js';

export function create(container) {
  const canvas = C.createWidgetShell(container, 0.55);

  /* ---- State ---- */
  let Ef = 7.0;   // eV  (default: copper)
  let T  = 0;     // K

  /* Boltzmann constant in eV/K */
  const kB = 8.617333262e-5;

  /* ---- Controls ---- */
  const controls = document.createElement('div');
  controls.style.cssText =
    'padding: 8px 16px; display: flex; flex-wrap: wrap; gap: 12px; ' +
    'align-items: center; font-family: "DM Sans", sans-serif; ' +
    'font-size: 12px; color: #3a3d5a;';
  controls.innerHTML = `
    <label style="display:flex;align-items:center;gap:6px;">
      E<sub>F</sub> <input type="range" min="100" max="1500" value="700" id="dos-ef"
              style="width:110px;accent-color:#2a2f7c;">
      <span id="dos-ef-val" style="min-width:56px;">7.0 eV</span>
    </label>
    <label style="display:flex;align-items:center;gap:6px;">
      T <input type="range" min="0" max="2000" value="0" id="dos-t"
              style="width:110px;accent-color:#2a2f7c;">
      <span id="dos-t-val" style="min-width:44px;">0 K</span>
    </label>
    <select id="dos-preset" style="padding:3px 6px;font-size:11px;border:1px solid #c8c6d0;background:#fff;color:#3a3d5a;">
      <option value="">Preset\u2026</option>
      <option value="3.2">Na</option>
      <option value="7.0">Cu</option>
      <option value="11.7">Al</option>
    </select>
  `;
  container.appendChild(controls);

  const efSlider  = controls.querySelector('#dos-ef');
  const tSlider   = controls.querySelector('#dos-t');
  const efVal     = controls.querySelector('#dos-ef-val');
  const tVal      = controls.querySelector('#dos-t-val');
  const preset    = controls.querySelector('#dos-preset');

  /* ---- Physics ---- */

  /** Free-electron DOS (arbitrary units — prefactor dropped). */
  function dos(E) {
    return E >= 0 ? Math.sqrt(E) : 0;
  }

  /** Fermi-Dirac occupation. */
  function fermiDirac(E, ef, temp) {
    if (temp <= 0) return E <= ef ? 1 : 0;
    const x = (E - ef) / (kB * temp);
    if (x > 500) return 0;
    if (x < -500) return 1;
    return 1 / (Math.exp(x) + 1);
  }

  /* ---- Render ---- */
  const pad = { l: 60, r: 20, t: 20, b: 50 };

  function render() {
    const { ctx, w, h } = C.setupCanvas(canvas, container, 0.55);

    /* Domain */
    const Emax = 18;
    const gMax = Math.sqrt(Emax) * 1.1;  // a little headroom

    const xS = C.scale(0, Emax, pad.l, w - pad.r);
    const yS = C.scale(0, gMax, h - pad.b, pad.t);

    /* Axes */
    C.drawAxes(ctx, pad, w, h, 'Energy (eV)', 'g(E) (arb. units)');

    /* X-axis ticks */
    ctx.font = C.TICK_FONT;
    ctx.fillStyle = C.MUTED;
    ctx.textAlign = 'center';
    for (let ev = 0; ev <= Emax; ev += 2) {
      ctx.fillText(ev, xS(ev), h - pad.b + 14);
    }

    /* Y-axis ticks */
    ctx.textAlign = 'right';
    const yStep = 1;
    for (let g = 0; g <= gMax; g += yStep) {
      ctx.fillText(g.toFixed(1), pad.l - 6, yS(g) + 4);
    }

    /* --- Filled states --- */
    const steps = 400;
    const filledPts = [];
    for (let i = 0; i <= steps; i++) {
      const E = Emax * i / steps;
      const g = dos(E);
      const f = fermiDirac(E, Ef, T);
      filledPts.push({ x: xS(E), y: yS(g * f) });
    }
    C.fillUnder(ctx, filledPts, yS(0), 'rgba(77, 92, 242, 0.25)');
    C.strokeCurve(ctx, filledPts, C.LIGHT, 1.2);

    /* --- Full DOS curve --- */
    const dosPts = C.sampleCurve(xS, yS, dos, steps);
    C.strokeCurve(ctx, dosPts, C.BLUE, 2.2);

    /* --- Ef marker (dashed vertical line) --- */
    const efPx = xS(Ef);
    C.dashedVLine(ctx, efPx, pad.t, h - pad.b, C.DARK);

    /* Label the Ef line */
    ctx.font = C.VALUE_FONT;
    ctx.fillStyle = C.DARK;
    ctx.textAlign = 'center';
    ctx.fillText('E\u1DA0', efPx, pad.t - 4);

    /* --- Legend --- */
    ctx.font = '500 11px "DM Sans", sans-serif';
    ctx.fillStyle = C.BLUE;
    ctx.textAlign = 'left';
    ctx.fillText('g(E) \u221D \u221AE', w - pad.r - 74, pad.t + 14);
    ctx.fillStyle = C.LIGHT;
    ctx.fillText('g(E)\u00B7f(E)', w - pad.r - 74, pad.t + 28);

    /* On-chart readout */
    ctx.font = C.VALUE_FONT;
    ctx.fillStyle = C.DARK;
    ctx.textAlign = 'left';
    ctx.fillText(
      `E\u1DA0 = ${Ef.toFixed(1)} eV, T = ${T} K`,
      pad.l + 10,
      pad.t + 16
    );
  }

  /* ---- Event wiring ---- */
  function update() {
    Ef = parseFloat(efSlider.value) / 100;
    T  = parseInt(tSlider.value, 10);
    efVal.textContent = Ef.toFixed(1) + ' eV';
    tVal.textContent  = T + ' K';
    render();
  }

  efSlider.addEventListener('input', update);
  tSlider.addEventListener('input', update);

  preset.addEventListener('change', () => {
    if (!preset.value) return;
    Ef = parseFloat(preset.value);
    efSlider.value = Math.round(Ef * 100);
    efVal.textContent = Ef.toFixed(1) + ' eV';
    render();
    preset.value = '';
  });

  render();
  window.addEventListener('resize', render);
}
