/* ==========================================================================
   Site background — full-page static canvas (renders once, no animation)
   Caches the result in sessionStorage so it persists across page navigations.
   ========================================================================== */

import { hashNoise } from './noise.js';

const SPECKLE_SEED = 42;
const GRAIN_SEED   = 11;
const MAX_DPR      = 2;
const CACHE_KEY_PREFIX = 'siteBg_';

/**
 * Initialise the fixed site background canvas.
 * On first load, renders speckle + grain + scan lines and caches the image.
 * On subsequent loads at the same viewport size, restores from cache instantly.
 */
export function initSiteBackground(canvasId = 'siteBgCanvas') {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const ctx = canvas.getContext('2d');

  function setup() {
    const dpr = Math.min(window.devicePixelRatio, MAX_DPR);
    const w = window.innerWidth;
    const h = window.innerHeight;
    const pw = w * dpr;
    const ph = h * dpr;

    canvas.width  = pw;
    canvas.height = ph;
    canvas.style.width  = w + 'px';
    canvas.style.height = h + 'px';

    const cacheKey = CACHE_KEY_PREFIX + pw + 'x' + ph;

    // Try restoring from cache
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const img = new Image();
        img.onload = () => ctx.drawImage(img, 0, 0);
        img.src = cached;
        return;
      }
    } catch (e) { /* sessionStorage unavailable or quota — fall through */ }

    // No cache — render from scratch
    ctx.scale(dpr, dpr);
    renderBackground(ctx, w, h);

    // Cache for next page load
    try {
      // Clear any old sizes first
      for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith(CACHE_KEY_PREFIX)) {
          sessionStorage.removeItem(key);
        }
      }
      sessionStorage.setItem(cacheKey, canvas.toDataURL('image/jpeg', 0.85));
    } catch (e) { /* quota exceeded — no problem, just skip */ }
  }

  function renderBackground(ctx, w, h) {
    // Speckle
    const speckle = document.createElement('canvas');
    speckle.width = w;
    speckle.height = h;
    const sCtx = speckle.getContext('2d');
    sCtx.fillStyle = '#2a2f7c';
    sCtx.fillRect(0, 0, w, h);

    const sd = sCtx.getImageData(0, 0, w, h);
    const sd_data = sd.data;
    for (let i = 0; i < sd_data.length; i += 4) {
      const px = (i / 4) % w;
      const py = Math.floor((i / 4) / w);
      const n = hashNoise(px * 0.5 + SPECKLE_SEED, py * 0.5 + SPECKLE_SEED * 0.3);
      if (n > 0.75) {
        const b = 0.1 + n * 0.15;
        sd_data[i]     = Math.min(255, 42 + b * 30);
        sd_data[i + 1] = Math.min(255, 47 + b * 35);
        sd_data[i + 2] = Math.min(255, 124 + b * 50);
        sd_data[i + 3] = 255;
      }
    }
    sCtx.putImageData(sd, 0, 0);

    // Grain
    const grain = document.createElement('canvas');
    grain.width = w;
    grain.height = h;
    const gCtx = grain.getContext('2d');
    const gd = gCtx.createImageData(w, h);
    const gd_data = gd.data;
    for (let i = 0; i < gd_data.length; i += 4) {
      const px = (i / 4) % w;
      const py = Math.floor((i / 4) / w);
      const v = hashNoise(px + GRAIN_SEED, py + GRAIN_SEED * 2) * 60;
      gd_data[i]     = v;
      gd_data[i + 1] = v;
      gd_data[i + 2] = v;
      gd_data[i + 3] = 45;
    }
    gCtx.putImageData(gd, 0, 0);

    // Composite
    ctx.drawImage(speckle, 0, 0, w, h);
    ctx.globalCompositeOperation = 'luminosity';
    ctx.drawImage(grain, 0, 0);
    ctx.globalCompositeOperation = 'source-over';

    // Scan lines
    ctx.fillStyle = 'rgba(0, 0, 30, 0.02)';
    for (let sy = 0; sy < h; sy += 3) {
      ctx.fillRect(0, sy, w, 1);
    }
  }

  setup();
  window.addEventListener('resize', setup);
}
