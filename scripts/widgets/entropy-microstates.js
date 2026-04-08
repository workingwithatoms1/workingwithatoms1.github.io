/* ==========================================================================
   Entropy microstates — free expansion visualisation
   Shows particles in a box. Toggle partition to see expansion.
   Counts accessible microstates and entropy change.
   ========================================================================== */

import * as C from './chart-utils.js';

export function create(container) {
  const canvas = C.createWidgetShell(container, 0.4);
  const ctx = canvas.getContext('2d');

  const controls = document.createElement('div');
  controls.className = 'widget-controls';
  controls.innerHTML = `
    <button class="widget-label" id="wToggle" style="cursor:pointer;border:1px solid #2a2f7c;padding:4px 12px;background:none;color:#2a2f7c">Remove partition</button>
    <span class="widget-value" id="wInfo" style="flex:1;text-align:right">N = 20 particles in ½ box</span>
  `;
  container.appendChild(controls);
  const toggleBtn = controls.querySelector('#wToggle');
  const infoSpan = controls.querySelector('#wInfo');

  const N = 20;
  let partitioned = true;
  let particles = [];
  let animId;

  function initParticles(halfOnly) {
    particles = [];
    for (let i = 0; i < N; i++) {
      particles.push({
        x: halfOnly ? Math.random() * 0.45 + 0.025 : Math.random() * 0.95 + 0.025,
        y: Math.random() * 0.85 + 0.075,
        vx: (Math.random() - 0.5) * 0.003,
        vy: (Math.random() - 0.5) * 0.003,
      });
    }
  }

  initParticles(true);

  function simulate(boxWidth) {
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0.025) { p.x = 0.025; p.vx *= -1; }
      if (p.x > boxWidth) { p.x = boxWidth; p.vx *= -1; }
      if (p.y < 0.075) { p.y = 0.075; p.vy *= -1; }
      if (p.y > 0.925) { p.y = 0.925; p.vy *= -1; }
    }
  }

  function render() {
    const dpr = Math.min(window.devicePixelRatio, C.MAX_DPR);
    const w = container.clientWidth;
    const h = Math.round(w * 0.4);
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const boxL = 20, boxT = 10;
    const boxW = w - 40, boxH = h - 20;

    // Box outline
    ctx.strokeStyle = C.BLUE;
    ctx.lineWidth = 2;
    ctx.strokeRect(boxL, boxT, boxW, boxH);

    // Partition
    if (partitioned) {
      ctx.strokeStyle = C.BLUE;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(boxL + boxW / 2, boxT);
      ctx.lineTo(boxL + boxW / 2, boxT + boxH);
      ctx.stroke();

      // "Vacuum" label on right side
      ctx.font = C.TITLE_FONT;
      ctx.fillStyle = 'rgba(42,47,124,0.2)';
      ctx.textAlign = 'center';
      ctx.fillText('Vacuum', boxL + boxW * 0.75, boxT + boxH / 2 + 5);
    }

    // Simulate
    const boxRight = partitioned ? 0.475 : 0.975;
    simulate(boxRight);

    // Draw particles
    ctx.fillStyle = C.BLUE;
    for (const p of particles) {
      const px = boxL + p.x * boxW;
      const py = boxT + p.y * boxH;
      ctx.beginPath();
      ctx.arc(px, py, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Info
    if (partitioned) {
      infoSpan.textContent = `${N} particles in ½V. Ω ∝ (½V)^N`;
    } else {
      infoSpan.textContent = `${N} particles in V. Ω ∝ V^N.  ΔS = NkB ln2`;
    }

    animId = requestAnimationFrame(render);
  }

  toggleBtn.addEventListener('click', () => {
    partitioned = !partitioned;
    toggleBtn.textContent = partitioned ? 'Remove partition' : 'Replace partition';
    if (partitioned) initParticles(true);
  });

  render();

  return {
    destroy() { cancelAnimationFrame(animId); }
  };
}
