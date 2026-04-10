/* ==========================================================================
   Electronegativity scale widget
   Visual Pauling scale with elements placed along a gradient bar.
   ========================================================================== */

import * as C from './chart-utils.js';

const ELEMENTS = [
  { sym: 'Cs', en: 0.7, type: 'metal' },
  { sym: 'K',  en: 0.8, type: 'metal' },
  { sym: 'Na', en: 0.9, type: 'metal' },
  { sym: 'Li', en: 1.0, type: 'metal' },
  { sym: 'Ca', en: 1.0, type: 'metal' },
  { sym: 'Mg', en: 1.3, type: 'metal' },
  { sym: 'Al', en: 1.6, type: 'metal' },
  { sym: 'Ti', en: 1.5, type: 'metal' },
  { sym: 'Zn', en: 1.6, type: 'metal' },
  { sym: 'Fe', en: 1.8, type: 'metal' },
  { sym: 'Ni', en: 1.9, type: 'metal' },
  { sym: 'Cu', en: 1.9, type: 'metal' },
  { sym: 'Si', en: 1.9, type: 'semi' },
  { sym: 'B',  en: 2.0, type: 'semi' },
  { sym: 'H',  en: 2.2, type: 'nonmetal' },
  { sym: 'C',  en: 2.6, type: 'nonmetal' },
  { sym: 'S',  en: 2.6, type: 'nonmetal' },
  { sym: 'Br', en: 3.0, type: 'nonmetal' },
  { sym: 'N',  en: 3.0, type: 'nonmetal' },
  { sym: 'Cl', en: 3.2, type: 'nonmetal' },
  { sym: 'O',  en: 3.4, type: 'nonmetal' },
  { sym: 'F',  en: 4.0, type: 'nonmetal' },
];

const TYPE_COLORS = {
  metal: '#2a2f7c',
  semi: '#4d5cf2',
  nonmetal: '#8b2252',
};

export function create(container) {
  const canvas = C.createWidgetShell(container, 0.22);
  const ctx = canvas.getContext('2d');

  let hoverEl = null;

  function render() {
    const { ctx: c, w, h } = C.setupCanvas(canvas, container, 0.22);

    const pad = { l: 40, r: 30, t: 44, b: 28 };
    const barY = pad.t + 12;
    const barH = 12;
    const xS = C.scale(0.5, 4.2, pad.l, w - pad.r);

    c.fillStyle = '#e1e0e8';
    c.fillRect(0, 0, w, h);

    // Title
    c.font = '600 11px "DM Sans", sans-serif';
    c.fillStyle = '#3a3d5a';
    c.textAlign = 'left';
    c.fillText('Pauling Electronegativity', pad.l, 14);

    // Gradient bar
    const grad = c.createLinearGradient(xS(0.5), 0, xS(4.2), 0);
    grad.addColorStop(0, 'rgba(42, 47, 124, 0.15)');
    grad.addColorStop(0.5, 'rgba(77, 92, 242, 0.15)');
    grad.addColorStop(1, 'rgba(139, 34, 82, 0.15)');
    c.fillStyle = grad;
    c.fillRect(xS(0.5), barY, xS(4.2) - xS(0.5), barH);

    // Region labels
    c.font = '500 9px "DM Sans", sans-serif';
    c.textBaseline = 'top';
    c.fillStyle = '#2a2f7c';
    c.textAlign = 'left';
    c.fillText('Metals', xS(0.6), barY + barH + 4);
    c.fillStyle = '#8b2252';
    c.textAlign = 'right';
    c.fillText('Nonmetals', xS(4.1), barY + barH + 4);

    // Tick marks
    c.strokeStyle = 'rgba(0,0,0,0.15)';
    c.lineWidth = 0.5;
    c.font = '400 9px "DM Sans", sans-serif';
    c.fillStyle = '#999';
    c.textAlign = 'center';
    c.textBaseline = 'top';
    for (let v = 1; v <= 4; v++) {
      c.beginPath();
      c.moveTo(xS(v), barY);
      c.lineTo(xS(v), barY + barH);
      c.stroke();
      c.fillText(v.toFixed(0), xS(v), barY + barH + 16);
    }

    // Elements as dots with labels
    // Stagger vertically to avoid overlap
    const placed = [];
    const dotR = 3;

    for (const el of ELEMENTS) {
      const px = xS(el.en);
      let py = barY + barH / 2;

      // Alternate above/below bar, with staggering for close values
      const nearby = placed.filter(p => Math.abs(p.px - px) < 20);
      const row = nearby.length;
      const above = row % 2 === 0;
      py = above ? barY - 8 - row * 7 : barY + barH + 28 + (row - 1) * 7;

      const isHovered = hoverEl === el.sym;
      const col = TYPE_COLORS[el.type];

      // Line from dot to bar
      c.strokeStyle = isHovered ? col : 'rgba(0,0,0,0.1)';
      c.lineWidth = isHovered ? 1.2 : 0.5;
      c.beginPath();
      c.moveTo(px, above ? py + dotR + 1 : py - dotR - 1);
      c.lineTo(px, above ? barY : barY + barH);
      c.stroke();

      // Dot
      c.beginPath();
      c.arc(px, py, isHovered ? dotR + 1.5 : dotR, 0, Math.PI * 2);
      c.fillStyle = col;
      c.fill();

      // Label
      c.font = isHovered ? '700 11px "DM Sans", sans-serif' : '500 10px "DM Sans", sans-serif';
      c.fillStyle = isHovered ? col : '#3a3d5a';
      c.textAlign = 'center';
      c.textBaseline = above ? 'bottom' : 'top';
      c.fillText(el.sym, px, above ? py - dotR - 2 : py + dotR + 2);

      // Show value on hover
      if (isHovered) {
        c.font = '400 9px "DM Sans", sans-serif';
        c.fillStyle = '#999';
        c.fillText(el.en.toFixed(1), px, above ? py - dotR - 14 : py + dotR + 14);
      }

      placed.push({ px, py, el });
    }
  }

  // Hover detection
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const scale = (canvas.width / Math.min(window.devicePixelRatio, 2)) / rect.width;
    const mx = (e.clientX - rect.left) * scale;
    const my = (e.clientY - rect.top) * scale;

    const pad = { l: 40, r: 30 };
    const { w } = { w: canvas.width / Math.min(window.devicePixelRatio, 2) };
    const xS = C.scale(0.5, 4.2, pad.l, w - pad.r);

    let closest = null;
    let closestDist = 20;
    for (const el of ELEMENTS) {
      const dist = Math.abs(xS(el.en) - mx);
      if (dist < closestDist) {
        closestDist = dist;
        closest = el.sym;
      }
    }

    if (closest !== hoverEl) {
      hoverEl = closest;
      render();
    }
  });

  canvas.addEventListener('mouseleave', () => {
    hoverEl = null;
    render();
  });

  render();
  window.addEventListener('resize', render);
}
