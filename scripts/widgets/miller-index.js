/* ==========================================================================
   Miller index plane viewer

   Shows a cubic unit cell in oblique projection with the (hkl) plane
   cutting through it. The user selects h, k, l (each 0-3) via sliders.

   Projection:
     x_screen = x - 0.4 * z
     y_screen = -y + 0.3 * z

   Intercept logic:
     h = 0 means the plane is parallel to the a-axis (intercept at infinity).
     Otherwise the a-axis intercept is at 1/h (in fractional coords).
     Same for k, l on b, c.

   The intercept plane is the polygon formed by the intercept points
   (or extended to cube faces when an index is zero).
   ========================================================================== */

import * as C from './chart-utils.js';

export function create(container) {
  const canvas = C.createWidgetShell(container, 0.55);

  /* ---- Controls ---- */
  const controls = document.createElement('div');
  controls.style.cssText =
    'padding: 8px 16px; display: flex; flex-wrap: wrap; gap: 14px; ' +
    'align-items: center; font-family: "DM Sans", sans-serif; ' +
    'font-size: 12px; color: #3a3d5a;';
  controls.innerHTML = `
    <label style="display:flex;align-items:center;gap:6px;">
      h <input type="range" min="0" max="3" value="1" step="1" id="mi-h"
              style="width:80px;accent-color:#2a2f7c;">
      <span id="mi-h-val" style="min-width:16px;">1</span>
    </label>
    <label style="display:flex;align-items:center;gap:6px;">
      k <input type="range" min="0" max="3" value="1" step="1" id="mi-k"
              style="width:80px;accent-color:#2a2f7c;">
      <span id="mi-k-val" style="min-width:16px;">1</span>
    </label>
    <label style="display:flex;align-items:center;gap:6px;">
      l <input type="range" min="0" max="3" value="1" step="1" id="mi-l"
              style="width:80px;accent-color:#2a2f7c;">
      <span id="mi-l-val" style="min-width:16px;">1</span>
    </label>
  `;
  container.appendChild(controls);

  const hSlider = controls.querySelector('#mi-h');
  const kSlider = controls.querySelector('#mi-k');
  const lSlider = controls.querySelector('#mi-l');
  const hVal = controls.querySelector('#mi-h-val');
  const kVal = controls.querySelector('#mi-k-val');
  const lVal = controls.querySelector('#mi-l-val');

  const pad = { l: 40, r: 40, t: 30, b: 50 };

  /* ---- Projection helpers ---- */
  function project(x, y, z, ox, oy, s) {
    return {
      x: ox + (x - 0.4 * z) * s,
      y: oy + (-y + 0.3 * z) * s
    };
  }

  /* ---- Cube geometry ---- */
  const cubeVerts = [
    [0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0],
    [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]
  ];
  const cubeEdges = [
    [0, 1], [1, 2], [2, 3], [3, 0],
    [4, 5], [5, 6], [6, 7], [7, 4],
    [0, 4], [1, 5], [2, 6], [3, 7]
  ];

  /* Edges that go behind the cube (drawn dashed) in this projection */
  const backEdges = new Set([
    '0,3', '0,4', '3,7'
  ]);

  /**
   * Compute the polygon vertices where the plane hx + ky + lz = 1
   * intersects the unit cube [0,1]^3.
   *
   * When h=0, k=0, l=0 the plane is undefined (no plane drawn).
   * When one or two indices are zero the plane is parallel to those axes
   * and still intersects the cube if the non-zero intercepts are in [0,1].
   */
  function computePlanePolygon(h, k, l) {
    if (h === 0 && k === 0 && l === 0) return [];

    /* Plane equation: h*x + k*y + l*z = 1
       We find every intersection of this plane with the 12 cube edges. */
    const pts = [];

    /* Each cube edge is parameterised as P = A + t*(B - A), t in [0,1].
       Also check cube face diagonals? No -- we intersect all 12 edges. */

    /* Actually, to get a clean convex polygon we find all intersection
       points of the plane with the cube faces. The cube has 6 faces, each
       a square with 4 edges -- 24 edge segments total but many shared.
       Easier: intersect the plane with all 12 unique cube edges. */

    for (const [i, j] of cubeEdges) {
      const A = cubeVerts[i];
      const B = cubeVerts[j];
      const dA = h * A[0] + k * A[1] + l * A[2];
      const dB = h * B[0] + k * B[1] + l * B[2];
      if (Math.abs(dB - dA) < 1e-12) continue; // edge parallel to plane
      const t = (1 - dA) / (dB - dA);
      if (t < -1e-9 || t > 1 + 1e-9) continue;
      const tc = Math.max(0, Math.min(1, t));
      pts.push([
        A[0] + tc * (B[0] - A[0]),
        A[1] + tc * (B[1] - A[1]),
        A[2] + tc * (B[2] - A[2])
      ]);
    }

    /* Also intersect with face diagonals? No, cube edges suffice for
       convex intersection. But the plane may cross a face without touching
       any of its edges only if it enters and exits through the same face --
       which cannot happen for a plane. So 12 edges is sufficient, but
       the plane can also intersect faces. We must also check face edges
       that are not cube edges -- but all face edges ARE cube edges.

       However there is a subtlety: the plane can cut through two points
       on the same face, defining an edge of the polygon that lies on that
       face but is NOT a cube edge. We have the vertices from edge
       intersections; we just need to order them into a convex polygon. */

    if (pts.length < 3) return pts;

    /* Order points by angle around their centroid, projected onto the
       plane's normal direction. */
    const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
    const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
    const cz = pts.reduce((s, p) => s + p[2], 0) / pts.length;

    /* Normal to the plane is (h, k, l). Build a local 2D coordinate
       system on the plane for angular sorting. */
    const nl = Math.sqrt(h * h + k * k + l * l);
    const nx = h / nl, ny = k / nl, nz = l / nl;

    /* Pick an arbitrary vector not parallel to n */
    let ux, uy, uz;
    if (Math.abs(nx) < 0.9) {
      ux = 0; uy = -nz; uz = ny;
    } else {
      ux = -nz; uy = 0; uz = nx;
    }
    const ul = Math.sqrt(ux * ux + uy * uy + uz * uz);
    ux /= ul; uy /= ul; uz /= ul;
    /* v = n x u */
    const vx = ny * uz - nz * uy;
    const vy = nz * ux - nx * uz;
    const vz = nx * uy - ny * ux;

    pts.sort((a, b) => {
      const au = (a[0] - cx) * ux + (a[1] - cy) * uy + (a[2] - cz) * uz;
      const av = (a[0] - cx) * vx + (a[1] - cy) * vy + (a[2] - cz) * vz;
      const bu = (b[0] - cx) * ux + (b[1] - cy) * uy + (b[2] - cz) * uz;
      const bv = (b[0] - cx) * vx + (b[1] - cy) * vy + (b[2] - cz) * vz;
      return Math.atan2(av, au) - Math.atan2(bv, bu);
    });

    /* Remove near-duplicate points */
    const unique = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      const prev = unique[unique.length - 1];
      const dx = pts[i][0] - prev[0];
      const dy = pts[i][1] - prev[1];
      const dz = pts[i][2] - prev[2];
      if (dx * dx + dy * dy + dz * dz > 1e-10) {
        unique.push(pts[i]);
      }
    }

    return unique;
  }

  /* ---- Render ---- */
  function render() {
    const { ctx, w, h } = C.setupCanvas(canvas, container, 0.55);

    const hi = parseInt(hSlider.value);
    const ki = parseInt(kSlider.value);
    const li = parseInt(lSlider.value);
    hVal.textContent = hi;
    kVal.textContent = ki;
    lVal.textContent = li;

    /* Layout */
    const plotW = w - pad.l - pad.r;
    const plotH = h - pad.t - pad.b;
    const s = Math.min(plotW, plotH) * 0.52;
    const ox = pad.l + plotW * 0.45;
    const oy = pad.t + plotH * 0.62;

    /* ---- Draw cube wireframe ---- */
    /* Back edges first (dashed) */
    for (const [i, j] of cubeEdges) {
      const key = Math.min(i, j) + ',' + Math.max(i, j);
      const a = project(...cubeVerts[i], ox, oy, s);
      const b = project(...cubeVerts[j], ox, oy, s);
      if (backEdges.has(key)) {
        ctx.strokeStyle = 'rgba(42, 47, 124, 0.25)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    /* ---- Draw the intercept plane (behind front edges) ---- */
    const polyVerts3D = computePlanePolygon(hi, ki, li);

    if (polyVerts3D.length >= 3) {
      const polyVerts2D = polyVerts3D.map(p => project(p[0], p[1], p[2], ox, oy, s));

      /* Filled plane */
      ctx.fillStyle = 'rgba(77, 92, 242, 0.18)';
      ctx.strokeStyle = C.LIGHT;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(polyVerts2D[0].x, polyVerts2D[0].y);
      for (let i = 1; i < polyVerts2D.length; i++) {
        ctx.lineTo(polyVerts2D[i].x, polyVerts2D[i].y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    /* Front edges (solid) */
    for (const [i, j] of cubeEdges) {
      const key = Math.min(i, j) + ',' + Math.max(i, j);
      if (backEdges.has(key)) continue;
      const a = project(...cubeVerts[i], ox, oy, s);
      const b = project(...cubeVerts[j], ox, oy, s);
      ctx.strokeStyle = C.DARK;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }

    /* ---- Draw axis arrows and labels ---- */
    const origin = project(0, 0, 0, ox, oy, s);
    const axisLen = 1.25;

    /* a-axis (x) */
    const aEnd = project(axisLen, 0, 0, ox, oy, s);
    drawAxis(ctx, origin, aEnd, 'a', C.DARK);

    /* b-axis (y) */
    const bEnd = project(0, axisLen, 0, ox, oy, s);
    drawAxis(ctx, origin, bEnd, 'b', C.DARK);

    /* c-axis (z) */
    const cEnd = project(0, 0, axisLen, ox, oy, s);
    drawAxis(ctx, origin, cEnd, 'c', C.DARK);

    /* ---- Mark intercept points ---- */
    if (hi > 0) {
      const ix = 1 / hi;
      if (ix <= 1) {
        const p = project(ix, 0, 0, ox, oy, s);
        C.drawDot(ctx, p.x, p.y, 4, C.RED);
        ctx.font = C.LABEL_FONT;
        ctx.fillStyle = C.RED;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(hi === 1 ? 'a' : 'a/' + hi, p.x, p.y + 8);
      }
    }
    if (ki > 0) {
      const iy = 1 / ki;
      if (iy <= 1) {
        const p = project(0, iy, 0, ox, oy, s);
        C.drawDot(ctx, p.x, p.y, 4, C.RED);
        ctx.font = C.LABEL_FONT;
        ctx.fillStyle = C.RED;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(ki === 1 ? 'b' : 'b/' + ki, p.x - 8, p.y);
      }
    }
    if (li > 0) {
      const iz = 1 / li;
      if (iz <= 1) {
        const p = project(0, 0, iz, ox, oy, s);
        C.drawDot(ctx, p.x, p.y, 4, C.RED);
        ctx.font = C.LABEL_FONT;
        ctx.fillStyle = C.RED;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(li === 1 ? 'c' : 'c/' + li, p.x + 8, p.y);
      }
    }

    /* ---- Corner dots ---- */
    for (const v of cubeVerts) {
      const p = project(v[0], v[1], v[2], ox, oy, s);
      C.drawDot(ctx, p.x, p.y, 2.5, C.DARK);
    }

    /* ---- Miller index label ---- */
    const millerStr = '(' + hi + ' ' + ki + ' ' + li + ')';
    ctx.font = '600 28px "DM Sans", sans-serif';
    ctx.fillStyle = C.DARK;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(millerStr, w / 2, pad.t + 4);

    /* ---- Intercept info ---- */
    ctx.font = C.LABEL_FONT;
    ctx.fillStyle = C.MUTED;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const parts = [];
    parts.push('a-intercept: ' + (hi === 0 ? '\u221e' : hi === 1 ? 'a' : 'a/' + hi));
    parts.push('b-intercept: ' + (ki === 0 ? '\u221e' : ki === 1 ? 'b' : 'b/' + ki));
    parts.push('c-intercept: ' + (li === 0 ? '\u221e' : li === 1 ? 'c' : 'c/' + li));
    ctx.fillText(parts.join('    '), w / 2, h - pad.b + 24);

    /* Warn if all zero */
    if (hi === 0 && ki === 0 && li === 0) {
      ctx.font = '400 13px "DM Sans", sans-serif';
      ctx.fillStyle = C.MUTED;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Set at least one index > 0 to define a plane', w / 2, oy);
    }
  }

  /* ---- Drawing helpers ---- */

  function drawAxis(ctx, from, to, label, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();

    /* Arrowhead */
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const angle = Math.atan2(dy, dx);
    const sz = 7;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(to.x - sz * Math.cos(angle - 0.35),
               to.y - sz * Math.sin(angle - 0.35));
    ctx.lineTo(to.x - sz * Math.cos(angle + 0.35),
               to.y - sz * Math.sin(angle + 0.35));
    ctx.closePath();
    ctx.fill();

    /* Label */
    ctx.font = '500 13px "DM Sans", sans-serif';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, to.x + 12 * Math.cos(angle), to.y + 12 * Math.sin(angle));
  }

  /* ---- Event wiring ---- */
  hSlider.addEventListener('input', render);
  kSlider.addEventListener('input', render);
  lSlider.addEventListener('input', render);

  render();
  window.addEventListener('resize', render);
}
