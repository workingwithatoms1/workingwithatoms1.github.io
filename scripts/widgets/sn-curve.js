/* ==========================================================================
   S-N (Wohler) fatigue curve widget
   Interactive plot of Basquin's law: sigma_a = sigma_f' * (2*N_f)^b
   with optional endurance limit sigma_e as horizontal asymptote.
   Sliders for sigma_f', b, sigma_e. Presets for Steel and Aluminium.
   ========================================================================== */

import * as C from './chart-utils.js';

const PRESETS = [
  { label: 'Steel',     sfp: 900, b: -0.10, se: 250 },
  { label: 'Aluminium', sfp: 700, b: -0.12, se: 0   },
];

export function create(container) {
  const canvas = C.createWidgetShell(container, 0.55);

  let sfp = 900;    // sigma_f' fatigue strength coefficient (MPa)
  let b   = -0.10;  // fatigue strength exponent (negative)
  let se  = 250;    // endurance limit (MPa), 0 = none

  // Slider mappings:
  //   sfp: 500-2000 MPa, step 10 => integer slider 50-200
  //   b:   -0.05 to -0.20, step 0.005 => integer slider -200 to -50 (value/1000)
  //   se:  0-400 MPa, step 5 => integer slider 0-80

  const controls = document.createElement('div');
  controls.style.cssText = 'padding: 8px 16px; display: flex; flex-wrap: wrap; gap: 12px; align-items: center; font-family: "DM Sans", sans-serif; font-size: 12px; color: #3a3d5a;';
  controls.innerHTML = `
    <label style="display:flex;align-items:center;gap:6px;">
      <span style="font-weight:500;">\u03c3\u2032<sub>f</sub></span>
      <input type="range" min="50" max="200" value="90" step="1" id="sn-sfp" style="width:100px;accent-color:#2a2f7c;">
      <span id="sn-sfp-val" style="min-width:64px;">900 MPa</span>
    </label>
    <label style="display:flex;align-items:center;gap:6px;">
      <span style="font-weight:500;">b</span>
      <input type="range" min="-200" max="-50" value="-100" step="1" id="sn-b" style="width:100px;accent-color:#2a2f7c;">
      <span id="sn-b-val" style="min-width:44px;">\u22120.100</span>
    </label>
    <label style="display:flex;align-items:center;gap:6px;">
      <span style="font-weight:500;">\u03c3<sub>e</sub></span>
      <input type="range" min="0" max="80" value="50" step="1" id="sn-se" style="width:100px;accent-color:#2a2f7c;">
      <span id="sn-se-val" style="min-width:52px;">250 MPa</span>
    </label>
    <select id="sn-preset" style="padding:3px 6px;font-size:11px;border:1px solid #c8c6d0;background:#fff;color:#3a3d5a;">
      <option value="">Preset\u2026</option>
      ${PRESETS.map((p, i) => `<option value="${i}">${p.label}</option>`).join('')}
    </select>
  `;
  container.appendChild(controls);

  const sfpSlider  = controls.querySelector('#sn-sfp');
  const bSlider    = controls.querySelector('#sn-b');
  const seSlider   = controls.querySelector('#sn-se');
  const sfpVal     = controls.querySelector('#sn-sfp-val');
  const bVal       = controls.querySelector('#sn-b-val');
  const seVal      = controls.querySelector('#sn-se-val');
  const presetSel  = controls.querySelector('#sn-preset');

  const pad = { l: 60, r: 20, t: 20, b: 50 };

  // Basquin's law: sigma_a = sigma_f' * (2*N_f)^b
  // X-axis is log10(N_f), so N_f = 10^x and sigma_a = sfp * (2 * 10^x)^b
  // When sigma_e > 0, the curve flattens to sigma_e (endurance limit).
  function sigmaA(log10Nf) {
    const Nf = Math.pow(10, log10Nf);
    const sa = sfp * Math.pow(2 * Nf, b);
    if (se > 0 && sa < se) return se;
    return sa;
  }

  function render() {
    const { ctx, w, h } = C.setupCanvas(canvas, container, 0.55);

    // Fixed axes
    const xMin = 1, xMax = 9;       // log10(N_f): 10 to 10^9
    const yMin = 0, yMax = 1200;    // sigma_a (MPa)

    const xS = C.scale(xMin, xMax, pad.l, w - pad.r);
    const yS = C.scale(yMin, yMax, h - pad.b, pad.t);

    // Axes
    C.drawAxes(ctx, pad, w, h, 'log\u2081\u2080 N\u1D62  (cycles)', '\u03c3\u2090  (MPa)');

    // Grid lines
    ctx.strokeStyle = 'rgba(0,0,0,0.05)';
    ctx.lineWidth = 0.6;
    for (let x = 1; x <= 9; x++) {
      ctx.beginPath();
      ctx.moveTo(xS(x), pad.t);
      ctx.lineTo(xS(x), h - pad.b);
      ctx.stroke();
    }
    for (let y = 0; y <= 1200; y += 200) {
      ctx.beginPath();
      ctx.moveTo(pad.l, yS(y));
      ctx.lineTo(w - pad.r, yS(y));
      ctx.stroke();
    }

    // X-axis ticks
    ctx.font = C.TICK_FONT;
    ctx.fillStyle = C.MUTED;
    ctx.textAlign = 'center';
    for (let x = 1; x <= 9; x++) {
      ctx.fillText(x.toString(), xS(x), h - pad.b + 14);
      ctx.strokeStyle = C.MUTED;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(xS(x), h - pad.b);
      ctx.lineTo(xS(x), h - pad.b + 4);
      ctx.stroke();
    }

    // Y-axis ticks
    ctx.textAlign = 'right';
    for (let y = 0; y <= 1200; y += 200) {
      ctx.fillStyle = C.MUTED;
      ctx.fillText(y.toString(), pad.l - 6, yS(y) + 4);
      ctx.strokeStyle = C.MUTED;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(pad.l - 3, yS(y));
      ctx.lineTo(pad.l, yS(y));
      ctx.stroke();
    }

    // Clip to plot area
    ctx.save();
    ctx.beginPath();
    ctx.rect(pad.l, pad.t, w - pad.l - pad.r, h - pad.t - pad.b);
    ctx.clip();

    // S-N curve (Basquin)
    const pts = C.sampleCurve(xS, yS, sigmaA, 300);
    C.fillUnder(ctx, pts, yS(0), C.FILL_BLUE);
    C.strokeCurve(ctx, pts, C.BLUE, 2.5);

    // Endurance limit dashed line
    if (se > 0) {
      C.dashedHLine(ctx, yS(se), pad.l, w - pad.r, C.RED);

      // Label
      ctx.font = C.TICK_FONT;
      ctx.fillStyle = C.RED;
      ctx.textAlign = 'left';
      ctx.fillText('\u03c3\u2091 = ' + se + ' MPa', pad.l + 8, yS(se) - 6);
    }

    ctx.restore();

    // Parameter readout on chart
    ctx.font = C.TITLE_FONT;
    ctx.fillStyle = C.DARK;
    ctx.textAlign = 'right';
    ctx.fillText('S\u2013N Curve (Basquin)', w - pad.r, pad.t + 14);
    ctx.font = C.TICK_FONT;
    ctx.fillStyle = C.MUTED;
    ctx.fillText("\u03c3\u2032f = " + sfp + ' MPa,  b = ' + b.toFixed(3), w - pad.r, pad.t + 30);
    if (se > 0) {
      ctx.fillText('\u03c3\u2091 = ' + se + ' MPa (endurance limit)', w - pad.r, pad.t + 44);
    } else {
      ctx.fillText('No endurance limit', w - pad.r, pad.t + 44);
    }
  }

  function update() {
    sfp = parseInt(sfpSlider.value) * 10;
    b   = parseInt(bSlider.value) / 1000;
    se  = parseInt(seSlider.value) * 5;
    sfpVal.textContent = sfp + ' MPa';
    bVal.textContent   = (b < 0 ? '\u2212' : '') + Math.abs(b).toFixed(3);
    seVal.textContent  = se + ' MPa';
    render();
  }

  sfpSlider.addEventListener('input', update);
  bSlider.addEventListener('input', update);
  seSlider.addEventListener('input', update);

  presetSel.addEventListener('change', () => {
    if (presetSel.value === '') return;
    const p = PRESETS[parseInt(presetSel.value)];
    sfp = p.sfp;
    b   = p.b;
    se  = p.se;
    sfpSlider.value = sfp / 10;
    bSlider.value   = Math.round(b * 1000);
    seSlider.value  = se / 5;
    sfpVal.textContent = sfp + ' MPa';
    bVal.textContent   = (b < 0 ? '\u2212' : '') + Math.abs(b).toFixed(3);
    seVal.textContent  = se + ' MPa';
    render();
    presetSel.value = '';
  });

  render();
  window.addEventListener('resize', render);
}
