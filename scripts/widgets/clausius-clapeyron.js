/* ==========================================================================
   Clausius-Clapeyron P-T phase diagram — interactive widget
   Shows solid-liquid and liquid-gas boundaries meeting at a triple point.
   Sliders for enthalpy of vaporisation and triple-point temperature.
   Presets for Water and CO2.
   ========================================================================== */

import * as C from './chart-utils.js';

const R = 8.314; // J/(mol·K)

/* Default physical parameters */
const DEFAULTS = {
  dH_vap:  40.7,   // kJ/mol
  T_tp:    273,    // K
  P_tp:    0.006,  // atm
  dH_fus:  6.0,    // kJ/mol
  dV_fus:  -1.6e-6,// m³/mol  (water: ice less dense => negative)
  dH_sub:  46.7,   // kJ/mol  (≈ dH_fus + dH_vap)
};

const PRESETS = [
  { label: 'Water', dH_vap: 40.7, T_tp: 273, P_tp: 0.006, dH_fus: 6.0,  dV_fus: -1.6e-6, dH_sub: 46.7 },
  { label: 'CO\u2082',  dH_vap: 25.0, T_tp: 217, P_tp: 5.1,   dH_fus: 9.0,  dV_fus: 5.0e-6,  dH_sub: 34.0 },
];

