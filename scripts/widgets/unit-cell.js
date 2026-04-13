/* ==========================================================================
   Cubic unit cell viewer widget

   Interactive 3D-looking diagrams of SC, BCC, and FCC unit cells rendered
   via oblique/isometric 2D projection on a canvas.  Toggle between the
   three crystal structures.  Shows coordination number and packing
   fraction.
   ========================================================================== */

import * as C from './chart-utils.js';

/* ---- Wireframe geometry ---- */

const CUBE_VERTS = [
  [0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1],
  [1, 1, 0], [1, 0, 1], [0, 1, 1], [1, 1, 1],
];
const CUBE_EDGES = [
  [0, 1], [0, 2], [0, 3],
  [1, 4], [1, 5], [2, 4],
  [2, 6], [3, 5], [3, 6],
  [4, 7], [5, 7], [6, 7],
];

/* ---- Crystal structure data ---- */

const STRUCTURES = {
  SC: {
    label: 'Simple Cubic',
    verts: CUBE_VERTS, edges: CUBE_EDGES,
    atoms: CUBE_VERTS.map(c => c),
    CN: 6,
    packing: Math.PI / 6,
  },
  BCC: {
    label: 'Body-Centred Cubic',
    verts: CUBE_VERTS, edges: CUBE_EDGES,
    atoms: [...CUBE_VERTS, [0.5, 0.5, 0.5]],
    CN: 8,
    packing: Math.PI * Math.sqrt(3) / 8,
  },
  FCC: {
    label: 'Face-Centred Cubic',
    verts: CUBE_VERTS, edges: CUBE_EDGES,
    atoms: [
      ...CUBE_VERTS,
      [0.5, 0.5, 0], [0.5, 0, 0.5], [0, 0.5, 0.5],
      [0.5, 0.5, 1], [0.5, 1, 0.5], [1, 0.5, 0.5],
    ],
    CN: 12,
    packing: Math.PI * Math.sqrt(2) / 6,
  },
};

/* ---- Projection helpers ---- */

function project(x, y, z, cx, cy, size) {
  const px = cx + (x - 0.5) * size + (z - 0.5) * size * -0.35;
  const py = cy - (y - 0.5) * size + (z - 0.5) * size * 0.25;
  return { px, py };
}

/** Depth value for z-sorting (higher = further from viewer) */
function depth(x, y, z) {
  return -x * 0.35 + y * 0.25 + z;
}

/* ---- Widget ---- */

