/* ==========================================================================
   Halftone renderer — canvas factory for animated dot compositions
   ========================================================================== */

import { hashNoise } from './noise.js';

const SPECKLE_COLOUR = { r: 42, g: 47, b: 124 };   // --blue base
const SPECKLE_SEED   = 42;
const SPECKLE_THRESH = 0.75;
const GRAIN_ALPHA    = 45;
const SCAN_LINE_GAP  = 3;
const MAX_DPR        = 2;

/**
 * Pre-render a speckle texture onto an offscreen canvas.
 * Sparse lighter-blue pixels over flat --blue for paper-like tooth.
 */
function renderSpeckle(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#2a2f7c';
  ctx.fillRect(0, 0, width, height);

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const px = (i / 4) % width;
    const py = Math.floor((i / 4) / width);
    const n = hashNoise(px * 0.5 + SPECKLE_SEED, py * 0.5 + SPECKLE_SEED * 0.3);

    if (n > SPECKLE_THRESH) {
      const b = 0.1 + n * 0.15;
      data[i]     = Math.min(255, SPECKLE_COLOUR.r + b * 30);
      data[i + 1] = Math.min(255, SPECKLE_COLOUR.g + b * 35);
      data[i + 2] = Math.min(255, SPECKLE_COLOUR.b + b * 50);
      data[i + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

/**
 * Pre-render a static film grain texture (luminosity composite).
 */
function renderGrain(width, height, seedX = 77, seedY = 33) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const px = (i / 4) % width;
    const py = Math.floor((i / 4) / width);
    const v = hashNoise(px + seedX, py + seedY) * 60;
    data[i]     = v;
    data[i + 1] = v;
    data[i + 2] = v;
    data[i + 3] = GRAIN_ALPHA;
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

/**
 * Draw faint horizontal scan lines.
 */
function drawScanLines(ctx, width, height) {
  ctx.fillStyle = 'rgba(0, 0, 30, 0.02)';
  for (let y = 0; y < height; y += SCAN_LINE_GAP) {
    ctx.fillRect(0, y, width, 1);
  }
}

/**
 * Build a dot grid for a given area and spacing.
 */
function buildDotGrid(width, height, spacing) {
  const dots = [];
  for (let x = 0; x < width + spacing; x += spacing) {
    for (let y = 0; y < height + spacing; y += spacing) {
      dots.push({ x, y });
    }
  }
  return dots;
}

/**
 * Create an animated halftone renderer bound to a canvas element.
 *
 * @param {HTMLCanvasElement} canvas  — target canvas
 * @param {Object} config
 * @param {number}   config.spacing   — dot grid spacing (px)
 * @param {number}   config.maxRadius — maximum dot radius (px)
 * @param {Function} config.field     — (x, y, w, h, time) => 0..1
 * @param {boolean}  [config.static]  — render once and stop (no animation loop)
 * @returns {{ destroy: Function }} — call destroy() to stop and clean up
 */
export function createHalftoneRenderer(canvas, config) {
  const ctx = canvas.getContext('2d');
  let w, h, dots, speckle, grain, animId;
  let time = 0;

  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio, MAX_DPR);

    w = rect.width;
    h = rect.height;

    canvas.width  = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width  = w + 'px';
    canvas.style.height = h + 'px';
    ctx.scale(dpr, dpr);

    speckle = renderSpeckle(w, h);
    grain   = renderGrain(w, h);
    dots    = buildDotGrid(w, h, config.spacing || 12);
  }

  function draw() {
    if (!config.static) time += 0.0016;

    // Layer 1: speckle base
    ctx.drawImage(speckle, 0, 0, w, h);

    // Layer 2: halftone dots
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    const maxR = config.maxRadius || 4;

    for (const dot of dots) {
      const val = config.field(dot.x, dot.y, w, h, time);
      if (val > 0.05) {
        const r = config.static
          ? val * maxR
          : val * maxR * (1 + Math.sin(time * 0.4 + dot.x * 0.005 + dot.y * 0.007) * 0.08);
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Layer 3: film grain (luminosity)
    ctx.globalCompositeOperation = 'luminosity';
    ctx.drawImage(grain, 0, 0);
    ctx.globalCompositeOperation = 'source-over';

    // Layer 4: scan lines
    drawScanLines(ctx, w, h);

    if (!config.static) animId = requestAnimationFrame(draw);
  }

  function onResize() {
    cancelAnimationFrame(animId);
    resize();
    draw();
  }

  // Initialise
  resize();
  draw();
  window.addEventListener('resize', onResize);

  // Public API
  return {
    destroy() {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
    }
  };
}
