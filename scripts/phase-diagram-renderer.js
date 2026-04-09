/* ==========================================================================
   Phase diagram canvas renderer
   Consumes the JSON contract from compute_binary.py.
   Uses the site's chart-utils for consistent styling.
   ========================================================================== */

import { setupCanvas, scale, BLUE, DARK, MUTED, LABEL_FONT, TICK_FONT, MAX_DPR } from './widgets/chart-utils.js';

const CURVE_COLOR = '#1a1d3a';
const CURVE_WIDTH = 1.8;
const SNAP_PT = 28;
const SNAP_CURVE = 18;
const MARKER_RED = '#8b2252';
const MARKER_BLUE = BLUE;

/**
 * Interpolate composition on a curve at a given temperature.
 */
function interp(pts, T) {
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, t0] = pts[i];
    const [x1, t1] = pts[i + 1];
    if ((t0 <= T && T <= t1) || (t1 <= T && T <= t0)) {
      return x0 + (T - t0) / (t1 - t0) * (x1 - x0);
    }
  }
  return null;
}

/**
 * Find snap target near mouse position.
 */
function findSnap(data, mx, my, xS, yS) {
  // Check special points first (larger catch radius)
  let bestPt = null;
  let bestPtD = SNAP_PT;
  for (const sp of data.special_points) {
    const dx = xS(sp.x) - mx;
    const dy = yS(sp.T) - my;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < bestPtD) {
      bestPtD = dist;
      bestPt = sp;
    }
  }
  if (bestPt) {
    return {
      px: xS(bestPt.x), py: yS(bestPt.T),
      xVal: bestPt.x, T: bestPt.T,
      name: bestPt.name, type: bestPt.type
    };
  }

  // Check curves
  const T = yS.inv(my);
  let bestC = null;
  let bestCD = SNAP_CURVE;
  for (const curve of data.curves) {
    const xOn = interp(curve.pts, T);
    if (xOn === null) continue;
    const d = Math.abs(xS(xOn) - mx);
    if (d < bestCD) {
      bestCD = d;
      bestC = {
        px: xS(xOn), py: yS(T),
        xVal: xOn, T,
        name: curve.name, type: 'boundary'
      };
    }
  }

  // Check isotherms
  for (const iso of data.isotherms) {
    const xM = xS.inv(mx);
    if (Math.abs(yS(iso.T) - my) < 10 && xM >= iso.x_start && xM <= iso.x_end) {
      const iD = Math.abs(yS(iso.T) - my);
      if (!bestC || iD < bestCD) {
        return {
          px: mx, py: yS(iso.T),
          xVal: xM, T: iso.T,
          name: iso.name + ' isotherm', type: 'boundary'
        };
      }
    }
  }

  return bestC;
}

/**
 * Draw a smooth curve through points using Catmull-Rom to cubic bezier.
 */
function drawSmoothCurve(ctx, pts, xS, yS, closed) {
  if (pts.length < 2) return;
  const P = pts.map(([x, t]) => [xS(x), yS(t)]);

  ctx.beginPath();
  ctx.moveTo(P[0][0], P[0][1]);

  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[Math.max(0, i - 1)];
    const p1 = P[i];
    const p2 = P[i + 1];
    const p3 = P[Math.min(P.length - 1, i + 2)];

    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;

    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2[0], p2[1]);
  }

  if (closed) ctx.closePath();
  ctx.stroke();
}

/**
 * Mount the phase diagram renderer into a container.
 *
 * @param {HTMLElement} container
 * @param {Object} data — the parsed JSON from compute_binary.py
 * @returns {{ destroy: Function }}
 */
