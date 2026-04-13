/* ==========================================================================
   Random-walk polymer chain widget
   Visualises a 2D random walk representing a polymer chain.
   Each segment has fixed bond length l = 1.
   Shows measured end-to-end distance R vs theoretical <R^2>^{1/2} = l*sqrt(N).
   ========================================================================== */

import * as C from './chart-utils.js';

/**
 * Generate a 2D random walk with N segments of length l starting at origin.
 * Returns array of {x, y} with N+1 points.
 */
function generateChain(N, l) {
  const pts = [{ x: 0, y: 0 }];
  for (let i = 0; i < N; i++) {
    const theta = Math.random() * 2 * Math.PI;
    const prev = pts[pts.length - 1];
    pts.push({
      x: prev.x + l * Math.cos(theta),
      y: prev.y + l * Math.sin(theta),
    });
  }
  return pts;
}

/**
 * Linearly interpolate between two hex colours.
 */
function lerpColor(hex1, hex2, t) {
  const r1 = parseInt(hex1.slice(1, 3), 16);
  const g1 = parseInt(hex1.slice(3, 5), 16);
  const b1 = parseInt(hex1.slice(5, 7), 16);
  const r2 = parseInt(hex2.slice(1, 3), 16);
  const g2 = parseInt(hex2.slice(3, 5), 16);
  const b2 = parseInt(hex2.slice(5, 7), 16);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `rgb(${r},${g},${b})`;
}

