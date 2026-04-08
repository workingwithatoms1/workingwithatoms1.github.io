/* ==========================================================================
   Kirchhoff's law diagram — canvas-rendered thermodynamic cycle

   Shows a reaction at T₁ and T₂, connected by Cp integrations,
   forming a closed cycle that demonstrates Kirchhoff's law.

        Reactants(T₂) ----ΔH(T₂)----> Products(T₂)
             ^                              ^
             |                              |
        ∫Cp(react)dT                  ∫Cp(prod)dT
             |                              |
        Reactants(T₁) ----ΔH(T₁)----> Products(T₁)
   ========================================================================== */

const BLUE    = '#2a2f7c';
const DARK    = '#1a1d3a';
const MUTED   = '#888';
const MAX_DPR = 2;

function drawArrow(ctx, x1, y1, x2, y2, size = 7) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  // Shaft
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  // Head
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(
    x2 - size * Math.cos(angle - Math.PI / 7),
    y2 - size * Math.sin(angle - Math.PI / 7)
  );
  ctx.lineTo(
    x2 - size * Math.cos(angle + Math.PI / 7),
    y2 - size * Math.sin(angle + Math.PI / 7)
  );
  ctx.closePath();
  ctx.fill();
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
    const h = Math.round(w * 0.52);

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    // Layout
    const padX = 40;
    const padY = 36;
    const topY = padY + 16;
    const botY = h - padY - 16;
    const leftX = padX;
    const rightX = w - padX;
    const midTopY = topY;
    const midBotY = botY;

    const speciesFont = '500 15px "Lora", serif';
    const labelFont = '400 12px "DM Sans", sans-serif';
    const tempFont = '500 13px "DM Sans", sans-serif';

    ctx.strokeStyle = BLUE;
    ctx.fillStyle = BLUE;
    ctx.lineWidth = 1.5;

    // Species labels
    const reactLabel = config.reactants || 'Reactants';
    const prodLabel = config.products || 'Products';
    const t1 = config.T1 || 'T₁';
    const t2 = config.T2 || 'T₂';

    // Measure text for positioning
    ctx.font = speciesFont;
    const reactW = ctx.measureText(reactLabel).width;
    const prodW = ctx.measureText(prodLabel).width;

    // Node positions (centres of text blocks)
    const blX = leftX + reactW / 2 + 8;   // bottom-left
    const brX = rightX - prodW / 2 - 8;   // bottom-right
    const tlX = blX;                        // top-left
    const trX = brX;                        // top-right

    // Draw species at four corners
    ctx.font = speciesFont;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = DARK;

    ctx.fillText(reactLabel + '(' + t2 + ')', tlX, midTopY);
    ctx.fillText(prodLabel + '(' + t2 + ')', trX, midTopY);
    ctx.fillText(reactLabel + '(' + t1 + ')', blX, midBotY);
    ctx.fillText(prodLabel + '(' + t1 + ')', brX, midBotY);

    // Arrow geometry: offset from text
    const hGap = 18;
    const vGap = 18;

    ctx.strokeStyle = BLUE;
    ctx.fillStyle = BLUE;
    ctx.lineWidth = 1.5;

    // Horizontal arrows (reactions)
    // Bottom: ΔH(T₁)
    const bAx1 = blX + reactW / 2 + hGap + 16;
    const bAx2 = brX - prodW / 2 - hGap - 16;
    drawArrow(ctx, bAx1, midBotY, bAx2, midBotY);

    ctx.font = labelFont;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = BLUE;
    ctx.fillText(config.bottomLabel || 'ΔH(T₁)', (bAx1 + bAx2) / 2, midBotY - 10);

    // Top: ΔH(T₂)
    const tAx1 = tlX + reactW / 2 + hGap + 16;
    const tAx2 = trX - prodW / 2 - hGap - 16;
    drawArrow(ctx, tAx1, midTopY, tAx2, midTopY);

    ctx.fillStyle = BLUE;
    ctx.textBaseline = 'bottom';
    ctx.fillText(config.topLabel || 'ΔH(T₂)', (tAx1 + tAx2) / 2, midTopY - 10);

    // Vertical arrows (heating)
    const lAy1 = midBotY - vGap - 4;
    const lAy2 = midTopY + vGap + 4;

    // Left: reactants T₁ → T₂
    const lAx = blX - reactW / 2 + 6;
    drawArrow(ctx, lAx, lAy1, lAx, lAy2);

    // Label left arrow
    ctx.save();
    ctx.translate(lAx - 10, (lAy1 + lAy2) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.font = labelFont;
    ctx.fillStyle = BLUE;
    ctx.fillText(config.leftLabel || '∫Cₚ(react)dT', 0, -4);
    ctx.restore();

    // Right: products T₁ → T₂
    const rAx = brX + prodW / 2 - 6;
    drawArrow(ctx, rAx, lAy1, rAx, lAy2);

    ctx.save();
    ctx.translate(rAx + 10, (lAy1 + lAy2) / 2);
    ctx.rotate(Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.font = labelFont;
    ctx.fillStyle = BLUE;
    ctx.fillText(config.rightLabel || '∫Cₚ(prod)dT', 0, -4);
    ctx.restore();

    // Summary at bottom
    if (config.summary) {
      ctx.font = 'italic 12px "Lora", serif';
      ctx.fillStyle = MUTED;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(config.summary, w / 2, midBotY + 26);
    }
  }

  render();
  window.addEventListener('resize', render);
}