export function create(container) {
  const canvas = C.createWidgetShell(container, 0.55);
  const ctx = canvas.getContext('2d');

  /* ---- State ---- */
  let dH_vap = DEFAULTS.dH_vap;
  let T_tp   = DEFAULTS.T_tp;
  let P_tp   = DEFAULTS.P_tp;
  let dH_fus = DEFAULTS.dH_fus;
  let dV_fus = DEFAULTS.dV_fus;
  let dH_sub = DEFAULTS.dH_sub;

  /* ---- Controls ---- */
  const controls = document.createElement('div');
  controls.style.cssText =
    'padding: 8px 16px; display: flex; flex-wrap: wrap; gap: 12px; ' +
    'align-items: center; font-family: "DM Sans", sans-serif; ' +
    'font-size: 12px; color: #3a3d5a;';
  controls.innerHTML = `
    <label style="display:flex;align-items:center;gap:6px;">
      \u0394H<sub>vap</sub>
      <input type="range" min="20" max="60" value="${dH_vap}" step="0.5" id="cc-dhvap"
             style="width:110px;accent-color:#2a2f7c;">
      <span id="cc-dhvap-val" style="min-width:72px;">${dH_vap} kJ/mol</span>
    </label>
    <label style="display:flex;align-items:center;gap:6px;">
      T<sub>tp</sub>
      <input type="range" min="200" max="400" value="${T_tp}" step="1" id="cc-ttp"
             style="width:110px;accent-color:#2a2f7c;">
      <span id="cc-ttp-val" style="min-width:42px;">${T_tp} K</span>
    </label>
    <select id="cc-preset" style="padding:3px 6px;font-size:11px;border:1px solid #c8c6d0;background:#fff;color:#3a3d5a;">
      <option value="">Preset\u2026</option>
      ${PRESETS.map((p, i) => `<option value="${i}">${p.label}</option>`).join('')}
    </select>
  `;
  container.appendChild(controls);

  const dhvapSlider = controls.querySelector('#cc-dhvap');
  const ttpSlider   = controls.querySelector('#cc-ttp');
  const dhvapVal    = controls.querySelector('#cc-dhvap-val');
  const ttpVal      = controls.querySelector('#cc-ttp-val');
  const presetSel   = controls.querySelector('#cc-preset');

  const pad = { l: 60, r: 20, t: 20, b: 50 };

  /* ---- Phase boundary equations ---- */

  /* Liquid-gas (Clausius-Clapeyron):
     ln(P/P_tp) = -dH_vap/R * (1/T - 1/T_tp)
     => P = P_tp * exp(-dH_vap/R * (1/T - 1/T_tp))  */
  function P_liq_gas(T) {
    return P_tp * Math.exp((-dH_vap * 1000 / R) * (1 / T - 1 / T_tp));
  }

  /* Solid-gas (sublimation, same form but with dH_sub):
     P = P_tp * exp(-dH_sub/R * (1/T - 1/T_tp))  */
  function P_sol_gas(T) {
    return P_tp * Math.exp((-dH_sub * 1000 / R) * (1 / T - 1 / T_tp));
  }

  /* Solid-liquid (nearly vertical):
     P = P_tp + dH_fus/(T_tp * dV_fus) * (T - T_tp)
     This is in Pa; we work in atm. dH_fus in J/mol, dV_fus in m³/mol, P_tp in atm.
     slope_Pa = dH_fus / (T_tp * dV_fus)  [Pa/K]
     slope_atm = slope_Pa / 101325         [atm/K]  */
  function P_sol_liq(T) {
    const slope_Pa = (dH_fus * 1000) / (T_tp * dV_fus); // Pa/K
    const slope_atm = slope_Pa / 101325;                 // atm/K
    return P_tp + slope_atm * (T - T_tp);
  }

  /* ---- Render ---- */
  function render() {
    const { w, h } = C.setupCanvas(canvas, container, 0.55);

    /* Read slider state */
    dH_vap = parseFloat(dhvapSlider.value);
    T_tp   = parseInt(ttpSlider.value);
    dH_sub = dH_fus + dH_vap; // keep sublimation consistent
    dhvapVal.textContent = dH_vap + ' kJ/mol';
    ttpVal.textContent   = T_tp + ' K';

    /* Axes: T on x (150-700 K), log10(P/atm) on y (-4 to 3) */
    const Tmin = 150, Tmax = 700;
    const logPmin = -4, logPmax = 3;
    const xS = C.scale(Tmin, Tmax, pad.l, w - pad.r);
    const yS = C.scale(logPmin, logPmax, h - pad.b, pad.t);

    /* ---- Axes ---- */
    C.drawAxes(ctx, pad, w, h, 'Temperature (K)', 'log\u2081\u2080 P (atm)');

    /* Grid lines */
    ctx.strokeStyle = 'rgba(0,0,0,0.05)';
    ctx.lineWidth = 0.6;
    for (let lp = logPmin; lp <= logPmax; lp += 1) {
      ctx.beginPath();
      ctx.moveTo(pad.l, yS(lp));
      ctx.lineTo(w - pad.r, yS(lp));
      ctx.stroke();
    }
    for (let t = 200; t <= 700; t += 100) {
      ctx.beginPath();
      ctx.moveTo(xS(t), pad.t);
      ctx.lineTo(xS(t), h - pad.b);
      ctx.stroke();
    }

    /* Y-axis ticks */
    ctx.font = C.TICK_FONT;
    ctx.fillStyle = C.MUTED;
    ctx.textAlign = 'right';
    for (let lp = logPmin; lp <= logPmax; lp += 1) {
      ctx.fillText(lp.toString(), pad.l - 6, yS(lp) + 4);
    }

    /* X-axis ticks */
    ctx.textAlign = 'center';
    for (let t = 200; t <= 700; t += 100) {
      ctx.fillText(t.toString(), xS(t), h - pad.b + 14);
    }

    /* ---- Clip to plot area ---- */
    ctx.save();
    ctx.beginPath();
    ctx.rect(pad.l, pad.t, w - pad.l - pad.r, h - pad.t - pad.b);
    ctx.clip();

    /* ---- Phase boundary curves ---- */

    /* Liquid-gas boundary: from triple point rightward */
    const lgPts = [];
    const lgSteps = 200;
    for (let i = 0; i <= lgSteps; i++) {
      const T = T_tp + (Tmax - T_tp) * i / lgSteps;
      const P = P_liq_gas(T);
      const lp = Math.log10(P);
      if (lp >= logPmin && lp <= logPmax) {
        lgPts.push({ x: xS(T), y: yS(lp) });
      }
    }
    C.strokeCurve(ctx, lgPts, C.BLUE, 2.5);

    /* Solid-gas boundary: from left up to triple point */
    const sgPts = [];
    const sgSteps = 200;
    for (let i = 0; i <= sgSteps; i++) {
      const T = Tmin + (T_tp - Tmin) * i / sgSteps;
      const P = P_sol_gas(T);
      const lp = Math.log10(P);
      if (lp >= logPmin && lp <= logPmax && T >= Tmin) {
        sgPts.push({ x: xS(T), y: yS(lp) });
      }
    }
    C.strokeCurve(ctx, sgPts, C.BLUE, 2.5);

    /* Solid-liquid boundary: nearly vertical line through triple point */
    const slPts = [];
    const slSteps = 200;
    /* Sweep in P from P_tp up to 10^logPmax atm */
    const P_sl_max = Math.pow(10, logPmax);
    const P_sl_min = P_tp;
    for (let i = 0; i <= slSteps; i++) {
      /* Work out T for a given P on the solid-liquid line:
         T = T_tp + (P - P_tp) / slope_atm  */
      const P_atm = P_sl_min + (P_sl_max - P_sl_min) * i / slSteps;
      const slope_Pa = (dH_fus * 1000) / (T_tp * dV_fus);
      const slope_atm = slope_Pa / 101325;
      if (Math.abs(slope_atm) < 1e-20) continue;
      const T = T_tp + (P_atm - P_tp) / slope_atm;
      const lp = Math.log10(P_atm);
      if (T >= Tmin && T <= Tmax && lp >= logPmin && lp <= logPmax) {
        slPts.push({ x: xS(T), y: yS(lp) });
      }
    }
    /* Sort by y (screen) so the curve draws top-to-bottom */
    slPts.sort((a, b) => a.y - b.y);
    C.strokeCurve(ctx, slPts, C.BLUE, 2.5);

    /* ---- Triple point ---- */
    const tp_logP = Math.log10(P_tp);
    if (tp_logP >= logPmin && tp_logP <= logPmax && T_tp >= Tmin && T_tp <= Tmax) {
      C.drawDot(ctx, xS(T_tp), yS(tp_logP), 5, C.BLUE);
      ctx.font = C.TITLE_FONT;
      ctx.fillStyle = C.DARK;
      ctx.textAlign = 'left';
      ctx.fillText('Triple point', xS(T_tp) + 8, yS(tp_logP) - 8);
    }

    /* ---- Region labels ---- */
    ctx.font = C.VALUE_FONT;
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(42, 47, 124, 0.45)';

    /* Position Solid label: upper-left region (cold, high P) */
    const solidLabelT = Math.max(Tmin + 20, Math.min(T_tp - 50, (Tmin + T_tp) / 2 - 20));
    const solidLabelLP = (logPmax + Math.max(tp_logP, logPmin)) / 2;
    ctx.fillText('Solid', xS(solidLabelT), yS(Math.min(solidLabelLP, logPmax - 0.5)));

    /* Position Liquid label: upper-right region (hot, high P, above liquid-gas curve) */
    const liqLabelT = Math.min(T_tp + (Tmax - T_tp) * 0.35, Tmax - 40);
    const liqLogP_at_label = Math.log10(P_liq_gas(liqLabelT));
    const liqLabelLP = (logPmax + liqLogP_at_label) / 2;
    ctx.fillText('Liquid', xS(liqLabelT), yS(Math.min(liqLabelLP, logPmax - 0.5)));

    /* Position Gas label: lower region (below liquid-gas and solid-gas curves) */
    const gasLabelT = Math.min(T_tp + (Tmax - T_tp) * 0.5, Tmax - 40);
    const gasLogP_at_label = Math.log10(P_liq_gas(gasLabelT));
    const gasLabelLP = (logPmin + Math.min(gasLogP_at_label, tp_logP)) / 2;
    ctx.fillText('Gas', xS(gasLabelT), yS(Math.max(gasLabelLP, logPmin + 0.5)));

    /* Restore clip */
    ctx.restore();
  }

  /* ---- Event wiring ---- */
  function update() {
    render();
  }

  dhvapSlider.addEventListener('input', update);
  ttpSlider.addEventListener('input', update);

  presetSel.addEventListener('change', () => {
    if (presetSel.value === '') return;
    const p = PRESETS[parseInt(presetSel.value)];
    dH_vap = p.dH_vap;
    T_tp   = p.T_tp;
    P_tp   = p.P_tp;
    dH_fus = p.dH_fus;
    dV_fus = p.dV_fus;
    dH_sub = p.dH_sub;
    dhvapSlider.value = dH_vap;
    ttpSlider.value   = T_tp;
    dhvapVal.textContent = dH_vap + ' kJ/mol';
    ttpVal.textContent   = T_tp + ' K';
    render();
    presetSel.value = '';
  });

  render();
  window.addEventListener('resize', render);
}
