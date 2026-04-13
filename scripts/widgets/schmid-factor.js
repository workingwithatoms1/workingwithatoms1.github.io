/* ==========================================================================
   Schmid factor widget — resolved shear stress on a slip system

   m = cos(phi) * cos(lambda)
   tau = sigma * m

   phi   = angle between tensile axis and slip-plane normal
   lambda = angle between tensile axis and slip direction

   Geometrically phi + lambda >= 90 degrees.
   Maximum Schmid factor is 0.5 (at phi = lambda = 45 degrees).

   Left half: schematic of a crystal with tensile axis, slip plane, slip
   direction, and the two angle arcs.
   Right half: large readout of m, horizontal bar gauge 0 to 0.5.
   ========================================================================== */

import * as C from './chart-utils.js';

export function create(container) {
  const canvas = C.createWidgetShell(container, 0.5);

  /* ---- Controls ---- */
  const controls = document.createElement('div');
  controls.style.cssText =
    'padding: 8px 16px; display: flex; flex-wrap: wrap; gap: 12px; ' +
    'align-items: center; font-family: "DM Sans", sans-serif; ' +
    'font-size: 12px; color: #3a3d5a;';
  controls.innerHTML = `
    <label style="display:flex;align-items:center;gap:6px;">
      \u03c6 <input type="range" min="0" max="90" value="45" step="1" id="sf-phi"
              style="width:110px;accent-color:#2a2f7c;">
      <span id="sf-phi-val" style="min-width:36px;">45\u00b0</span>
    </label>
    <label style="display:flex;align-items:center;gap:6px;">
      \u03bb <input type="range" min="0" max="90" value="45" step="1" id="sf-lam"
              style="width:110px;accent-color:#2a2f7c;">
      <span id="sf-lam-val" style="min-width:36px;">45\u00b0</span>
    </label>
  `;
  container.appendChild(controls);

  const phiSlider = controls.querySelector('#sf-phi');
  const lamSlider = controls.querySelector('#sf-lam');
  const phiVal    = controls.querySelector('#sf-phi-val');
  const lamVal    = controls.querySelector('#sf-lam-val');

  const pad = { l: 20, r: 20, t: 20, b: 50 };

  /* ---- Render ---- */
  function render() {
    const { ctx, w, h } = C.setupCanvas(canvas, container, 0.5);

    let phiDeg = parseFloat(phiSlider.value);
    let lamDeg = parseFloat(lamSlider.value);

    /* Clamp: phi + lambda must be >= 90 */
    let impossible = false;
    if (phiDeg + lamDeg < 90) {
      impossible = true;
      /* Clamp lambda upward so the constraint holds */
      lamDeg = 90 - phiDeg;
      lamSlider.value = lamDeg;
    }

    phiVal.textContent = phiDeg + '\u00b0';
    lamVal.textContent = lamDeg + '\u00b0';

    const phiRad = phiDeg * Math.PI / 180;
    const lamRad = lamDeg * Math.PI / 180;
    const m = Math.cos(phiRad) * Math.cos(lamRad);
    const mClamped = Math.max(0, m);

    /* ================================================================
       LEFT HALF — crystal schematic
       ================================================================ */
    const leftW = w / 2;
    const cx = pad.l + (leftW - pad.l) / 2;
    const cy = pad.t + (h - pad.t - pad.b) / 2;
    const plotH = h - pad.t - pad.b;
    const size = Math.min(leftW - pad.l - 10, plotH) * 0.38;

    /* Crystal rectangle (tilted slightly for visual interest — but we
       keep the tensile axis vertical for clarity) */
    const rectW = size * 1.1;
    const rectH = size * 1.7;
    ctx.strokeStyle = C.MUTED;
    ctx.lineWidth = 1.2;
    ctx.setLineDash([]);
    ctx.strokeRect(cx - rectW / 2, cy - rectH / 2, rectW, rectH);
    ctx.fillStyle = 'rgba(77, 92, 242, 0.04)';
    ctx.fillRect(cx - rectW / 2, cy - rectH / 2, rectW, rectH);

    /* ---- Tensile axis (vertical arrow, pointing up) ---- */
    const arrowLen = rectH / 2 + size * 0.45;

    ctx.strokeStyle = C.DARK;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy + arrowLen);
    ctx.lineTo(cx, cy - arrowLen);
    ctx.stroke();

    /* Arrowhead at top */
    drawArrowhead(ctx, cx, cy - arrowLen, -Math.PI / 2, 8, C.DARK);
    /* Arrowhead at bottom (pointing down = away) */
    drawArrowhead(ctx, cx, cy + arrowLen, Math.PI / 2, 8, C.DARK);

    /* Label: sigma */
    ctx.font = '500 13px "DM Sans", sans-serif';
    ctx.fillStyle = C.DARK;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('\u03c3', cx + 6, cy - arrowLen + 4);

    /* ---- Slip-plane normal (at angle phi from tensile axis) ---- */
    /* The tensile axis points up (-pi/2). The normal is phi away from it.
       We draw the normal going to the upper-right for phi > 0. */
    const normalAngle = -Math.PI / 2 + phiRad;  // angle from positive x
    const normalLen = size * 0.85;

    ctx.strokeStyle = C.RED;
    ctx.lineWidth = 1.8;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + normalLen * Math.cos(normalAngle),
               cy + normalLen * Math.sin(normalAngle));
    ctx.stroke();
    ctx.setLineDash([]);

    /* Arrowhead on normal */
    drawArrowhead(ctx,
      cx + normalLen * Math.cos(normalAngle),
      cy + normalLen * Math.sin(normalAngle),
      normalAngle, 7, C.RED);

    /* Label: n (slip plane normal) */
    ctx.font = '500 12px "DM Sans", sans-serif';
    ctx.fillStyle = C.RED;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('n', cx + (normalLen + 10) * Math.cos(normalAngle),
                      cy + (normalLen + 10) * Math.sin(normalAngle));

    /* ---- Slip-plane line (perpendicular to the normal, through centre) ---- */
    const planeAngle = normalAngle + Math.PI / 2;
    const planeHalfLen = size * 0.9;

    ctx.strokeStyle = 'rgba(139, 34, 82, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(cx - planeHalfLen * Math.cos(planeAngle),
               cy - planeHalfLen * Math.sin(planeAngle));
    ctx.lineTo(cx + planeHalfLen * Math.cos(planeAngle),
               cy + planeHalfLen * Math.sin(planeAngle));
    ctx.stroke();
    ctx.setLineDash([]);

    /* ---- Slip direction (at angle lambda from tensile axis, in the
       slip plane — so it lies on the plane) ---- */
    /* The slip direction is lambda away from the tensile axis, on the
       opposite side from the normal (to keep phi + lambda >= 90). */
    const slipAngle = -Math.PI / 2 - lamRad;
    const slipLen = size * 0.85;

    ctx.strokeStyle = C.BLUE;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + slipLen * Math.cos(slipAngle),
               cy + slipLen * Math.sin(slipAngle));
    ctx.stroke();

    /* Arrowhead on slip direction */
    drawArrowhead(ctx,
      cx + slipLen * Math.cos(slipAngle),
      cy + slipLen * Math.sin(slipAngle),
      slipAngle, 7, C.BLUE);

    /* Label: s (slip direction) */
    ctx.font = '500 12px "DM Sans", sans-serif';
    ctx.fillStyle = C.BLUE;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText('s', cx + (slipLen + 10) * Math.cos(slipAngle),
                      cy + (slipLen + 10) * Math.sin(slipAngle));

    /* ---- Arc for phi (tensile axis to normal) ---- */
    const arcR = size * 0.35;
    /* Canvas arc goes clockwise. Tensile axis is at -pi/2, normal at normalAngle.
       phi arc goes from tensile axis toward the normal. */
    drawAngleArc(ctx, cx, cy, arcR, -Math.PI / 2, normalAngle, phiDeg, C.RED);

    /* Label phi */
    const phiMid = (-Math.PI / 2 + normalAngle) / 2;
    ctx.font = '500 12px "DM Sans", sans-serif';
    ctx.fillStyle = C.RED;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('\u03c6', cx + (arcR + 14) * Math.cos(phiMid),
                           cy + (arcR + 14) * Math.sin(phiMid));

    /* ---- Arc for lambda (tensile axis to slip direction) ---- */
    const arcR2 = size * 0.45;
    drawAngleArc(ctx, cx, cy, arcR2, -Math.PI / 2, slipAngle, lamDeg, C.BLUE);

    /* Label lambda */
    const lamMid = (-Math.PI / 2 + slipAngle) / 2;
    ctx.font = '500 12px "DM Sans", sans-serif';
    ctx.fillStyle = C.BLUE;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('\u03bb', cx + (arcR2 + 14) * Math.cos(lamMid),
                           cy + (arcR2 + 14) * Math.sin(lamMid));

    /* ================================================================
       RIGHT HALF — readout and bar gauge
       ================================================================ */
    const rightX = w / 2 + 10;
    const rightW = w / 2 - pad.r - 10;
    const readoutCx = rightX + rightW / 2;

    /* Title */
    ctx.font = C.TITLE_FONT;
    ctx.fillStyle = C.DARK;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('Schmid Factor', readoutCx, pad.t + 8);

    /* Large m readout */
    ctx.font = '600 48px "DM Sans", sans-serif';
    ctx.fillStyle = impossible ? '#c44' : C.DARK;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(mClamped.toFixed(3), readoutCx, cy - 20);

    /* tau / sigma = m */
    ctx.font = '400 15px "DM Sans", sans-serif';
    ctx.fillStyle = C.MUTED;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('\u03c4 / \u03c3 = m', readoutCx, cy + 10);

    /* Formula line */
    ctx.font = C.LABEL_FONT;
    ctx.fillStyle = C.MUTED;
    ctx.fillText('m = cos \u03c6 \u00b7 cos \u03bb', readoutCx, cy + 32);

    /* ---- Bar gauge 0 to 0.5 ---- */
    const barY = cy + 58;
    const barH = 14;
    const barLeft = rightX + 16;
    const barRight = rightX + rightW - 16;
    const barW = barRight - barLeft;

    /* Background track */
    ctx.fillStyle = 'rgba(0,0,0,0.06)';
    roundRect(ctx, barLeft, barY, barW, barH, 4);
    ctx.fill();

    /* Filled portion */
    const fillFrac = mClamped / 0.5;
    const fillW = Math.max(0, barW * fillFrac);
    if (fillW > 0) {
      ctx.fillStyle = impossible ? 'rgba(204,68,68,0.5)' : C.BLUE;
      roundRect(ctx, barLeft, barY, fillW, barH, 4);
      ctx.fill();
    }

    /* Gauge ticks and labels */
    ctx.font = C.TICK_FONT;
    ctx.fillStyle = C.MUTED;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let v = 0; v <= 0.5; v += 0.1) {
      const tx = barLeft + (v / 0.5) * barW;
      ctx.fillText(v.toFixed(1), tx, barY + barH + 4);
      /* Small tick */
      ctx.strokeStyle = C.MUTED;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(tx, barY + barH);
      ctx.lineTo(tx, barY + barH + 2);
      ctx.stroke();
    }

    /* Max label */
    ctx.font = C.TICK_FONT;
    ctx.fillStyle = C.MUTED;
    ctx.textAlign = 'center';
    ctx.fillText('m\u2098\u2090\u2093 = 0.5', readoutCx, barY + barH + 18);

    /* ---- Angle readouts ---- */
    const infoY = barY + barH + 38;
    ctx.font = C.LABEL_FONT;
    ctx.fillStyle = C.DARK;
    ctx.textAlign = 'center';
    ctx.fillText(
      '\u03c6 = ' + phiDeg + '\u00b0    \u03bb = ' + lamDeg + '\u00b0',
      readoutCx, infoY
    );

    /* Constraint note */
    ctx.font = C.TICK_FONT;
    ctx.fillStyle = impossible ? '#c44' : 'rgba(0,0,0,0.25)';
    ctx.fillText('\u03c6 + \u03bb \u2265 90\u00b0', readoutCx, infoY + 16);

    /* ---- Bottom equation ---- */
    ctx.font = C.LABEL_FONT;
    ctx.fillStyle = C.MUTED;
    ctx.textAlign = 'center';
    ctx.fillText(
      '\u03c4\u1d63\u2091\u209b = \u03c3 \u00b7 cos\u03c6 \u00b7 cos\u03bb',
      w / 2, h - pad.b + 24
    );
  }

  /* ---- Helpers ---- */

  /**
   * Draw an arrowhead at (x, y) pointing in direction angle (radians).
   */
  function drawArrowhead(ctx, x, y, angle, size, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - size * Math.cos(angle - 0.35),
               y - size * Math.sin(angle - 0.35));
    ctx.lineTo(x - size * Math.cos(angle + 0.35),
               y - size * Math.sin(angle + 0.35));
    ctx.closePath();
    ctx.fill();
  }

  /**
   * Draw an arc between two angles, with the shorter angular path.
   */
  function drawAngleArc(ctx, cx, cy, r, fromAngle, toAngle, degrees, color) {
    if (degrees < 1) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    /* Determine direction: draw the short way round */
    let diff = toAngle - fromAngle;
    while (diff > Math.PI) diff -= 2 * Math.PI;
    while (diff < -Math.PI) diff += 2 * Math.PI;
    const ccw = diff < 0;
    ctx.arc(cx, cy, r, fromAngle, toAngle, ccw);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  /**
   * Trace a rounded rectangle path (does not fill or stroke).
   */
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  /* ---- Event wiring ---- */
  phiSlider.addEventListener('input', render);
  lamSlider.addEventListener('input', render);

  render();
  window.addEventListener('resize', render);
}
