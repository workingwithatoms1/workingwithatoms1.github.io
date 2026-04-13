/* ==========================================================================
   Ellingham diagram — interactive oxide stability chart
   Click reaction lines to highlight. Shows carbon/CO lines.
   ========================================================================== */

import * as C from './chart-utils.js';

// Reaction data: ΔG° = a + bT (kJ per mol O2)
const REACTIONS = [
  { metal: '2Cu₂O',   a: -340,  b: 0.14,  color: '#8b5e3c' },
  { metal: '2NiO',    a: -480,  b: 0.18,  color: '#5a8b3c' },
  { metal: '2FeO',    a: -530,  b: 0.13,  color: '#3c5a8b' },
  { metal: '2ZnO',    a: -700,  b: 0.22,  color: '#8b3c6e' },
  { metal: 'TiO₂',   a: -920,  b: 0.18,  color: '#4a7080' },
  { metal: '⅔Al₂O₃', a: -1120, b: 0.21,  color: '#6b4a80' },
  { metal: '2MgO',    a: -1200, b: 0.22,  color: '#3c8b7a' },
  { metal: '2CaO',    a: -1270, b: 0.21,  color: '#8b7a3c' },
];

const CARBON = [
  { label: 'C → CO₂',  a: -394, b: 0.0,   dash: true },
  { label: '2C → 2CO', a: -224, b: -0.175, dash: true },
];

export function create(container) {
  const canvas = C.createWidgetShell(container, 0.65);
  const ctx = canvas.getContext('2d');

  let selected = -1;

  const pad = { l: 60, r: 120, t: 24, b: 50 };

  function render() {
    const { w, h } = C.setupCanvas(canvas, container, 0.65);

    const Tmin = 0, Tmax = 2000;
    const Gmin = -1400, Gmax = 0;
    const xS = C.scale(Tmin, Tmax, pad.l, w - pad.r);
    const yS = C.scale(Gmin, Gmax, h - pad.b, pad.t);

    C.drawAxes(ctx, pad, w, h, 'T (°C)', 'ΔG° (kJ / mol O₂)');

    // Grid lines
    ctx.strokeStyle = 'rgba(0,0,0,0.05)';
    ctx.lineWidth = 1;
    for (let g = -1200; g <= 0; g += 200) {
      ctx.beginPath();
      ctx.moveTo(pad.l, yS(g));
      ctx.lineTo(w - pad.r, yS(g));
      ctx.stroke();
      ctx.font = C.TICK_FONT;
      ctx.fillStyle = C.MUTED;
      ctx.textAlign = 'right';
      ctx.fillText(g.toString(), pad.l - 6, yS(g) + 4);
    }
    for (let t = 0; t <= 2000; t += 500) {
      ctx.beginPath();
      ctx.moveTo(xS(t), h - pad.b);
      ctx.lineTo(xS(t), pad.t);
      ctx.stroke();
      ctx.font = C.TICK_FONT;
      ctx.fillStyle = C.MUTED;
      ctx.textAlign = 'center';
      ctx.fillText(t.toString(), xS(t), h - pad.b + 14);
    }

    // Carbon lines
    for (const c of CARBON) {
      const pts = [];
      for (let t = 0; t <= 2000; t += 20) {
        const g = c.a + c.b * t;
        if (g >= Gmin && g <= Gmax) pts.push({ x: xS(t), y: yS(g) });
      }
      ctx.setLineDash([6, 4]);
      C.strokeCurve(ctx, pts, C.MUTED, 1.5);
      ctx.setLineDash([]);
      if (pts.length > 2) {
        const lbl = pts[pts.length - 1];
        ctx.font = C.TICK_FONT;
        ctx.fillStyle = C.MUTED;
        ctx.textAlign = 'left';
        ctx.fillText(c.label, lbl.x + 6, lbl.y + 4);
      }
    }

    // Reaction lines
    REACTIONS.forEach((r, i) => {
      const pts = [];
      for (let t = 0; t <= 2000; t += 20) {
        const g = r.a + r.b * t;
        if (g >= Gmin && g <= Gmax) pts.push({ x: xS(t), y: yS(g) });
      }
      const isSelected = i === selected;
      C.strokeCurve(ctx, pts, isSelected ? r.color : r.color, isSelected ? 3 : 1.5);

      // Label at right end
      if (pts.length > 0) {
        const lbl = pts[pts.length - 1];
        ctx.font = isSelected ? C.TITLE_FONT : C.TICK_FONT;
        ctx.fillStyle = r.color;
        ctx.textAlign = 'left';
        ctx.fillText(r.metal, lbl.x + 6, lbl.y + 4);
      }
    });

    // Title
    ctx.font = C.TITLE_FONT;
    ctx.fillStyle = C.DARK;
    ctx.textAlign = 'left';
    ctx.fillText('Ellingham Diagram', pad.l, pad.t + 14);
  }

  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio, C.MAX_DPR);
    const mx = (e.clientX - rect.left);
    const my = (e.clientY - rect.top);
    const { w, h } = { w: container.clientWidth, h: Math.round(container.clientWidth * 0.65) };
    const xS = C.scale(0, 2000, pad.l, w - pad.r);
    const yS = C.scale(-1400, 0, h - pad.b, pad.t);

    let closest = -1, closestDist = 20;
    REACTIONS.forEach((r, i) => {
      const T = xS.inv(mx);
      const g = r.a + r.b * T;
      const gy = yS(g);
      const dist = Math.abs(my - gy);
      if (dist < closestDist) { closestDist = dist; closest = i; }
    });
    selected = closest === selected ? -1 : closest;
    render();
  });

  render();
  window.addEventListener('resize', render);
}
