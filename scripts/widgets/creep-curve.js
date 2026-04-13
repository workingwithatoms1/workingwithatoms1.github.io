/* ==========================================================================
   Creep curve widget — three stages of creep deformation
   Interactive plot showing primary (decelerating), secondary (steady-state),
   and tertiary (accelerating to rupture) creep behaviour.

   Model:
     eps(t) = eps_0 + eps_1*(1 - exp(-t/t_1)) + eps_dot_s*t
              + eps_3*(exp((t - t_r)/t_3) - 1)   for t approaching t_r

   Sliders: homologous temperature (0.4-0.9 Tm) and stress (low/med/high).
   ========================================================================== */

import * as C from './chart-utils.js';

export function create(container) {
  const canvas = C.createWidgetShell(container, 0.55);

  /* ---- Controls ---- */
  const controls = document.createElement('div');
  controls.style.cssText = 'padding: 8px 16px 4px; display: flex; flex-wrap: wrap; gap: 12px; align-items: center; font-family: "DM Sans", sans-serif; font-size: 12px; color: #3a3d5a;';
  controls.innerHTML = `
    <label style="display:flex;align-items:center;gap:6px;">
      <span style="font-weight:500;">T / T<sub>m</sub></span>
      <input type="range" min="40" max="90" value="60" step="1" id="cr-temp" style="width:110px;accent-color:#2a2f7c;">
      <span id="cr-temp-val" style="min-width:36px;">0.60</span>
    </label>
    <label style="display:flex;align-items:center;gap:6px;">
      <span style="font-weight:500;">\u03c3</span>
      <input type="range" min="1" max="3" value="2" step="1" id="cr-stress" style="width:90px;accent-color:#2a2f7c;">
      <span id="cr-stress-val" style="min-width:52px;">Medium</span>
    </label>
  `;
  container.appendChild(controls);

  const callout = document.createElement('div');
  callout.style.cssText = 'padding: 2px 16px 10px; font-family: "DM Sans", sans-serif; font-size: 11px; color: #666; line-height: 1.5;';
  callout.innerHTML =
    '<span style="font-weight:500;color:#3a3d5a;">Creep stages:</span> ' +
    'I \u2014 primary (decelerating, work hardening) \u00b7 ' +
    'II \u2014 secondary (steady-state, recovery \u2248 hardening) \u00b7 ' +
    'III \u2014 tertiary (accelerating, void coalescence \u2192 rupture)';
  container.appendChild(callout);

  const tempSlider   = controls.querySelector('#cr-temp');
  const stressSlider = controls.querySelector('#cr-stress');
  const tempVal      = controls.querySelector('#cr-temp-val');
  const stressVal    = controls.querySelector('#cr-stress-val');

  const stressLabels = { 1: 'Low', 2: 'Medium', 3: 'High' };

  const pad = { l: 60, r: 20, t: 20, b: 50 };

  /* ---- Fixed axes ---- */
  const T_MAX = 1000; // hours
  const E_MAX = 0.3;  // strain

  /* ---- Parameter mapping ---- */
  function getParams(homT, stressLevel) {
    // Base steady-state rate depends strongly on temperature and stress
    // Arrhenius-like scaling with homologous temperature
    const tempFactor = Math.exp(4 * (homT - 0.5)); // exponential increase
    const stressFactors = { 1: 0.3, 2: 1.0, 3: 3.0 };
    const sFactor = stressFactors[stressLevel];

    const eps_dot_s = 6e-5 * tempFactor * sFactor; // strain/h

    // Rupture time decreases with temperature and stress
    const t_r = Math.min(950, Math.max(200, 800 / (tempFactor * sFactor)));

    // Primary creep parameters
    const eps_0 = 0.005; // instantaneous elastic strain
    const eps_1 = 0.015 + 0.005 * sFactor; // primary strain amplitude
    const t_1   = t_r * 0.08; // primary time constant (~8% of rupture)

    // Tertiary parameters — onset near t_r
    const t_3   = t_r * 0.06; // controls steepness of tertiary
    const eps_3 = 0.003;       // tertiary scaling

    return { eps_0, eps_1, t_1, eps_dot_s, t_r, eps_3, t_3 };
  }

  /* ---- Creep model ---- */
  function creepStrain(t, p) {
    const primary   = p.eps_1 * (1 - Math.exp(-t / p.t_1));
    const secondary = p.eps_dot_s * t;
    let tertiary = 0;
    if (t < p.t_r) {
      tertiary = p.eps_3 * (Math.exp((t - p.t_r) / p.t_3) - 1);
    } else {
      // Beyond rupture — clamp
      return Infinity;
    }
    return p.eps_0 + primary + secondary + tertiary;
  }

  /* ---- Boundaries between stages ---- */
  function stageBounds(p) {
    // Primary-secondary transition: when primary contribution becomes negligible
    // ~3 time constants of primary decay
    const t_ps = Math.min(3 * p.t_1, p.t_r * 0.25);

    // Secondary-tertiary transition: when tertiary rate equals steady-state rate
    // d(tertiary)/dt = (eps_3/t_3)*exp((t-t_r)/t_3) = eps_dot_s
    // (t-t_r)/t_3 = ln(eps_dot_s * t_3 / eps_3)
    const arg = p.eps_dot_s * p.t_3 / p.eps_3;
    const t_st = arg > 0 ? p.t_r + p.t_3 * Math.log(arg) : p.t_r * 0.75;

    return {
      t_ps: Math.max(t_ps, 10),
      t_st: Math.min(Math.max(t_st, t_ps + 20), p.t_r - 10)
    };
  }

  function render() {
    const { ctx, w, h } = C.setupCanvas(canvas, container, 0.55);

    const homT = parseInt(tempSlider.value) / 100;
    const stressLevel = parseInt(stressSlider.value);
    tempVal.textContent = homT.toFixed(2);
    stressVal.textContent = stressLabels[stressLevel];

    const p = getParams(homT, stressLevel);
    const bounds = stageBounds(p);

    const xS = C.scale(0, T_MAX, pad.l, w - pad.r);
    const yS = C.scale(0, E_MAX, h - pad.b, pad.t);

    const plotW = w - pad.l - pad.r;
    const plotH = h - pad.t - pad.b;

    /* ---- Stage background shading ---- */
    const x_ps = xS(bounds.t_ps);
    const x_st = xS(bounds.t_st);
    const x_tr = xS(Math.min(p.t_r, T_MAX));

    // Stage I — primary
    ctx.fillStyle = 'rgba(77, 92, 242, 0.06)';
    ctx.fillRect(pad.l, pad.t, x_ps - pad.l, plotH);

    // Stage II — secondary
    ctx.fillStyle = 'rgba(42, 47, 124, 0.04)';
    ctx.fillRect(x_ps, pad.t, x_st - x_ps, plotH);

    // Stage III — tertiary
    ctx.fillStyle = 'rgba(139, 34, 82, 0.06)';
    ctx.fillRect(x_st, pad.t, x_tr - x_st, plotH);

    /* ---- Stage labels ---- */
    ctx.font = '400 10px "DM Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    ctx.fillStyle = 'rgba(77, 92, 242, 0.5)';
    ctx.fillText('I', (pad.l + x_ps) / 2, pad.t + 6);

    ctx.fillStyle = 'rgba(42, 47, 124, 0.45)';
    ctx.fillText('II', (x_ps + x_st) / 2, pad.t + 6);

    ctx.fillStyle = 'rgba(139, 34, 82, 0.5)';
    ctx.fillText('III', (x_st + x_tr) / 2, pad.t + 6);

    /* ---- Axes ---- */
    C.drawAxes(ctx, pad, w, h, 'Time (h)', 'Strain, \u03b5');

    /* ---- X-axis ticks ---- */
    ctx.font = C.TICK_FONT;
    ctx.fillStyle = C.MUTED;
    ctx.textAlign = 'center';
    for (let t = 0; t <= T_MAX; t += 200) {
      const tx = xS(t);
      ctx.fillText(t.toString(), tx, h - pad.b + 14);
      ctx.strokeStyle = C.MUTED;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(tx, h - pad.b);
      ctx.lineTo(tx, h - pad.b + 4);
      ctx.stroke();
    }

    /* ---- Y-axis ticks ---- */
    ctx.textAlign = 'right';
    for (let e = 0; e <= E_MAX; e += 0.05) {
      const yy = yS(e);
      ctx.fillStyle = C.MUTED;
      ctx.fillText(e.toFixed(2), pad.l - 6, yy + 4);
      ctx.strokeStyle = C.MUTED;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(pad.l - 3, yy);
      ctx.lineTo(pad.l, yy);
      ctx.stroke();
    }

    /* ---- Clip to plot area ---- */
    ctx.save();
    ctx.beginPath();
    ctx.rect(pad.l, pad.t, plotW, plotH);
    ctx.clip();

    /* ---- Sample and draw creep curve ---- */
    const pts = [];
    const steps = 500;
    for (let i = 0; i <= steps; i++) {
      const t = T_MAX * i / steps;
      if (t >= p.t_r) break;
      const eps = creepStrain(t, p);
      if (!isFinite(eps) || eps > E_MAX * 1.2) break;
      pts.push({ x: xS(t), y: yS(eps), vx: t, vy: eps });
    }

    C.fillUnder(ctx, pts, yS(0), C.FILL_BLUE);
    C.strokeCurve(ctx, pts, C.BLUE, 2.5);

    /* ---- Steady-state tangent line (dashed) ---- */
    // Evaluate at midpoint of secondary stage
    const t_mid = (bounds.t_ps + bounds.t_st) / 2;
    const eps_mid = creepStrain(t_mid, p);
    const slope = p.eps_dot_s; // dominant rate in secondary regime

    // Draw tangent extending across most of secondary region
    const t_tan_start = bounds.t_ps * 0.5;
    const t_tan_end = Math.min(bounds.t_st * 1.3, p.t_r - 10);
    const eps_tan_start = eps_mid + slope * (t_tan_start - t_mid);
    const eps_tan_end = eps_mid + slope * (t_tan_end - t_mid);

    ctx.strokeStyle = C.RED;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(xS(t_tan_start), yS(eps_tan_start));
    ctx.lineTo(xS(t_tan_end), yS(eps_tan_end));
    ctx.stroke();
    ctx.setLineDash([]);

    /* ---- Label the slope ---- */
    const dotRate = p.eps_dot_s;
    const rateLabel = dotRate < 1e-4
      ? '\u03b5\u0307\u209b = ' + dotRate.toExponential(1) + ' /h'
      : '\u03b5\u0307\u209b = ' + dotRate.toFixed(4) + ' /h';

    ctx.font = C.TICK_FONT;
    ctx.fillStyle = C.RED;
    ctx.textAlign = 'left';
    const labelT = t_mid + (t_tan_end - t_mid) * 0.2;
    const labelEps = eps_mid + slope * (labelT - t_mid);
    ctx.fillText(rateLabel, xS(labelT), yS(labelEps) - 12);

    /* ---- Rupture marker ---- */
    if (p.t_r <= T_MAX) {
      // Find last valid point
      const lastPt = pts[pts.length - 1];
      if (lastPt) {
        // X marker at rupture
        const rx = lastPt.x;
        const ry = lastPt.y;
        const sz = 5;
        ctx.strokeStyle = C.RED;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(rx - sz, ry - sz);
        ctx.lineTo(rx + sz, ry + sz);
        ctx.moveTo(rx + sz, ry - sz);
        ctx.lineTo(rx - sz, ry + sz);
        ctx.stroke();

        // Label
        ctx.font = C.TICK_FONT;
        ctx.fillStyle = C.RED;
        ctx.textAlign = 'center';
        ctx.fillText('rupture', rx, ry - 14);

        // Dashed vertical at t_r
        C.dashedVLine(ctx, xS(p.t_r), yS(0), ry, 'rgba(139,34,82,0.35)');
      }
    }

    ctx.restore(); // unclip

    /* ---- Title / parameter readout ---- */
    ctx.font = C.TITLE_FONT;
    ctx.fillStyle = C.DARK;
    ctx.textAlign = 'right';
    ctx.fillText('Creep Curve', w - pad.r, pad.t + 14);
    ctx.font = C.TICK_FONT;
    ctx.fillStyle = C.MUTED;
    ctx.fillText('T/T\u2098 = ' + homT.toFixed(2) + ',  \u03c3 = ' + stressLabels[stressLevel].toLowerCase(), w - pad.r, pad.t + 28);
    if (p.t_r <= T_MAX) {
      ctx.fillText('t\u1d63 = ' + Math.round(p.t_r) + ' h', w - pad.r, pad.t + 42);
    }
  }

  tempSlider.addEventListener('input', render);
  stressSlider.addEventListener('input', render);
  render();
  window.addEventListener('resize', render);
}
