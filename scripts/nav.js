/* ==========================================================================
   Nav — scroll behaviour + halftone canvas background
   ========================================================================== */

import { hashNoise } from './noise.js';
import { createNavField } from './fields.js';

const MAX_DPR      = 2;
const DOT_SPACING  = 10;
const DOT_RADIUS   = 5;
const SPECKLE_SEED = 42;

/**
 * Initialise the nav scroll toggle and its halftone background canvas.
 */
export function initNav() {
  const navEl   = document.querySelector('nav');
  const heroEl  = document.querySelector('.hero');
  const canvas  = document.getElementById('navCanvas');
  if (!navEl || !canvas) return;

  const ctx = canvas.getContext('2d');
  const navField = createNavField();

  let w, h, fullH, speckle, grain, dots;
  let navTime = 0;

  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    const dpr  = Math.min(window.devicePixelRatio, MAX_DPR);

    w = rect.width;
    h = rect.height;
    fullH = w * 0.6;   // virtual height for hero ribbon field

    canvas.width  = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width  = w + 'px';
    canvas.style.height = h + 'px';
    ctx.scale(dpr, dpr);

    // Speckle
    speckle = document.createElement('canvas');
    speckle.width = w;
    speckle.height = fullH;
    const sCtx = speckle.getContext('2d');
    sCtx.fillStyle = '#2a2f7c';
    sCtx.fillRect(0, 0, w, fullH);
    const sd = sCtx.getImageData(0, 0, w, fullH);
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
    grain = document.createElement('canvas');
    grain.width = w;
    grain.height = h;
    const gCtx = grain.getContext('2d');
    const gd = gCtx.createImageData(w, h);
    const gd_data = gd.data;
    for (let i = 0; i < gd_data.length; i += 4) {
      const px = (i / 4) % w;
      const py = Math.floor((i / 4) / w);
      const v = hashNoise(px + 99, py + 55) * 60;
      gd_data[i]     = v;
      gd_data[i + 1] = v;
      gd_data[i + 2] = v;
      gd_data[i + 3] = 45;
    }
    gCtx.putImageData(gd, 0, 0);

    // Dot grid (covers full virtual height so ribbon is complete)
    dots = [];
    for (let x = 0; x < w + DOT_SPACING; x += DOT_SPACING) {
      for (let y = 0; y < fullH + DOT_SPACING; y += DOT_SPACING) {
        dots.push({ x, y });
      }
    }

    draw();
  }

  function draw() {
    navTime += 0.0016;

    // Speckle base (clip to nav height)
    ctx.drawImage(speckle, 0, 0, w, h, 0, 0, w, h);

    // Halftone dots with text avoidance zones
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';

    const logoZone  = { x: 200,      y: h * 0.5, rx: 220,     ry: h * 0.7 };
    const linksZone = { x: w * 0.75, y: h * 0.5, rx: w * 0.3, ry: h * 0.7 };

    for (const dot of dots) {
      if (dot.y > h + 10) continue;

      let val = navField(dot.x, dot.y, w, fullH, navTime);

      // Elliptical exclusion with quadratic falloff
      const logoDist  = Math.sqrt(
        Math.pow((dot.x - logoZone.x)  / logoZone.rx,  2) +
        Math.pow((dot.y - logoZone.y)  / logoZone.ry,  2)
      );
      const linksDist = Math.sqrt(
        Math.pow((dot.x - linksZone.x) / linksZone.rx, 2) +
        Math.pow((dot.y - linksZone.y) / linksZone.ry, 2)
      );
      val *= Math.pow(Math.min(1, Math.min(logoDist, linksDist)), 2);

      if (val > 0.05) {
        const r = val * DOT_RADIUS;
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Grain + scan lines
    ctx.globalCompositeOperation = 'luminosity';
    ctx.drawImage(grain, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(0, 0, 30, 0.02)';
    for (let sy = 0; sy < h; sy += 3) {
      ctx.fillRect(0, sy, w, 1);
    }

    requestAnimationFrame(draw);
  }

  // Scroll toggle
  if (heroEl) {
    window.addEventListener('scroll', () => {
      const heroBottom = heroEl.offsetTop + heroEl.offsetHeight - 80;
      navEl.classList.toggle('scrolled', window.scrollY > heroBottom);
    }, { passive: true });
  }

  resize();
  window.addEventListener('resize', resize);

  // Mobile hamburger toggle
  const toggle = navEl.querySelector('.nav-toggle');
  if (toggle) {
    toggle.addEventListener('click', () => {
      navEl.classList.toggle('nav-open');
    });
    // Close menu when a link is tapped
    navEl.querySelectorAll('.nav-links a').forEach(link => {
      link.addEventListener('click', () => {
        navEl.classList.remove('nav-open');
      });
    });
  }
}
