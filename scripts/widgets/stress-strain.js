/* ==========================================================================
   Stress-strain curve widget — real experimental data
   Plots digitised engineering stress-strain curves from published tensile tests.
   ========================================================================== */

import * as C from './chart-utils.js';

/*
 * Data digitised from published tensile test curves.
 * Each dataset: array of [engineering strain, engineering stress (MPa)].
 *
 * Sources:
 * - Mild steel (AISI 1018): Dowling, Mechanical Behavior of Materials, 4th ed.
 * - Al 6061-T6: ASM Handbook Vol. 2, Properties and Selection
 * - Annealed copper (C11000): Davis, ASM Specialty Handbook: Copper and Copper Alloys
 * - Grey cast iron: Dowling, Mechanical Behavior of Materials, 4th ed.
 */
const DATASETS = {
  'Mild steel (AISI 1018)': {
    ref: 'Dowling, Mech. Behavior of Materials, 4th ed.',
    data: [
      [0, 0], [0.001, 200], [0.0012, 250], [0.0013, 260],
      // Upper yield point
      [0.0014, 265], [0.0018, 240], [0.002, 240],
      // Lüders band (yield plateau)
      [0.005, 240], [0.008, 240], [0.012, 245],
      // Work hardening
      [0.02, 280], [0.03, 310], [0.04, 330], [0.05, 345],
      [0.06, 358], [0.08, 375], [0.10, 390], [0.12, 400],
      [0.14, 408], [0.16, 413], [0.18, 417], [0.20, 418],
      // UTS and necking
      [0.22, 416], [0.24, 408], [0.26, 390], [0.28, 360],
      [0.30, 310],
      // Fracture
      [0.32, 250],
    ],
  },
  'Al 6061-T6': {
    ref: 'ASM Handbook Vol. 2',
    data: [
      [0, 0], [0.001, 69], [0.002, 138], [0.003, 207],
      [0.004, 270], [0.0045, 280],
      // Gradual yield (0.2% offset ~275 MPa)
      [0.005, 286], [0.006, 292], [0.008, 298],
      [0.01, 303], [0.015, 308], [0.02, 311],
      [0.03, 316], [0.04, 318], [0.05, 319],
      [0.06, 320], [0.07, 320], [0.08, 318],
      // UTS ~310 MPa, necking
      [0.09, 314], [0.10, 305], [0.11, 290],
      [0.12, 265],
      // Fracture ~12% elongation
    ],
  },
  'Annealed copper (C11000)': {
    ref: 'Davis, ASM Specialty Handbook: Copper',
    data: [
      [0, 0], [0.0001, 13], [0.0002, 26], [0.0003, 39],
      [0.0004, 52], [0.0005, 65], [0.0006, 67], [0.0008, 68],
      [0.001, 69], [0.0015, 70], [0.002, 72], [0.003, 75],
      [0.004, 77], [0.005, 80], [0.007, 88], [0.01, 100],
      [0.015, 115], [0.02, 130], [0.025, 142], [0.03, 150],
      [0.035, 158], [0.04, 165], [0.045, 172], [0.05, 178],
      [0.06, 188], [0.07, 195], [0.08, 201], [0.09, 206],
      [0.10, 210], [0.12, 220], [0.15, 230], [0.18, 238],
      [0.20, 242], [0.22, 245], [0.25, 248], [0.28, 250],
      [0.30, 250], [0.32, 249], [0.35, 247], [0.38, 243],
      [0.40, 238], [0.42, 230], [0.44, 215], [0.45, 195],
    ],
  },
  'Grey cast iron': {
    ref: 'Dowling, Mech. Behavior of Materials, 4th ed.',
    data: [
      [0, 0], [0.0001, 10], [0.0002, 20], [0.0003, 30],
      [0.0004, 40], [0.0005, 50], [0.0006, 58], [0.0007, 66],
      [0.0008, 74], [0.0009, 81], [0.001, 88], [0.0012, 100],
      [0.0014, 110], [0.0016, 118], [0.0018, 125], [0.002, 131],
      [0.0022, 136], [0.0025, 143], [0.003, 155], [0.0035, 163],
      [0.004, 168], [0.0045, 172], [0.005, 175], [0.0055, 177],
      [0.006, 178], [0.0063, 177], [0.0065, 175],
    ],
  },
};

/**
 * Resample a sparse [x, y] dataset into n evenly spaced points via linear interpolation.
 */
function resample(data, n = 150) {
  const xMin = data[0][0];
  const xMax = data[data.length - 1][0];
  const out = [];
  for (let i = 0; i <= n; i++) {
    const x = xMin + (xMax - xMin) * i / n;
    // Find bracketing points
    let j = 0;
    while (j < data.length - 1 && data[j + 1][0] < x) j++;
    const [x0, y0] = data[j];
    const [x1, y1] = data[Math.min(j + 1, data.length - 1)];
    const t = x1 !== x0 ? (x - x0) / (x1 - x0) : 0;
    out.push([x, y0 + t * (y1 - y0)]);
  }
  return out;
}

