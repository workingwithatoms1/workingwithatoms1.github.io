/* ==========================================================================
   Stereographic Projection widget — full [001] projection for FCC crystals

   Shows the complete upper-hemisphere [001] stereographic projection.
   The user drags a point (tensile axis) anywhere within the disc.
   The widget computes Schmid factors for all 12 FCC {111}<110> slip
   systems, colors the disc by max Schmid factor, draws the 24 symmetry
   triangles, and highlights the active slip system.

   Stereographic projection (south-pole onto equatorial plane):
     For unit vector (l, m, n) with n >= 0:
       sx = l / (1 + n),  sy = m / (1 + n)
     Disc boundary at radius 1 (equator, n = 0).
   ========================================================================== */

import * as C from './chart-utils.js';

/* ---- The 12 FCC {111}<110> slip systems ---- */

const SLIP_SYSTEMS = [
  // Plane (111)
  { plane: [ 1, 1, 1], dir: [ 1,-1, 0], label: '(111)[11\u03050]' },
  { plane: [ 1, 1, 1], dir: [ 1, 0,-1], label: '(111)[101\u0305]' },
  { plane: [ 1, 1, 1], dir: [ 0, 1,-1], label: '(111)[011\u0305]' },
  // Plane (-111)
  { plane: [-1, 1, 1], dir: [ 1, 1, 0], label: '(1\u030511)[110]' },
  { plane: [-1, 1, 1], dir: [ 1, 0, 1], label: '(1\u030511)[101]' },
  { plane: [-1, 1, 1], dir: [ 0, 1,-1], label: '(1\u030511)[011\u0305]' },
  // Plane (1-11)
  { plane: [ 1,-1, 1], dir: [ 1, 1, 0], label: '(11\u03051)[110]' },
  { plane: [ 1,-1, 1], dir: [ 1, 0,-1], label: '(11\u03051)[101\u0305]' },
  { plane: [ 1,-1, 1], dir: [ 0, 1, 1], label: '(11\u03051)[011]' },
  // Plane (11-1)
  { plane: [ 1, 1,-1], dir: [ 1,-1, 0], label: '(111\u0305)[11\u03050]' },
  { plane: [ 1, 1,-1], dir: [ 1, 0, 1], label: '(111\u0305)[101]' },
  { plane: [ 1, 1,-1], dir: [ 0, 1, 1], label: '(111\u0305)[011]' },
];

const SYSTEMS = SLIP_SYSTEMS.map(s => {
  const pn = Math.sqrt(s.plane[0]**2 + s.plane[1]**2 + s.plane[2]**2);
  const dn = Math.sqrt(s.dir[0]**2 + s.dir[1]**2 + s.dir[2]**2);
  return {
    n: [s.plane[0]/pn, s.plane[1]/pn, s.plane[2]/pn],
    d: [s.dir[0]/dn, s.dir[1]/dn, s.dir[2]/dn],
    label: s.label,
  };
});

/* ---- Math helpers ---- */

function dot3(a, b) { return a[0]*b[0] + a[1]*b[1] + a[2]*b[2]; }

function normalize3(v) {
  const len = Math.sqrt(v[0]**2 + v[1]**2 + v[2]**2);
  if (len < 1e-12) return [0, 0, 1];
  return [v[0]/len, v[1]/len, v[2]/len];
}

function stereo(l, m, n) {
  const d = 1 + n;
  if (d < 1e-12) return { sx: 0, sy: 0 };
  return { sx: l / d, sy: m / d };
}

function stereoV(v) {
  const u = normalize3(v);
  return stereo(u[0], u[1], u[2]);
}

function invStereo(sx, sy) {
  const r2 = sx*sx + sy*sy;
  const n = (1 - r2) / (1 + r2);
  const s = 2 / (1 + r2);
  return [sx * s, sy * s, n];
}

function schmidFactor(g, i) {
  const sys = SYSTEMS[i];
  return Math.abs(dot3(g, sys.n) * dot3(g, sys.d));
}

function maxSchmidInfo(g) {
  let best = 0, bestIdx = 0;
  for (let i = 0; i < 12; i++) {
    const m = schmidFactor(g, i);
    if (m > best) { best = m; bestIdx = i; }
  }
  return { m: best, idx: bestIdx };
}

/* ---- Key crystallographic poles ---- */

const S2 = Math.sqrt(2), S3 = Math.sqrt(3);

// Upper-hemisphere poles with labels
const POLES = [
  // <001> — centre only
  { v: [0,0,1], label: '001' },
  // <011> in upper hemisphere
  { v: [0,1,1],  label: '011' },
  { v: [0,-1,1], label: '01\u03051' },
  { v: [1,0,1],  label: '101' },
  { v: [-1,0,1], label: '1\u030501' },
  // <111> in upper hemisphere
  { v: [1,1,1],   label: '111' },
  { v: [-1,1,1],  label: '1\u030511' },
  { v: [1,-1,1],  label: '11\u03051' },
  { v: [-1,-1,1], label: '1\u03051\u03051' },
];

