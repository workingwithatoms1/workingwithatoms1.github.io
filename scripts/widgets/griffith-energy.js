/* ==========================================================================
   Griffith energy balance widget — Linear elastic fracture mechanics
   Interactive plot of elastic, surface, and total energy for a crack
   of half-length a in an infinite plate under uniaxial stress σ.

   Elastic energy released:  U_el = -π σ² a² / E       (per unit thickness)
   Surface energy created:   U_s  =  4 a γ_s            (two surfaces)
   Total:                    U    =  U_el + U_s

   Critical crack length (dU/da = 0):
     a* = 2 E γ_s / (π σ²)

   Griffith stress for a given a*:
     σ_G = √(2 E γ_s / (π a*))
   ========================================================================== */

import * as C from './chart-utils.js';

export function create(container) {
  const canvas = C.createWidgetShell(container, 0.55);

  // State — slider values in user-friendly units
  let sigma = 100;    // applied stress, MPa
  let gammaS = 1.0;   // surface energy, J/m²
  let E = 200;        // Young's modulus, GPa

  // --- Controls ------------------------------------------------------------
  const controls = document.createElement('div');
  controls.style.cssText =
    'padding: 8px 16px; display: flex; flex-wrap: wrap; gap: 12px; ' +
    'align-items: center; font-family: "DM Sans", sans-serif; ' +
    'font-size: 12px; color: #3a3d5a;';
  controls.innerHTML = `
    <label style="display:flex;align-items:center;gap:6px;">
      <span style="font-weight:500;">\u03c3</span>
      <input type="range" min="10" max="500" value="100" step="1"
             id="grif-sigma" style="width:100px;accent-color:#2a2f7c;">
      <span id="grif-sigma-val" style="min-width:62px;">100 MPa</span>
    </label>
    <label style="display:flex;align-items:center;gap:6px;">
      <span style="font-weight:500;">\u03b3<sub>s</sub></span>
      <input type="range" min="50" max="500" value="100" step="1"
             id="grif-gamma" style="width:100px;accent-color:#2a2f7c;">
      <span id="grif-gamma-val" style="min-width:60px;">1.00 J/m\u00b2</span>
    </label>
    <label style="display:flex;align-items:center;gap:6px;">
      <span style="font-weight:500;">E</span>
      <input type="range" min="50" max="400" value="200" step="1"
             id="grif-E" style="width:100px;accent-color:#2a2f7c;">
      <span id="grif-E-val" style="min-width:56px;">200 GPa</span>
    </label>
  `;
  container.appendChild(controls);

  const sigmaSlider = controls.querySelector('#grif-sigma');
  const gammaSlider = controls.querySelector('#grif-gamma');
  const eSlider     = controls.querySelector('#grif-E');
  const sigmaVal    = controls.querySelector('#grif-sigma-val');
  const gammaVal    = controls.querySelector('#grif-gamma-val');
  const eVal        = controls.querySelector('#grif-E-val');

  // --- Readout box ---------------------------------------------------------
  const readout = document.createElement('div');
  readout.style.cssText =
    'padding: 4px 16px 10px; font-family: "DM Sans", sans-serif; ' +
    'font-size: 12px; color: #3a3d5a; display: flex; gap: 24px; flex-wrap: wrap;';
  container.appendChild(readout);

  // --- Physics (SI internally) ---------------------------------------------
  // sigma in Pa, gammaS in J/m², E in Pa
  // Energies per unit thickness (J/m)

  function aStar() {
    // a* = 2 E gamma_s / (pi sigma^2)
    const sig = sigma * 1e6;   // MPa -> Pa
    const Epa = E * 1e9;       // GPa -> Pa
    return 2 * Epa * gammaS / (Math.PI * sig * sig);   // m
  }

  function sigmaGriffith() {
    // sigma_G = sqrt(2 E gamma_s / (pi a*))  — evaluated at current a*
    // This is just sigma itself when a = a*, but we display it for reference
    const Epa = E * 1e9;
    const ac = aStar();
    if (ac <= 0) return Infinity;
    return Math.sqrt(2 * Epa * gammaS / (Math.PI * ac));  // Pa
  }

  // Energy terms as functions of a (in metres), returning J/m
  function Uel(a) {
    const sig = sigma * 1e6;
    const Epa = E * 1e9;
    return -Math.PI * sig * sig * a * a / Epa;
  }

  function Us(a) {
    return 4 * a * gammaS;
  }

  function Utotal(a) {
    return Uel(a) + Us(a);
  }

  // --- Render --------------------------------------------------------------
  const pad = { l: 72, r: 20, t: 20, b: 50 };

  function render() {
    const { ctx, w, h } = C.setupCanvas(canvas, container, 0.55);

    // Determine axis ranges based on current parameters
    const ac = aStar();         // m

    // x-axis: crack half-length in µm, show up to ~3× a*
    const acUm = ac * 1e6;     // µm
    const xMaxUm = Math.max(acUm * 3, 1);   // at least 1 µm

    // y-axis: energy (J/m). Total energy peaks at a* with value:
    const Upeak = Utotal(ac);  // J/m
    const UelMax = Uel(xMaxUm * 1e-6);

    // Fixed y range that accommodates the curves
    const yHi = Math.max(Upeak * 2.5, Us(xMaxUm * 1e-6) * 1.1);
    const yLo = Math.min(UelMax * 1.2, -Math.abs(Upeak) * 0.5);

    const xS = C.scale(0, xMaxUm, pad.l, w - pad.r);
    const yS = C.scale(yLo, yHi, h - pad.b, pad.t);

    // --- Axes & zero line --------------------------------------------------
    C.drawAxes(ctx, pad, w, h, 'a  (\u00b5m)', 'U  (J/m)');

    // Zero line
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(pad.l, yS(0));
    ctx.lineTo(w - pad.r, yS(0));
    ctx.stroke();

    // --- Tick labels (x) ---------------------------------------------------
    ctx.font = C.TICK_FONT;
    ctx.fillStyle = C.DARK;
    ctx.textAlign = 'center';
    const nxTicks = 6;
    for (let i = 0; i <= nxTicks; i++) {
      const v = xMaxUm * i / nxTicks;
      ctx.fillText(v.toFixed(0), xS(v), h - pad.b + 14);
    }

    // --- Tick labels (y) ---------------------------------------------------
    ctx.textAlign = 'right';
    const nyTicks = 5;
    for (let i = 0; i <= nyTicks; i++) {
      const v = yLo + (yHi - yLo) * i / nyTicks;
      ctx.fillText(formatEnergy(v), pad.l - 6, yS(v) + 4);
    }

    // --- Clip to plot area -------------------------------------------------
    ctx.save();
    ctx.beginPath();
    ctx.rect(pad.l, pad.t, w - pad.l - pad.r, h - pad.t - pad.b);
    ctx.clip();

    // --- Curves ------------------------------------------------------------
    const steps = 200;

    // Elastic energy released (negative, dashed blue)
    const elPts = [];
    for (let i = 0; i <= steps; i++) {
      const aUm = xMaxUm * i / steps;
      const v = Uel(aUm * 1e-6);
      elPts.push({ x: xS(aUm), y: yS(v) });
    }
    ctx.setLineDash([6, 4]);
    C.strokeCurve(ctx, elPts, C.BLUE, 1.5);
    ctx.setLineDash([]);

    // Surface energy created (positive, dashed red)
    const surfPts = [];
    for (let i = 0; i <= steps; i++) {
      const aUm = xMaxUm * i / steps;
      const v = Us(aUm * 1e-6);
      surfPts.push({ x: xS(aUm), y: yS(v) });
    }
    ctx.setLineDash([6, 4]);
    C.strokeCurve(ctx, surfPts, C.RED, 1.5);
    ctx.setLineDash([]);

    // Total energy (solid dark)
    const totPts = [];
    for (let i = 0; i <= steps; i++) {
      const aUm = xMaxUm * i / steps;
      const v = Utotal(aUm * 1e-6);
      totPts.push({ x: xS(aUm), y: yS(v) });
    }
    C.strokeCurve(ctx, totPts, C.DARK, 2.5);

    ctx.restore();

    // --- Critical point marker (a*, U_total peak) --------------------------
    const acPx    = xS(acUm);
    const UpeakPx = yS(Upeak);

    // Crosshair dashed lines
    C.dashedVLine(ctx, acPx, yS(0), UpeakPx, C.MUTED);
    C.dashedHLine(ctx, UpeakPx, pad.l, acPx, C.MUTED);

    // Dot at the maximum
    C.drawDot(ctx, acPx, UpeakPx, 6, C.RED);

    // Label "a*" — prominent
    ctx.font = '600 14px "DM Sans", sans-serif';
    ctx.fillStyle = C.RED;
    ctx.textAlign = 'left';
    ctx.fillText('a* = ' + acUm.toFixed(1) + ' \u00b5m', acPx + 10, UpeakPx - 10);

    // --- Curve legend (top-right) ------------------------------------------
    const lx = w - pad.r - 8;
    const ly = pad.t + 12;
    ctx.font = '500 11px "DM Sans", sans-serif';
    ctx.textAlign = 'right';

    ctx.fillStyle = C.DARK;
    ctx.fillText('U\u209C\u2092\u209C\u2090\u2097', lx, ly);
    ctx.fillStyle = C.BLUE;
    ctx.fillText('U\u2091\u2097 (elastic)', lx, ly + 16);
    ctx.fillStyle = C.RED;
    ctx.fillText('U\u209B (surface)', lx, ly + 32);

    // --- Readout -----------------------------------------------------------
    const sigG = sigmaGriffith() * 1e-6;   // Pa -> MPa
    readout.innerHTML =
      `<span>a* = <b>${formatLength(ac)}</b></span>` +
      `<span>\u03c3<sub>G</sub> = <b>${sigG.toFixed(1)}</b> MPa</span>` +
      `<span>U(a*) = <b>${formatEnergy(Upeak)}</b> J/m</span>`;
  }

  // --- Formatting helpers --------------------------------------------------
  function formatLength(metres) {
    if (metres >= 1) return metres.toFixed(2) + ' m';
    if (metres >= 1e-3) return (metres * 1e3).toFixed(2) + ' mm';
    return (metres * 1e6).toFixed(1) + ' \u00b5m';
  }

  function formatEnergy(jpm) {
    const abs = Math.abs(jpm);
    if (abs === 0) return '0';
    if (abs >= 1)    return jpm.toFixed(1);
    if (abs >= 0.01) return jpm.toFixed(3);
    return jpm.toExponential(1);
  }

  // --- Slider wiring -------------------------------------------------------
  function update() {
    sigma  = parseInt(sigmaSlider.value);              // MPa directly
    gammaS = parseInt(gammaSlider.value) / 100;        // slider 50-500 -> 0.50-5.00
    E      = parseInt(eSlider.value);                  // GPa directly
    sigmaVal.textContent = sigma + ' MPa';
    gammaVal.textContent = gammaS.toFixed(2) + ' J/m\u00b2';
    eVal.textContent     = E + ' GPa';
    render();
  }

  sigmaSlider.addEventListener('input', update);
  gammaSlider.addEventListener('input', update);
  eSlider.addEventListener('input', update);

  render();
  window.addEventListener('resize', render);
}