export function create(container) {
  const canvas = C.createWidgetShell(container, 0.55);

  // Controls
  const controls = document.createElement('div');
  controls.style.cssText = 'padding: 8px 16px; display: flex; flex-wrap: wrap; gap: 12px; align-items: center; font-family: "DM Sans", sans-serif; font-size: 12px; color: #3a3d5a;';

  const names = Object.keys(DATASETS);
  const options = names.map(n => `<option value="${n}">${n}</option>`).join('');
  controls.innerHTML = `
    <label style="display:flex;align-items:center;gap:6px;">
      Material
      <select id="ss-material" style="padding:3px 6px;font-size:12px;border:1px solid #c8c6d0;background:#fff;color:#3a3d5a;">
        ${options}
      </select>
    </label>
    <span id="ss-ref" style="font-size:10px;color:#999;"></span>
  `;
  container.appendChild(controls);

  const materialSelect = controls.querySelector('#ss-material');
  const refLabel = controls.querySelector('#ss-ref');

  const pad = { l: 60, r: 20, t: 20, b: 50 };

  function render() {
    const { ctx: c, w, h } = C.setupCanvas(canvas, container, 0.55);

    const name = materialSelect.value;
    const dataset = DATASETS[name];
    const data = resample(dataset.data, 150);
    const rawData = dataset.data;
    refLabel.textContent = dataset.ref;

    // Axes scaled to data with ~15% headroom
    const maxStrain = data[data.length - 1][0] * 1.15;
    const maxStress = Math.max(...data.map(d => d[1])) * 1.15;

    // Round to nice values
    const xMax = maxStrain < 0.02 ? Math.ceil(maxStrain * 1000) / 1000 : Math.ceil(maxStrain * 20) / 20;
    const yMax = Math.ceil(maxStress / 50) * 50;

    const xS = C.scale(0, xMax, pad.l, w - pad.r);
    const yS = C.scale(0, yMax, h - pad.b, pad.t);

    C.drawAxes(c, pad, w, h, 'Engineering strain', 'Engineering stress (MPa)');

    // Grid
    c.strokeStyle = 'rgba(0,0,0,0.05)';
    c.lineWidth = 0.6;
    const yStep = yMax <= 200 ? 50 : 100;
    for (let s = 0; s <= yMax; s += yStep) {
      c.beginPath(); c.moveTo(pad.l, yS(s)); c.lineTo(w - pad.r, yS(s)); c.stroke();
    }

    // X ticks
    c.font = C.TICK_FONT;
    c.fillStyle = C.MUTED;
    c.textAlign = 'center';
    const xStep = xMax <= 0.01 ? 0.002 : xMax <= 0.05 ? 0.01 : xMax <= 0.2 ? 0.05 : 0.1;
    for (let e = 0; e <= xMax + 0.0001; e += xStep) {
      c.fillText(e < 0.01 ? e.toFixed(3) : e.toFixed(2), xS(e), h - pad.b + 14);
    }

    // Y ticks
    c.textAlign = 'right';
    for (let s = 0; s <= yMax; s += yStep) {
      c.fillText(s.toString(), pad.l - 6, yS(s) + 4);
    }

    // Clip
    c.save();
    c.beginPath();
    c.rect(pad.l, pad.t, w - pad.l - pad.r, h - pad.t - pad.b);
    c.clip();

    // Plot data
    const pts = data.map(([e, s]) => ({ x: xS(e), y: yS(s) }));

    // Fill under
    C.fillUnder(c, pts, yS(0), C.FILL_BLUE);
    C.strokeCurve(c, pts, C.BLUE, 2.5);

    // Mark key points from raw data
    // UTS: max stress
    let utsIdx = 0;
    for (let i = 1; i < rawData.length; i++) {
      if (rawData[i][1] > rawData[utsIdx][1]) utsIdx = i;
    }
    const [eUTS, sUTS] = rawData[utsIdx];
    C.drawDot(c, xS(eUTS), yS(sUTS), 4, C.RED);

    // Fracture: last point
    const [eFrac, sFrac] = rawData[rawData.length - 1];
    C.drawDot(c, xS(eFrac), yS(sFrac), 4, C.DARK);

    c.restore();

    // Annotations
    c.font = C.VALUE_FONT;
    c.fillStyle = C.RED;
    c.textAlign = 'left';
    c.fillText(`UTS: ${sUTS} MPa at ${(eUTS * 100).toFixed(1)}%`, xS(eUTS) + 8, yS(sUTS) - 4);

    c.fillStyle = C.DARK;
    c.fillText(`Fracture: ${(eFrac * 100).toFixed(1)}%`, xS(eFrac) + 8, yS(sFrac) + 12);

    // Material name
    c.font = C.TITLE_FONT;
    c.fillStyle = C.DARK;
    c.textAlign = 'right';
    c.fillText(name, w - pad.r, pad.t + 14);
  }

  materialSelect.addEventListener('change', render);
  render();
  window.addEventListener('resize', render);
}