export function createPhaseDiagram(container, data) {
  container.innerHTML = '';

  // Parse system elements
  const [el1, el2] = data.system.split('-');

  // Title
  const header = document.createElement('div');
  header.className = 'pd-header';
  header.innerHTML = `
    <h2 class="pd-title">${el1}\u2013${el2} Binary Phase Diagram</h2>
    <p class="pd-ref">${data.reference || ''}</p>
  `;
  container.appendChild(header);

  // Canvas
  const canvas = document.createElement('canvas');
  canvas.className = 'pd-canvas';
  canvas.style.cursor = 'crosshair';
  canvas.style.display = 'block';
  canvas.style.width = '100%';
  container.appendChild(canvas);

  // Info bar
  const info = document.createElement('div');
  info.className = 'pd-info';
  info.innerHTML = '<span class="pd-hint">Hover to inspect \u00B7 snaps to boundaries and invariant points</span>';
  container.appendChild(info);

  // State
  const pad = { l: 56, r: 48, t: 28, b: 48 };
  let hover = null;
  let w = 0, h = 0, xS, yS;

  // Determine T range from data
  let Tmin = Infinity, Tmax = -Infinity;
  for (const c of data.curves) {
    for (const [, t] of c.pts) {
      if (t < Tmin) Tmin = t;
      if (t > Tmax) Tmax = t;
    }
  }
  // Round to nice values
  Tmin = Math.floor(Tmin / 50) * 50;
  Tmax = Math.ceil(Tmax / 50) * 50;

  function render() {
    const dpr = Math.min(window.devicePixelRatio, MAX_DPR);
    w = container.clientWidth;
    h = Math.round(w * 0.6);
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.height = h + 'px';
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    xS = scale(0, 1, pad.l, w - pad.r);
    yS = scale(Tmin, Tmax, h - pad.b, pad.t);

    // White plot area
    ctx.fillStyle = '#fff';
    ctx.fillRect(pad.l, pad.t, w - pad.l - pad.r, h - pad.t - pad.b);

    // Grid
    ctx.strokeStyle = 'rgba(0,0,0,0.05)';
    ctx.lineWidth = 0.6;
    for (let x = 0; x <= 1; x += 0.2) {
      ctx.beginPath();
      ctx.moveTo(xS(x), pad.t);
      ctx.lineTo(xS(x), h - pad.b);
      ctx.stroke();
    }
    for (let t = Tmin; t <= Tmax; t += 100) {
      ctx.beginPath();
      ctx.moveTo(pad.l, yS(t));
      ctx.lineTo(w - pad.r, yS(t));
      ctx.stroke();
    }

    // Curves
    ctx.strokeStyle = CURVE_COLOR;
    ctx.lineWidth = CURVE_WIDTH;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    for (const c of data.curves) {
      drawSmoothCurve(ctx, c.pts, xS, yS, c.closed);
    }

    // Isotherms (solid tie lines between invariant points)
    ctx.strokeStyle = CURVE_COLOR;
    ctx.lineWidth = CURVE_WIDTH;
    ctx.lineCap = 'round';
    for (const iso of data.isotherms) {
      ctx.beginPath();
      ctx.moveTo(xS(iso.x_start), yS(iso.T));
      ctx.lineTo(xS(iso.x_end), yS(iso.T));
      ctx.stroke();
    }

    // Special point markers
    for (const sp of data.special_points) {
      const px = xS(sp.x);
      const py = yS(sp.T);
      ctx.beginPath();
      if (sp.type === 'triple') {
        ctx.arc(px, py, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.strokeStyle = CURVE_COLOR;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else if (sp.type === 'melt') {
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fillStyle = CURVE_COLOR;
        ctx.fill();
      } else {
        ctx.arc(px, py, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.strokeStyle = CURVE_COLOR;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
    }

    // Axes border
    ctx.strokeStyle = '#bbb';
    ctx.lineWidth = 1;
    ctx.strokeRect(pad.l, pad.t, w - pad.l - pad.r, h - pad.t - pad.b);

    // X axis labels
    ctx.font = TICK_FONT;
    ctx.fillStyle = MUTED;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let x = 0; x <= 1; x += 0.2) {
      ctx.fillText(x.toFixed(1), xS(x), h - pad.b + 6);
    }
    ctx.font = LABEL_FONT;
    ctx.fillStyle = DARK;
    ctx.fillText('Mole Fraction ' + el2, pad.l + (w - pad.l - pad.r) / 2, h - 8);

    // Y axis labels
    ctx.font = TICK_FONT;
    ctx.fillStyle = MUTED;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let t = Tmin; t <= Tmax; t += 100) {
      ctx.fillText(t.toString(), pad.l - 6, yS(t));
    }
    ctx.save();
    ctx.translate(14, pad.t + (h - pad.t - pad.b) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.font = LABEL_FONT;
    ctx.fillStyle = DARK;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('Temperature (K)', 0, 0);
    ctx.restore();

    // Element labels at top
    ctx.font = '700 14px "DM Sans", sans-serif';
    ctx.fillStyle = DARK;
    ctx.textAlign = 'center';
    ctx.fillText(el1, xS(0), pad.t - 12);
    ctx.fillText(el2, xS(1), pad.t - 12);

    // Invariant reaction labels (below isotherms)
    for (const iso of data.isotherms) {
      const midX = xS((iso.x_start + iso.x_end) / 2);
      ctx.font = '400 9px "DM Sans", sans-serif';
      ctx.fillStyle = MUTED;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(iso.name, midX, yS(iso.T) + 4);
      // Temperature label
      ctx.font = '600 9px "DM Sans", sans-serif';
      ctx.fillText(Math.round(iso.T) + ' K', midX, yS(iso.T) + 15);
    }

    // Phase region labels
    const LB = '#444';
    if (data.labels) {
      for (const lbl of data.labels) {
        const px = lbl.anchor === 'right' ? w - pad.r + 10 : xS(lbl.x);
        const py = yS(lbl.T);

        ctx.textBaseline = 'middle';

        if (lbl.style === 'phase') {
          ctx.font = '700 14px "DM Sans", sans-serif';
          ctx.fillStyle = LB;
          ctx.fontStyle = 'italic';
        } else if (lbl.style === 'phase-large') {
          ctx.font = '700 15px "DM Sans", sans-serif';
          ctx.fillStyle = LB;
        } else if (lbl.style === 'region') {
          ctx.font = '600 11px "DM Sans", sans-serif';
          ctx.fillStyle = LB;
        } else {
          ctx.font = '600 10px "DM Sans", sans-serif';
          ctx.fillStyle = LB;
        }

        ctx.textAlign = lbl.anchor === 'right' ? 'left' : 'center';
        ctx.fillText(lbl.text, px, py);

        // Arrow from label to narrow region
        if (lbl.arrow) {
          const ax = xS(lbl.arrow[0]);
          const ay = yS(lbl.arrow[1]);
          const dx = ax - px;
          const dy = ay - py;
          const len = Math.sqrt(dx * dx + dy * dy);
          if (len > 10) {
            const ux = dx / len;
            const uy = dy / len;
            ctx.strokeStyle = LB;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(px + ux * 8, py + uy * 8);
            ctx.lineTo(ax - ux * 2, ay - uy * 2);
            ctx.stroke();
            // Arrowhead
            ctx.fillStyle = LB;
            ctx.beginPath();
            ctx.moveTo(ax, ay);
            ctx.lineTo(ax - ux * 5 - uy * 2.5, ay - uy * 5 + ux * 2.5);
            ctx.lineTo(ax - ux * 5 + uy * 2.5, ay - uy * 5 - ux * 2.5);
            ctx.closePath();
            ctx.fill();
          }
        }
      }
    }

    // Hover
    if (hover) {
      const isPoint = hover.type === 'triple' || hover.type === 'melt' || hover.type === 'critical' || hover.type === 'junction';
      const isBound = hover.type === 'boundary';
      const col = isPoint ? MARKER_RED : isBound ? MARKER_BLUE : CURVE_COLOR;

      // Crosshair (faint)
      ctx.strokeStyle = CURVE_COLOR;
      ctx.lineWidth = 0.3;
      ctx.setLineDash([3, 3]);
      ctx.globalAlpha = 0.12;
      ctx.beginPath();
      ctx.moveTo(hover.rawX, pad.t);
      ctx.lineTo(hover.rawX, h - pad.b);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(pad.l, hover.rawY);
      ctx.lineTo(w - pad.r, hover.rawY);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.setLineDash([]);

      // Guide lines to axes
      ctx.strokeStyle = col;
      ctx.lineWidth = 0.7;
      ctx.setLineDash([4, 2]);
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.moveTo(hover.px, h - pad.b);
      ctx.lineTo(hover.px, hover.py);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(pad.l, hover.py);
      ctx.lineTo(hover.px, hover.py);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.setLineDash([]);

      // Marker
      if (isPoint) {
        // Diamond + dot
        ctx.beginPath();
        ctx.moveTo(hover.px, hover.py - 9);
        ctx.lineTo(hover.px + 7, hover.py);
        ctx.lineTo(hover.px, hover.py + 9);
        ctx.lineTo(hover.px - 7, hover.py);
        ctx.closePath();
        ctx.strokeStyle = MARKER_RED;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(hover.px, hover.py, 3, 0, Math.PI * 2);
        ctx.fillStyle = MARKER_RED;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(hover.px, hover.py, 1.2, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
      } else if (isBound) {
        ctx.beginPath();
        ctx.arc(hover.px, hover.py, 6, 0, Math.PI * 2);
        ctx.strokeStyle = MARKER_BLUE;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.5;
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.arc(hover.px, hover.py, 3, 0, Math.PI * 2);
        ctx.fillStyle = MARKER_BLUE;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(hover.px, hover.py, 1, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(hover.px, hover.py, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = CURVE_COLOR;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(hover.px, hover.py, 1, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
      }

      // Info bar
      info.innerHTML = `
        <span>x<sub>${el2}</sub> = <b>${hover.xVal.toFixed(4)}</b></span>
        <span>T = <b>${hover.T.toFixed(1)} K</b></span>
        ${hover.name ? `<span class="pd-snap-label" style="color:${col}">${hover.name}</span>` : ''}
      `;
    }
  }

  function onMove(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = w / rect.width;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleX;

    const xF = xS.inv(mx);
    const tV = yS.inv(my);

    if (xF < -0.02 || xF > 1.02 || tV < Tmin - 10 || tV > Tmax + 10) {
      hover = null;
      render();
      info.innerHTML = '<span class="pd-hint">Hover to inspect \u00B7 snaps to boundaries and invariant points</span>';
      return;
    }

    const snap = findSnap(data, mx, my, xS, yS);
    if (snap) {
      hover = { ...snap, rawX: mx, rawY: my };
    } else {
      const cx = Math.max(0, Math.min(1, xF));
      const ct = Math.max(Tmin, Math.min(Tmax, tV));
      hover = {
        px: xS(cx), py: yS(ct), rawX: mx, rawY: my,
        xVal: cx, T: ct, name: null, type: null
      };
    }
    render();
  }

  function onLeave() {
    hover = null;
    render();
    info.innerHTML = '<span class="pd-hint">Hover to inspect \u00B7 snaps to boundaries and invariant points</span>';
  }

  canvas.addEventListener('mousemove', onMove);
  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    onMove({ clientX: touch.clientX, clientY: touch.clientY });
  }, { passive: false });
  canvas.addEventListener('mouseleave', onLeave);
  canvas.addEventListener('touchend', onLeave);

  // Initial render
  render();
  window.addEventListener('resize', render);

  return {
    destroy() {
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('mouseleave', onLeave);
      window.removeEventListener('resize', render);
    }
  };
}