// Equatorial poles (on disc boundary)
const EQ_POLES = [
  { v: [1,0,0],  label: '100', angle: 0 },
  { v: [0,1,0],  label: '010', angle: 90 },
  { v: [-1,0,0], label: '1\u030500', angle: 180 },
  { v: [0,-1,0], label: '01\u03050', angle: 270 },
  { v: [1,1,0],  label: '110', angle: 45 },
  { v: [-1,1,0], label: '1\u030510', angle: 135 },
  { v: [-1,-1,0],label: '1\u03051\u03050', angle: 225 },
  { v: [1,-1,0], label: '11\u03050', angle: 315 },
];

/* ---- Great circle arc drawing ----
   An arc on the unit sphere from point A to B, projected stereographically.
   Uses spherical linear interpolation (slerp). */

function drawGreatCircleArc(ctx, a, b, toCanvas, steps = 60) {
  const ua = normalize3(a), ub = normalize3(b);
  const cosTheta = Math.max(-1, Math.min(1, dot3(ua, ub)));
  const theta = Math.acos(cosTheta);
  if (theta < 1e-6) return;
  const sinTheta = Math.sin(theta);

  ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const sa = Math.sin((1-t)*theta) / sinTheta;
    const sb = Math.sin(t*theta) / sinTheta;
    const v = [sa*ua[0]+sb*ub[0], sa*ua[1]+sb*ub[1], sa*ua[2]+sb*ub[2]];
    // Only draw if in upper hemisphere
    if (v[2] < -0.01) continue;
    const p = stereo(v[0], v[1], Math.max(0, v[2]));
    const c = toCanvas(p.sx, p.sy);
    if (i === 0) ctx.moveTo(c.cx, c.cy);
    else ctx.lineTo(c.cx, c.cy);
  }
  ctx.stroke();
}

/* ---- Great-circle arcs ---- */

// 8 short arcs connecting adjacent <011> and <111> poles (triangle edges)
const INNER_ARCS = [
  [[0,1,1],[1,1,1]],   [[0,1,1],[-1,1,1]],
  [[0,-1,1],[1,-1,1]],  [[0,-1,1],[-1,-1,1]],
  [[1,0,1],[1,1,1]],   [[1,0,1],[1,-1,1]],
  [[-1,0,1],[-1,1,1]], [[-1,0,1],[-1,-1,1]],
];

// 4 large curved arcs — {110} zone traces that span the disc.
// These are the characteristic "lens" curves on a standard stereographic projection.
// Each is drawn as two half-arcs through the intermediate <011> pole.
const ZONE_ARCS = [
  // (01-1) trace: [-100] → [011] → [100]  (upper half)
  [[-1,0,0],[0,1,1]], [[0,1,1],[1,0,0]],
  // (011) trace: [-100] → [0-11] → [100]  (lower half)
  [[-1,0,0],[0,-1,1]], [[0,-1,1],[1,0,0]],
  // (10-1) trace: [0-10] → [101] → [010]  (right half)
  [[0,-1,0],[1,0,1]], [[1,0,1],[0,1,0]],
  // (101) trace: [0-10] → [-101] → [010]  (left half)
  [[0,-1,0],[-1,0,1]], [[-1,0,1],[0,1,0]],
];

/* ---- All 24 standard triangles (8 sectors × 3 each) ----
   Each has one <001>/<100>, one <011>, one <111> vertex. */
/* Each sector (between two mirror lines) has 3 triangles: one inner
   (touching [001]) and two outer. The outer subdivision follows the zone
   arcs — each <111> pole connects to two <100> equatorial poles via zone
   arcs, and the arc WITHIN the sector creates the split. */
