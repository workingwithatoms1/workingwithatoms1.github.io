/* ==========================================================================
   Carnot cycle PV diagram — interactive widget
   Sliders for Th and Tc. Shows isotherms, adiabats, shaded work area,
   and live efficiency calculation.
   ========================================================================== */

const BLUE   = '#2a2f7c';
const LIGHT  = '#4d5cf2';
const MUTED  = '#888';
const DARK   = '#1a1d3a';
const FILL   = 'rgba(77, 92, 242, 0.12)';
const GAMMA  = 5 / 3;  // monatomic ideal gas
const MAX_DPR = 2;

export function create(container, config) {
  container.style.minHeight = 'auto';
  container.style.background = '#e1e0e8';

  // Canvas
  const canvas = document.createElement('canvas');
  canvas.className = 'widget-canvas';
  container.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  // Controls
  const controls = document.createElement('div');
  controls.className = 'widget-controls';
  controls.style.flexWrap = 'wrap';
  controls.innerHTML = `
    <label class="widget-label">T<sub>H</sub></label>
    <input type="range" class="widget-slider" id="wThSlider" min="400" max="1000" value="600" step="10">
    <span class="widget-value" id="wThVal">600 K</span>
    <label class="widget-label">T<sub>C</sub></label>
    <input type="range" class="widget-slider" id="wTcSlider" min="200" max="590" value="300" step="10">
    <span class="widget-value" id="wTcVal">300 K</span>
    <span class="widget-label" style="margin-left:auto" id="wEff">η = 50.0%</span>
  `;
  container.appendChild(controls);

  const thSlider = controls.querySelector('#wThSlider');
  const tcSlider = controls.querySelector('#wTcSlider');
  const thVal    = controls.querySelector('#wThVal');
  const tcVal    = controls.querySelector('#wTcVal');
  const effLabel = controls.querySelector('#wEff');

  function getCyclePoints(Th, Tc) {
    // nR = 1 for simplicity. State A on Th isotherm.
    const V1 = 1.0;
    const P1 = Th / V1;

    // Isothermal expansion A→B at Th
    const V2 = 2.5;
    const P2 = Th / V2;

    // Adiabatic expansion B→C: Th * V2^(γ-1) = Tc * V3^(γ-1)
    const V3 = V2 * Math.pow(Th / Tc, 1 / (GAMMA - 1));
    const P3 = Tc / V3;

    // Adiabatic compression D→A: Th * V1^(γ-1) = Tc * V4^(γ-1)
    const V4 = V1 * Math.pow(Th / Tc, 1 / (GAMMA - 1));
    const P4 = Tc / V4;

    return { V1, P1, V2, P2, V3, P3, V4, P4, Th, Tc };
  }

  function render() {
    const dpr = Math.min(window.devicePixelRatio, MAX_DPR);
    const w = container.clientWidth;
    const h = Math.round(w * 0.55);

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const Th = parseInt(thSlider.value);
    let Tc = parseInt(tcSlider.value);
    if (Tc >= Th) { Tc = Th - 10; tcSlider.value = Tc; }
    tcSlider.max = Th - 10;

    thVal.textContent = Th + ' K';
    tcVal.textContent = Tc + ' K';
    const eff = (1 - Tc / Th) * 100;
    effLabel.textContent = 'η = ' + eff.toFixed(1) + '%';

    const cp = getCyclePoints(Th, Tc);

    // Plot area
    const pad = { l: 52, r: 20, t: 20, b: 40 };
    const pw = w - pad.l - pad.r;
    const ph = h - pad.t - pad.b;

    // Scale: V range and P range
    const Vmin = 0.5, Vmax = cp.V3 * 1.15;
    const Pmax = cp.P1 * 1.1, Pmin = 0;

    function toX(V) { return pad.l + (V - Vmin) / (Vmax - Vmin) * pw; }
    function toY(P) { return pad.t + (1 - (P - Pmin) / (Pmax - Pmin)) * ph; }

    // Axes
    ctx.strokeStyle = MUTED;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.l, pad.t);
    ctx.lineTo(pad.l, h - pad.b);
    ctx.lineTo(w - pad.r, h - pad.b);
    ctx.stroke();

    ctx.font = '12px "DM Sans", sans-serif';
    ctx.fillStyle = MUTED;
    ctx.textAlign = 'center';
    ctx.fillText('V', w / 2, h - 8);
    ctx.save();
    ctx.translate(14, h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('P', 0, 0);
    ctx.restore();

    // Helper: draw curve as series of points
    function drawCurve(vStart, vEnd, pFunc, steps = 80) {
      const pts = [];
      for (let i = 0; i <= steps; i++) {
        const V = vStart + (vEnd - vStart) * i / steps;
        pts.push({ x: toX(V), y: toY(pFunc(V)) });
      }
      return pts;
    }

    function strokePts(pts) {
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.stroke();
    }

    // Background isotherms (faint)
    ctx.strokeStyle = 'rgba(42, 47, 124, 0.1)';
    ctx.lineWidth = 1;
    const thIso = drawCurve(Vmin, Vmax, V => Th / V);
    strokePts(thIso);
    const tcIso = drawCurve(Vmin, Vmax, V => Tc / V);
    strokePts(tcIso);

    // Isotherm labels
    ctx.font = '11px "DM Sans", sans-serif';
    ctx.fillStyle = 'rgba(42, 47, 124, 0.35)';
    ctx.textAlign = 'left';
    ctx.fillText('T_H = ' + Th + ' K', toX(Vmax) - 80, toY(Th / Vmax) - 6);
    ctx.fillText('T_C = ' + Tc + ' K', toX(Vmax) - 78, toY(Tc / Vmax) - 6);

    // Cycle paths
    // A→B isothermal at Th
    const ab = drawCurve(cp.V1, cp.V2, V => Th / V);
    // B→C adiabatic
    const bcConst = Th * Math.pow(cp.V2, GAMMA - 1);
    const bc = drawCurve(cp.V2, cp.V3, V => bcConst / Math.pow(V, GAMMA));
    // C→D isothermal at Tc
    const cd = drawCurve(cp.V3, cp.V4, V => Tc / V);
    // D→A adiabatic
    const daConst = Tc * Math.pow(cp.V4, GAMMA - 1);
    const da = drawCurve(cp.V4, cp.V1, V => daConst / Math.pow(V, GAMMA));

    // Fill enclosed area
    ctx.fillStyle = FILL;
    ctx.beginPath();
    for (const pt of ab) ctx.lineTo(pt.x, pt.y);
    for (const pt of bc) ctx.lineTo(pt.x, pt.y);
    for (const pt of [...cd].reverse()) ctx.lineTo(pt.x, pt.y);
    for (const pt of [...da].reverse()) ctx.lineTo(pt.x, pt.y);
    ctx.closePath();
    ctx.fill();

    // Stroke cycle
    ctx.strokeStyle = BLUE;
    ctx.lineWidth = 2;
    strokePts(ab);
    strokePts(bc);
    ctx.strokeStyle = LIGHT;
    strokePts([...cd].reverse());
    strokePts([...da].reverse());

    // State labels
    ctx.font = '500 13px "DM Sans", sans-serif';
    ctx.fillStyle = DARK;
    ctx.textAlign = 'center';
    const labelOffset = 14;
    ctx.fillText('A', toX(cp.V1) - labelOffset, toY(cp.P1) - 6);
    ctx.fillText('B', toX(cp.V2) + labelOffset, toY(cp.P2) - 6);
    ctx.fillText('C', toX(cp.V3) + labelOffset, toY(cp.P3) + 16);
    ctx.fillText('D', toX(cp.V4) - labelOffset, toY(cp.P4) + 16);

    // State dots
    ctx.fillStyle = BLUE;
    for (const [V, P] of [[cp.V1, cp.P1], [cp.V2, cp.P2], [cp.V3, cp.P3], [cp.V4, cp.P4]]) {
      ctx.beginPath();
      ctx.arc(toX(V), toY(P), 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Process labels
    ctx.font = '11px "DM Sans", sans-serif';
    ctx.fillStyle = BLUE;
    const abMid = ab[Math.floor(ab.length / 2)];
    ctx.fillText('Q_H in', abMid.x, abMid.y - 12);
    ctx.fillStyle = LIGHT;
    const cdMid = cd[Math.floor(cd.length / 2)];
    ctx.fillText('Q_C out', cdMid.x, cdMid.y + 18);
  }

  thSlider.addEventListener('input', render);
  tcSlider.addEventListener('input', render);

  render();
  window.addEventListener('resize', render);
}