export function create(container) {
  const canvas = C.createWidgetShell(container, 0.6);

  /* ---- Controls ---- */
  const controls = document.createElement('div');
  controls.style.cssText =
    'padding: 12px 16px; display: flex; flex-wrap: wrap; gap: 12px; ' +
    'align-items: center; font-family: "DM Sans", sans-serif; ' +
    'font-size: 12px; color: #3a3d5a;';

  controls.innerHTML = `
    <div style="display:flex;gap:4px;" id="uc-type-btns">
      <button data-type="SC"  class="uc-btn uc-btn-active">SC</button>
      <button data-type="BCC" class="uc-btn">BCC</button>
      <button data-type="FCC" class="uc-btn">FCC</button>
    </div>
    <span id="uc-info" style="font-family:'Lora',serif;font-size:13px;color:#3a3d5a;"></span>
  `;

  /* Scoped button styles */
  const style = document.createElement('style');
  style.textContent = `
    .uc-btn {
      padding: 4px 10px;
      font-family: 'DM Sans', sans-serif;
      font-size: 11px;
      border: 1px solid #c8c6d0;
      background: #fff;
      color: #3a3d5a;
      cursor: pointer;
      border-radius: 3px;
      transition: all 0.15s;
    }
    .uc-btn:hover { background: #f0f0f6; }
    .uc-btn-active {
      background: #2a2f7c;
      color: #fff;
      border-color: #2a2f7c;
    }
    .uc-btn-active:hover { background: #3a40a0; }
  `;
  container.appendChild(style);
  container.appendChild(controls);

  const typeBtns = controls.querySelectorAll('.uc-btn');
  const infoSpan = controls.querySelector('#uc-info');

  let current = 'SC';

  /* ---- Toggle buttons ---- */
  typeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      typeBtns.forEach(b => b.classList.remove('uc-btn-active'));
      btn.classList.add('uc-btn-active');
      current = btn.dataset.type;
      render();
    });
  });

  /* ---- Render ---- */
  function render() {
    const { ctx, w, h } = C.setupCanvas(canvas, container, 0.6);
    const pad = { l: 20, r: 20, t: 20, b: 50 };

    const plotW = w - pad.l - pad.r;
    const plotH = h - pad.t - pad.b;
    const size = Math.min(plotW, plotH) * 0.52;
    const cx = pad.l + plotW / 2;
    const cy = pad.t + plotH / 2;

    const struct = STRUCTURES[current];

    /* ---- Info text ---- */
    infoSpan.textContent =
      struct.label +
      '  \u2014  CN = ' + struct.CN +
      ',  APF = ' + (struct.packing * 100).toFixed(1) + '%';

    /* ---- Draw wireframe edges ---- */
    const edgeData = struct.edges.map(([i, j]) => {
      const a = struct.verts[i];
      const b = struct.verts[j];
      const midD = (depth(a[0], a[1], a[2]) + depth(b[0], b[1], b[2])) / 2;
      return { a, b, depth: midD };
    });
    edgeData.sort((a, b) => b.depth - a.depth); // draw back edges first

    const maxD = Math.max(...edgeData.map(e => e.depth));
    const minD = Math.min(...edgeData.map(e => e.depth));

    for (const edge of edgeData) {
      const pa = project(edge.a[0], edge.a[1], edge.a[2], cx, cy, size);
      const pb = project(edge.b[0], edge.b[1], edge.b[2], cx, cy, size);

      // Edges further from viewer are drawn more faintly
      const t = maxD === minD ? 0.5 : (edge.depth - minD) / (maxD - minD);
      const alpha = 0.25 + (1 - t) * 0.45; // 0.25 (back) to 0.70 (front)

      ctx.strokeStyle = `rgba(42, 47, 124, ${alpha})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(pa.px, pa.py);
      ctx.lineTo(pb.px, pb.py);
      ctx.stroke();
    }

    /* ---- Prepare atoms for depth-sorted rendering ---- */
    const baseR = size * 0.09;
    const atomList = struct.atoms.map(pos => {
      const [x, y, z] = pos;
      const { px, py } = project(x, y, z, cx, cy, size);
      const d = depth(x, y, z);
      return { px, py, depth: d };
    });

    // Sort by depth: draw furthest first so closer atoms overlap correctly
    atomList.sort((a, b) => b.depth - a.depth);

    const atomMaxD = Math.max(...atomList.map(a => a.depth));
    const atomMinD = Math.min(...atomList.map(a => a.depth));

    for (const atom of atomList) {
      // Size varies by depth: further = smaller
      const t = atomMaxD === atomMinD
        ? 0.5
        : (atom.depth - atomMinD) / (atomMaxD - atomMinD);
      const r = baseR * (0.75 + t * 0.35); // 0.75 (back) to 1.10 (front)

      const fillAlpha = 1.0;

      // Gradient-like shading: lighter highlight shifted to upper-left
      const grad = ctx.createRadialGradient(
        atom.px - r * 0.3, atom.py - r * 0.3, r * 0.1,
        atom.px, atom.py, r
      );
      grad.addColorStop(0, `rgba(100, 112, 255, ${fillAlpha})`);
      grad.addColorStop(0.6, `rgba(42, 47, 124, ${fillAlpha})`);
      grad.addColorStop(1, `rgba(26, 29, 58, ${fillAlpha})`);

      ctx.beginPath();
      ctx.arc(atom.px, atom.py, r, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      // Subtle edge ring
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.15 * fillAlpha})`;
      ctx.lineWidth = 0.6;
      ctx.stroke();
    }

    /* ---- Structure title on canvas ---- */
    ctx.font = C.TITLE_FONT;
    ctx.fillStyle = C.DARK;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(struct.label, pad.l + 4, pad.t + 4);

    /* ---- Info annotation on canvas ---- */
    ctx.font = C.TICK_FONT;
    ctx.fillStyle = C.MUTED;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(
      'CN = ' + struct.CN + '    APF = ' + (struct.packing * 100).toFixed(1) + '%',
      pad.l + 4,
      h - pad.b + 30
    );
  }

  /* ---- Event wiring ---- */
  render();
  window.addEventListener('resize', render);
}