export function create(container) {
  const canvas = C.createWidgetShell(container, 0.6);

  /* ---- State ---- */
  let N = 100;
  const l = 1;
  let chain = generateChain(N, l);

  /* ---- Controls ---- */
  const controls = document.createElement('div');
  controls.style.cssText =
    'padding: 8px 16px; display: flex; flex-wrap: wrap; gap: 12px; ' +
    'align-items: center; font-family: "DM Sans", sans-serif; ' +
    'font-size: 12px; color: #3a3d5a;';
  controls.innerHTML = `
    <label style="display:flex;align-items:center;gap:6px;">
      N <input type="range" min="10" max="500" value="100" id="poly-n"
              style="width:140px;accent-color:#2a2f7c;">
      <span id="poly-n-val" style="min-width:36px;">100</span>
    </label>
    <button id="poly-new" style="cursor:pointer;border:1px solid #2a2f7c;
      padding:4px 12px;background:none;color:#2a2f7c;border-radius:3px;
      font-family:'DM Sans',sans-serif;font-size:12px;">New chain</button>
  `;
  container.appendChild(controls);

  const nSlider = controls.querySelector('#poly-n');
  const nVal    = controls.querySelector('#poly-n-val');
  const newBtn  = controls.querySelector('#poly-new');

  const pad = { l: 20, r: 20, t: 20, b: 50 };

  /* ---- Render ---- */
  function render() {
    const { ctx, w, h } = C.setupCanvas(canvas, container, 0.6);

    const start = chain[0];
    const end   = chain[chain.length - 1];
    const dx    = end.x - start.x;
    const dy    = end.y - start.y;
    const R     = Math.sqrt(dx * dx + dy * dy);
    const Rrms  = l * Math.sqrt(N);

    /* --- Determine bounding box (chain + RMS circle) --- */
    let xMin = Infinity, xMax = -Infinity;
    let yMin = Infinity, yMax = -Infinity;
    for (const p of chain) {
      if (p.x < xMin) xMin = p.x;
      if (p.x > xMax) xMax = p.x;
      if (p.y < yMin) yMin = p.y;
      if (p.y > yMax) yMax = p.y;
    }
    // Include the RMS circle centred on start
    xMin = Math.min(xMin, start.x - Rrms);
    xMax = Math.max(xMax, start.x + Rrms);
    yMin = Math.min(yMin, start.y - Rrms);
    yMax = Math.max(yMax, start.y + Rrms);

    // Add padding in data space (5%)
    const spanX = xMax - xMin || 1;
    const spanY = yMax - yMin || 1;
    const margin = 0.05;
    xMin -= spanX * margin;
    xMax += spanX * margin;
    yMin -= spanY * margin;
    yMax += spanY * margin;

    /* --- Equal-aspect scaling --- */
    const plotW = w - pad.l - pad.r;
    const plotH = h - pad.t - pad.b;
    const dataW = xMax - xMin;
    const dataH = yMax - yMin;
    const scaleVal = Math.min(plotW / dataW, plotH / dataH);

    // Centre the plot within the available area
    const usedW = dataW * scaleVal;
    const usedH = dataH * scaleVal;
    const offX  = pad.l + (plotW - usedW) / 2;
    const offY  = pad.t + (plotH - usedH) / 2;

    function toScreenX(v) { return offX + (v - xMin) * scaleVal; }
    function toScreenY(v) { return offY + (yMax - v) * scaleVal; }  // flip y

    /* --- Background fill for plot area --- */
    ctx.fillStyle = '#e1e0e8';
    ctx.fillRect(0, 0, w, h);

    /* --- RMS circle (dashed) centred on start --- */
    const cx = toScreenX(start.x);
    const cy = toScreenY(start.y);
    const rPx = Rrms * scaleVal;
    ctx.strokeStyle = C.MUTED;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.arc(cx, cy, rPx, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    /* --- Chain segments with colour gradient --- */
    const nSeg = chain.length - 1;
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    for (let i = 0; i < nSeg; i++) {
      const t = nSeg > 1 ? i / (nSeg - 1) : 0;
      ctx.strokeStyle = lerpColor(C.BLUE, C.RED, t);
      ctx.beginPath();
      ctx.moveTo(toScreenX(chain[i].x), toScreenY(chain[i].y));
      ctx.lineTo(toScreenX(chain[i + 1].x), toScreenY(chain[i + 1].y));
      ctx.stroke();
    }

    /* --- End-to-end vector (dashed) --- */
    const sx = toScreenX(start.x);
    const sy = toScreenY(start.y);
    const ex = toScreenX(end.x);
    const ey = toScreenY(end.y);
    ctx.strokeStyle = C.DARK;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.setLineDash([]);

    /* --- Start and end dots --- */
    C.drawDot(ctx, sx, sy, 5, C.BLUE);
    C.drawDot(ctx, ex, ey, 5, C.RED);

    /* --- Text readout --- */
    ctx.font = C.VALUE_FONT;
    ctx.textAlign = 'left';
    ctx.fillStyle = C.DARK;
    ctx.fillText(
      `R = ${R.toFixed(2)}`,
      pad.l + 6,
      h - pad.b + 24
    );
    ctx.fillText(
      `R\u1D63\u2098\u209B = l\u221AN = ${Rrms.toFixed(2)}`,
      pad.l + 6,
      h - pad.b + 42
    );

    /* --- RMS circle label --- */
    ctx.font = C.LABEL_FONT;
    ctx.fillStyle = C.MUTED;
    ctx.textAlign = 'center';
    ctx.fillText('l\u221AN', cx + rPx + 2, cy - 6);

    /* --- Ratio label on right side --- */
    ctx.font = C.VALUE_FONT;
    ctx.textAlign = 'right';
    ctx.fillStyle = C.DARK;
    ctx.fillText(
      `R / R\u1D63\u2098\u209B = ${(R / Rrms).toFixed(2)}`,
      w - pad.r - 6,
      h - pad.b + 24
    );
    ctx.fillText(
      `N = ${N}`,
      w - pad.r - 6,
      h - pad.b + 42
    );
  }

  /* ---- Event wiring ---- */
  function regenerate() {
    N = parseInt(nSlider.value);
    nVal.textContent = N;
    chain = generateChain(N, l);
    render();
  }

  nSlider.addEventListener('input', regenerate);
  newBtn.addEventListener('click', () => {
    chain = generateChain(N, l);
    render();
  });

  render();
  window.addEventListener('resize', render);
}
