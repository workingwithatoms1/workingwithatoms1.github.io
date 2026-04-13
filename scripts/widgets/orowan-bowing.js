/* ==========================================================================
   Orowan bowing widget — dislocation bowing between precipitates

   A dislocation line bows between two pinning points (precipitates)
   under applied shear stress tau.

   Radius of curvature:  R = Gb / (2 tau)
   Orowan stress:        tau_Or = Gb / L

   At tau = tau_Or the bowing radius R = L/2 and the line forms a
   semicircle. Beyond that the dislocation bypasses, leaving Orowan
   loops around each particle.

   Slider controls the normalised stress ratio tau / tau_Or from 0 to 1.2.
   ========================================================================== */

import * as C from './chart-utils.js';

export function create(container) {
  const canvas = C.createWidgetShell(container, 0.45);

  let ratio = 0.0; // tau / tau_Orowan

  /* ---- Controls ---- */
  const controls = document.createElement('div');
  controls.style.cssText =
    'padding: 8px 16px; display: flex; align-items: center; gap: 12px; ' +
    'font-family: "DM Sans", sans-serif; font-size: 12px; color: #3a3d5a;';
  controls.innerHTML = `
    <span>\u03c4 / \u03c4<sub>Or</sub></span>
    <input type="range" min="0" max="120" value="0" step="1"
           style="flex:1; accent-color: #2a2f7c;">
    <span id="ob-ratio-val" style="min-width:36px; font-weight:500;">0.00</span>
  `;
  container.appendChild(controls);

  const slider  = controls.querySelector('input');
  const ratioEl = controls.querySelector('#ob-ratio-val');

  const pad = { l: 20, r: 20, t: 20, b: 50 };

  /* ---- Helpers ---- */

  /** Draw an arrowhead at (x,y) pointing in direction angle (radians). */
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

  /** Draw a double-headed horizontal shear arrow pair. */
  function drawShearArrows(ctx, x1, x2, y, color, label) {
    const dir = x2 > x1 ? 1 : -1;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x1, y);
    ctx.lineTo(x2, y);
    ctx.stroke();
    drawArrowhead(ctx, x2, y, dir > 0 ? 0 : Math.PI, 7, color);
    if (label) {
      ctx.font = '500 12px "DM Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(label, (x1 + x2) / 2, y - 5);
    }
  }

  /* ---- Render ---- */
  function render() {
    const { ctx, w, h } = C.setupCanvas(canvas, container, 0.45);

    const plotW = w - pad.l - pad.r;
    const plotH = h - pad.t - pad.b;

    /* Geometry — particle positions and spacing in pixels */
    const cx = pad.l + plotW / 2;
    const cy = pad.t + plotH * 0.45;           // dislocation line y
    const L  = Math.min(plotW * 0.48, 200);    // inter-particle spacing (px)
    const pR = Math.min(L * 0.09, 12);         // particle radius (px)

    const pLeftX  = cx - L / 2;
    const pRightX = cx + L / 2;

    /* ---- Background ---- */
    ctx.fillStyle = '#e1e0e8';
    ctx.fillRect(0, 0, w, h);

    /* ---- Applied shear stress arrows (top rightward, bottom leftward) ---- */
    if (ratio > 0.01) {
      const arrowLen = Math.min(ratio * 40, 50);
      const topY = pad.t + 8;
      const botY = h - pad.b - 8;
      drawShearArrows(ctx, w - pad.r - arrowLen - 10, w - pad.r - 10,
                       topY, C.RED, '\u03c4');
      drawShearArrows(ctx, pad.l + arrowLen + 10, pad.l + 10,
                       botY, C.RED, '\u03c4');
    }

    /* ---- Dislocation straight tails extending beyond particles ---- */
    const tailLen = L * 0.35;
    ctx.strokeStyle = C.BLUE;
    ctx.lineWidth = 2;

    if (ratio < 1.0) {
      /* Left tail */
      ctx.beginPath();
      ctx.moveTo(pLeftX - tailLen, cy);
      ctx.lineTo(pLeftX, cy);
      ctx.stroke();

      /* Right tail */
      ctx.beginPath();
      ctx.moveTo(pRightX, cy);
      ctx.lineTo(pRightX + tailLen, cy);
      ctx.stroke();
    }

    /* ---- Dislocation bowing arc ---- */
    if (ratio < 0.001) {
      /* Straight line between particles */
      ctx.strokeStyle = C.BLUE;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(pLeftX, cy);
      ctx.lineTo(pRightX, cy);
      ctx.stroke();
    } else if (ratio < 1.0) {
      /* Bowing arc: circular arc between the two pinning points.
         R = L / (2 * ratio)  in pixel units (since R_real = Gb/(2tau)
         and tau/tau_Or = ratio, so R = L/(2*ratio)).
         The arc centre is above the line (dislocation bows downward
         under positive shear). */
      const R = L / (2 * ratio);

      /* Half-angle subtended: sin(alpha) = (L/2) / R */
      const sinAlpha = (L / 2) / R;
      const alpha = Math.asin(Math.min(sinAlpha, 1.0));

      /* Arc centre is above the chord by distance d = R * cos(alpha) */
      const d = R * Math.cos(alpha);
      const arcCx = cx;
      const arcCy = cy - d;  // centre above the line

      /* Canvas arc: we want the bottom portion of the circle.
         The two endpoints are at angles (pi/2 - alpha) and (pi/2 + alpha)
         measured from the centre. */
      const startAngle = Math.PI / 2 - alpha;
      const endAngle   = Math.PI / 2 + alpha;

      ctx.strokeStyle = C.BLUE;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(arcCx, arcCy, R, startAngle, endAngle, false);
      ctx.stroke();

      /* Draw radius of curvature indicator */
      if (ratio > 0.15) {
        /* Draw R line from arc centre to the bottom of the arc */
        const rLineEndX = arcCx;
        const rLineEndY = arcCy + R;

        ctx.strokeStyle = C.MUTED;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(arcCx, arcCy);
        ctx.lineTo(rLineEndX, rLineEndY);
        ctx.stroke();
        ctx.setLineDash([]);

        /* Small dot at arc centre */
        ctx.fillStyle = C.MUTED;
        ctx.beginPath();
        ctx.arc(arcCx, arcCy, 2, 0, Math.PI * 2);
        ctx.fill();

        /* Label R */
        ctx.font = '400 11px "DM Sans", sans-serif';
        ctx.fillStyle = C.MUTED;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText('R', arcCx + 5, (arcCy + rLineEndY) / 2);
      }
    } else {
      /* Bypass regime (ratio >= 1): Orowan loops around each particle
         and a straight dislocation line passes behind them. */

      const loopR = pR + 4;

      /* Full Orowan loops (circles) around each particle */
      ctx.strokeStyle = C.BLUE;
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.arc(pLeftX, cy, loopR, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(pRightX, cy, loopR, 0, Math.PI * 2);
      ctx.stroke();

      /* Dislocation line has passed beyond — drawn below the particles */
      const bypassY = cy + loopR + 8;
      ctx.strokeStyle = C.BLUE;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(pLeftX - tailLen, bypassY);
      ctx.lineTo(pRightX + tailLen, bypassY);
      ctx.stroke();

      /* Label the loops */
      ctx.font = '400 9px "DM Sans", sans-serif';
      ctx.fillStyle = C.BLUE;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText('loop', pLeftX, cy - loopR - 3);
      ctx.fillText('loop', pRightX, cy - loopR - 3);
    }

    /* ---- Precipitate circles (drawn on top) ---- */
    ctx.fillStyle = '#888';
    ctx.beginPath();
    ctx.arc(pLeftX, cy, pR, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(pRightX, cy, pR, 0, Math.PI * 2);
    ctx.fill();

    /* Precipitate labels — offset further down in bypass mode to
       clear the Orowan loops */
    const labelOffset = ratio >= 1.0 ? pR + 22 : pR + 5;
    ctx.font = '400 10px "DM Sans", sans-serif';
    ctx.fillStyle = C.MUTED;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('precipitate', pLeftX, cy + labelOffset);
    ctx.fillText('precipitate', pRightX, cy + labelOffset);

    /* ---- Inter-particle spacing label L ---- */
    const dimY = ratio >= 1.0 ? cy - pR - 28 : cy - pR - 18;
    ctx.strokeStyle = C.DARK;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pLeftX, dimY);
    ctx.lineTo(pRightX, dimY);
    ctx.stroke();

    /* End ticks */
    ctx.beginPath();
    ctx.moveTo(pLeftX, dimY - 4);
    ctx.lineTo(pLeftX, dimY + 4);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(pRightX, dimY - 4);
    ctx.lineTo(pRightX, dimY + 4);
    ctx.stroke();

    ctx.font = '500 12px "DM Sans", sans-serif';
    ctx.fillStyle = C.DARK;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('L', cx, dimY - 3);

    /* ---- Burgers vector arrow (small, near bottom-left) ---- */
    const bArrowX = pad.l + 16;
    const bArrowY = h - pad.b + 20;
    const bLen = 20;

    ctx.strokeStyle = C.DARK;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(bArrowX, bArrowY);
    ctx.lineTo(bArrowX + bLen, bArrowY);
    ctx.stroke();
    drawArrowhead(ctx, bArrowX + bLen, bArrowY, 0, 6, C.DARK);

    ctx.font = '500 11px "DM Sans", sans-serif';
    ctx.fillStyle = C.DARK;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('b', bArrowX + bLen + 4, bArrowY - 5);

    /* ---- Ratio readout (prominent, top-centre) ---- */
    ctx.font = '600 22px "DM Sans", sans-serif';
    ctx.fillStyle = ratio >= 1.0 ? C.RED : C.DARK;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('\u03c4 / \u03c4\u2092\u1d63 = ' + ratio.toFixed(2),
                 cx, pad.t + 2);

    /* Status label */
    ctx.font = '400 11px "DM Sans", sans-serif';
    ctx.fillStyle = ratio >= 1.0 ? C.RED : C.MUTED;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    if (ratio >= 1.0) {
      ctx.fillText('bypass \u2014 Orowan loops left behind', cx, pad.t + 28);
    } else if (ratio > 0.5) {
      ctx.fillText('strong bowing', cx, pad.t + 28);
    } else if (ratio > 0.01) {
      ctx.fillText('bowing', cx, pad.t + 28);
    } else {
      ctx.fillText('no applied stress', cx, pad.t + 28);
    }

    /* ---- Bottom equation ---- */
    ctx.font = C.LABEL_FONT;
    ctx.fillStyle = C.MUTED;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(
      '\u03c4\u2092\u1d63 = Gb / L        R = Gb / (2\u03c4)',
      cx, h - pad.b + 32
    );
  }

  /* ---- Event wiring ---- */
  slider.addEventListener('input', (e) => {
    ratio = parseFloat(e.target.value) / 100;
    ratioEl.textContent = ratio.toFixed(2);
    render();
  });

  render();
  window.addEventListener('resize', render);
}
