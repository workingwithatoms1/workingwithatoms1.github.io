/* ==========================================================================
   Bragg diffraction widget

   Interactive geometric diagram showing two parallel planes of atoms with
   incoming and reflected X-ray beams.  The Bragg condition is:

       n lambda = 2 d sin(theta)

   When the condition is satisfied (within tolerance), reflected beams glow
   bright blue; otherwise they fade to grey.

   Sliders: theta (5-85 deg), d-spacing (1-5 A), lambda (0.5-3 A), n toggle.
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
      \u03b8 <input type="range" min="5" max="85" value="30" step="0.5" id="bd-theta"
              style="width:100px;accent-color:#2a2f7c;">
      <span id="bd-theta-val" style="min-width:36px;font-family:'Lora',serif;font-size:13px;">30\u00b0</span>
    </label>
    <label style="display:flex;align-items:center;gap:6px;">
      d <input type="range" min="100" max="500" value="250" step="5" id="bd-d"
              style="width:90px;accent-color:#2a2f7c;">
      <span id="bd-d-val" style="min-width:42px;font-family:'Lora',serif;font-size:13px;">2.50 \u00c5</span>
    </label>
    <label style="display:flex;align-items:center;gap:6px;">
      \u03bb <input type="range" min="50" max="300" value="150" step="5" id="bd-lam"
              style="width:90px;accent-color:#2a2f7c;">
      <span id="bd-lam-val" style="min-width:42px;font-family:'Lora',serif;font-size:13px;">1.50 \u00c5</span>
    </label>
  `;
  container.appendChild(controls);

  const thetaSlider = controls.querySelector('#bd-theta');
  const dSlider     = controls.querySelector('#bd-d');
  const lamSlider   = controls.querySelector('#bd-lam');
  const thetaVal    = controls.querySelector('#bd-theta-val');
  const dVal        = controls.querySelector('#bd-d-val');
  const lamVal      = controls.querySelector('#bd-lam-val');

  const pad = { l: 20, r: 20, t: 20, b: 50 };

  /* ---- Render ---- */
  function render() {
    const { ctx, w, h } = C.setupCanvas(canvas, container, 0.5);

    const thetaDeg = parseFloat(thetaSlider.value);
    const d_val    = parseInt(dSlider.value) / 100;   // angstroms
    const lam_val  = parseInt(lamSlider.value) / 100;  // angstroms

    thetaVal.textContent = thetaDeg + '\u00b0';
    dVal.textContent     = d_val.toFixed(2) + ' \u00c5';
    lamVal.textContent   = lam_val.toFixed(2) + ' \u00c5';

    const thetaRad = thetaDeg * Math.PI / 180;

    /* Bragg condition — check all accessible orders simultaneously */
    const twoD_sinTheta = 2 * d_val * Math.sin(thetaRad);
    const tolerance     = 0.08;
    const orders = [];
    for (let n = 1; n <= 5; n++) {
      const sinTh = n * lam_val / (2 * d_val);
      if (sinTh > 1) break;                      // not physically accessible
      const thDeg = Math.asin(sinTh) * 180 / Math.PI;
      const matched = Math.abs(twoD_sinTheta - n * lam_val) < tolerance;
      orders.push({ n, theta: thDeg, matched });
    }
    const braggMatch   = orders.some(o => o.matched);
    const matchedOrder = orders.find(o => o.matched);

    /* ================================================================
       Layout
       ================================================================ */
    const plotW = w - pad.l - pad.r;
    const plotH = h - pad.t - pad.b;

    /* Two horizontal planes of atoms — gap scales with d-spacing */
    const nAtoms     = 7;
    const atomR      = Math.min(plotW * 0.018, 8);
    const planeGap   = plotH * 0.07 * d_val;   // proportional to d
    const centreY    = pad.t + plotH * 0.40;
    const planeY1    = centreY - planeGap / 2;  // upper plane
    const planeY2    = centreY + planeGap / 2;  // lower plane
    const planeLeft  = pad.l + plotW * 0.08;
    const planeRight = pad.l + plotW * 0.92;
    const planeW     = planeRight - planeLeft;

    /* Beams hit atoms — pick the central atom on each plane */
    const hitAtomIdx = Math.floor(nAtoms / 2);
    const hitX1 = planeLeft + (hitAtomIdx + 0.5) * planeW / nAtoms;
    const hitY1 = planeY1;

    /* ================================================================
       Draw planes (dashed lines)
       ================================================================ */
    ctx.strokeStyle = 'rgba(42, 47, 124, 0.15)';
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(planeLeft, planeY1);
    ctx.lineTo(planeRight, planeY1);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(planeLeft, planeY2);
    ctx.lineTo(planeRight, planeY2);
    ctx.stroke();
    ctx.setLineDash([]);

    /* ================================================================
       Draw atoms on planes
       ================================================================ */
    const atomPositions1 = [];
    const atomPositions2 = [];
    for (let i = 0; i < nAtoms; i++) {
      const x = planeLeft + (i + 0.5) * planeW / nAtoms;
      atomPositions1.push({ x, y: planeY1 });
      atomPositions2.push({ x, y: planeY2 });
    }

    function drawAtom(x, y, r) {
      ctx.fillStyle = C.BLUE;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }

    for (const a of atomPositions1) drawAtom(a.x, a.y, atomR);
    for (const a of atomPositions2) drawAtom(a.x, a.y, atomR);

    /* ================================================================
       d-spacing annotation
       ================================================================ */
    const dAnnotX = planeRight + 12;
    ctx.strokeStyle = C.MUTED;
    ctx.lineWidth = 1;
    // vertical line
    ctx.beginPath();
    ctx.moveTo(dAnnotX, planeY1);
    ctx.lineTo(dAnnotX, planeY2);
    ctx.stroke();
    // tick marks
    ctx.beginPath();
    ctx.moveTo(dAnnotX - 3, planeY1);
    ctx.lineTo(dAnnotX + 3, planeY1);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(dAnnotX - 3, planeY2);
    ctx.lineTo(dAnnotX + 3, planeY2);
    ctx.stroke();
    // label
    ctx.font = C.VALUE_FONT;
    ctx.fillStyle = C.DARK;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('d', dAnnotX + 6, (planeY1 + planeY2) / 2);

    /* ================================================================
       Beam geometry

       The incoming beam arrives at angle theta to the *plane* (not to
       the normal). Beam 2 hits plane 2 directly below beam 1's hit on
       plane 1 — the standard textbook Bragg construction. Both beams
       are parallel; the path-difference triangle (A-P-B) is symmetric
       about the vertical through the two hit points.
       ================================================================ */

    /* Beam 2 hits directly below beam 1 (same atom column) */
    const hitX2 = hitX1;
    const hitY2 = planeY2;

    /* Beam directions (unit vectors) */
    /* Incoming: travelling to the right and downward at angle theta to horizontal */
    const inDx =  Math.cos(thetaRad);
    const inDy =  Math.sin(thetaRad);
    /* Reflected: travelling to the right and upward at angle theta to horizontal */
    const outDx =  Math.cos(thetaRad);
    const outDy = -Math.sin(thetaRad);

    /* Beam lengths for drawing */
    const beamLen = plotW * 0.32;

    /* ---- Incoming beams ---- */
    const in1_startX = hitX1 - beamLen * inDx;
    const in1_startY = hitY1 - beamLen * inDy;
    const in2_startX = hitX2 - beamLen * inDx;
    const in2_startY = hitY2 - beamLen * inDy;

    /* ---- Outgoing (reflected) beams ---- */
    const out1_endX = hitX1 + beamLen * outDx;
    const out1_endY = hitY1 + beamLen * outDy;
    const out2_endX = hitX2 + beamLen * outDx;
    const out2_endY = hitY2 + beamLen * outDy;

    /* Beam colours */
    const beamInColor  = '#c44';
    const beamOutBright = '#4d5cf2';
    const beamOutFaint  = 'rgba(140, 140, 160, 0.35)';
    const beamOutColor  = braggMatch ? beamOutBright : beamOutFaint;
    const beamOutWidth  = braggMatch ? 2.5 : 1.5;

    /* Helper: draw arrow with arrowhead */
    function drawBeam(x0, y0, x1, y1, color, lw) {
      ctx.strokeStyle = color;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();

      // Arrowhead at (x1, y1)
      const angle = Math.atan2(y1 - y0, x1 - x0);
      const aSize = 7;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x1 - aSize * Math.cos(angle - 0.35),
                 y1 - aSize * Math.sin(angle - 0.35));
      ctx.lineTo(x1 - aSize * Math.cos(angle + 0.35),
                 y1 - aSize * Math.sin(angle + 0.35));
      ctx.closePath();
      ctx.fill();
    }

    /* Draw incoming beams */
    drawBeam(in1_startX, in1_startY, hitX1, hitY1, beamInColor, 2);
    drawBeam(in2_startX, in2_startY, hitX2, hitY2, beamInColor, 2);

    /* Draw reflected beams */
    drawBeam(hitX1, hitY1, out1_endX, out1_endY, beamOutColor, beamOutWidth);
    drawBeam(hitX2, hitY2, out2_endX, out2_endY, beamOutColor, beamOutWidth);

    /* Labels on beams */
    ctx.font = '400 10px "DM Sans", sans-serif';
    ctx.fillStyle = beamInColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    const lbX = (in1_startX + hitX1) / 2;
    const lbY = (in1_startY + hitY1) / 2 - 6;
    ctx.fillText('Incoming', lbX, lbY);

    ctx.fillStyle = beamOutColor;
    const rbX = (hitX1 + out1_endX) / 2;
    const rbY = (hitY1 + out1_endY) / 2 - 6;
    ctx.fillText('Reflected', rbX, rbY);

    /* ================================================================
       Path-difference triangle

       The extra path that beam 2 travels compared to beam 1 is
       the distance A->B->C where:
         A = point on beam 2's incoming ray perpendicular from hit1
         B = hit point on plane 2 (hitX2, hitY2)
         C = point on beam 2's outgoing ray perpendicular from hit1

       In the classic Bragg diagram:
         - Drop a perpendicular from hit1 to the incoming beam 2 -> point A
         - Drop a perpendicular from hit1 to the outgoing beam 2 -> point C
         - The triangle A-B-C lies below the first plane
         - AB + BC = 2d sin(theta) = path difference
       ================================================================ */

    /* Point A: foot of perpendicular from hitPoint1 to incoming beam 2 */
    /* Incoming beam 2 line: from in2_start to hitX2,hitY2
       Direction unit vector: (inDx, inDy)
       Project (hit1 - in2_start) onto beam direction */
    const vAx = hitX1 - in2_startX;
    const vAy = hitY1 - in2_startY;
    const projA = vAx * inDx + vAy * inDy;
    const Ax = in2_startX + projA * inDx;
    const Ay = in2_startY + projA * inDy;

    /* Point C: foot of perpendicular from hitPoint1 to outgoing beam 2 */
    const wCx = hitX1 - hitX2;
    const wCy = hitY1 - hitY2;
    const projC = wCx * outDx + wCy * outDy;
    const Cx = hitX2 + projC * outDx;
    const Cy = hitY2 + projC * outDy;

    /* Draw the path-difference triangle: A -> B (hitX2,hitY2) -> C */
    const triColor = braggMatch ? 'rgba(77, 92, 242, 0.25)' : 'rgba(140, 140, 160, 0.12)';
    const triStroke = braggMatch ? 'rgba(77, 92, 242, 0.7)' : 'rgba(140, 140, 160, 0.4)';

    /* Filled triangle */
    ctx.fillStyle = triColor;
    ctx.beginPath();
    ctx.moveTo(Ax, Ay);
    ctx.lineTo(hitX2, hitY2);
    ctx.lineTo(Cx, Cy);
    ctx.closePath();
    ctx.fill();

    /* Triangle outline */
    ctx.strokeStyle = triStroke;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(Ax, Ay);
    ctx.lineTo(hitX2, hitY2);
    ctx.lineTo(Cx, Cy);
    ctx.closePath();
    ctx.stroke();

    /* Dashed perpendiculars from hit1 to A and C */
    ctx.strokeStyle = triStroke;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(hitX1, hitY1);
    ctx.lineTo(Ax, Ay);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(hitX1, hitY1);
    ctx.lineTo(Cx, Cy);
    ctx.stroke();
    ctx.setLineDash([]);

    /* Small right-angle marks at A and C */
    function drawRightAngle(px, py, dir1x, dir1y, dir2x, dir2y, size) {
      ctx.strokeStyle = triStroke;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(px + dir1x * size, py + dir1y * size);
      ctx.lineTo(px + dir1x * size + dir2x * size,
                 py + dir1y * size + dir2y * size);
      ctx.lineTo(px + dir2x * size, py + dir2y * size);
      ctx.stroke();
    }

    const raSize = 5;
    /* At A: perpendicular between beam direction (inDx,inDy) and
       direction to hit1 */
    const toH1_Ax = hitX1 - Ax;
    const toH1_Ay = hitY1 - Ay;
    const lenAH = Math.sqrt(toH1_Ax * toH1_Ax + toH1_Ay * toH1_Ay);
    if (lenAH > 1) {
      drawRightAngle(Ax, Ay, -inDx, -inDy,
                     toH1_Ax / lenAH, toH1_Ay / lenAH, raSize);
    }

    const toH1_Cx = hitX1 - Cx;
    const toH1_Cy = hitY1 - Cy;
    const lenCH = Math.sqrt(toH1_Cx * toH1_Cx + toH1_Cy * toH1_Cy);
    if (lenCH > 1) {
      drawRightAngle(Cx, Cy, outDx, outDy,
                     toH1_Cx / lenCH, toH1_Cy / lenCH, raSize);
    }

    /* Path-difference label near the triangle */
    ctx.font = '400 10px "DM Sans", sans-serif';
    ctx.fillStyle = triStroke;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const triLabelX = hitX2;
    const triLabelY = hitY2 + 8;
    ctx.fillText('2d sin\u03b8', triLabelX, triLabelY);

    /* ================================================================
       Angle arc: theta at the hit point on the upper plane

       theta is the angle between the incoming beam and the plane
       (horizontal). Draw an arc from the horizontal to the beam
       direction.
       ================================================================ */
    const arcR = Math.min(plotW * 0.06, 30);

    /* Arc from the horizontal (going left from hit1) to the incoming
       beam direction (going upper-left). The plane direction going left
       is angle pi (180 deg). The incoming beam arrives from the
       upper-left, so its direction toward the source is at angle
       pi + theta. Arc from pi to pi+theta (CCW in screen coords means
       the arc goes upward). */
    ctx.strokeStyle = C.RED;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    /* In screen coordinates, the plane runs left at angle pi.
       The incoming beam comes from angle (pi + thetaRad) — above
       the horizontal. Canvas angles increase clockwise, so going
       from the plane upward to the beam is counter-clockwise. */
    ctx.arc(hitX1, hitY1, arcR, Math.PI, Math.PI + thetaRad, true);
    ctx.stroke();
    ctx.setLineDash([]);

    /* Theta label */
    const thetaLabelAngle = Math.PI + thetaRad / 2;
    ctx.font = '500 12px "DM Sans", sans-serif';
    ctx.fillStyle = C.RED;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('\u03b8',
      hitX1 + (arcR + 12) * Math.cos(thetaLabelAngle),
      hitY1 + (arcR + 12) * Math.sin(thetaLabelAngle));

    /* Also draw the angle arc on the reflected side */
    ctx.strokeStyle = beamOutColor;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    /* Reflected beam goes to upper-right. From horizontal going right
       (angle 0) the beam is at angle -thetaRad. Arc from 0 to
       -thetaRad (CCW). */
    ctx.arc(hitX1, hitY1, arcR * 0.85, -thetaRad, 0, false);
    ctx.stroke();
    ctx.setLineDash([]);

    /* Theta label on reflected side */
    const thetaLabelAngle2 = -thetaRad / 2;
    ctx.fillStyle = beamOutColor;
    ctx.fillText('\u03b8',
      hitX1 + (arcR * 0.85 + 12) * Math.cos(thetaLabelAngle2),
      hitY1 + (arcR * 0.85 + 12) * Math.sin(thetaLabelAngle2));

    /* ================================================================
       Plane labels
       ================================================================ */
    ctx.font = '400 10px "DM Sans", sans-serif';
    ctx.fillStyle = 'rgba(42, 47, 124, 0.4)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText('Plane 1', planeLeft, planeY1 - 6);
    ctx.fillText('Plane 2', planeLeft, planeY2 - 6);

    /* ================================================================
       Readout: show all accessible Bragg angles
       ================================================================ */
    const readoutY = h - pad.b + 10;
    const midX = pad.l + plotW / 2;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    /* Row 1: list all accessible orders with their Bragg angles */
    const orderStrs = orders.map(o => {
      const tag = 'n=' + o.n + ': ' + o.theta.toFixed(1) + '\u00b0';
      return { str: tag, matched: o.matched };
    });

    let xCursor = midX - (orderStrs.length - 1) * 55;
    ctx.font = '500 12px "DM Sans", sans-serif';
    for (const o of orderStrs) {
      ctx.fillStyle = o.matched ? beamOutBright : C.MUTED;
      ctx.fillText(o.str, xCursor, readoutY);
      xCursor += 110;
    }

    /* Row 2: matched indicator or current 2d sinθ */
    ctx.font = '400 11px "DM Sans", sans-serif';
    if (braggMatch) {
      ctx.fillStyle = beamOutBright;
      ctx.fillText(
        'n=' + matchedOrder.n + ' Bragg condition met   2d sin\u03b8 = ' +
        twoD_sinTheta.toFixed(3) + ' \u00c5',
        midX, readoutY + 16
      );
    } else {
      ctx.fillStyle = C.MUTED;
      ctx.fillText(
        '2d sin\u03b8 = ' + twoD_sinTheta.toFixed(3) + ' \u00c5',
        midX, readoutY + 16
      );
    }

    /* ================================================================
       Constructive / destructive indicator (glow effect on match)
       ================================================================ */
    if (braggMatch) {
      ctx.save();
      ctx.shadowColor = '#4d5cf2';
      ctx.shadowBlur = 12;
      ctx.strokeStyle = 'rgba(77, 92, 242, 0.5)';
      ctx.lineWidth = 4;

      ctx.beginPath();
      ctx.moveTo(hitX1, hitY1);
      ctx.lineTo(out1_endX, out1_endY);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(hitX2, hitY2);
      ctx.lineTo(out2_endX, out2_endY);
      ctx.stroke();

      ctx.restore();
    }
  }

  /* ---- Event wiring ---- */
  thetaSlider.addEventListener('input', render);
  dSlider.addEventListener('input', render);
  lamSlider.addEventListener('input', render);

  render();
  window.addEventListener('resize', render);
}
