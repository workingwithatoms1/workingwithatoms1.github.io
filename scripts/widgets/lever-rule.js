/* ==========================================================================
   Lever rule widget — interactive phase diagram
   Draggable point on a lens diagram. Shows tie line, phase compositions,
   and phase fractions. Uses the same Cu-Ni-like system as common-tangent.
   ========================================================================== */

import * as C from './chart-utils.js';

export function create(container) {
  const canvas = C.createWidgetShell(container, 0.55);
  const ctx = canvas.getContext('2d');

  // Cu-Ni-like lens diagram (pre-computed from common-tangent system)
  const TmA = 1356, TmB = 1728;

  // Approximate liquidus and solidus as smooth curves
  // Parameterised as x(T) using a simple model fitted to the common-tangent results
  function liquidusX(T) {
    if (T <= TmA) return 0;
    if (T >= TmB) return 1;
    const f = (T - TmA) / (TmB - TmA);
    return f * (1 + 0.35 * (1 - f)); // slight bulge to look like a real lens
  }

  function solidusX(T) {
    if (T <= TmA) return 0;
    if (T >= TmB) return 1;
    const f = (T - TmA) / (TmB - TmA);
    return f * (1 - 0.35 * f); // mirrors the bulge
  }

  // Drag state
  let dragT = 1520, dragX = 0.5;
  let dragging = false;

  const pad = { l: 60, r: 24, t: 24, b: 50 };
  const Tmin = TmA - 80, Tmax = TmB + 80;
  let xS, yS, w, h;

  // Info readout
  const info = document.createElement('div');
  info.className = 'widget-controls';
  info.style.justifyContent = 'center';
  info.style.gap = '24px';
  info.style.minHeight = '32px';
  info.innerHTML = '<span class="widget-value" id="wLeverInfo">Click or drag on the diagram</span>';
  container.appendChild(info);
  const infoSpan = info.querySelector('#wLeverInfo');

  function render() {
    const dpr = Math.min(window.devicePixelRatio, C.MAX_DPR);
    w = container.clientWidth;
    h = Math.round(w * 0.55);

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    xS = C.scale(0, 1, pad.l, w - pad.r);
    yS = C.scale(Tmin, Tmax, h - pad.b, pad.t);

    C.drawAxes(ctx, pad, w, h, 'x_B (mole fraction)', 'T (K)');

    // Temperature tick marks
    ctx.font = C.TICK_FONT;
    ctx.fillStyle = C.MUTED;
    ctx.textAlign = 'right';
    for (let T = 1400; T <= 1700; T += 100) {
      ctx.fillText(T.toString(), pad.l - 6, yS(T) + 4);
      ctx.strokeStyle = 'rgba(0,0,0,0.05)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(pad.l, yS(T));
      ctx.lineTo(w - pad.r, yS(T));
      ctx.stroke();
    }

    // Composition tick marks
    ctx.textAlign = 'center';
    for (let x = 0; x <= 1.01; x += 0.2) {
      ctx.fillText(x.toFixed(1), xS(x), h - pad.b + 14);
    }

    // Phase regions
    // Liquidus curve
    const liqPts = [];
    const solPts = [];
    for (let T = TmA; T <= TmB; T += 3) {
      liqPts.push({ x: xS(liquidusX(T)), y: yS(T) });
      solPts.push({ x: xS(solidusX(T)), y: yS(T) });
    }

    // Fill two-phase region
    C.fillBetween(ctx, liqPts, solPts, 'rgba(77, 92, 242, 0.06)');

    C.strokeCurve(ctx, liqPts, C.LIGHT, 2);
    C.strokeCurve(ctx, solPts, C.BLUE, 2);

    // Labels
    ctx.font = C.LABEL_FONT;
    ctx.fillStyle = C.LIGHT;
    ctx.textAlign = 'left';
    ctx.fillText('Liquidus', xS(liquidusX(1450)) + 8, yS(1450));
    ctx.fillStyle = C.BLUE;
    ctx.fillText('Solidus', xS(solidusX(1600)) - 50, yS(1600));

    // Region labels
    ctx.font = C.TITLE_FONT;
    ctx.fillStyle = 'rgba(42,47,124,0.2)';
    ctx.textAlign = 'center';
    ctx.fillText('Liquid', xS(0.3), yS(TmB + 30));
    ctx.fillText('Solid', xS(0.7), yS(TmA - 40));
    ctx.fillText('L + S', xS(0.5), yS(1542));

    // Component labels
    ctx.font = C.TITLE_FONT;
    ctx.fillStyle = C.DARK;
    ctx.textAlign = 'center';
    ctx.fillText('A (Cu)', xS(0), h - pad.b + 28);
    ctx.fillText('B (Ni)', xS(1), h - pad.b + 28);

    // Clamp drag point
    dragT = Math.max(Tmin + 10, Math.min(Tmax - 10, dragT));
    dragX = Math.max(0, Math.min(1, dragX));

    // Determine which region the point is in
    const xl = liquidusX(dragT);
    const xs = solidusX(dragT);
    const inTwoPhase = dragT > TmA && dragT < TmB && dragX > xl && dragX < xs;
    const inLiquid = dragT >= TmB || (dragT > TmA && dragX <= xl);
    const inSolid = dragT <= TmA || (dragT < TmB && dragX >= xs);

    if (inTwoPhase) {
      // Tie line
      ctx.strokeStyle = C.RED;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(xS(xl), yS(dragT));
      ctx.lineTo(xS(xs), yS(dragT));
      ctx.stroke();

      // Tie line endpoints
      C.drawDot(ctx, xS(xl), yS(dragT), 5, C.LIGHT);
      C.drawDot(ctx, xS(xs), yS(dragT), 5, C.BLUE);

      // Composition labels at endpoints
      ctx.font = C.TICK_FONT;
      ctx.fillStyle = C.LIGHT;
      ctx.textAlign = 'center';
      ctx.fillText('x_L = ' + xl.toFixed(2), xS(xl), yS(dragT) - 12);
      ctx.fillStyle = C.BLUE;
      ctx.fillText('x_S = ' + xs.toFixed(2), xS(xs), yS(dragT) - 12);

      // Lever rule fractions
      const fL = (xs - dragX) / (xs - xl);
      const fS = 1 - fL;

      infoSpan.innerHTML =
        `T = ${Math.round(dragT)} K &nbsp;|&nbsp; x₀ = ${dragX.toFixed(2)} &nbsp;|&nbsp; ` +
        `<span style="color:${C.LIGHT}">f<sub>L</sub> = ${fL.toFixed(2)}</span> &nbsp; ` +
        `<span style="color:${C.BLUE}">f<sub>S</sub> = ${fS.toFixed(2)}</span>`;
    } else if (inLiquid) {
      infoSpan.innerHTML = `T = ${Math.round(dragT)} K &nbsp;|&nbsp; x₀ = ${dragX.toFixed(2)} &nbsp;|&nbsp; Single phase: <span style="color:${C.LIGHT}">Liquid</span>`;
    } else if (inSolid) {
      infoSpan.innerHTML = `T = ${Math.round(dragT)} K &nbsp;|&nbsp; x₀ = ${dragX.toFixed(2)} &nbsp;|&nbsp; Single phase: <span style="color:${C.BLUE}">Solid</span>`;
    } else {
      infoSpan.innerHTML = `T = ${Math.round(dragT)} K &nbsp;|&nbsp; x₀ = ${dragX.toFixed(2)}`;
    }

    // Draggable point
    C.drawDot(ctx, xS(dragX), yS(dragT), 6, C.RED);

    // Crosshair
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = 'rgba(139, 34, 82, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(xS(dragX), pad.t);
    ctx.lineTo(xS(dragX), h - pad.b);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(pad.l, yS(dragT));
    ctx.lineTo(w - pad.r, yS(dragT));
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function getCoords(e) {
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    return { x: xS.inv(px), T: yS.inv(py) };
  }

  canvas.addEventListener('mousedown', (e) => {
    dragging = true;
    const c = getCoords(e);
    dragX = c.x;
    dragT = c.T;
    render();
  });

  canvas.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const c = getCoords(e);
    dragX = c.x;
    dragT = c.T;
    render();
  });

  window.addEventListener('mouseup', () => { dragging = false; });

  // Touch support
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    dragging = true;
    const t = e.touches[0];
    const c = getCoords(t);
    dragX = c.x;
    dragT = c.T;
    render();
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (!dragging) return;
    const t = e.touches[0];
    const c = getCoords(t);
    dragX = c.x;
    dragT = c.T;
    render();
  }, { passive: false });

  canvas.addEventListener('touchend', () => { dragging = false; });

  render();
  window.addEventListener('resize', render);
}
