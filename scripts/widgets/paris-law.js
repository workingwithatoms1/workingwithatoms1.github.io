/* ==========================================================================
   Paris law fatigue crack growth widget
   da/dN vs Delta-K on log-log axes with the classic sigmoidal shape.
   Model: da/dN = C * (DK)^m * (1 - (DK_th/DK))^2 / (1 - (DK/K_IC))^2
   Sliders for C, m, DK_th, K_IC. Presets for Steel and Aluminium.
   ========================================================================== */

import * as C from './chart-utils.js';

const PRESETS = [
  { label: 'Steel',     Cv: 2e-11, m: 3.0, dkth: 5, kic: 50 },
  { label: 'Aluminium', Cv: 5e-10, m: 3.5, dkth: 2, kic: 30 },
];

export function create(container) {
  const canvas = C.createWidgetShell(container, 0.55);

  // State variables
  let Cv   = 2e-11;  // Paris constant C
  let m    = 3.0;    // Paris exponent
  let dkth = 5;      // threshold Delta-K (MPa sqrt(m))
  let kic  = 50;     // fracture toughness K_IC (MPa sqrt(m))

  // Slider mappings for C: log10(C) range -12 to -8
  // slider integer = log10(C) * 100, so -1200 to -800
  function cToSlider(c) { return Math.round(Math.log10(c) * 100); }
  function sliderToC(v) { return Math.pow(10, v / 100); }

  // Slider mappings for m: 2.0 to 5.0 in steps of 0.1
  // slider integer = m * 10, so 20 to 50
  function mToSlider(mv) { return Math.round(mv * 10); }
  function sliderToM(v)  { return v / 10; }

  // Controls
  const controls = document.createElement('div');
  controls.style.cssText = 'padding: 8px 16px; display: flex; flex-wrap: wrap; gap: 12px; align-items: center; font-family: "DM Sans", sans-serif; font-size: 12px; color: #3a3d5a;';
  controls.innerHTML = `
    <label style="display:flex;align-items:center;gap:6px;">
      <span style="font-weight:500;">C</span>
      <input type="range" min="-1200" max="-800" value="${cToSlider(Cv)}" step="1" id="pl-c" style="width:90px;accent-color:#2a2f7c;">
      <span id="pl-c-val" style="min-width:68px;">${Cv.toExponential(0)}</span>
    </label>
    <label style="display:flex;align-items:center;gap:6px;">
      <span style="font-weight:500;">m</span>
      <input type="range" min="20" max="50" value="${mToSlider(m)}" step="1" id="pl-m" style="width:80px;accent-color:#2a2f7c;">
      <span id="pl-m-val" style="min-width:28px;">${m.toFixed(1)}</span>
    </label>
    <label style="display:flex;align-items:center;gap:6px;">
      <span style="font-weight:500;">\u0394K<sub>th</sub></span>
      <input type="range" min="20" max="100" value="${dkth * 10}" step="1" id="pl-dkth" style="width:80px;accent-color:#2a2f7c;">
      <span id="pl-dkth-val" style="min-width:36px;">${dkth}</span>
    </label>
    <label style="display:flex;align-items:center;gap:6px;">
      <span style="font-weight:500;">K<sub>IC</sub></span>
      <input type="range" min="20" max="100" value="${kic}" step="1" id="pl-kic" style="width:80px;accent-color:#2a2f7c;">
      <span id="pl-kic-val" style="min-width:42px;">${kic} MPa\u221am</span>
    </label>
    <select id="pl-preset" style="padding:3px 6px;font-size:11px;border:1px solid #c8c6d0;background:#fff;color:#3a3d5a;">
      <option value="">Preset\u2026</option>
      ${PRESETS.map((p, i) => `<option value="${i}">${p.label}</option>`).join('')}
    </select>
  `;
  container.appendChild(controls);

  const cSlider    = controls.querySelector('#pl-c');
  const mSlider    = controls.querySelector('#pl-m');
  const dkthSlider = controls.querySelector('#pl-dkth');
  const kicSlider  = controls.querySelector('#pl-kic');
  const cValSpan   = controls.querySelector('#pl-c-val');
  const mValSpan   = controls.querySelector('#pl-m-val');
  const dkthValSpan = controls.querySelector('#pl-dkth-val');
  const kicValSpan  = controls.querySelector('#pl-kic-val');
  const presetSel   = controls.querySelector('#pl-preset');

  const pad = { l: 60, r: 20, t: 20, b: 50 };

  // Paris law model (extended, sigmoidal):
  // da/dN = C * (DK)^m * (1 - (DK_th/DK))^2 / (1 - (DK/K_IC))^2
  // Input/output in log10 space for plotting.
  // logDK = log10(DK), returns log10(da/dN)
  function log10dadN(logDK) {
    const dk = Math.pow(10, logDK);
    if (dk <= dkth || dk >= kic) return NaN;
    const threshTerm = 1 - (dkth / dk);
    const fractureTerm = 1 - (dk / kic);
    if (threshTerm <= 0 || fractureTerm <= 0) return NaN;
    const dadN = Cv * Math.pow(dk, m) * Math.pow(threshTerm, 2) / Math.pow(fractureTerm, 2);
    return Math.log10(dadN);
  }

  function render() {
    const { ctx, w, h } = C.setupCanvas(canvas, container, 0.55);

    // Log-log axes: x = log10(DK), y = log10(da/dN)
    const xMin = Math.log10(1),   xMax = Math.log10(200);   // 1 to 200 MPa sqrt(m)
    const yMin = -12, yMax = -3;                             // 10^-12 to 10^-3 m/cycle

    const xS = C.scale(xMin, xMax, pad.l, w - pad.r);
    const yS = C.scale(yMin, yMax, h - pad.b, pad.t);

    // Axes
    C.drawAxes(ctx, pad, w, h, '\u0394K  (MPa\u221am)', 'da/dN  (m/cycle)');

    // Grid lines
    ctx.strokeStyle = 'rgba(0,0,0,0.05)';
    ctx.lineWidth = 0.6;

    // X grid at decade marks: 1, 10, 100
    for (let exp = 0; exp <= 2; exp++) {
      const lx = exp;
      ctx.beginPath();
      ctx.moveTo(xS(lx), pad.t);
      ctx.lineTo(xS(lx), h - pad.b);
      ctx.stroke();
    }
    // Y grid at decade marks
    for (let ly = -12; ly <= -3; ly++) {
      ctx.beginPath();
      ctx.moveTo(pad.l, yS(ly));
      ctx.lineTo(w - pad.r, yS(ly));
      ctx.stroke();
    }

    // X-axis tick labels (log scale)
    ctx.font = C.TICK_FONT;
    ctx.fillStyle = C.MUTED;
    ctx.textAlign = 'center';
    const xTicks = [1, 2, 5, 10, 20, 50, 100, 200];
    for (const val of xTicks) {
      const lx = Math.log10(val);
      if (lx < xMin || lx > xMax) continue;
      ctx.fillText(val.toString(), xS(lx), h - pad.b + 14);
      // Tick mark
      ctx.strokeStyle = C.MUTED;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(xS(lx), h - pad.b);
      ctx.lineTo(xS(lx), h - pad.b + 4);
      ctx.stroke();
    }

    // Y-axis tick labels (log scale)
    ctx.textAlign = 'right';
    for (let ly = -12; ly <= -3; ly++) {
      ctx.fillStyle = C.MUTED;
      ctx.fillText('10' + superscript(ly), pad.l - 6, yS(ly) + 4);
      // Tick mark
      ctx.strokeStyle = C.MUTED;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(pad.l - 3, yS(ly));
      ctx.lineTo(pad.l, yS(ly));
      ctx.stroke();
    }

    // Clip to plot area
    ctx.save();
    ctx.beginPath();
    ctx.rect(pad.l, pad.t, w - pad.l - pad.r, h - pad.t - pad.b);
    ctx.clip();

    // Sample the curve (in log10 space)
    const pts = [];
    const steps = 400;
    // Sample from just above dkth to just below kic
    const sampleMin = Math.log10(dkth * 1.001);
    const sampleMax = Math.log10(kic * 0.999);
    for (let i = 0; i <= steps; i++) {
      const logDK = sampleMin + (sampleMax - sampleMin) * i / steps;
      const logDadN = log10dadN(logDK);
      if (isFinite(logDadN) && logDadN >= yMin - 1 && logDadN <= yMax + 1) {
        pts.push({ x: xS(logDK), y: yS(logDadN) });
      }
    }

    C.strokeCurve(ctx, pts, C.BLUE, 2.5);

    // Region labels
    const plotW = w - pad.l - pad.r;
    const plotH = h - pad.t - pad.b;
    ctx.font = '400 10px "DM Sans", sans-serif';
    ctx.textAlign = 'center';

    // Threshold region label (near left, vertical)
    const threshX = xS(Math.log10(dkth)) - 2;
    if (threshX > pad.l + 6) {
      const regionCentreX = (pad.l + threshX) / 2;
      ctx.save();
      ctx.fillStyle = 'rgba(139, 34, 82, 0.55)';
      ctx.translate(regionCentreX, pad.t + plotH * 0.45);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText('Threshold', 0, 0);
      ctx.restore();
    }

    // Fast fracture region label (near right, vertical)
    const fracX = xS(Math.log10(kic)) + 2;
    if (fracX < w - pad.r - 6) {
      const regionCentreX = (fracX + w - pad.r) / 2;
      ctx.save();
      ctx.fillStyle = 'rgba(139, 34, 82, 0.55)';
      ctx.translate(regionCentreX, pad.t + plotH * 0.45);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText('Fast fracture', 0, 0);
      ctx.restore();
    }

    // Paris regime label (centre of the linear region)
    // The linear region is roughly between 2*dkth and kic/2 on the DK axis
    const parisMinDK = Math.max(dkth * 2, 1);
    const parisMaxDK = Math.min(kic / 2, 200);
    if (parisMaxDK > parisMinDK) {
      const parisMidLog = (Math.log10(parisMinDK) + Math.log10(parisMaxDK)) / 2;
      const parisMidY = log10dadN(parisMidLog);
      if (isFinite(parisMidY)) {
        ctx.fillStyle = 'rgba(42, 47, 124, 0.6)';
        ctx.font = '500 11px "DM Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Paris regime', xS(parisMidLog), yS(parisMidY) - 14);
      }
    }

    // Slope annotation: show "m = ..." with a small slope triangle
    // Pick two points in the Paris regime for the annotation
    const slopeAnchorLog = (Math.log10(parisMinDK) + Math.log10(parisMaxDK)) / 2;
    const slopeDelta = 0.15; // half-width in log10(DK)
    const logDK1 = slopeAnchorLog - slopeDelta;
    const logDK2 = slopeAnchorLog + slopeDelta;
    const logY1 = log10dadN(logDK1);
    const logY2 = log10dadN(logDK2);
    if (isFinite(logY1) && isFinite(logY2)) {
      const sx1 = xS(logDK1), sy1 = yS(logY1);
      const sx2 = xS(logDK2), sy2 = yS(logY2);
      // Slope triangle: horizontal from (x1,y1) to (x2,y1), then vertical to (x2,y2)
      ctx.strokeStyle = 'rgba(42, 47, 124, 0.35)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(sx1, sy1);
      ctx.lineTo(sx2, sy1);
      ctx.lineTo(sx2, sy2);
      ctx.stroke();
      ctx.setLineDash([]);

      // "m" label next to the vertical leg
      ctx.font = C.TICK_FONT;
      ctx.fillStyle = C.DARK;
      ctx.textAlign = 'left';
      ctx.fillText('m = ' + m.toFixed(1), sx2 + 5, (sy1 + sy2) / 2 + 3);
    }

    // Dashed vertical lines at DK_th and K_IC
    const dkthPx = xS(Math.log10(dkth));
    const kicPx  = xS(Math.log10(kic));
    C.dashedVLine(ctx, dkthPx, pad.t, h - pad.b, 'rgba(139,34,82,0.35)');
    C.dashedVLine(ctx, kicPx,  pad.t, h - pad.b, 'rgba(139,34,82,0.35)');

    // Labels for DK_th and K_IC lines
    ctx.font = C.TICK_FONT;
    ctx.fillStyle = C.RED;
    ctx.textAlign = 'center';
    ctx.fillText('\u0394K\u209C\u2095', dkthPx, h - pad.b - 6);
    ctx.fillText('K\u1d3c', kicPx, h - pad.b - 6);

    ctx.restore();

    // Title and parameter readout (top-right, outside clip)
    ctx.font = C.TITLE_FONT;
    ctx.fillStyle = C.DARK;
    ctx.textAlign = 'right';
    ctx.fillText('Paris Law (Crack Growth)', w - pad.r, pad.t + 14);
    ctx.font = C.TICK_FONT;
    ctx.fillStyle = C.MUTED;
    ctx.fillText('C = ' + Cv.toExponential(0) + ',  m = ' + m.toFixed(1), w - pad.r, pad.t + 30);
    ctx.fillText('\u0394K\u209C\u2095 = ' + dkth.toFixed(1) + ',  K\u1d3c = ' + kic + '  MPa\u221am', w - pad.r, pad.t + 44);
  }

  function update() {
    Cv   = sliderToC(parseInt(cSlider.value));
    m    = sliderToM(parseInt(mSlider.value));
    dkth = parseInt(dkthSlider.value) / 10;
    kic  = parseInt(kicSlider.value);
    cValSpan.textContent    = Cv.toExponential(0);
    mValSpan.textContent    = m.toFixed(1);
    dkthValSpan.textContent = dkth.toFixed(1);
    kicValSpan.textContent  = kic + ' MPa\u221am';
    render();
  }

  cSlider.addEventListener('input', update);
  mSlider.addEventListener('input', update);
  dkthSlider.addEventListener('input', update);
  kicSlider.addEventListener('input', update);

  presetSel.addEventListener('change', () => {
    if (presetSel.value === '') return;
    const p = PRESETS[parseInt(presetSel.value)];
    Cv   = p.Cv;
    m    = p.m;
    dkth = p.dkth;
    kic  = p.kic;
    cSlider.value    = cToSlider(Cv);
    mSlider.value    = mToSlider(m);
    dkthSlider.value = Math.round(dkth * 10);
    kicSlider.value  = kic;
    cValSpan.textContent    = Cv.toExponential(0);
    mValSpan.textContent    = m.toFixed(1);
    dkthValSpan.textContent = dkth.toFixed(1);
    kicValSpan.textContent  = kic + ' MPa\u221am';
    render();
    presetSel.value = '';
  });

  render();
  window.addEventListener('resize', render);
}

/* Unicode superscript helper for exponents */
function superscript(n) {
  const sup = { '-': '\u207b', '0': '\u2070', '1': '\u00b9', '2': '\u00b2', '3': '\u00b3',
                '4': '\u2074', '5': '\u2075', '6': '\u2076', '7': '\u2077', '8': '\u2078', '9': '\u2079' };
  return String(n).split('').map(ch => sup[ch] || ch).join('');
}
