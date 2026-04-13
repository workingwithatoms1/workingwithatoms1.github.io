/* ==========================================================================
   Nucleation energy barrier widget — Classical nucleation theory
   Interactive plot of volume, surface, and total free energy terms for
   forming a spherical nucleus of radius r.

   dG(r) = -(4/3) pi r^3 dGv  +  4 pi r^2 gamma

   Critical radius:  r* = 2 gamma / dGv
   Activation barrier: dG* = 16 pi gamma^3 / (3 dGv^2)
   ========================================================================== */

import * as C from './chart-utils.js';

export function create(container) {
  const canvas = C.createWidgetShell(container, 0.55);

  let gamma = 0.20;   // interfacial energy, J/m^2
  let dGv   = 0.50;   // volume free energy driving force, GJ/m^3

  // --- Controls -----------------------------------------------------------
  const controls = document.createElement('div');
  controls.style.cssText =
    'padding: 8px 16px; display: flex; flex-wrap: wrap; gap: 12px; ' +
    'align-items: center; font-family: "DM Sans", sans-serif; ' +
    'font-size: 12px; color: #3a3d5a;';
  controls.innerHTML = `
    <label style="display:flex;align-items:center;gap:6px;">
      \u03b3 <input type="range" min="50" max="500" value="200"
            id="nuc-gamma" style="width:110px;accent-color:#2a2f7c;">
      <span id="nuc-gamma-val" style="min-width:72px;">0.20 J/m\u00b2</span>
    </label>
    <label style="display:flex;align-items:center;gap:6px;">
      \u0394G<sub>v</sub> <input type="range" min="10" max="200" value="50"
            id="nuc-dgv" style="width:110px;accent-color:#2a2f7c;">
      <span id="nuc-dgv-val" style="min-width:82px;">0.50 GJ/m\u00b3</span>
    </label>
  `;
  container.appendChild(controls);

  const gammaSlider = controls.querySelector('#nuc-gamma');
  const dgvSlider   = controls.querySelector('#nuc-dgv');
  const gammaVal    = controls.querySelector('#nuc-gamma-val');
  const dgvVal      = controls.querySelector('#nuc-dgv-val');

  // --- Readout box --------------------------------------------------------
  const readout = document.createElement('div');
  readout.style.cssText =
    'padding: 4px 16px 10px; font-family: "DM Sans", sans-serif; ' +
    'font-size: 12px; color: #3a3d5a; display: flex; gap: 24px; flex-wrap: wrap;';
  container.appendChild(readout);

  // --- Physics helpers (SI internally, displayed in nm / 10^-18 J) --------
  // dGv is in GJ/m^3 = 1e9 J/m^3
  function rStar()  { return 2 * gamma / (dGv * 1e9); }            // m
  function dGStar() { return 16 * Math.PI * gamma * gamma * gamma
                        / (3 * (dGv * 1e9) * (dGv * 1e9)); }       // J

  // Free energy terms as functions of r (in metres), returning joules
  function volTerm(r)  { return -(4 / 3) * Math.PI * r * r * r * dGv * 1e9; }
  function surfTerm(r) { return 4 * Math.PI * r * r * gamma; }
  function totalG(r)   { return volTerm(r) + surfTerm(r); }

  // --- Render -------------------------------------------------------------
  const pad = { l: 60, r: 20, t: 22, b: 50 };

  function render() {
    const { ctx, w, h } = C.setupCanvas(canvas, container, 0.55);

    // Fixed axes — curve reshapes, axes stay put
    const rMaxNm = 3.0;                        // nm
    const rMax = rMaxNm * 1e-9;                // m

    const rc  = rStar();                       // m
    const rcNm = rc * 1e9;                     // nm
    const dGc = dGStar();                      // J
    const dGcUnits = dGc * 1e18;               // x10^-18 J

    // Fixed y range
    // Fixed y range that accommodates the full slider range
    const yLo = -15;
    const yHi = 10;

    const xS = C.scale(0, rMaxNm, pad.l, w - pad.r);
    const yS = C.scale(yLo, yHi, h - pad.b, pad.t);

    // --- Axes & zero line -------------------------------------------------
    C.drawAxes(ctx, pad, w, h, 'r (nm)', '\u0394G (\u00d710\u207b\u00b9\u2078 J)');

    // Zero line
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(pad.l, yS(0));
    ctx.lineTo(w - pad.r, yS(0));
    ctx.stroke();

    // Clip curves to plot area
    ctx.save();
    ctx.beginPath();
    ctx.rect(pad.l, pad.t, w - pad.l - pad.r, h - pad.t - pad.b);
    ctx.clip();

    // --- Curves -----------------------------------------------------------
    const steps = 200;

    // Volume term (negative, dashed red)
    const volPts = [];
    for (let i = 0; i <= steps; i++) {
      const rNm = rMaxNm * i / steps;
      const v = volTerm(rNm * 1e-9) * 1e18;
      volPts.push({ x: xS(rNm), y: yS(v) });
    }
    ctx.setLineDash([6, 4]);
    C.strokeCurve(ctx, volPts, C.RED, 1.5);
    ctx.setLineDash([]);

    // Surface term (positive, dashed light blue)
    const surfPts = [];
    for (let i = 0; i <= steps; i++) {
      const rNm = rMaxNm * i / steps;
      const v = surfTerm(rNm * 1e-9) * 1e18;
      surfPts.push({ x: xS(rNm), y: yS(v) });
    }
    ctx.setLineDash([6, 4]);
    C.strokeCurve(ctx, surfPts, C.LIGHT, 1.5);
    ctx.setLineDash([]);

    // Total free energy (solid blue)
    const totPts = [];
    for (let i = 0; i <= steps; i++) {
      const rNm = rMaxNm * i / steps;
      const v = totalG(rNm * 1e-9) * 1e18;
      totPts.push({ x: xS(rNm), y: yS(v) });
    }
    C.strokeCurve(ctx, totPts, C.BLUE, 2.5);

    ctx.restore();

    // --- Critical point marker --------------------------------------------
    const rcPx  = xS(rcNm);
    const dGcPx = yS(dGcUnits);

    // Crosshair
    C.dashedVLine(ctx, rcPx, yS(0), dGcPx, C.MUTED);
    C.dashedHLine(ctx, dGcPx, pad.l, rcPx, C.MUTED);

    // Dot
    C.drawDot(ctx, rcPx, dGcPx, 5, C.BLUE);

    // --- Labels at critical point -----------------------------------------
    ctx.font = C.VALUE_FONT;
    ctx.fillStyle = C.BLUE;
    ctx.textAlign = 'left';
    ctx.fillText('r*', rcPx + 8, dGcPx - 8);

    ctx.fillStyle = C.DARK;
    ctx.textAlign = 'right';
    ctx.fillText('\u0394G*', pad.l - 6, dGcPx + 4);

    // --- Curve legend (top-right) -----------------------------------------
    const lx = w - pad.r - 8;
    const ly = pad.t + 12;
    ctx.font = '500 11px "DM Sans", sans-serif';
    ctx.textAlign = 'right';

    ctx.fillStyle = C.BLUE;
    ctx.fillText('\u0394G(r)', lx, ly);
    ctx.fillStyle = C.RED;
    ctx.fillText('Volume', lx, ly + 16);
    ctx.fillStyle = C.LIGHT;
    ctx.fillText('Surface', lx, ly + 32);

    // --- Tick labels (x) --------------------------------------------------
    ctx.font = C.TICK_FONT;
    ctx.fillStyle = C.MUTED;
    ctx.textAlign = 'center';
    const nxTicks = 5;
    for (let i = 0; i <= nxTicks; i++) {
      const rNm = rMaxNm * i / nxTicks;
      ctx.fillText(rNm.toFixed(1), xS(rNm), h - pad.b + 14);
    }

    // --- Tick labels (y) --------------------------------------------------
    ctx.textAlign = 'right';
    const nyTicks = 5;
    for (let i = 0; i <= nyTicks; i++) {
      const gVal = yLo + (yHi - yLo) * i / nyTicks;
      ctx.fillText(gVal.toFixed(1), pad.l - 6, yS(gVal) + 4);
    }

    // --- Readout ----------------------------------------------------------
    readout.innerHTML =
      `<span>r* = <b>${(rcNm).toFixed(2)}</b> nm</span>` +
      `<span>\u0394G* = <b>${dGcUnits.toFixed(2)}</b> \u00d710\u207b\u00b9\u2078 J</span>`;
  }

  // --- Slider wiring ------------------------------------------------------
  function update() {
    gamma = parseInt(gammaSlider.value) / 1000;   // mJ -> J/m^2
    dGv   = parseInt(dgvSlider.value) / 100;      // centiunits -> GJ/m^3
    gammaVal.textContent = gamma.toFixed(2) + ' J/m\u00b2';
    dgvVal.textContent   = dGv.toFixed(2) + ' GJ/m\u00b3';
    render();
  }

  gammaSlider.addEventListener('input', update);
  dgvSlider.addEventListener('input', update);

  render();
  window.addEventListener('resize', render);
}
