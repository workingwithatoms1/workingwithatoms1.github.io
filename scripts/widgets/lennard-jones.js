/* ==========================================================================
   Lennard-Jones interatomic potential widget
   Interactive plot: drag ε and σ to see the potential, force, and key points.
   ========================================================================== */

import * as C from './chart-utils.js';

export function create(container) {
  const canvas = C.createWidgetShell(container, 0.55);
  const ctx = canvas.getContext('2d');

  let epsilon = 0.01;  // eV (default: argon)
  let sigma = 3.40;    // Å

  // Controls
  const controls = document.createElement('div');
  controls.style.cssText = 'padding: 8px 16px; display: flex; flex-wrap: wrap; gap: 12px; align-items: center; font-family: "DM Sans", sans-serif; font-size: 12px; color: #3a3d5a;';
  controls.innerHTML = `
    <label style="display:flex;align-items:center;gap:6px;">
      \u03b5 <input type="range" min="1" max="400" value="10" id="lj-eps" style="width:100px;accent-color:#2a2f7c;">
      <span id="lj-eps-val" style="min-width:60px;">0.010 eV</span>
    </label>
    <label style="display:flex;align-items:center;gap:6px;">
      \u03c3 <input type="range" min="200" max="500" value="340" id="lj-sig" style="width:100px;accent-color:#2a2f7c;">
      <span id="lj-sig-val" style="min-width:50px;">3.40 \u00c5</span>
    </label>
    <select id="lj-preset" style="padding:3px 6px;font-size:11px;border:1px solid #c8c6d0;background:#fff;color:#3a3d5a;">
      <option value="">Preset...</option>
      <option value="0.0104,3.40">Ar</option>
      <option value="0.067,2.56">Ne</option>
      <option value="0.31,2.74">N\u2082</option>
      <option value="0.41,2.93">Fe (approx)</option>
      <option value="3.6,1.54">C-C (approx)</option>
    </select>
  `;
  container.appendChild(controls);

  const epsSlider = controls.querySelector('#lj-eps');
  const sigSlider = controls.querySelector('#lj-sig');
  const epsVal = controls.querySelector('#lj-eps-val');
  const sigVal = controls.querySelector('#lj-sig-val');
  const preset = controls.querySelector('#lj-preset');

  function lj(r) {
    const s = sigma / r;
    const s6 = s * s * s * s * s * s;
    return 4 * epsilon * (s6 * s6 - s6);
  }

  function ljForce(r) {
    const s = sigma / r;
    const s6 = s * s * s * s * s * s;
    return 24 * epsilon / r * (2 * s6 * s6 - s6);
  }

  function render() {
    const { ctx: c, w, h } = C.setupCanvas(canvas, container, 0.55);

    const pad = { l: 56, r: 20, t: 20, b: 44 };
    const r0 = sigma * Math.pow(2, 1/6);
    const rMin = sigma * 0.88;
    const rMax = sigma * 2.8;
    const eMin = -epsilon * 1.3;
    const eMax = epsilon * 1.5;

    const xS = C.scale(rMin, rMax, pad.l, w - pad.r);
    const yS = C.scale(eMin, eMax, h - pad.b, pad.t);

    // Grid
    c.strokeStyle = 'rgba(0,0,0,0.05)';
    c.lineWidth = 0.6;
    // Zero line
    c.strokeStyle = 'rgba(0,0,0,0.15)';
    c.beginPath();
    c.moveTo(pad.l, yS(0));
    c.lineTo(w - pad.r, yS(0));
    c.stroke();

    // Potential curve
    const pts = [];
    for (let i = 0; i <= 200; i++) {
      const r = rMin + (rMax - rMin) * i / 200;
      const e = lj(r);
      if (e < eMax * 3) {
        pts.push({ x: xS(r), y: yS(Math.max(eMin, Math.min(eMax, e))) });
      }
    }
    C.strokeCurve(c, pts, C.BLUE, 2);

    // Force curve (lighter)
    const fPts = [];
    const fMax = Math.abs(ljForce(r0 * 0.95)) * 1.2;
    const fS = C.scale(-fMax, fMax, h - pad.b, pad.t);
    for (let i = 0; i <= 200; i++) {
      const r = rMin + (rMax - rMin) * i / 200;
      const f = ljForce(r);
      if (Math.abs(f) < fMax * 3) {
        fPts.push({ x: xS(r), y: fS(Math.max(-fMax, Math.min(fMax, f))) });
      }
    }
    C.strokeCurve(c, fPts, C.RED, 1.2);

    // Equilibrium point
    C.drawDot(c, xS(r0), yS(-epsilon), 5, C.BLUE);

    // Dashed lines to axes
    C.dashedVLine(c, xS(r0), yS(0), yS(-epsilon), C.MUTED);
    C.dashedHLine(c, yS(-epsilon), pad.l, xS(r0), C.MUTED);

    // Labels
    c.font = C.VALUE_FONT;
    c.fillStyle = C.BLUE;
    c.textAlign = 'center';
    c.fillText('r\u2080 = ' + r0.toFixed(2) + ' \u00c5', xS(r0), yS(0) + 14);
    c.textAlign = 'right';
    c.fillText('\u2013\u03b5', pad.l - 6, yS(-epsilon) + 4);

    // Sigma marker
    const eSigma = lj(sigma); // should be 0
    C.drawDot(c, xS(sigma), yS(0), 3, C.MUTED);
    c.font = '400 10px "DM Sans", sans-serif';
    c.fillStyle = C.MUTED;
    c.textAlign = 'center';
    c.fillText('\u03c3', xS(sigma), yS(0) - 10);

    // Legend
    c.font = '500 11px "DM Sans", sans-serif';
    c.fillStyle = C.BLUE;
    c.textAlign = 'left';
    c.fillText('E(r)', w - pad.r - 50, pad.t + 14);
    c.fillStyle = C.RED;
    c.fillText('F(r)', w - pad.r - 50, pad.t + 28);

    // Axes
    C.drawAxes(c, pad, w, h, 'r (\u00c5)', 'E (eV)');

    // r ticks
    c.font = C.TICK_FONT;
    c.fillStyle = C.MUTED;
    c.textAlign = 'center';
    const rStep = sigma < 2 ? 0.5 : 1;
    for (let r = Math.ceil(rMin / rStep) * rStep; r <= rMax; r += rStep) {
      c.fillText(r.toFixed(1), xS(r), h - pad.b + 14);
    }

    // E ticks
    c.textAlign = 'right';
    const nTicks = 4;
    for (let i = 0; i <= nTicks; i++) {
      const e = eMin + (eMax - eMin) * i / nTicks;
      c.fillText(e.toFixed(3), pad.l - 6, yS(e) + 4);
    }
  }

  function update() {
    epsilon = parseFloat(epsSlider.value) / 1000;
    sigma = parseFloat(sigSlider.value) / 100;
    epsVal.textContent = epsilon.toFixed(3) + ' eV';
    sigVal.textContent = sigma.toFixed(2) + ' \u00c5';
    render();
  }

  epsSlider.addEventListener('input', update);
  sigSlider.addEventListener('input', update);

  preset.addEventListener('change', () => {
    if (!preset.value) return;
    const [e, s] = preset.value.split(',').map(Number);
    epsilon = e;
    sigma = s;
    epsSlider.value = Math.round(e * 1000);
    sigSlider.value = Math.round(s * 100);
    epsVal.textContent = e.toFixed(3) + ' eV';
    sigVal.textContent = s.toFixed(2) + ' \u00c5';
    render();
    preset.value = '';
  });

  render();
  window.addEventListener('resize', render);
}
