/* ==========================================================================
   Pourbaix diagram — E vs pH for iron at 25°C
   Hover to see stable phase. Water stability lines shown.
   ========================================================================== */

import * as C from './chart-utils.js';

const REGIONS = [
  { label: 'Fe', path: [[0,-0.62],[7,-0.62],[7,-1.0],[14,-1.0],[14,-1.4],[0,-1.4]], color: 'rgba(42,47,124,0.08)' },
  { label: 'Fe²⁺', path: [[0,-0.62],[0,0.5],[6,0.5],[6,-0.05],[9.4,-0.25],[9.4,-0.62],[7,-0.62]], color: 'rgba(77,92,242,0.08)' },
  { label: 'Fe³⁺', path: [[0,0.5],[0,1.4],[2,1.4],[2,0.8],[6,0.5]], color: 'rgba(139,34,82,0.06)' },
  { label: 'Fe₂O₃', path: [[2,0.8],[2,1.4],[14,1.4],[14,0.3],[9.4,-0.25],[6,-0.05],[6,0.5]], color: 'rgba(139,34,82,0.10)' },
  { label: 'Fe₃O₄', path: [[7,-0.62],[9.4,-0.62],[9.4,-0.25],[14,0.3],[14,-1.0],[7,-1.0]], color: 'rgba(42,47,124,0.12)' },
];

export function create(container) {
  const canvas = C.createWidgetShell(container, 0.6);
  const ctx = canvas.getContext('2d');

  const pad = { l: 60, r: 20, t: 24, b: 50 };
  let hoverX = -1, hoverY = -1;

  function render() {
    const { w, h } = C.setupCanvas(canvas, container, 0.6);

    const pHmin = 0, pHmax = 14;
    const Emin = -1.4, Emax = 1.4;
    const xS = C.scale(pHmin, pHmax, pad.l, w - pad.r);
    const yS = C.scale(Emin, Emax, h - pad.b, pad.t);

    C.drawAxes(ctx, pad, w, h, 'pH', 'E (V vs SHE)');

    // Grid
    ctx.strokeStyle = 'rgba(0,0,0,0.05)';
    ctx.lineWidth = 1;
    for (let e = -1.2; e <= 1.2; e += 0.4) {
      ctx.beginPath();
      ctx.moveTo(pad.l, yS(e));
      ctx.lineTo(w - pad.r, yS(e));
      ctx.stroke();
      ctx.font = C.TICK_FONT;
      ctx.fillStyle = C.MUTED;
      ctx.textAlign = 'right';
      ctx.fillText(e.toFixed(1), pad.l - 6, yS(e) + 4);
    }
    for (let p = 0; p <= 14; p += 2) {
      ctx.font = C.TICK_FONT;
      ctx.fillStyle = C.MUTED;
      ctx.textAlign = 'center';
      ctx.fillText(p.toString(), xS(p), h - pad.b + 14);
    }

    // Fill regions
    for (const r of REGIONS) {
      ctx.fillStyle = r.color;
      ctx.beginPath();
      for (let i = 0; i < r.path.length; i++) {
        const [pH, E] = r.path[i];
        const px = xS(Math.max(pHmin, Math.min(pHmax, pH)));
        const py = yS(Math.max(Emin, Math.min(Emax, E)));
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    }

    // Region labels
    ctx.font = C.VALUE_FONT;
    const labelPos = [
      { label: 'Fe', x: 3, y: -1.0 },
      { label: 'Fe²⁺', x: 2, y: 0.0 },
      { label: 'Fe³⁺', x: 0.8, y: 1.0 },
      { label: 'Fe₂O₃', x: 10, y: 0.6 },
      { label: 'Fe₃O₄', x: 11, y: -0.5 },
    ];
    for (const lp of labelPos) {
      ctx.fillStyle = C.DARK;
      ctx.textAlign = 'center';
      ctx.fillText(lp.label, xS(lp.x), yS(lp.y));
    }

    // Region boundaries (approximate)
    ctx.strokeStyle = C.BLUE;
    ctx.lineWidth = 1.5;

    // Fe/Fe2+ boundary
    ctx.beginPath();
    ctx.moveTo(xS(0), yS(-0.62));
    ctx.lineTo(xS(9.4), yS(-0.62));
    ctx.stroke();

    // Fe2+/Fe2O3
    ctx.beginPath();
    ctx.moveTo(xS(6), yS(-0.05));
    ctx.lineTo(xS(6), yS(0.5));
    ctx.stroke();

    // Fe2+/Fe3+
    ctx.beginPath();
    ctx.moveTo(xS(0), yS(0.5));
    ctx.lineTo(xS(6), yS(0.5));
    ctx.stroke();

    // Fe3+/Fe2O3
    ctx.beginPath();
    ctx.moveTo(xS(2), yS(0.8));
    ctx.lineTo(xS(6), yS(0.5));
    ctx.stroke();

    // Fe2O3/Fe3O4
    ctx.beginPath();
    ctx.moveTo(xS(9.4), yS(-0.25));
    ctx.lineTo(xS(14), yS(0.3));
    ctx.stroke();

    // Fe/Fe3O4
    ctx.beginPath();
    ctx.moveTo(xS(7), yS(-0.62));
    ctx.lineTo(xS(9.4), yS(-0.62));
    ctx.lineTo(xS(9.4), yS(-0.25));
    ctx.stroke();

    // Water stability lines
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = C.MUTED;
    ctx.lineWidth = 1;
    // O2/H2O upper line: E = 1.23 - 0.059*pH
    ctx.beginPath();
    ctx.moveTo(xS(0), yS(1.23));
    ctx.lineTo(xS(14), yS(1.23 - 0.059 * 14));
    ctx.stroke();
    // H2/H2O lower line: E = -0.059*pH
    ctx.beginPath();
    ctx.moveTo(xS(0), yS(0));
    ctx.lineTo(xS(14), yS(-0.059 * 14));
    ctx.stroke();
    ctx.setLineDash([]);

    // Water line labels
    ctx.font = C.TICK_FONT;
    ctx.fillStyle = C.MUTED;
    ctx.textAlign = 'right';
    ctx.fillText('O₂/H₂O', xS(13.5), yS(1.23 - 0.059 * 13.5) - 8);
    ctx.fillText('H₂/H₂O', xS(13.5), yS(-0.059 * 13.5) - 8);

    // Immunity / Corrosion / Passivation labels
    ctx.font = C.TITLE_FONT;
    ctx.fillStyle = 'rgba(42,47,124,0.4)';
    ctx.textAlign = 'center';
    ctx.fillText('Immunity', xS(3), yS(-1.15));
    ctx.fillText('Corrosion', xS(2), yS(0.25));
    ctx.fillText('Passivation', xS(10), yS(0.9));
  }

  render();
  window.addEventListener('resize', render);
}
