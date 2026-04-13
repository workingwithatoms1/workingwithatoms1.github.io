/* ==========================================================================
   Mohr's Circle widget — 2D stress state
   Sliders for sigma_x, sigma_y, tau_xy. Shows Mohr's circle with principal
   stresses, max shear, and stress points connected through the centre.
   ========================================================================== */

import * as C from './chart-utils.js';

export function create(container) {
  const canvas = C.createWidgetShell(container, 0.55);

  /* ---- Controls ---- */
  const controls = document.createElement('div');
  controls.style.cssText =
    'padding: 8px 16px; display: flex; flex-wrap: wrap; gap: 12px; ' +
    'align-items: center; font-family: "DM Sans", sans-serif; ' +
    'font-size: 12px; color: #3a3d5a;';
  controls.innerHTML = `
    <label style="display:flex;align-items:center;gap:6px;">
      \u03c3\u2093 <input type="range" min="-500" max="500" value="200" step="5" id="mc-sx"
              style="width:100px;accent-color:#2a2f7c;">
      <span id="mc-sx-val" style="min-width:62px;">200 MPa</span>
    </label>
    <label style="display:flex;align-items:center;gap:6px;">
      \u03c3\u1d67 <input type="range" min="-500" max="500" value="-100" step="5" id="mc-sy"
              style="width:100px;accent-color:#2a2f7c;">
      <span id="mc-sy-val" style="min-width:62px;">\u2212100 MPa</span>
    </label>
    <label style="display:flex;align-items:center;gap:6px;">
      \u03c4\u2093\u1d67 <input type="range" min="-300" max="300" value="80" step="5" id="mc-txy"
              style="width:100px;accent-color:#2a2f7c;">
      <span id="mc-txy-val" style="min-width:56px;">80 MPa</span>
    </label>
  `;
  container.appendChild(controls);

  const sxSlider  = controls.querySelector('#mc-sx');
  const sySlider  = controls.querySelector('#mc-sy');
  const txySlider = controls.querySelector('#mc-txy');
  const sxVal     = controls.querySelector('#mc-sx-val');
  const syVal     = controls.querySelector('#mc-sy-val');
  const txyVal    = controls.querySelector('#mc-txy-val');

  const pad = { l: 60, r: 20, t: 20, b: 50 };

  /* ---- Render ---- */
  function render() {
    const { ctx, w, h } = C.setupCanvas(canvas, container, 0.55);

    /* Read slider values */
    const sx  = parseFloat(sxSlider.value);
    const sy  = parseFloat(sySlider.value);
    const txy = parseFloat(txySlider.value);

    /* Update readouts */
    sxVal.textContent  = fmtMPa(sx);
    syVal.textContent  = fmtMPa(sy);
    txyVal.textContent = fmtMPa(txy);

    /* Mohr's circle calculations */
    const centre = (sx + sy) / 2;
    const radius = Math.sqrt(((sx - sy) / 2) ** 2 + txy ** 2);
    const s1 = centre + radius;   // sigma_1
    const s2 = centre - radius;   // sigma_2
    const tauMax = radius;
    const thetaP = 0.5 * Math.atan2(2 * txy, sx - sy);  // radians

    /* Equal-scale axes so the circle is actually circular */
    const range = 600;
    const plotW = w - pad.l - pad.r;
    const plotH = h - pad.t - pad.b;
    const aspect = plotW / plotH;
    const xRange = aspect >= 1 ? range : range * aspect;
    const yRange = aspect >= 1 ? range / aspect : range;
    const xS = C.scale(-xRange, xRange, pad.l, w - pad.r);
    const yS = C.scale(-yRange, yRange, h - pad.b, pad.t);

    /* ---- Axes ---- */
    C.drawAxes(ctx, pad, w, h, '\u03c3 (MPa)', '\u03c4 (MPa)');

    /* Grid lines through origin */
    ctx.strokeStyle = 'rgba(0,0,0,0.12)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(pad.l, yS(0));
    ctx.lineTo(w - pad.r, yS(0));
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(xS(0), pad.t);
    ctx.lineTo(xS(0), h - pad.b);
    ctx.stroke();

    /* ---- Tick marks ---- */
    ctx.font = C.TICK_FONT;
    ctx.fillStyle = C.MUTED;

    /* x-axis ticks */
    ctx.textAlign = 'center';
    for (let v = -400; v <= 400; v += 200) {
      if (v === 0) continue;
      const px = xS(v);
      if (px < pad.l + 10 || px > w - pad.r - 10) continue;
      ctx.fillText(String(v), px, h - pad.b + 14);
      /* small tick mark */
      ctx.strokeStyle = C.MUTED;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(px, h - pad.b);
      ctx.lineTo(px, h - pad.b + 4);
      ctx.stroke();
    }
    ctx.fillText('0', xS(0) - 10, h - pad.b + 14);

    /* y-axis ticks */
    ctx.textAlign = 'right';
    for (let v = -300; v <= 300; v += 150) {
      if (v === 0) continue;
      const py = yS(v);
      if (py < pad.t + 5 || py > h - pad.b - 5) continue;
      ctx.fillText(String(v), pad.l - 6, py + 4);
      ctx.strokeStyle = C.MUTED;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(pad.l - 3, py);
      ctx.lineTo(pad.l, py);
      ctx.stroke();
    }

    /* ---- Clip to plot area ---- */
    ctx.save();
    ctx.beginPath();
    ctx.rect(pad.l, pad.t, w - pad.l - pad.r, h - pad.t - pad.b);
    ctx.clip();

    /* ---- Draw the circle ---- */
    const cx = xS(centre);
    const cy = yS(0);
    /* Convert radius from data to pixel space (x direction) */
    const rPx = Math.abs(xS(centre + radius) - xS(centre));

    /* Filled circle (subtle) */
    ctx.fillStyle = C.FILL_BLUE;
    ctx.beginPath();
    ctx.arc(cx, cy, rPx, 0, Math.PI * 2);
    ctx.fill();

    /* Circle outline */
    ctx.strokeStyle = C.BLUE;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, rPx, 0, Math.PI * 2);
    ctx.stroke();

    /* ---- Stress points and connecting line ---- */
    /* Point X: (sigma_x, tau_xy)   Point Y: (sigma_y, -tau_xy) */
    const pxX = xS(sx);
    const pyX = yS(txy);
    const pxY = xS(sy);
    const pyY = yS(-txy);

    /* Connecting line through centre */
    ctx.strokeStyle = C.RED;
    ctx.lineWidth = 1.2;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(pxX, pyX);
    ctx.lineTo(pxY, pyY);
    ctx.stroke();
    ctx.setLineDash([]);

    /* Stress point dots */
    C.drawDot(ctx, pxX, pyX, 4.5, C.RED);
    C.drawDot(ctx, pxY, pyY, 4.5, C.RED);

    /* Labels for stress points */
    ctx.font = C.TICK_FONT;
    ctx.fillStyle = C.RED;
    ctx.textAlign = 'left';
    ctx.fillText('(\u03c3\u2093, \u03c4\u2093\u1d67)', pxX + 7, pyX - 4);
    ctx.fillText('(\u03c3\u1d67, \u2212\u03c4\u2093\u1d67)', pxY + 7, pyY + 12);

    /* ---- Mark principal stresses on the sigma axis ---- */
    C.drawDot(ctx, xS(s1), yS(0), 5, C.BLUE);
    C.drawDot(ctx, xS(s2), yS(0), 5, C.BLUE);

    /* Mark tau_max at top and bottom of circle */
    C.drawDot(ctx, cx, yS(tauMax), 4, C.LIGHT);
    C.drawDot(ctx, cx, yS(-tauMax), 4, C.LIGHT);

    /* ---- Centre dot ---- */
    C.drawDot(ctx, cx, cy, 3, C.MUTED);

    /* ---- 2θ arc from stress point X to σ₁ ---- */
    if (radius > 5) {
      // Angle of the X stress point from centre
      const angleX = Math.atan2(-(txy), sx - centre); // negative because y-axis is inverted on Mohr
      const angle1 = 0; // σ₁ is on the positive σ axis from centre
      const arcR = rPx * 0.35; // draw arc at 35% of circle radius for clarity

      ctx.strokeStyle = C.RED;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      // Draw from σ₁ direction to the X point direction (2θ_p on the circle = θ_p in real space)
      ctx.arc(cx, cy, arcR, angle1, angleX, angleX < 0);
      ctx.stroke();
      ctx.setLineDash([]);

      // Label 2θ at the midpoint of the arc
      const midAngle = (angle1 + angleX) / 2;
      const labelR = arcR + 12;
      ctx.font = '500 11px "DM Sans", sans-serif';
      ctx.fillStyle = C.RED;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('2\u03b8\u209a', cx + labelR * Math.cos(midAngle), cy + labelR * Math.sin(midAngle));
    }

    /* Restore clip */
    ctx.restore();

    /* ---- Labels for key values ---- */
    ctx.font = C.TICK_FONT;

    /* sigma_1 label */
    ctx.fillStyle = C.BLUE;
    ctx.textAlign = 'center';
    const s1px = xS(s1);
    if (s1px < w - pad.r - 5) {
      ctx.fillText('\u03c3\u2081 = ' + fmtVal(s1), clampX(s1px, pad, w), yS(0) + 16);
    }

    /* sigma_2 label */
    const s2px = xS(s2);
    if (s2px > pad.l + 5) {
      ctx.fillText('\u03c3\u2082 = ' + fmtVal(s2), clampX(s2px, pad, w), yS(0) + 16);
    }

    /* tau_max label */
    ctx.fillStyle = C.LIGHT;
    ctx.textAlign = 'left';
    const tMaxPx = yS(tauMax);
    if (tMaxPx > pad.t + 10) {
      ctx.fillText('\u03c4\u2098\u2090\u2093 = ' + fmtVal(tauMax), cx + 6, tMaxPx - 6);
    }

    /* Centre label */
    ctx.fillStyle = C.MUTED;
    ctx.textAlign = 'center';
    ctx.fillText('C = ' + fmtVal(centre), cx, yS(0) - 8);

    /* ---- Principal angle annotation ---- */
    ctx.font = C.TICK_FONT;
    ctx.fillStyle = C.DARK;
    ctx.textAlign = 'left';
    const thetaDeg = (thetaP * 180 / Math.PI).toFixed(1);
    ctx.fillText('\u03b8\u209a = ' + thetaDeg + '\u00b0', pad.l + 6, pad.t + 14);

    /* ---- Equation summary ---- */
    ctx.font = C.LABEL_FONT;
    ctx.fillStyle = C.MUTED;
    ctx.textAlign = 'left';
    ctx.fillText(
      'C = (\u03c3\u2093+\u03c3\u1d67)/2    R = \u221a[(\u0394\u03c3/2)\u00b2 + \u03c4\u00b2]    \u03c3\u2081,\u2082 = C \u00b1 R',
      pad.l + 6, h - pad.b - 22
    );
  }

  /* ---- Helpers ---- */

  function fmtMPa(v) {
    return (v < 0 ? '\u2212' : '') + Math.abs(v) + ' MPa';
  }

  function fmtVal(v) {
    return (v < 0 ? '\u2212' : '') + Math.abs(v).toFixed(0);
  }

  function clampX(px, pad, w) {
    return Math.max(pad.l + 20, Math.min(w - pad.r - 20, px));
  }

  /* ---- Event wiring ---- */
  sxSlider.addEventListener('input', render);
  sySlider.addEventListener('input', render);
  txySlider.addEventListener('input', render);

  render();
  window.addEventListener('resize', render);
}
