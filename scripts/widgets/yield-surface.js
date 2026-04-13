/* ==========================================================================
   Yield Surface widget — von Mises ellipse & Tresca hexagon
   Plane stress (sigma_3 = 0) in principal stress space (sigma_1 vs sigma_2).

   Von Mises:  sigma_1^2 - sigma_1*sigma_2 + sigma_2^2 = sigma_y^2
   Tresca:     max(|sigma_1 - sigma_2|, |sigma_1|, |sigma_2|) = sigma_y

   Slider: sigma_y (yield stress, 100-1000 MPa)
   ========================================================================== */

import * as C from './chart-utils.js';

export function create(container) {
  const canvas = C.createWidgetShell(container, 0.6);

  /* ---- Controls ---- */
  const controls = document.createElement('div');
  controls.style.cssText =
    'padding: 8px 16px; display: flex; flex-wrap: wrap; gap: 12px; ' +
    'align-items: center; font-family: "DM Sans", sans-serif; ' +
    'font-size: 12px; color: #3a3d5a;';
  controls.innerHTML = `
    <label style="display:flex;align-items:center;gap:6px;">
      \u03c3\u1d67 <input type="range" min="100" max="1000" value="300" step="10" id="ys-sy"
              style="width:140px;accent-color:#2a2f7c;">
      <span id="ys-sy-val" style="min-width:70px;">300 MPa</span>
    </label>
  `;
  container.appendChild(controls);

  const sySlider = controls.querySelector('#ys-sy');
  const syVal    = controls.querySelector('#ys-sy-val');

  const pad = { l: 60, r: 20, t: 20, b: 50 };

  /* ---- Render ---- */
  function render() {
    const { ctx, w, h } = C.setupCanvas(canvas, container, 0.6);

    const sigmaY = parseFloat(sySlider.value);
    syVal.textContent = sigmaY + ' MPa';

    /* ---- Equal-scale axes: both axes span -1200 to 1200 MPa in data,
       but we adjust so 1 MPa = same pixels in both directions ---- */
    const plotW = w - pad.l - pad.r;
    const plotH = h - pad.t - pad.b;
    const dataRange = 1200; // half-range in MPa
    const pxPerMPa = Math.min(plotW, plotH) / (2 * dataRange);

    const xHalfData = plotW / (2 * pxPerMPa);
    const yHalfData = plotH / (2 * pxPerMPa);

    const xS = C.scale(-xHalfData, xHalfData, pad.l, w - pad.r);
    const yS = C.scale(-yHalfData, yHalfData, h - pad.b, pad.t);

    /* ---- Background axes (L-shaped frame) ---- */
    C.drawAxes(ctx, pad, w, h, '\u03c3\u2081 (MPa)', '\u03c3\u2082 (MPa)');

    /* ---- Grid lines through origin ---- */
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

    const tickStep = 400;

    /* x-axis ticks */
    ctx.textAlign = 'center';
    for (let v = -1200; v <= 1200; v += tickStep) {
      if (v === 0) continue;
      const px = xS(v);
      if (px < pad.l + 10 || px > w - pad.r - 10) continue;
      ctx.fillText(String(v), px, h - pad.b + 14);
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
    for (let v = -1200; v <= 1200; v += tickStep) {
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
    ctx.rect(pad.l, pad.t, plotW, plotH);
    ctx.clip();

    /* ---- Tresca hexagon ----
       Vertices: (sy,0), (sy,sy), (0,sy), (-sy,0), (-sy,-sy), (0,-sy) */
    const trescaVerts = [
      [sigmaY, 0],
      [sigmaY, sigmaY],
      [0, sigmaY],
      [-sigmaY, 0],
      [-sigmaY, -sigmaY],
      [0, -sigmaY],
    ];

    /* Fill Tresca (use FILL_RED for distinction) */
    ctx.fillStyle = C.FILL_RED;
    ctx.beginPath();
    ctx.moveTo(xS(trescaVerts[0][0]), yS(trescaVerts[0][1]));
    for (let i = 1; i < trescaVerts.length; i++) {
      ctx.lineTo(xS(trescaVerts[i][0]), yS(trescaVerts[i][1]));
    }
    ctx.closePath();
    ctx.fill();

    /* Stroke Tresca */
    ctx.strokeStyle = C.RED;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(xS(trescaVerts[0][0]), yS(trescaVerts[0][1]));
    for (let i = 1; i < trescaVerts.length; i++) {
      ctx.lineTo(xS(trescaVerts[i][0]), yS(trescaVerts[i][1]));
    }
    ctx.closePath();
    ctx.stroke();

    /* ---- Von Mises ellipse ----
       Parametric form for sigma_1^2 - sigma_1*sigma_2 + sigma_2^2 = sigma_y^2:
       Diagonalise the quadratic form: eigenvalues 3/2, 1/2 with eigenvectors
       along (1,-1) and (1,1).  In rotated coords u,v the ellipse is
       (3/2)u^2 + (1/2)v^2 = sy^2.  Back-transforming gives:
         sigma_1 = sigma_y * (cos(t)/sqrt(3) + sin(t))
         sigma_2 = sigma_y * (-cos(t)/sqrt(3) + sin(t))
       Verify: 3*(cos/sqrt3)^2 + sin^2 = cos^2 + sin^2 = 1.  Correct. */
    const N = 360;
    const invSqrt3 = 1 / Math.sqrt(3);
    const vmPts = [];
    for (let i = 0; i <= N; i++) {
      const theta = (2 * Math.PI * i) / N;
      const cosT = Math.cos(theta);
      const sinT = Math.sin(theta);
      const s1 = sigmaY * (cosT * invSqrt3 + sinT);
      const s2 = sigmaY * (-cosT * invSqrt3 + sinT);
      vmPts.push({ x: xS(s1), y: yS(s2) });
    }

    /* Fill von Mises */
    ctx.fillStyle = C.FILL_BLUE;
    ctx.beginPath();
    ctx.moveTo(vmPts[0].x, vmPts[0].y);
    for (let i = 1; i < vmPts.length; i++) {
      ctx.lineTo(vmPts[i].x, vmPts[i].y);
    }
    ctx.closePath();
    ctx.fill();

    /* Stroke von Mises */
    ctx.strokeStyle = C.BLUE;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(vmPts[0].x, vmPts[0].y);
    for (let i = 1; i < vmPts.length; i++) {
      ctx.lineTo(vmPts[i].x, vmPts[i].y);
    }
    ctx.closePath();
    ctx.stroke();

    /* Restore clip */
    ctx.restore();

    /* ---- Legend ---- */
    ctx.font = C.LABEL_FONT;
    const legendX = pad.l + 10;
    const legendY = pad.t + 14;

    ctx.fillStyle = C.BLUE;
    ctx.textAlign = 'left';
    ctx.fillText('\u2014 von Mises', legendX, legendY);

    ctx.fillStyle = C.RED;
    ctx.fillText('\u2014 Tresca', legendX, legendY + 16);

  }

  /* ---- Event wiring ---- */
  sySlider.addEventListener('input', render);

  render();
  window.addEventListener('resize', render);
}
