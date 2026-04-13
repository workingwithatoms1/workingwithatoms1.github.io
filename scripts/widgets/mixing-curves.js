/* ==========================================================================
   Mixing curves — ΔG_mix, ΔH_mix, -TΔS_mix for a regular solution
   Sliders for Omega and T.
   ========================================================================== */

import * as C from './chart-utils.js';

export function create(container) {
  const canvas = C.createWidgetShell(container);
  const ctx = canvas.getContext('2d');
  const R = 8.314;

  const controls = document.createElement('div');
  controls.className = 'widget-controls';
  controls.innerHTML = `
    <label class="widget-label">Ω (kJ/mol)</label>
    <input type="range" class="widget-slider" id="wOmega" min="-20" max="30" value="10" step="1">
    <span class="widget-value" id="wOmegaVal">10</span>
    <label class="widget-label">T (K)</label>
    <input type="range" class="widget-slider" id="wT" min="200" max="2000" value="800" step="50">
    <span class="widget-value" id="wTVal">800</span>
  `;
  container.appendChild(controls);
  const omSlider = controls.querySelector('#wOmega');
  const tSlider = controls.querySelector('#wT');
  const omVal = controls.querySelector('#wOmegaVal');
  const tVal = controls.querySelector('#wTVal');

  const pad = { l: 60, r: 20, t: 24, b: 50 };

  function render() {
    const { w, h } = C.setupCanvas(canvas, container);
    const Omega = parseInt(omSlider.value) * 1000;
    const T = parseInt(tSlider.value);
    omVal.textContent = (Omega / 1000).toFixed(0);
    tVal.textContent = T;

    const Hmix = x => Omega * x * (1 - x);
    const TSmix = x => {
      if (x <= 0.001 || x >= 0.999) return 0;
      return -T * R * (x * Math.log(x) + (1 - x) * Math.log(1 - x));
    };
    const Gmix = x => Hmix(x) - TSmix(x);

    // Find range
    let yMin = 0, yMax = 0;
    for (let x = 0.01; x < 1; x += 0.01) {
      for (const v of [Hmix(x), -TSmix(x), Gmix(x)]) {
        if (v < yMin) yMin = v;
        if (v > yMax) yMax = v;
      }
    }
    const margin = Math.max((yMax - yMin) * 0.15, 500);

    const xScale = C.scale(0, 1, pad.l, w - pad.r);
    const yScale = C.scale(yMin - margin, yMax + margin, h - pad.b, pad.t);

    C.drawAxes(ctx, pad, w, h, 'x_B', 'Energy (J/mol)');
    C.dashedHLine(ctx, yScale(0), pad.l, w - pad.r);

    // ΔH_mix
    const hPts = C.sampleCurve(xScale, yScale, Hmix);
    C.strokeCurve(ctx, hPts, C.RED, 1.5);

    // -TΔS_mix (plotted as negative so ΔG = ΔH + this)
    const sPts = C.sampleCurve(xScale, yScale, x => -TSmix(x));
    C.strokeCurve(ctx, sPts, C.LIGHT, 1.5);

    // ΔG_mix
    const gPts = C.sampleCurve(xScale, yScale, Gmix);
    C.strokeCurve(ctx, gPts, C.BLUE, 2.5);

    // Legend
    const lx = pad.l + 12, ly = pad.t + 10;
    ctx.font = C.LABEL_FONT;
    const labels = [
      { text: 'ΔG_mix', color: C.BLUE },
      { text: 'ΔH_mix', color: C.RED },
      { text: '−TΔS_mix', color: C.LIGHT },
    ];
    labels.forEach((l, i) => {
      ctx.strokeStyle = l.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(lx, ly + i * 16);
      ctx.lineTo(lx + 20, ly + i * 16);
      ctx.stroke();
      ctx.fillStyle = l.color;
      ctx.textAlign = 'left';
      ctx.fillText(l.text, lx + 26, ly + i * 16 + 4);
    });
  }

  omSlider.addEventListener('input', render);
  tSlider.addEventListener('input', render);
  render();
  window.addEventListener('resize', render);
}
