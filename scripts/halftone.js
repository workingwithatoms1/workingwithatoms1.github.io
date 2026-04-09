/* ==========================================================================
   Halftone renderer — canvas factory for static dot compositions
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
 * Pre-render a combined overlay (grain + scan lines) for fast per-frame compositing.
 */
function renderOverlay(width, height, seedX = 77, seedY = 33) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // Grain
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

  // Scan lines baked in
  ctx.fillStyle = 'rgba(0, 0, 30, 0.02)';
  for (let y = 0; y < height; y += SCAN_LINE_GAP) {
    ctx.fillRect(0, y, width, 1);
  }

  return canvas;
}

/**
 * Create a static halftone renderer bound to a canvas element.
 * Renders once on init and re-renders on window resize.
 *
 * @param {HTMLCanvasElement} canvas  — target canvas
 * @param {Object} config
 * @param {number}   config.spacing   — dot grid spacing (px)
 * @param {number}   config.maxRadius — maximum dot radius (px)
 * @param {Function} config.field     — (x, y, w, h, time) => 0..1
 * @returns {{ destroy: Function }} — call destroy() to stop and clean up
 */
export function createHalftoneRenderer(canvas, config) {
  const ctx = canvas.getContext('2d');
  let w, h, dots, speckle, overlay;

  function render() {
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
    overlay = renderOverlay(w, h);
    dots    = buildDotGrid(w, h, config.spacing || 12);

    // Layer 1: speckle base
    ctx.drawImage(speckle, 0, 0, w, h);

    // Layer 2: halftone dots — single batched path
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    const maxR = config.maxRadius || 4;
    const TWO_PI = Math.PI * 2;

    ctx.beginPath();
    for (let i = 0, len = dots.length; i < len; i++) {
      const dot = dots[i];
      const val = config.field(dot.x, dot.y, w, h, 0);
      if (val > 0.05) {
        const r = val * maxR;
        ctx.moveTo(dot.x + r, dot.y);
        ctx.arc(dot.x, dot.y, r, 0, TWO_PI);
      }
    }
    ctx.fill();

    // Layer 3: grain + scan lines (pre-composited overlay)
    ctx.globalCompositeOperation = 'luminosity';
    ctx.drawImage(overlay, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
  }

  // Initialise
  render();
  window.addEventListener('resize', render);

  return {
    destroy() {
      window.removeEventListener('resize', render);
    }
  };
}
