/* ==========================================================================
   Activity plot — Raoult's law, Henry's law, and real behaviour
   Slider for interaction parameter to show positive/negative deviation.
   ========================================================================== */

import * as C from './chart-utils.js';

export function create(container) {
  const canvas = C.createWidgetShell(container);
  const ctx = canvas.getContext('2d');

  const controls = document.createElement('div');
  controls.className = 'widget-controls';
  controls.innerHTML = `
    <label class="widget-label">Ω/RT</label>
    <input type="range" class="widget-slider" min="-30" max="30" value="15" step="1">
    <span class="widget-value">1.50</span>
  `;
  container.appendChild(controls);
  const slider = controls.querySelector('input');
  const valSpan = controls.querySelector('.widget-value');

  const pad = { l: 52, r: 20, t: 24, b: 44 };

  function render() {
    const { w, h } = C.setupCanvas(canvas, container);
    const omegaRT = parseInt(slider.value) / 10;
    valSpan.textContent = omegaRT.toFixed(1);

    const xScale = C.scale(0, 1, pad.l, w - pad.r);
    const yScale = C.scale(0, Math.max(2.5, Math.exp(omegaRT * 0.25) * 1.2), h - pad.b, pad.t);

    C.drawAxes(ctx, pad, w, h, 'x_B', 'a_B');

    // Raoult's law (diagonal)
    const raoult = C.sampleCurve(xScale, yScale, x => x);
    C.strokeCurve(ctx, raoult, C.MUTED, 1);
    ctx.font = C.TICK_FONT;
    ctx.fillStyle = C.MUTED;
    ctx.textAlign = 'left';
    ctx.fillText("Raoult's law", xScale(0.55), yScale(0.55) - 8);

    // Real activity: a = x * gamma, where ln(gamma) = Omega/RT * (1-x)^2 (one-suffix Margules)
    const realPts = C.sampleCurve(xScale, yScale, x => {
      if (x <= 0.001) return 0;
      const lnGamma = omegaRT * (1 - x) * (1 - x);
      return x * Math.exp(lnGamma);
    }, 200);
    C.strokeCurve(ctx, realPts, C.BLUE, 2);

    // Henry's law tangent (slope = gamma at infinite dilution)
    const gammaInf = Math.exp(omegaRT);
    const henryPts = C.sampleCurve(xScale, yScale, x => gammaInf * x);
    // Only draw up to where it's relevant
    const henryClipped = henryPts.filter(p => p.vy <= yScale.domain[1] && p.vx <= 0.4);
    ctx.setLineDash([6, 4]);
    C.strokeCurve(ctx, henryClipped, C.LIGHT, 1.5);
    ctx.setLineDash([]);
    ctx.font = C.TICK_FONT;
    ctx.fillStyle = C.LIGHT;
    ctx.textAlign = 'left';
    if (henryClipped.length > 5) {
      const lbl = henryClipped[Math.min(henryClipped.length - 1, Math.floor(henryClipped.length * 0.6))];
      ctx.fillText("Henry's law", lbl.x + 4, lbl.y - 8);
    }

    // Labels
    ctx.font = C.LABEL_FONT;
    ctx.fillStyle = C.BLUE;
    ctx.textAlign = 'right';
    const lastPt = realPts[realPts.length - 2];
    if (lastPt) ctx.fillText('Real', lastPt.x - 4, lastPt.y - 6);

    // Deviation label
    ctx.font = C.TITLE_FONT;
    ctx.fillStyle = C.DARK;
    ctx.textAlign = 'right';
    const label = omegaRT > 0.1 ? 'Positive deviation (γ > 1)' :
                  omegaRT < -0.1 ? 'Negative deviation (γ < 1)' : 'Ideal (γ = 1)';
    ctx.fillText(label, w - pad.r, pad.t + 14);
  }

  slider.addEventListener('input', render);
  render();
  window.addEventListener('resize', render);
}
