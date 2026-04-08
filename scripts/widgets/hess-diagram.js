/* ==========================================================================
   Hess diagram widget — canvas-rendered reaction triangle
   ========================================================================== */

const BLUE    = '#2a2f7c';
const DARK    = '#1a1d3a';
const MUTED   = '#888';
const BG      = '#e1e0e8';
const MAX_DPR = 2;

/**
 * Draw an arrowhead at the end of a line.
 */
function drawArrow(ctx, fromX, fromY, toX, toY, size = 8) {
  const angle = Math.atan2(toY - fromY, toX - fromX);
  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(
    toX - size * Math.cos(angle - Math.PI / 7),
    toY - size * Math.sin(angle - Math.PI / 7)
  );
  ctx.lineTo(
    toX - size * Math.cos(angle + Math.PI / 7),
    toY - size * Math.sin(angle + Math.PI / 7)
  );
  ctx.closePath();
  ctx.fill();
}

/**
 * Measure and draw text, returning its width for layout purposes.
 */
function drawText(ctx, text, x, y, font, color, align = 'center', baseline = 'middle') {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  ctx.fillText(text, x, y);
  return ctx.measureText(text).width;
}

export function create(container, config) {
  const canvas = document.createElement('canvas');
  canvas.className = 'widget-canvas';
  container.appendChild(canvas);
  container.style.minHeight = 'auto';
  container.style.background = 'transparent';

  const ctx = canvas.getContext('2d');

  function render() {
    const dpr = Math.min(window.devicePixelRatio, MAX_DPR);
    const w = container.clientWidth;
    const h = Math.round(w * 0.48);

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Clear
    ctx.clearRect(0, 0, w, h);

    // Layout
    const padX = 24;
    const topY = h * 0.18;
    const botY = h * 0.72;
    const midX = w * 0.5;
    const leftX = padX + 10;
    const rightX = w - padX - 10;

    const speciesFont = '500 16px "Lora", serif';
    const labelFont = '400 12px "DM Sans", sans-serif';
    const summaryFont = 'italic 12px "Lora", serif';

    // Measure species text widths for arrow offsets
    ctx.font = speciesFont;
    const reactW = ctx.measureText(config.reactants).width;
    const prodW = ctx.measureText(config.products).width;
    const interW = ctx.measureText(config.intermediate).width;

    // Species positions
    const reactX = leftX + reactW / 2;
    const prodX = rightX - prodW / 2;
    const interX = midX;

    // Draw species
    drawText(ctx, config.reactants, reactX, topY, speciesFont, DARK);
    drawText(ctx, config.products, prodX, topY, speciesFont, DARK);
    drawText(ctx, config.intermediate, interX, botY, speciesFont, DARK);

    // Arrow endpoints (offset from text)
    const gap = 14;

    // Arrow 1: horizontal, reactants -> products
    const a1x1 = reactX + reactW / 2 + gap;
    const a1x2 = prodX - prodW / 2 - gap;
    const a1y = topY;

    ctx.strokeStyle = BLUE;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(a1x1, a1y);
    ctx.lineTo(a1x2, a1y);
    ctx.stroke();
    ctx.fillStyle = BLUE;
    drawArrow(ctx, a1x1, a1y, a1x2, a1y);

    // Label above arrow 1
    drawText(ctx, config.direct.label, (a1x1 + a1x2) / 2, a1y - 16, labelFont, BLUE);

    // Arrow 2: reactants -> intermediate (diagonal down-right)
    const a2x1 = reactX + reactW / 2 * 0.5;
    const a2y1 = topY + 14;
    const a2x2 = interX - interW / 2 * 0.5;
    const a2y2 = botY - 14;

    ctx.beginPath();
    ctx.moveTo(a2x1, a2y1);
    ctx.lineTo(a2x2, a2y2);
    ctx.stroke();
    ctx.fillStyle = BLUE;
    drawArrow(ctx, a2x1, a2y1, a2x2, a2y2);

    // Label for arrow 2 (left side)
    const a2mx = (a2x1 + a2x2) / 2 - 12;
    const a2my = (a2y1 + a2y2) / 2;
    drawText(ctx, config.step1.label, a2mx, a2my, labelFont, BLUE, 'right');

    // Arrow 3: intermediate -> products (diagonal up-right)
    const a3x1 = interX + interW / 2 * 0.5;
    const a3y1 = botY - 14;
    const a3x2 = prodX - prodW / 2 * 0.5;
    const a3y2 = topY + 14;

    ctx.beginPath();
    ctx.moveTo(a3x1, a3y1);
    ctx.lineTo(a3x2, a3y2);
    ctx.stroke();
    ctx.fillStyle = BLUE;
    drawArrow(ctx, a3x1, a3y1, a3x2, a3y2);

    // Label for arrow 3 (right side)
    const a3mx = (a3x1 + a3x2) / 2 + 12;
    const a3my = (a3y1 + a3y2) / 2;
    drawText(ctx, config.step2.label, a3mx, a3my, labelFont, BLUE, 'left');

    // Summary equation at bottom
    drawText(ctx, config.summary, midX, h * 0.9, summaryFont, MUTED);
  }

  render();
  window.addEventListener('resize', render);
}
