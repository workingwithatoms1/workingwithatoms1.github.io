/* ==========================================================================
   Avrami (JMAK) transformation curve widget
   Interactive plot of f(t) = 1 - exp(-(k*t)^n) with sliders for n and k.
   Marks t_50 with a dashed crosshair and explains the Avrami exponent.
   ========================================================================== */

import * as C from './chart-utils.js';

export function create(container) {
  const canvas = C.createWidgetShell(container, 0.55);

  // Controls: n slider, k slider, readout, callout
  const controls = document.createElement('div');
  controls.style.cssText = 'padding: 8px 16px 4px; display: flex; flex-wrap: wrap; gap: 12px; align-items: center; font-family: "DM Sans", sans-serif; font-size: 12px; color: #3a3d5a;';
  controls.innerHTML = `
    <label style="display:flex;align-items:center;gap:6px;">
      <span style="font-weight:500;">n</span>
      <input type="range" min="10" max="40" value="30" step="1" id="av-n" style="width:110px;accent-color:#2a2f7c;">
      <span id="av-n-val" style="min-width:32px;">3.0</span>
    </label>
    <label style="display:flex;align-items:center;gap:6px;">
      <span style="font-weight:500;">k</span>
      <input type="range" min="1" max="50" value="10" step="1" id="av-k" style="width:110px;accent-color:#2a2f7c;">
      <span id="av-k-val" style="min-width:44px;">0.10</span>
    </label>
  `;
  container.appendChild(controls);

  const callout = document.createElement('div');
  callout.style.cssText = 'padding: 2px 16px 10px; font-family: "DM Sans", sans-serif; font-size: 11px; color: #666; line-height: 1.5;';
  callout.innerHTML =
    '<span style="font-weight:500;color:#3a3d5a;">Avrami exponent n:</span> ' +
    'n \u2248 1 (1D growth) &middot; n \u2248 2 (2D growth) &middot; ' +
    'n \u2248 3 (3D growth, fixed nuclei) &middot; n \u2248 4 (3D growth + continuous nucleation)';
  container.appendChild(callout);

  const nSlider = controls.querySelector('#av-n');
  const kSlider = controls.querySelector('#av-k');
  const nVal    = controls.querySelector('#av-n-val');
  const kVal    = controls.querySelector('#av-k-val');

  const pad = { l: 60, r: 20, t: 24, b: 50 };

  function render() {
    const { ctx, w, h } = C.setupCanvas(canvas, container, 0.55);

    const n = parseInt(nSlider.value) / 10;
    const k = parseInt(kSlider.value) / 100;
    nVal.textContent = n.toFixed(1);
    kVal.textContent = k.toFixed(2);

    // Avrami equation
    function f(t) {
      return 1 - Math.exp(-Math.pow(k * t, n));
    }

    // Fixed time axis — curve reshapes, axes stay put
    const tMin = 0;
    const tMax = 100;

    const xS = C.scale(tMin, tMax, pad.l, w - pad.r);
    const yS = C.scale(0, 1.05, h - pad.b, pad.t);

    // Axes
    C.drawAxes(ctx, pad, w, h, 'Time (a.u.)', 'Fraction transformed, f');

    // Horizontal guide at f = 1
    C.dashedHLine(ctx, yS(1), pad.l, w - pad.r, 'rgba(0,0,0,0.08)');

    // The S-shaped curve
    const pts = C.sampleCurve(xS, yS, f, 200);
    C.fillUnder(ctx, pts, yS(0), C.FILL_BLUE);
    C.strokeCurve(ctx, pts, C.BLUE, 2.5);

    // t_50: time at which f = 0.5 => (k*t)^n = ln(2) => t = (ln2)^(1/n) / k
    const t50 = Math.pow(Math.LN2, 1 / n) / k;
    const t50x = xS(t50);
    const t50y = yS(0.5);

    // Dashed crosshair at t_50
    C.dashedVLine(ctx, t50x, yS(0), t50y, C.RED);
    C.dashedHLine(ctx, t50y, pad.l, t50x, C.RED);
    C.drawDot(ctx, t50x, t50y, 5, C.RED);

    // t_50 label
    ctx.font = C.VALUE_FONT;
    ctx.fillStyle = C.RED;
    ctx.textAlign = 'left';
    ctx.fillText('t\u2085\u2080 = ' + t50.toFixed(1), t50x + 8, t50y - 8);

    // y = 0.5 label on left axis
    ctx.font = C.TICK_FONT;
    ctx.fillStyle = C.RED;
    ctx.textAlign = 'right';
    ctx.fillText('0.5', pad.l - 6, t50y + 4);

    // Parameter readout on chart
    ctx.font = C.TITLE_FONT;
    ctx.fillStyle = C.DARK;
    ctx.textAlign = 'right';
    ctx.fillText('n = ' + n.toFixed(1) + ',  k = ' + k.toFixed(2), w - pad.r, pad.t + 14);

    // X-axis ticks
    ctx.font = C.TICK_FONT;
    ctx.fillStyle = C.MUTED;
    ctx.textAlign = 'center';
    const nXTicks = 5;
    for (let i = 0; i <= nXTicks; i++) {
      const t = tMin + (tMax - tMin) * i / nXTicks;
      const tx = xS(t);
      ctx.fillText(t.toFixed(0), tx, h - pad.b + 14);
      // Small tick mark
      ctx.strokeStyle = C.MUTED;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(tx, h - pad.b);
      ctx.lineTo(tx, h - pad.b + 4);
      ctx.stroke();
    }

    // Y-axis ticks
    ctx.textAlign = 'right';
    for (let v = 0; v <= 1; v += 0.2) {
      const yy = yS(v);
      ctx.fillStyle = C.MUTED;
      ctx.fillText(v.toFixed(1), pad.l - 6, yy + 4);
      ctx.strokeStyle = C.MUTED;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(pad.l - 3, yy);
      ctx.lineTo(pad.l, yy);
      ctx.stroke();
    }
  }

  nSlider.addEventListener('input', render);
  kSlider.addEventListener('input', render);
  render();
  window.addEventListener('resize', render);
}