const TRIANGLES = [
  // Sector 0 (0°–45°): P=[101], Q=[111], zone Q→[100]
  [[0,0,1],[1,0,1],[1,1,1]],   [[1,0,1],[1,0,0],[1,1,1]],   [[1,1,1],[1,0,0],[1,1,0]],
  // Sector 1 (45°–90°): P=[011], Q=[111], zone Q→[010]
  [[0,0,1],[1,1,1],[0,1,1]],   [[1,1,1],[1,1,0],[0,1,0]],   [[1,1,1],[0,1,1],[0,1,0]],
  // Sector 2 (90°–135°): P=[011], Q=[-111], zone Q→[010]
  [[0,0,1],[0,1,1],[-1,1,1]],  [[0,1,1],[0,1,0],[-1,1,1]],  [[-1,1,1],[0,1,0],[-1,1,0]],
  // Sector 3 (135°–180°): P=[-101], Q=[-111], zone Q→[-100]
  [[0,0,1],[-1,1,1],[-1,0,1]], [[-1,1,1],[-1,1,0],[-1,0,0]],[[-1,1,1],[-1,0,1],[-1,0,0]],
  // Sector 4 (180°–225°): P=[-101], Q=[-1-11], zone Q→[-100]
  [[0,0,1],[-1,0,1],[-1,-1,1]],[[-1,0,1],[-1,0,0],[-1,-1,1]],[[-1,-1,1],[-1,0,0],[-1,-1,0]],
  // Sector 5 (225°–270°): P=[0-11], Q=[-1-11], zone Q→[0-10]
  [[0,0,1],[-1,-1,1],[0,-1,1]],[[-1,-1,1],[-1,-1,0],[0,-1,0]],[[-1,-1,1],[0,-1,1],[0,-1,0]],
  // Sector 6 (270°–315°): P=[0-11], Q=[1-11], zone Q→[0-10]
  [[0,0,1],[0,-1,1],[1,-1,1]],  [[0,-1,1],[0,-1,0],[1,-1,1]],  [[1,-1,1],[0,-1,0],[1,-1,0]],
  // Sector 7 (315°–360°): P=[101], Q=[1-11], zone Q→[100]
  [[0,0,1],[1,-1,1],[1,0,1]],   [[1,-1,1],[1,-1,0],[1,0,0]],  [[1,-1,1],[1,0,1],[1,0,0]],
];

/* Spherical triangle containment: test against great-circle planes
   rather than 2D straight lines. Handles curved boundaries correctly. */
function cross3(a,b) {
  return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
}

// Pre-compute edge normals for each triangle (on the sphere)
const TRI_NORMALS = TRIANGLES.map(tri => {
  const A = normalize3(tri[0]), B = normalize3(tri[1]), C = normalize3(tri[2]);
  const nAB = cross3(A, B);
  const nBC = cross3(B, C);
  const nCA = cross3(C, A);
  // Orient so C is on positive side of AB, etc.
  const sAB = Math.sign(dot3(C, nAB));
  const sBC = Math.sign(dot3(A, nBC));
  const sCA = Math.sign(dot3(B, nCA));
  return {
    nAB: [nAB[0]*sAB, nAB[1]*sAB, nAB[2]*sAB],
    nBC: [nBC[0]*sBC, nBC[1]*sBC, nBC[2]*sBC],
    nCA: [nCA[0]*sCA, nCA[1]*sCA, nCA[2]*sCA],
  };
});

function pointInSphericalTri(g, i) {
  const { nAB, nBC, nCA } = TRI_NORMALS[i];
  return dot3(g, nAB) >= -1e-6 && dot3(g, nBC) >= -1e-6 && dot3(g, nCA) >= -1e-6;
}

/* ---- Great circle trace of a plane on the projection ----
   The trace of plane with normal n is all unit vectors v where v·n = 0.
   Returns array of {sx, sy} points in upper hemisphere. */

function planeTrace(normal, steps = 80) {
  const n = normalize3(normal);
  // Find two orthogonal vectors in the plane
  let u1;
  if (Math.abs(n[2]) < 0.9) {
    u1 = normalize3([n[1], -n[0], 0]); // n × [0,0,1] simplified
  } else {
    u1 = normalize3([0, n[2], -n[1]]); // n × [1,0,0] simplified
  }
  const u2 = normalize3([
    n[1]*u1[2] - n[2]*u1[1],
    n[2]*u1[0] - n[0]*u1[2],
    n[0]*u1[1] - n[1]*u1[0],
  ]);

  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    const v = [
      Math.cos(t)*u1[0] + Math.sin(t)*u2[0],
      Math.cos(t)*u1[1] + Math.sin(t)*u2[1],
      Math.cos(t)*u1[2] + Math.sin(t)*u2[2],
    ];
    if (v[2] >= -0.01) {
      const p = stereo(v[0], v[1], Math.max(0, v[2]));
      pts.push(p);
    }
  }
  return pts;
}

/* ================================================================
   Widget
   ================================================================ */

