/* ==========================================================================
   G vs T — phase stability diagram
   Shows solid and liquid free energy curves crossing at the melting point.
   Draggable temperature marker.
   ========================================================================== */

import * as C from './chart-utils.js';

export function create(container, config) {
  const canvas = C.createWidgetShell(container);
  const ctx = canvas.getContext('2d');

  const Tm = config.Tm || 933;  // melting point (Al default)
  const dH = config.dH || 10700; // enthalpy of fusion J/mol
  const dS = dH / Tm;           // entropy of fusion
  const metal = config.metal || 'Al';

  const controls = document.createElement('div');
  controls.className = 'widget-controls';
  controls.innerHTML = `
    <label class="widget-label">Temperature</label>
    <input type="range" class="widget-slider" min="600" max="1200" value="${Tm}" step="5">
    <span class="widget-value">${Tm} K</span>
    <span class="widget-label" id="wPhase" style="margin-left:auto">At T<sub>m</sub>: coexistence</span>
  `;
  container.appendChild(controls);
  const slider = controls.querySelector('input');
  const valSpan = controls.querySelector('.widget-value');
  const phaseSpan = controls.querySelector('#wPhase');

  const pad = { l: 52, r: 20, t: 24, b: 44 };

  // G_solid(T) = 0 (reference), G_liquid(T) = dH - T*dS (relative to solid)
  // Both decrease with T but liquid has steeper slope
  // For absolute-looking curves: G_solid = -S_solid * T, G_liquid = dH - S_liquid * T
  const Ss = 28.3;  // approximate molar entropy of Al solid
  const Sl = Ss + dS;

  function render() {
    const { w, h } = C.setupCanvas(canvas, container);
    const T = parseInt(slider.value);
    valSpan.textContent = T + ' K';

    const Tmin = 600, Tmax = 1200;
    const Gmin = -Sl * Tmax - 5000;
    const Gmax = -Ss * Tmin + 5000;

    const xS = C.scale(Tmin, Tmax, pad.l, w - pad.r);
    const yS = C.scale(Gmin, Gmax, h - pad.b, pad.t);

    C.drawAxes(ctx, pad, w, h, 'T (K)', 'G (J/mol)');

    // Solid curve: G = -Ss * T + const (shifted so they cross at Tm)
    const Gref = -Ss * Tm;
    const solidPts = C.sampleCurve(xS, yS, t => -Ss * t - Gref + (-Ss * Tm), 100);
    const liquidPts = C.sampleCurve(xS, yS, t => dH - Sl * t - Gref + (-Ss * Tm), 100);

    // Simpler: plot relative to a common reference
    const gSolid = t => -Ss * t;
    const gLiquid = t => dH - Sl * t;

    const yMin = Math.min(gSolid(Tmax), gLiquid(Tmax)) - 2000;
    const yMax = Math.max(gSolid(Tmin), gLiquid(Tmin)) + 2000;
    const yScale = C.scale(yMin, yMax, h - pad.b, pad.t);
    const xScale = C.scale(Tmin, Tmax, pad.l, w - pad.r);

    // Redraw axes with correct scale
    ctx.clearRect(0, 0, w, h);
    C.drawAxes(ctx, pad, w, h, 'T (K)', 'G (J/mol)');

    const sPts = C.sampleCurve(xScale, yScale, gSolid);
    const lPts = C.sampleCurve(xScale, yScale, gLiquid);

    C.strokeCurve(ctx, sPts, C.BLUE, 2);
    C.strokeCurve(ctx, lPts, C.LIGHT, 2);

    // Labels on curves
    ctx.font = C.LABEL_FONT;
    ctx.fillStyle = C.BLUE;
    ctx.textAlign = 'left';
    ctx.fillText('Solid', xScale(Tmin) + 8, yScale(gSolid(Tmin)) - 8);
    ctx.fillStyle = C.LIGHT;
    ctx.fillText('Liquid', xScale(Tmin) + 8, yScale(gLiquid(Tmin)) - 8);

    // Melting point marker
    C.dashedVLine(ctx, xScale(Tm), yScale(yMax), yScale(yMin));
    ctx.font = C.TICK_FONT;
    ctx.fillStyle = C.MUTED;
    ctx.textAlign = 'center';
    ctx.fillText('T_m = ' + Tm + ' K', xScale(Tm), yScale(yMin) + 14);

    // Current temperature line
    const Tx = xScale(T);
    ctx.strokeStyle = C.DARK;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(Tx, yScale(yMax));
    ctx.lineTo(Tx, yScale(yMin));
    ctx.stroke();

    // Dots on both curves at current T
    const gsT = gSolid(T);
    const glT = gLiquid(T);
    C.drawDot(ctx, Tx, yScale(gsT), 5, C.BLUE);
    C.drawDot(ctx, Tx, yScale(glT), 5, C.LIGHT);

    // Highlight stable phase
    const dG = glT - gsT;
    if (T < Tm - 5) {
      phaseSpan.textContent = `Solid stable (ΔG = +${(dG).toFixed(0)} J/mol)`;
      phaseSpan.style.color = C.BLUE;
    } else if (T > Tm + 5) {
      phaseSpan.textContent = `Liquid stable (ΔG = ${(dG).toFixed(0)} J/mol)`;
      phaseSpan.style.color = C.LIGHT;
    } else {
      phaseSpan.textContent = 'At T_m: coexistence';
      phaseSpan.style.color = C.DARK;
    }

    // ΔG arrow between curves
    if (Math.abs(dG) > 100) {
      const yTop = Math.min(yScale(gsT), yScale(glT));
      const yBot = Math.max(yScale(gsT), yScale(glT));
      ctx.strokeStyle = 'rgba(42,47,124,0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(Tx + 8, yTop);
      ctx.lineTo(Tx + 8, yBot);
      ctx.stroke();
      ctx.font = C.TICK_FONT;
      ctx.fillStyle = C.DARK;
      ctx.textAlign = 'left';
      ctx.fillText('ΔG', Tx + 12, (yTop + yBot) / 2 + 4);
    }
  }

  slider.addEventListener('input', render);
  render();
  window.addEventListener('resize', render);
}
