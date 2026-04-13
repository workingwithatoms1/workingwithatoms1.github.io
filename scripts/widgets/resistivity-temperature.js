/* ==========================================================================
   Resistivity vs Temperature widget
   Interactive log10(rho) vs T plot comparing a metal and a semiconductor.
   Metal:         rho = rho_0 * (1 + alpha * (T - 300))
   Semiconductor: rho = A * exp(Eg / (2 * k_B * T))
   Sliders for metal rho_0 (log scale) and semiconductor Eg.
   Presets for Cu vs Si and Fe vs Ge.
   ========================================================================== */

import * as C from './chart-utils.js';

const kB = 8.617e-5; // eV/K

const PRESETS = [
  { label: 'Cu vs Si', rho0: 1.7e-8, alpha: 0.004, Eg: 1.12 },
  { label: 'Fe vs Ge', rho0: 1.0e-7, alpha: 0.006, Eg: 0.67 },
];

// Prefactor A anchored so rho_semi(300 K) = 1000 ohm-m for Si (Eg = 1.12 eV).
// A is fixed; changing Eg shifts the exponential slope.
const A_SEMI = 1000 / Math.exp(1.12 / (2 * kB * 300));

export function create(container) {
  const canvas = C.createWidgetShell(container, 0.55);
  const ctx = canvas.getContext('2d');

  let rho0  = 1.7e-8;  // metal resistivity at 300 K (ohm-m)
  let alpha = 0.004;    // temperature coefficient (1/K)
  let Eg    = 1.12;     // semiconductor band gap (eV)

  // Log-scale slider for rho0: slider value = log10(rho0) * 100
  // Range: 1e-8 to 1e-6 => log10 range -8 to -6 => slider -800 to -600
  function rho0ToSlider(r) { return Math.round(Math.log10(r) * 100); }
  function sliderToRho0(v) { return Math.pow(10, v / 100); }

  // Eg slider: value in hundredths of eV (50 to 300)
  function egToSlider(eg) { return Math.round(eg * 100); }
  function sliderToEg(v)  { return v / 100; }

  // Controls
  const controls = document.createElement('div');
  controls.style.cssText =
    'padding: 8px 16px; display: flex; flex-wrap: wrap; gap: 12px; ' +
    'align-items: center; font-family: "DM Sans", sans-serif; ' +
    'font-size: 12px; color: #3a3d5a;';
  controls.innerHTML = `
    <label style="display:flex;align-items:center;gap:6px;">
      \u03c1\u2080 <input type="range" min="-800" max="-600" value="${rho0ToSlider(rho0)}" step="1" id="rt-rho0" style="width:100px;accent-color:#2a2f7c;">
      <span id="rt-rho0-val" style="min-width:80px;">${rho0.toExponential(1)} \u03a9\u00b7m</span>
    </label>
    <label style="display:flex;align-items:center;gap:6px;">
      E<sub>g</sub> <input type="range" min="50" max="300" value="${egToSlider(Eg)}" step="1" id="rt-eg" style="width:100px;accent-color:#2a2f7c;">
      <span id="rt-eg-val" style="min-width:52px;">${Eg.toFixed(2)} eV</span>
    </label>
    <select id="rt-preset" style="padding:3px 6px;font-size:11px;border:1px solid #c8c6d0;background:#fff;color:#3a3d5a;border-radius:3px;">
      <option value="">Preset...</option>
      ${PRESETS.map((p, i) => `<option value="${i}">${p.label}</option>`).join('')}
    </select>
  `;
  container.appendChild(controls);

  const rho0Slider = controls.querySelector('#rt-rho0');
  const egSlider   = controls.querySelector('#rt-eg');
  const rho0Val    = controls.querySelector('#rt-rho0-val');
  const egVal      = controls.querySelector('#rt-eg-val');
  const presetSel  = controls.querySelector('#rt-preset');

  const pad = { l: 60, r: 20, t: 20, b: 50 };

  // Physics functions returning log10(rho)
  function metalLog10Rho(T) {
    const rho = rho0 * (1 + alpha * (T - 300));
    if (rho <= 0) return -Infinity;
    return Math.log10(rho);
  }

  function semiLog10Rho(T) {
    // rho = A * exp(Eg / (2 * kB * T))
    const exponent = Eg / (2 * kB * T);
    // log10(rho) = log10(A) + exponent * log10(e)
    const log10rho = Math.log10(A_SEMI) + exponent * Math.LOG10E;
    return log10rho;
  }

  function render() {
    const { w, h } = C.setupCanvas(canvas, container, 0.55);

    const xMin = 100, xMax = 1000;  // Temperature (K)
    const yMin = -9,  yMax = 5;     // log10(rho) in ohm-m

    const xS = C.scale(xMin, xMax, pad.l, w - pad.r);
    const yS = C.scale(yMin, yMax, h - pad.b, pad.t);

    // Axes
    C.drawAxes(ctx, pad, w, h, 'Temperature (K)', 'log\u2081\u2080 \u03c1  (\u03a9\u00b7m)');

    // Grid lines
    ctx.strokeStyle = 'rgba(0,0,0,0.05)';
    ctx.lineWidth = 0.6;
    for (let y = yMin; y <= yMax; y += 1) {
      ctx.beginPath();
      ctx.moveTo(pad.l, yS(y));
      ctx.lineTo(w - pad.r, yS(y));
      ctx.stroke();
    }
    for (let x = 100; x <= 1000; x += 100) {
      ctx.beginPath();
      ctx.moveTo(xS(x), pad.t);
      ctx.lineTo(xS(x), h - pad.b);
      ctx.stroke();
    }

    // Y-axis ticks
    ctx.font = C.TICK_FONT;
    ctx.fillStyle = C.MUTED;
    ctx.textAlign = 'right';
    for (let y = yMin; y <= yMax; y += 2) {
      ctx.fillText(y.toString(), pad.l - 6, yS(y) + 4);
    }

    // X-axis ticks
    ctx.textAlign = 'center';
    for (let x = 200; x <= 1000; x += 200) {
      ctx.fillText(x.toString(), xS(x), h - pad.b + 14);
    }

    // Clip to plot area
    ctx.save();
    ctx.beginPath();
    ctx.rect(pad.l, pad.t, w - pad.l - pad.r, h - pad.t - pad.b);
    ctx.clip();

    // Metal curve
    const metalPts = C.sampleCurve(xS, yS, metalLog10Rho, 300);
    C.strokeCurve(ctx, metalPts, C.BLUE, 2.5);

    // Semiconductor curve
    const semiPts = C.sampleCurve(xS, yS, semiLog10Rho, 300);
    C.strokeCurve(ctx, semiPts, C.RED, 2.5);

    // Find crossing temperature (bisection)
    let Tcross = null;
    for (let i = 0; i < 299; i++) {
      const T1 = xMin + (xMax - xMin) * i / 300;
      const T2 = xMin + (xMax - xMin) * (i + 1) / 300;
      const diff1 = metalLog10Rho(T1) - semiLog10Rho(T1);
      const diff2 = metalLog10Rho(T2) - semiLog10Rho(T2);
      if (diff1 * diff2 < 0) {
        // Bisect
        let lo = T1, hi = T2;
        for (let j = 0; j < 30; j++) {
          const mid = (lo + hi) / 2;
          const dMid = metalLog10Rho(mid) - semiLog10Rho(mid);
          if (dMid * diff1 > 0) lo = mid; else hi = mid;
        }
        Tcross = (lo + hi) / 2;
        break;
      }
    }

    // Draw crossing point
    if (Tcross !== null && Tcross >= xMin && Tcross <= xMax) {
      const crossY = metalLog10Rho(Tcross);
      if (crossY >= yMin && crossY <= yMax) {
        const px = xS(Tcross);
        const py = yS(crossY);

        C.drawDot(ctx, px, py, 5, C.DARK);
        C.dashedVLine(ctx, px, h - pad.b, py, C.MUTED);
        C.dashedHLine(ctx, py, pad.l, px, C.MUTED);

        ctx.font = C.TICK_FONT;
        ctx.fillStyle = C.DARK;
        ctx.textAlign = 'center';
        ctx.fillText(Math.round(Tcross) + ' K', px, py - 10);
      }
    }

    // Curve labels -- place along the curves at sensible positions
    // Metal label at T = 800 K
    const metalLabelT = 800;
    const metalLabelY = metalLog10Rho(metalLabelT);
    if (metalLabelY >= yMin && metalLabelY <= yMax) {
      ctx.font = C.LABEL_FONT;
      ctx.fillStyle = C.BLUE;
      ctx.textAlign = 'left';
      ctx.fillText('Metal', xS(metalLabelT) + 4, yS(metalLabelY) - 8);
    }

    // Semiconductor label at T = 300 K
    const semiLabelT = 300;
    const semiLabelY = semiLog10Rho(semiLabelT);
    if (semiLabelY >= yMin && semiLabelY <= yMax) {
      ctx.font = C.LABEL_FONT;
      ctx.fillStyle = C.RED;
      ctx.textAlign = 'left';
      ctx.fillText('Semiconductor', xS(semiLabelT) + 4, yS(semiLabelY) - 8);
    } else {
      // If off-chart at 300 K, try labelling at a lower T where it's visible
      const fallbackT = 200;
      const fallbackY = semiLog10Rho(fallbackT);
      if (fallbackY >= yMin && fallbackY <= yMax) {
        ctx.font = C.LABEL_FONT;
        ctx.fillStyle = C.RED;
        ctx.textAlign = 'left';
        ctx.fillText('Semiconductor', xS(fallbackT) + 4, yS(fallbackY) - 8);
      }
    }

    ctx.restore();

    // Parameter annotations (top-right)
    ctx.font = C.TITLE_FONT;
    ctx.fillStyle = C.DARK;
    ctx.textAlign = 'right';
    ctx.fillText('Resistivity vs Temperature', w - pad.r, pad.t + 14);
    ctx.font = C.TICK_FONT;
    ctx.fillStyle = C.MUTED;
    ctx.fillText('\u03c1\u2080 = ' + rho0.toExponential(1) + ' \u03a9\u00b7m,  \u03b1 = ' + alpha, w - pad.r, pad.t + 30);
    ctx.fillText('E\u2091 = ' + Eg.toFixed(2) + ' eV', w - pad.r, pad.t + 44);
    if (Tcross !== null && Tcross >= xMin && Tcross <= xMax) {
      ctx.fillText('Crossover: ' + Math.round(Tcross) + ' K', w - pad.r, pad.t + 58);
    }
  }

  function update() {
    rho0 = sliderToRho0(parseInt(rho0Slider.value));
    Eg   = sliderToEg(parseInt(egSlider.value));
    rho0Val.textContent = rho0.toExponential(1) + ' \u03a9\u00b7m';
    egVal.textContent   = Eg.toFixed(2) + ' eV';
    render();
  }

  rho0Slider.addEventListener('input', update);
  egSlider.addEventListener('input', update);

  presetSel.addEventListener('change', () => {
    if (presetSel.value === '') return;
    const p = PRESETS[parseInt(presetSel.value)];
    rho0  = p.rho0;
    alpha = p.alpha;
    Eg    = p.Eg;
    rho0Slider.value = rho0ToSlider(rho0);
    egSlider.value   = egToSlider(Eg);
    rho0Val.textContent = rho0.toExponential(1) + ' \u03a9\u00b7m';
    egVal.textContent   = Eg.toFixed(2) + ' eV';
    render();
    presetSel.value = '';
  });

  render();
  window.addEventListener('resize', render);
}