export function create(container) {
  const canvas = C.createWidgetShell(container, 0.7);
  const ctx = canvas.getContext('2d');
  canvas.style.cursor = 'crosshair';

  // Drag state — start at centre of standard triangle
  const initG = normalize3([1, 2, 4]); // a generic point inside std triangle
  let dragP = stereoV(initG);
  let dragging = false;

  // Layout
  let discCx, discCy, discR;

  function toCanvas(sx, sy) {
    return { cx: discCx + sx * discR, cy: discCy - sy * discR };
  }
  function fromCanvas(cx, cy) {
    return { sx: (cx - discCx) / discR, sy: -(cy - discCy) / discR };
  }

  const RED = '#8b2252';
  const ACTIVE_PLANE_COLOR = 'rgba(77, 92, 242, 0.35)';
  const ACTIVE_DIR_COLOR = '#4d5cf2';

  /* Controls: text input for tensile axis */
  const controls = document.createElement('div');
  controls.className = 'widget-controls';
  controls.style.cssText = 'display:flex;align-items:center;gap:8px;justify-content:center;padding:4px 0;';

  const inputLabel = document.createElement('span');
  inputLabel.textContent = 'Tensile axis [uvw]:';
  inputLabel.style.cssText = 'font:500 12px "DM Sans",sans-serif;color:#3a3d5a;';
  controls.appendChild(inputLabel);

  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'e.g. -4 1 2';
  input.style.cssText =
    'width:90px;padding:4px 8px;font:400 13px "DM Mono","DM Sans",monospace;' +
    'border:1px solid #ccc;border-radius:3px;text-align:center;color:#1a1d3a;';
  controls.appendChild(input);

  const goBtn = document.createElement('button');
  goBtn.textContent = 'Go';
  goBtn.style.cssText =
    'padding:4px 12px;font:500 11px "DM Sans",sans-serif;' +
    'background:#2a2f7c;color:#f0f0f8;border:none;border-radius:3px;cursor:pointer;';
  controls.appendChild(goBtn);

  container.appendChild(controls);

  function parseAndGo() {
    // Parse input: accept formats like "-4 1 2", "-412", "[-4,1,2]", "-4 1 2"
    let text = input.value.trim().replace(/[\[\](),]/g, ' ').trim();
    // If no spaces and length 2-4, treat each char as a digit (with leading - as sign)
    let parts;
    if (text.includes(' ')) {
      parts = text.split(/\s+/);
    } else {
      // Parse character-by-character: - attaches to next digit
      parts = [];
      for (let i = 0; i < text.length; i++) {
        if (text[i] === '-' && i+1 < text.length && text[i+1] >= '0' && text[i+1] <= '9') {
          parts.push(text[i] + text[i+1]);
          i++;
        } else if (text[i] >= '0' && text[i] <= '9') {
          parts.push(text[i]);
        }
      }
    }
    if (parts.length !== 3) return;
    const u = parseInt(parts[0]), v = parseInt(parts[1]), w = parseInt(parts[2]);
    if (isNaN(u) || isNaN(v) || isNaN(w)) return;
    if (u === 0 && v === 0 && w === 0) return;

    const g = normalize3([u, v, w]);
    // If in lower hemisphere, flip to upper
    const gUp = g[2] >= 0 ? g : [-g[0], -g[1], -g[2]];
    dragP = stereoV(gUp);
    render();
  }

  goBtn.addEventListener('click', parseAndGo);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') parseAndGo(); });

  /* Info readout */
  const info = document.createElement('div');
  info.style.cssText =
    'padding:6px 12px;font:400 12px "DM Sans",sans-serif;color:#3a3d5a;text-align:center;min-height:22px;';
  container.appendChild(info);

  /* ---- Render ---- */
  function render() {
    const dpr = Math.min(window.devicePixelRatio, C.MAX_DPR || 2);
    const w = container.clientWidth;
    const h = Math.round(w * 0.7);
    canvas.width = w * dpr; canvas.height = h * dpr;
    canvas.style.width = w+'px'; canvas.style.height = h+'px';
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.clearRect(0,0,w,h);

    // Layout: disc on left (~58%), table on right
    const leftW = Math.round(w * 0.58);
    const pad = 16;
    discR = Math.min(leftW - pad*2, h - pad*2 - 20) / 2;
    discCx = pad + (leftW - pad*2) / 2;
    discCy = pad + 14 + discR;

    const rightX = leftW + 4;
    const rightW = w - rightX - 10;

    // ---- Compute Schmid factors and detect double-slip near boundaries ----
    const g = normalize3(invStereo(dragP.sx, dragP.sy));
    const factors = SYSTEMS.map((sys, i) => ({
      index: i, label: sys.label, m: schmidFactor(g, i),
      n: sys.n, d: sys.d,
    }));
    factors.sort((a, b) => b.m - a.m);
    const active = factors[0];

    // Double-slip detection: if the top two systems have nearly equal
    // Schmid factors, we're near a triangle boundary.
    const AMBER = '#b8860b';
    const SNAP_THRESHOLD = 0.012;
    const isDoubleSlip = factors.length > 1 &&
      (factors[0].m - factors[1].m) < SNAP_THRESHOLD &&
      factors[0].m > 0.01;
    const active2 = isDoubleSlip ? factors[1] : null;

    // White disc fill
    ctx.fillStyle = '#f5f5fa';
    ctx.beginPath();
    ctx.arc(discCx, discCy, discR, 0, Math.PI*2);
    ctx.fill();

    // Disc border
    ctx.strokeStyle = C.DARK;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(discCx, discCy, discR, 0, Math.PI*2);
    ctx.stroke();

    // ---- Mirror lines through centre (straight lines) ----
    // 4 lines connecting antipodal equatorial poles through [001]:
    //   [100]↔[-100], [010]↔[0-10], [110]↔[-1-10], [1-10]↔[-110]
    ctx.strokeStyle = 'rgba(26,29,58,0.2)';
    ctx.lineWidth = 0.7;
    const mirrorPairs = [
      [[1,0],[-1,0]],     // horizontal: [100]↔[-100]
      [[0,1],[0,-1]],     // vertical:   [010]↔[0-10]
      [[1,1],[-1,-1]],    // diagonal:   [110]↔[-1-10]
      [[1,-1],[-1,1]],    // diagonal:   [1-10]↔[-110]
    ];
    for (const [a, b] of mirrorPairs) {
      const la = Math.sqrt(a[0]**2+a[1]**2);
      const lb = Math.sqrt(b[0]**2+b[1]**2);
      const p1 = toCanvas(a[0]/la, a[1]/la);
      const p2 = toCanvas(b[0]/lb, b[1]/lb);
      ctx.beginPath();
      ctx.moveTo(p1.cx, p1.cy);
      ctx.lineTo(p2.cx, p2.cy);
      ctx.stroke();
    }

    // ---- Curved zone arcs ({110} traces spanning the disc) ----
    ctx.strokeStyle = 'rgba(26,29,58,0.15)';
    ctx.lineWidth = 0.7;
    for (const [a, b] of ZONE_ARCS) {
      drawGreatCircleArc(ctx, a, b, toCanvas, 50);
    }

    // ---- Short arcs (inner triangle boundaries: <011> to <111>) ----
    ctx.strokeStyle = 'rgba(26,29,58,0.2)';
    ctx.lineWidth = 0.7;
    for (const [a, b] of INNER_ARCS) {
      drawGreatCircleArc(ctx, a, b, toCanvas, 40);
    }

    // ---- Highlight the triangle(s) containing the cursor ----
    // Find all triangles that contain the point (usually 1; on boundary, 2)
    const activeTriangles = [];
    for (let i = 0; i < TRIANGLES.length; i++) {
      if (pointInSphericalTri(g, i)) activeTriangles.push(i);
    }
    // In double-slip mode, also find the nearest adjacent triangle
    if (isDoubleSlip && activeTriangles.length === 1) {
      // Find the triangle on the other side of the boundary by checking
      // all triangles and picking the closest one we're NOT already in
      let bestDist = Infinity, bestIdx = -1;
      for (let i = 0; i < TRIANGLES.length; i++) {
        if (i === activeTriangles[0]) continue;
        // Distance: how far g is from being inside this triangle
        const { nAB, nBC, nCA } = TRI_NORMALS[i];
        const minSide = Math.min(dot3(g,nAB), dot3(g,nBC), dot3(g,nCA));
        if (minSide > -0.05 && -minSide < bestDist) {
          bestDist = -minSide; bestIdx = i;
        }
      }
      if (bestIdx >= 0) activeTriangles.push(bestIdx);
    }

    function drawTriEdge(a, b) {
      if (Math.abs(a[2]) < 0.01 && Math.abs(b[2]) < 0.01) {
        const ca = toCanvas(stereoV(a).sx, stereoV(a).sy);
        const cb = toCanvas(stereoV(b).sx, stereoV(b).sy);
        const angA = Math.atan2(ca.cy - discCy, ca.cx - discCx);
        const angB = Math.atan2(cb.cy - discCy, cb.cx - discCx);
        let diff = angB - angA;
        if (diff > Math.PI) diff -= Math.PI * 2;
        if (diff < -Math.PI) diff += Math.PI * 2;
        ctx.beginPath();
        ctx.arc(discCx, discCy, discR, angA, angA + diff, diff < 0);
        ctx.stroke();
      } else {
        drawGreatCircleArc(ctx, a, b, toCanvas, 60);
      }
    }

    for (const ti of activeTriangles) {
      const verts = TRIANGLES[ti];
      ctx.strokeStyle = isDoubleSlip ? AMBER : C.DARK;
      ctx.lineWidth = isDoubleSlip ? 2.5 : 2;
      for (let e = 0; e < 3; e++) {
        drawTriEdge(verts[e], verts[(e+1)%3]);
      }
    }

    // ---- Determine which poles to highlight ----
    const activeSystems = [SLIP_SYSTEMS[active.index]];
    if (active2) activeSystems.push(SLIP_SYSTEMS[active2.index]);

    // Collect all normals and directions to highlight
    const highlightNormals = [];
    const highlightDirs = [];
    for (const sys of activeSystems) {
      highlightNormals.push(normalize3(sys.plane));
      highlightDirs.push(normalize3(sys.dir));
    }

    function isActivePole(v) {
      const uv = normalize3(v);
      for (const n of highlightNormals) {
        for (const sign of [1, -1]) {
          const sv = [n[0]*sign, n[1]*sign, n[2]*sign];
          if (sv[2] >= -0.01 && Math.abs(dot3(uv, sv) - 1) < 0.01) return 'normal';
        }
      }
      for (const d of highlightDirs) {
        for (const sign of [1, -1]) {
          const sv = [d[0]*sign, d[1]*sign, d[2]*sign];
          if (Math.abs(dot3(uv, normalize3(sv)) - 1) < 0.01) return 'direction';
        }
      }
      return null;
    }

    // ---- Pole markers ----
    // Interior poles
    for (const pole of POLES) {
      const p = stereoV(pole.v);
      const c = toCanvas(p.sx, p.sy);
      const activeType = isActivePole(pole.v);

      if (activeType) {
        // Glow ring
        ctx.beginPath();
        ctx.arc(c.cx, c.cy, 12, 0, Math.PI*2);
        ctx.fillStyle = activeType === 'normal'
          ? 'rgba(77, 92, 242, 0.15)' : 'rgba(139, 34, 82, 0.15)';
        ctx.fill();
      }

      // Dot
      ctx.beginPath();
      ctx.arc(c.cx, c.cy, activeType ? 5 : 3, 0, Math.PI*2);
      ctx.fillStyle = activeType === 'normal' ? ACTIVE_DIR_COLOR
                    : activeType === 'direction' ? RED
                    : '#fff';
      ctx.fill();
      ctx.strokeStyle = activeType ? '#fff' : C.DARK;
      ctx.lineWidth = activeType ? 1.5 : 1.2;
      ctx.stroke();

      // Label
      ctx.font = activeType ? '600 11px "DM Sans",sans-serif' : '500 10px "DM Sans",sans-serif';
      ctx.fillStyle = activeType === 'normal' ? ACTIVE_DIR_COLOR
                    : activeType === 'direction' ? RED
                    : C.DARK;
      ctx.textBaseline = 'middle';
      const lx = p.sx, ly = p.sy;
      if (Math.abs(lx) < 0.01 && Math.abs(ly) < 0.01) {
        ctx.textAlign = 'center';
        ctx.fillText('['+pole.label+']', c.cx, c.cy + 14);
      } else if (lx > ly + 0.01) {
        ctx.textAlign = 'left';
        ctx.fillText('['+pole.label+']', c.cx + 8, c.cy);
      } else if (ly > lx + 0.01) {
        ctx.textAlign = 'right';
        ctx.fillText('['+pole.label+']', c.cx - 8, c.cy);
      } else {
        ctx.textAlign = 'left';
        ctx.fillText('['+pole.label+']', c.cx + 8, c.cy - 6);
      }
    }

    // Equatorial poles (on boundary)
    for (const pole of EQ_POLES) {
      const p = stereoV(pole.v);
      const c = toCanvas(p.sx, p.sy);
      const activeType = isActivePole(pole.v);

      if (activeType) {
        ctx.beginPath();
        ctx.arc(c.cx, c.cy, 10, 0, Math.PI*2);
        ctx.fillStyle = activeType === 'normal'
          ? 'rgba(77, 92, 242, 0.15)' : 'rgba(139, 34, 82, 0.15)';
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(c.cx, c.cy, activeType ? 5 : 2.5, 0, Math.PI*2);
      ctx.fillStyle = activeType === 'normal' ? ACTIVE_DIR_COLOR
                    : activeType === 'direction' ? RED
                    : C.DARK;
      ctx.fill();
      if (activeType) {
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
      }

      ctx.font = activeType ? '600 10px "DM Sans",sans-serif' : '400 9px "DM Sans",sans-serif';
      ctx.fillStyle = activeType === 'normal' ? ACTIVE_DIR_COLOR
                    : activeType === 'direction' ? RED
                    : C.MUTED;
      ctx.textBaseline = 'middle';
      if (pole.angle === 0) { ctx.textAlign = 'left'; ctx.fillText('['+pole.label+']', c.cx+8, c.cy); }
      else if (pole.angle === 90) { ctx.textAlign = 'center'; ctx.fillText('['+pole.label+']', c.cx, c.cy-12); }
      else if (pole.angle === 180) { ctx.textAlign = 'right'; ctx.fillText('['+pole.label+']', c.cx-8, c.cy); }
      else if (pole.angle === 270) { ctx.textAlign = 'center'; ctx.fillText('['+pole.label+']', c.cx, c.cy+12); }
      else if (pole.angle === 45) { ctx.textAlign = 'left'; ctx.fillText('['+pole.label+']', c.cx+6, c.cy-8); }
      else if (pole.angle === 135) { ctx.textAlign = 'right'; ctx.fillText('['+pole.label+']', c.cx-6, c.cy-8); }
      else if (pole.angle === 225) { ctx.textAlign = 'right'; ctx.fillText('['+pole.label+']', c.cx-6, c.cy+10); }
      else if (pole.angle === 315) { ctx.textAlign = 'left'; ctx.fillText('['+pole.label+']', c.cx+6, c.cy+10); }
    }

    // ---- Title ----
    ctx.font = C.TITLE_FONT;
    ctx.fillStyle = C.DARK;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('[001] Stereographic Projection — FCC {111}\u27E8110\u27E9', pad, 4);

    // ---- Draggable point ----
    const cp = toCanvas(dragP.sx, dragP.sy);
    const ptColor = isDoubleSlip ? AMBER : '#8b2252';
    ctx.beginPath();
    ctx.arc(cp.cx, cp.cy, 10, 0, Math.PI*2);
    ctx.fillStyle = isDoubleSlip ? 'rgba(184,134,11,0.15)' : 'rgba(139,34,82,0.12)';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cp.cx, cp.cy, 5, 0, Math.PI*2);
    ctx.fillStyle = ptColor;
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // ---- Right side: active system + table ----
    const boxY = pad + 16;
    const boxH = isDoubleSlip ? 72 : 54;

    ctx.fillStyle = isDoubleSlip ? 'rgba(184,134,11,0.08)' : 'rgba(42,47,124,0.06)';
    roundRect(ctx, rightX, boxY, rightW, boxH, 5);
    ctx.fill();

    ctx.font = '500 10px "DM Sans",sans-serif';
    ctx.fillStyle = isDoubleSlip ? AMBER : C.MUTED;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(isDoubleSlip ? 'DOUBLE SLIP — BOUNDARY' : 'ACTIVE SLIP SYSTEM', rightX+8, boxY+5);

    ctx.font = '600 14px "DM Sans",sans-serif';
    ctx.fillStyle = C.DARK;
    ctx.fillText(active.label, rightX+8, boxY+20);

    ctx.font = '500 13px "DM Sans",sans-serif';
    ctx.fillStyle = isDoubleSlip ? AMBER : C.BLUE;
    ctx.textAlign = 'right';
    ctx.fillText('m = '+active.m.toFixed(4), rightX+rightW-8, boxY+22);

    if (isDoubleSlip) {
      ctx.font = '600 14px "DM Sans",sans-serif';
      ctx.fillStyle = C.DARK;
      ctx.textAlign = 'left';
      ctx.fillText(active2.label, rightX+8, boxY+38);

      ctx.font = '500 13px "DM Sans",sans-serif';
      ctx.fillStyle = AMBER;
      ctx.textAlign = 'right';
      ctx.fillText('m = '+active2.m.toFixed(4), rightX+rightW-8, boxY+40);
    }

    const dirStr = formatDirection(g);
    ctx.font = '400 11px "DM Sans",sans-serif';
    ctx.fillStyle = C.MUTED;
    ctx.textAlign = 'left';
    ctx.fillText('Tensile axis: '+dirStr, rightX+8, boxY + boxH - 12);

    // Table
    const tableY = boxY + boxH + 10;
    const rowH = Math.min(17, (h - tableY - 10) / 13);
    const showN = Math.min(12, Math.floor((h - tableY - 10) / rowH) - 1);

    ctx.font = '500 9px "DM Sans",sans-serif';
    ctx.fillStyle = C.MUTED;
    ctx.textAlign = 'left';
    ctx.fillText('#', rightX+3, tableY);
    ctx.fillText('System', rightX+16, tableY);
    ctx.textAlign = 'right';
    ctx.fillText('m', rightX+rightW-4, tableY);

    ctx.strokeStyle = 'rgba(0,0,0,0.06)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(rightX, tableY+11);
    ctx.lineTo(rightX+rightW, tableY+11);
    ctx.stroke();

    for (let i = 0; i < showN; i++) {
      const f = factors[i];
      const ry = tableY + 14 + i * rowH;
      const isTop = (i === 0) || (isDoubleSlip && i === 1);
      const topColor = isDoubleSlip ? AMBER : C.BLUE;

      if (isTop) {
        ctx.fillStyle = isDoubleSlip ? 'rgba(184,134,11,0.08)' : 'rgba(42,47,124,0.06)';
        roundRect(ctx, rightX, ry-2, rightW, rowH, 2);
        ctx.fill();
      }

      ctx.font = '400 10px "DM Sans",sans-serif';
      ctx.fillStyle = isTop ? topColor : C.MUTED;
      ctx.textAlign = 'left';
      ctx.fillText(String(i+1), rightX+3, ry+9);

      ctx.font = isTop ? '500 10px "DM Sans",sans-serif' : '400 10px "DM Sans",sans-serif';
      ctx.fillStyle = isTop ? C.DARK : '#666';
      ctx.fillText(f.label, rightX+16, ry+9);

      // Mini bar
      const barX = rightX + rightW*0.54;
      const barW = rightW*0.2;
      ctx.fillStyle = 'rgba(0,0,0,0.04)';
      ctx.fillRect(barX, ry+4, barW, 3);
      if (f.m > 0) {
        ctx.fillStyle = isTop ? topColor : 'rgba(42,47,124,0.2)';
        ctx.fillRect(barX, ry+4, barW*(f.m/0.5), 3);
      }

      ctx.font = '400 10px "Lora",serif';
      ctx.fillStyle = isTop ? topColor : C.MUTED;
      ctx.textAlign = 'right';
      ctx.fillText(f.m.toFixed(4), rightX+rightW-4, ry+9);
    }

    // Legend
    const legY = h - 18;
    const legX = discCx - discR;
    ctx.font = '400 9px "DM Sans",sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    // Plane normal
    ctx.beginPath(); ctx.arc(legX+4, legY, 4, 0, Math.PI*2);
    ctx.fillStyle = ACTIVE_DIR_COLOR; ctx.fill();
    ctx.fillStyle = C.MUTED;
    ctx.fillText('slip plane normal {111}', legX+12, legY);
    // Slip direction
    const dx = legX + 130;
    ctx.beginPath(); ctx.arc(dx+4, legY, 4, 0, Math.PI*2);
    ctx.fillStyle = RED; ctx.fill();
    ctx.fillStyle = C.MUTED;
    ctx.fillText('slip direction \u27E8110\u27E9', dx+12, legY);

    // Info bar
    if (isDoubleSlip) {
      info.innerHTML =
        '<span style="color:'+AMBER+'">Double slip</span>: <b>'+dirStr+'</b>'+
        ' &nbsp;\u00B7&nbsp; <b style="color:'+AMBER+'">'+active.label+
        '</b> + <b style="color:'+AMBER+'">'+active2.label+
        '</b> &nbsp;\u00B7&nbsp; m = <b>'+active.m.toFixed(4)+'</b>';
    } else {
      info.innerHTML =
        'Tensile axis: <b>'+dirStr+'</b>'+
        ' &nbsp;\u00B7&nbsp; Active: <b style="color:'+C.BLUE+'">'+active.label+'</b>'+
        ' &nbsp;\u00B7&nbsp; m = <b>'+active.m.toFixed(4)+'</b>';
    }
  }

  /* ---- Helpers ---- */

  function roundRect(ctx,x,y,w,h,r) {
    ctx.beginPath();
    ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y);
    ctx.quadraticCurveTo(x+w,y,x+w,y+r); ctx.lineTo(x+w,y+h-r);
    ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h); ctx.lineTo(x+r,y+h);
    ctx.quadraticCurveTo(x,y+h,x,y+h-r); ctx.lineTo(x,y+r);
    ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath();
  }

  function formatDirection(v) {
    // Preserve signs — use absolute values only for scaling
    const au = Math.abs(v[0]), av = Math.abs(v[1]), aw = Math.abs(v[2]);
    const minNZ = Math.min(
      au>0.01?au:Infinity, av>0.01?av:Infinity, aw>0.01?aw:Infinity
    );
    const s = (minNZ > 0 && isFinite(minNZ)) ? 1/minNZ : 1;
    const su = v[0]*s, sv = v[1]*s, sw = v[2]*s;
    for (let m = 1; m <= 12; m++) {
      const ru=Math.round(su*m), rv=Math.round(sv*m), rw=Math.round(sw*m);
      if (Math.abs(su*m-ru)<0.08 && Math.abs(sv*m-rv)<0.08 && Math.abs(sw*m-rw)<0.08) {
        // Format with overline for negative indices
        const fmt = n => n < 0 ? Math.abs(n)+'\u0305' : ''+n;
        return '['+fmt(ru)+' '+fmt(rv)+' '+fmt(rw)+']';
      }
    }
    const fmt = n => n < 0 ? Math.abs(n).toFixed(2)+'\u0305' : n.toFixed(2);
    return '['+fmt(su)+' '+fmt(sv)+' '+fmt(sw)+']';
  }

  /* ---- Interaction ---- */

  function getCoords(e) {
    const r = canvas.getBoundingClientRect();
    return fromCanvas(e.clientX-r.left, e.clientY-r.top);
  }

  function handleDrag(sx, sy) {
    // Clamp to disc
    const r2 = sx*sx + sy*sy;
    if (r2 > 0.98) {
      const s = 0.99 / Math.sqrt(r2);
      sx *= s; sy *= s;
    }
    dragP = { sx, sy };
    render();
  }

  canvas.addEventListener('mousedown', e => {
    dragging = true;
    const {sx,sy} = getCoords(e);
    handleDrag(sx,sy);
  });
  canvas.addEventListener('mousemove', e => {
    if (!dragging) return;
    const {sx,sy} = getCoords(e);
    handleDrag(sx,sy);
  });
  window.addEventListener('mouseup', () => { dragging = false; });

  canvas.addEventListener('touchstart', e => {
    e.preventDefault(); dragging = true;
    const {sx,sy} = getCoords(e.touches[0]);
    handleDrag(sx,sy);
  }, {passive:false});
  canvas.addEventListener('touchmove', e => {
    e.preventDefault(); if (!dragging) return;
    const {sx,sy} = getCoords(e.touches[0]);
    handleDrag(sx,sy);
  }, {passive:false});
  canvas.addEventListener('touchend', () => { dragging = false; });

  render();
  window.addEventListener('resize', render);
}
