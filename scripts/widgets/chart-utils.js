/* ==========================================================================
   Shared chart utilities for thermodynamics widgets
   ========================================================================== */

export const BLUE   = '#2a2f7c';
export const LIGHT  = '#4d5cf2';
export const DARK   = '#1a1d3a';
export const MUTED  = '#888';
export const RED    = '#8b2252';
export const FILL_BLUE  = 'rgba(77, 92, 242, 0.12)';
export const FILL_RED   = 'rgba(139, 34, 82, 0.10)';
export const MAX_DPR = 2;

export const LABEL_FONT  = '400 11px "DM Sans", sans-serif';
export const TICK_FONT   = '400 10px "DM Sans", sans-serif';
export const TITLE_FONT  = '500 12px "DM Sans", sans-serif';
export const VALUE_FONT  = '400 13px "Lora", serif';

/**
 * Set up a canvas for hi-dpi rendering. Returns { ctx, w, h }.
 */
export function setupCanvas(canvas, container, aspectRatio = 0.55) {
  const dpr = Math.min(window.devicePixelRatio, MAX_DPR);
  const w = container.clientWidth;
  const h = Math.round(w * aspectRatio);
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  return { ctx, w, h };
}

/**
 * Create a linear scale function.
 */
export function scale(domainMin, domainMax, rangeMin, rangeMax) {
  const m = (rangeMax - rangeMin) / (domainMax - domainMin);
  const fn = v => rangeMin + (v - domainMin) * m;
  fn.inv = px => domainMin + (px - rangeMin) / m;
  fn.domain = [domainMin, domainMax];
  fn.range = [rangeMin, rangeMax];
  return fn;
}

/**
 * Draw axes with labels.
 */
export function drawAxes(ctx, pad, w, h, xLabel, yLabel) {
  ctx.strokeStyle = MUTED;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad.l, pad.t);
  ctx.lineTo(pad.l, h - pad.b);
  ctx.lineTo(w - pad.r, h - pad.b);
  ctx.stroke();

  ctx.font = LABEL_FONT;
  ctx.fillStyle = MUTED;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(xLabel, pad.l + (w - pad.l - pad.r) / 2, h - pad.b + 18);

  ctx.save();
  ctx.translate(14, pad.t + (h - pad.t - pad.b) / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textBaseline = 'top';
  ctx.fillText(yLabel, 0, 0);
  ctx.restore();
}

/**
 * Draw a curve from an array of {x, y} screen points.
 */
export function strokeCurve(ctx, pts, color = BLUE, lineWidth = 2) {
  if (pts.length < 2) return;
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.stroke();
}

/**
 * Fill area under a curve down to a baseline y.
 */
export function fillUnder(ctx, pts, baseY, color = FILL_BLUE) {
  if (pts.length < 2) return;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, baseY);
  for (const pt of pts) ctx.lineTo(pt.x, pt.y);
  ctx.lineTo(pts[pts.length - 1].x, baseY);
  ctx.closePath();
  ctx.fill();
}

/**
 * Fill area between two curves.
 */
export function fillBetween(ctx, pts1, pts2, color = FILL_BLUE) {
  if (pts1.length < 2) return;
  ctx.fillStyle = color;
  ctx.beginPath();
  for (const pt of pts1) ctx.lineTo(pt.x, pt.y);
  for (let i = pts2.length - 1; i >= 0; i--) ctx.lineTo(pts2[i].x, pts2[i].y);
  ctx.closePath();
  ctx.fill();
}

/**
 * Draw a dot at screen coordinates.
 */
export function drawDot(ctx, x, y, r = 4, color = BLUE) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Draw a dashed vertical line.
 */
export function dashedVLine(ctx, x, y1, y2, color = MUTED) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(x, y1);
  ctx.lineTo(x, y2);
  ctx.stroke();
  ctx.setLineDash([]);
}

/**
 * Draw a dashed horizontal line.
 */
export function dashedHLine(ctx, y, x1, x2, color = MUTED) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(x1, y);
  ctx.lineTo(x2, y);
  ctx.stroke();
  ctx.setLineDash([]);
}

/**
 * Generate points along a function f(x) mapped to screen coords.
 */
export function sampleCurve(xScale, yScale, f, steps = 100) {
  const [xMin, xMax] = xScale.domain;
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const x = xMin + (xMax - xMin) * i / steps;
    const y = f(x);
    if (isFinite(y)) pts.push({ x: xScale(x), y: yScale(y), vx: x, vy: y });
  }
  return pts;
}

/**
 * Standard widget container setup: canvas + controls div.
 */
export function createWidgetShell(container, aspectRatio = 0.55) {
  container.style.minHeight = 'auto';
  container.style.background = '#e1e0e8';

  const canvas = document.createElement('canvas');
  canvas.className = 'widget-canvas';
  container.appendChild(canvas);

  return canvas;
}
