/* ==========================================================================
   Phase diagram canvas renderer
   Consumes the JSON contract from compute_binary.py.
   Uses the site's chart-utils for consistent styling.
   ========================================================================== */

import { setupCanvas, scale, BLUE, DARK, MUTED, LABEL_FONT, TICK_FONT, MAX_DPR } from './widgets/chart-utils.js';

const CURVE_COLOR = '#1a1d3a';
const CURVE_WIDTH = 1.8;
const SNAP_PT = 28;

// Atomic masses for mol↔wt% conversion
const ATOMIC_MASS = {
  'Al':26.982,'B':10.81,'C':12.011,'Ce':140.12,'Cr':51.996,'Cu':63.546,
  'Fe':55.845,'Hf':178.49,'Li':6.941,'Mg':24.305,'Mn':54.938,'Mo':95.95,
  'Nb':92.906,'Nd':144.24,'Ni':58.693,'Si':28.086,'Sn':118.71,'Ta':180.95,
  'Ti':47.867,'V':50.942,'W':183.84,'Y':88.906,'Zn':65.38,'Zr':91.224,
};

function molToWt(x, mA, mB) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  return (x * mB) / (x * mB + (1 - x) * mA);
}

function wtToMol(w, mA, mB) {
  if (w <= 0) return 0;
  if (w >= 1) return 1;
  return (w / mB) / (w / mB + (1 - w) / mA);
}
const SNAP_CURVE = 18;
const MARKER_RED = '#8b2252';
const MARKER_BLUE = BLUE;

/**
 * Interpolate composition on a curve at a given temperature.
 */
function interp(pts, T) {
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, t0] = pts[i];
    const [x1, t1] = pts[i + 1];
    if ((t0 <= T && T <= t1) || (t1 <= T && T <= t0)) {
      return x0 + (T - t0) / (t1 - t0) * (x1 - x0);
    }
  }
  return null;
}

/**
 * Find snap target near mouse position.
 */
function findSnap(data, mx, my, xS, yS, toDisp, fromDisp) {
  // Check special points first (larger catch radius)
  let bestPt = null;
  let bestPtD = SNAP_PT;
  for (const sp of data.special_points) {
    const dx = xS(toDisp(sp.x)) - mx;
    const dy = yS(sp.T) - my;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < bestPtD) {
      bestPtD = dist;
      bestPt = sp;
    }
  }
  if (bestPt) {
    return {
      px: xS(toDisp(bestPt.x)), py: yS(bestPt.T),
      xVal: bestPt.x, T: bestPt.T,
      name: bestPt.name, type: bestPt.type,
      reaction: bestPt.reaction || null
    };
  }

  // Check curves
  const T = yS.inv(my);
  let bestC = null;
  let bestCD = SNAP_CURVE;
  for (const curve of data.curves) {
    const xOn = interp(curve.pts, T);
    if (xOn === null) continue;
    const d = Math.abs(xS(toDisp(xOn)) - mx);
    if (d < bestCD) {
      bestCD = d;
      bestC = {
        px: xS(toDisp(xOn)), py: yS(T),
        xVal: xOn, T,
        name: curve.name, type: 'boundary'
      };
    }
  }

  // Check isotherms
  for (const iso of data.isotherms) {
    const xMol = fromDisp(xS.inv(mx));
    if (Math.abs(yS(iso.T) - my) < 10 && xMol >= iso.x_start && xMol <= iso.x_end) {
      const iD = Math.abs(yS(iso.T) - my);
      if (!bestC || iD < bestCD) {
        return {
          px: mx, py: yS(iso.T),
          xVal: xMol, T: iso.T,
          name: iso.name + ' isotherm', type: 'boundary'
        };
      }
    }
  }

  return bestC;
}

/**
 * Draw a smooth curve through points using Catmull-Rom to cubic bezier.
 */
function drawSmoothCurve(ctx, pts, xS, yS, closed, xTransform) {
  if (pts.length < 2) return;
  const tx = xTransform || (x => x);
  const P = pts.map(([x, t]) => [xS(tx(x)), yS(t)]);

  ctx.beginPath();
  ctx.moveTo(P[0][0], P[0][1]);

  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[Math.max(0, i - 1)];
    const p1 = P[i];
    const p2 = P[i + 1];
    const p3 = P[Math.min(P.length - 1, i + 2)];

    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;

    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2[0], p2[1]);
  }

  if (closed) ctx.closePath();
  ctx.stroke();
}

/**
 * Mount the phase diagram renderer into a container.
 *
 * @param {HTMLElement} container
 * @param {Object} data — the parsed JSON from compute_binary.py
 * @returns {{ destroy: Function }}
 */
export function createPhaseDiagram(container, data) {
  container.innerHTML = '';

  // Parse system elements
  const [el1, el2] = data.system.split('-');

  // Active dataset (supports stable/metastable toggle)
  // Default to metastable if available
  let isMetastable = !!data.metastable;
  let activeData = isMetastable ? {
    curves: data.metastable.curves,
    special_points: data.metastable.special_points,
    isotherms: data.metastable.isotherms,
    labels: data.metastable.labels,
    xMin: data.metastable.xMin,
    xMax: data.metastable.xMax,
  } : {
    curves: data.curves,
    special_points: data.special_points,
    isotherms: data.isotherms,
    labels: data.labels,
  };

  // Title
  const header = document.createElement('div');
  header.className = 'pd-header';
  header.innerHTML = `
    <h2 class="pd-title">${el1}\u2013${el2} Binary Phase Diagram</h2>
    <p class="pd-ref">${data.reference || ''}</p>
  `;
  container.appendChild(header);

  // Stable/metastable toggle (only for Fe-C style diagrams)
  if (data.metastable) {
    const toggle = document.createElement('div');
    toggle.className = 'pd-toggle';
    toggle.innerHTML = `
      <button class="pd-toggle-btn" data-mode="stable">Stable (graphite)</button>
      <button class="pd-toggle-btn pd-toggle-active" data-mode="metastable">Metastable (Fe\u2083C)</button>
    `;
    container.appendChild(toggle);

    toggle.addEventListener('click', (e) => {
      const btn = e.target.closest('.pd-toggle-btn');
      if (!btn) return;
      const mode = btn.dataset.mode;
      isMetastable = mode === 'metastable';

      toggle.querySelectorAll('.pd-toggle-btn').forEach(b => b.classList.remove('pd-toggle-active'));
      btn.classList.add('pd-toggle-active');

      if (isMetastable) {
        activeData = {
          curves: data.metastable.curves,
          special_points: data.metastable.special_points,
          isotherms: data.metastable.isotherms,
          labels: data.metastable.labels,
          xMin: data.metastable.xMin,
          xMax: data.metastable.xMax,
        };
      } else {
        activeData = {
          curves: data.curves,
          special_points: data.special_points,
          isotherms: data.isotherms,
          labels: data.labels,
        };
      }
      recalcRanges();
      render();
    });
  }

  // Canvas
  const canvas = document.createElement('canvas');
  canvas.className = 'pd-canvas';
  canvas.style.cursor = 'crosshair';
  canvas.style.display = 'block';
  canvas.style.width = '100%';
  container.appendChild(canvas);

  // Info bar
  const info = document.createElement('div');
  info.className = 'pd-info';
  info.innerHTML = '<span class="pd-hint">Hover to inspect \u00B7 snaps to boundaries and invariant points</span>';
  container.appendChild(info);

  // Mol/Wt% toggle
  const mA = ATOMIC_MASS[el1] || 1;
  const mB = ATOMIC_MASS[el2] || 1;
  let useWt = false;

  const unitToggle = document.createElement('div');
  unitToggle.className = 'pd-toggle';
  unitToggle.innerHTML = `
    <button class="pd-toggle-btn pd-toggle-active" data-unit="mol">mol%</button>
    <button class="pd-toggle-btn" data-unit="wt">wt%</button>
  `;
  container.appendChild(unitToggle);

  unitToggle.addEventListener('click', (e) => {
    const btn = e.target.closest('.pd-toggle-btn');
    if (!btn) return;
    useWt = btn.dataset.unit === 'wt';
    unitToggle.querySelectorAll('.pd-toggle-btn').forEach(b => b.classList.remove('pd-toggle-active'));
    btn.classList.add('pd-toggle-active');
    recalcRanges();
    render();
  });

  // State
  const pad = { l: 64, r: 76, t: 28, b: 56 };
  let hover = null;
  let w = 0, h = 0, xS, yS;

  /**
   * Determine which phase region a point (x, T) falls in.
   * Sweeps all curves at the given T, finds which interval the x falls in,
   * and returns the bounding curve names as a region description.
   */
  function getRegion(x, T) {
    // Find all curve crossings at this temperature
    const crossings = [];
    for (const c of activeData.curves) {
      if (c.closed) {
        const half = Math.floor(c.pts.length / 2);
        const xl = interp(c.pts.slice(0, half), T);
        const xr = interp(c.pts.slice(half), T);
        if (xl !== null) crossings.push({ x: xl, id: c.id + '_L', name: c.name });
        if (xr !== null) crossings.push({ x: xr, id: c.id + '_R', name: c.name });
      } else {
        const xc = interp(c.pts, T);
        if (xc !== null) crossings.push({ x: xc, id: c.id, name: c.name });
      }
    }
    crossings.sort((a, b) => a.x - b.x);

    // Find which interval x falls in
    let leftCurve = null;
    let rightCurve = null;
    for (let i = 0; i < crossings.length; i++) {
      if (x < crossings[i].x) {
        rightCurve = crossings[i];
        leftCurve = i > 0 ? crossings[i - 1] : null;
        break;
      }
    }
    if (!rightCurve && crossings.length > 0) {
      leftCurve = crossings[crossings.length - 1];
    }

    // Determine region from bounding curves
    // If both curves share a phase pair prefix, it's a two-phase region
    if (leftCurve && rightCurve) {
      const lp = leftCurve.id.replace(/_low.*|_high.*|_L$|_R$/, '');
      const rp = rightCurve.id.replace(/_low.*|_high.*|_L$|_R$/, '');
      if (lp === rp) {
        // Two-phase region — format the pair name nicely
        return formatPairName(lp);
      }
    }

    // Single-phase region — identify from adjacent two-phase regions
    // The phase is the one shared between the left and right bounding pairs
    if (leftCurve) {
      const lp = leftCurve.id.replace(/_low.*|_high.*|_L$|_R$/, '');
      // The "high" side of a pair → the right phase of that pair
      if (leftCurve.id.includes('_high') || leftCurve.id.includes('_R')) {
        return formatPhaseName(lp.split('_').pop());
      }
    }
    if (rightCurve) {
      const rp = rightCurve.id.replace(/_low.*|_high.*|_L$|_R$/, '');
      if (rightCurve.id.includes('_low') || rightCurve.id.includes('_L')) {
        return formatPhaseName(rp.split('_')[0]);
      }
    }

    // Above all curves = liquid, below = check boundaries
    if (crossings.length > 0 && x >= 0 && x <= 1) {
      if (T > crossings[0].x) return 'Liquid';
    }

    return null;
  }

  function formatPhaseName(raw) {
    // Per-system overrides take priority
    const overrides = data.phaseNames || {};
    if (overrides[raw]) return overrides[raw];

    const map = {
      'FCC': '\u03b1', 'FCC_A1': '\u03b1',
      'BCC': '\u03b2', 'BCC_A2': '\u03b2', 'BCC_B2': '\u03b2',
      'HCP': 'hcp', 'HCP_A3': 'hcp',
      'LIQUID': 'Liquid',
      'CEMENTITE_D011': 'Fe\u2083C', 'CEMENTITE': 'Fe\u2083C',
      'GRAPHITE': 'Graphite', 'DIAMOND_A4': 'Diamond',
    };
    if (map[raw]) return map[raw];
    // Strip Strukturbericht suffixes (_D011, _A1, _B2, _A3, _A15, etc.)
    const stripped = raw.replace(/_[A-D]\d+[A-Z]?$/, '');
    if (map[stripped]) return map[stripped];
    // Greek letter names
    const greek = {
      'THETA':'\u03b8','ETA':'\u03b7','EPSILON':'\u03b5','ZETA':'\u03b6',
      'DELTA':'\u03b4','GAMMA':'\u03b3','BETA':'\u03b2','ALPHA':'\u03b1',
      'SIGMA':'\u03c3','MU':'\u03bc','CHI':'\u03c7',
    };
    for (const part of raw.split('_')) {
      if (greek[part]) return greek[part];
    }
    // Compound names: AL2LI3 -> Al₂Li₃
    const subs = '\u2080\u2081\u2082\u2083\u2084\u2085\u2086\u2087\u2088\u2089';
    return raw.replace(/([A-Z][a-z]?)(\d+)/g, (_, el, n) =>
      el + n.split('').map(d => subs[parseInt(d)]).join('')
    );
  }

  // Build a lookup from curve pair prefix -> [phase1 name, phase2 name]
  function buildPairPhases() {
    const pp = {};
    for (const c of activeData.curves) {
      if (c.closed) continue;
      const prefix = c.id.replace(/_low.*|_high.*|_l$|_r$/, '');
      if (!pp[prefix]) pp[prefix] = [];
      const phaseName = c.name.replace(' boundary', '');
      if (!pp[prefix].includes(phaseName)) {
        pp[prefix].push(phaseName);
      }
    }
    return pp;
  }
  let pairPhases = buildPairPhases();

  function formatPairName(raw) {
    const phases = pairPhases[raw];
    if (phases && phases.length === 2) {
      return formatPhaseName(phases[0]) + ' + ' + formatPhaseName(phases[1]);
    }
    if (phases && phases.length === 1) {
      return formatPhaseName(phases[0]);
    }
    return formatPhaseName(raw);
  }

  // Convert mole fraction to display value (mol or wt%)
  function toDisplay(x) {
    return useWt ? molToWt(x, mA, mB) : x;
  }
  // Convert display value back to mole fraction
  function fromDisplay(d) {
    return useWt ? wtToMol(d, mA, mB) : d;
  }

  // Determine T and X range from active data
  let Tmin, Tmax, Xmin, Xmax;
  function recalcRanges() {
    Tmin = Infinity; Tmax = -Infinity;
    for (const c of activeData.curves) {
      for (const [, t] of c.pts) {
        if (t < Tmin) Tmin = t;
        if (t > Tmax) Tmax = t;
      }
    }
    if (activeData.labels) {
      for (const lbl of activeData.labels) {
        if (lbl.T < Tmin) Tmin = lbl.T;
        if (lbl.T > Tmax) Tmax = lbl.T;
      }
    }
    Tmin = Math.floor(Tmin / 50) * 50;
    Tmax = Math.ceil(Tmax / 50) * 50 + 25;
    Xmin = toDisplay(activeData.xMin || 0);
    Xmax = toDisplay(activeData.xMax || 1);
    pairPhases = buildPairPhases();
  }
  recalcRanges();

  function render() {
    const dpr = Math.min(window.devicePixelRatio, MAX_DPR);
    w = container.clientWidth;
    h = Math.round(w * 0.6);
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.height = h + 'px';
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    xS = scale(Xmin, Xmax, pad.l, w - pad.r);
    yS = scale(Tmin, Tmax, h - pad.b, pad.t);

    // White plot area
    ctx.fillStyle = '#fff';
    ctx.fillRect(pad.l, pad.t, w - pad.l - pad.r, h - pad.t - pad.b);

    // Grid — generate ticks in display units
    const xTicks = [];
    if (useWt) {
      // Nice round wt% values
      const step = Xmax <= 0.1 ? 0.01 : Xmax <= 0.5 ? 0.05 : 0.1;
      for (let w = 0; w <= Xmax + 0.001; w += step) xTicks.push(Math.round(w * 1000) / 1000);
    } else {
      const step = Xmax <= 0.5 ? 0.1 : 0.2;
      for (let x = 0; x <= Xmax + 0.001; x += step) xTicks.push(Math.round(x * 100) / 100);
    }

    ctx.strokeStyle = 'rgba(0,0,0,0.05)';
    ctx.lineWidth = 0.6;
    for (const x of xTicks) {
      ctx.beginPath();
      ctx.moveTo(xS(x), pad.t);
      ctx.lineTo(xS(x), h - pad.b);
      ctx.stroke();
    }
    for (let t = Tmin; t <= Tmax; t += 100) {
      ctx.beginPath();
      ctx.moveTo(pad.l, yS(t));
      ctx.lineTo(w - pad.r, yS(t));
      ctx.stroke();
    }

    // Curves
    ctx.strokeStyle = CURVE_COLOR;
    ctx.lineWidth = CURVE_WIDTH;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    for (const c of activeData.curves) {
      drawSmoothCurve(ctx, c.pts, xS, yS, c.closed, toDisplay);
    }

    // Isotherms (solid tie lines between invariant points)
    ctx.strokeStyle = CURVE_COLOR;
    ctx.lineWidth = CURVE_WIDTH;
    ctx.lineCap = 'round';
    for (const iso of activeData.isotherms) {
      ctx.beginPath();
      ctx.moveTo(xS(toDisplay(iso.x_start)), yS(iso.T));
      ctx.lineTo(xS(toDisplay(iso.x_end)), yS(iso.T));
      ctx.stroke();
    }

    // Special point markers
    for (const sp of activeData.special_points) {
      const px = xS(toDisplay(sp.x));
      const py = yS(sp.T);
      ctx.beginPath();
      if (sp.type === 'triple') {
        ctx.arc(px, py, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.strokeStyle = CURVE_COLOR;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else if (sp.type === 'melt') {
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fillStyle = CURVE_COLOR;
        ctx.fill();
      } else {
        ctx.arc(px, py, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.strokeStyle = CURVE_COLOR;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
    }

    // Axes border
    ctx.strokeStyle = '#bbb';
    ctx.lineWidth = 1;
    ctx.strokeRect(pad.l, pad.t, w - pad.l - pad.r, h - pad.t - pad.b);

    // X axis ticks
    ctx.font = '500 12px "DM Sans", sans-serif';
    ctx.fillStyle = DARK;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (const x of xTicks) {
      ctx.fillText(Math.round(x * 100).toString(), xS(x), h - pad.b + 6);
    }
    // X axis title
    ctx.font = '600 14px "DM Sans", sans-serif';
    ctx.fillText((useWt ? 'wt% ' : 'mol% ') + el2, pad.l + (w - pad.l - pad.r) / 2, h - pad.b + 26);

    // Y axis ticks
    ctx.font = '500 12px "DM Sans", sans-serif';
    ctx.fillStyle = DARK;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let t = Tmin; t <= Tmax; t += 100) {
      ctx.fillText(t.toString(), pad.l - 6, yS(t));
    }
    // Y axis title
    ctx.save();
    ctx.translate(14, pad.t + (h - pad.t - pad.b) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.font = '600 14px "DM Sans", sans-serif';
    ctx.fillStyle = DARK;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('Temperature (K)', 0, 0);
    ctx.restore();

    // Right axis: °C at round 100°C intervals
    ctx.font = '500 12px "DM Sans", sans-serif';
    ctx.fillStyle = DARK;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const cMin = Math.ceil((Tmin - 273.15) / 100) * 100;
    const cMax = Math.floor((Tmax - 273.15) / 100) * 100;
    for (let tC = cMin; tC <= cMax; tC += 100) {
      const tK = tC + 273.15;
      if (tK >= Tmin && tK <= Tmax) {
        ctx.fillText(tC.toString(), w - pad.r + 6, yS(tK));
      }
    }
    ctx.save();
    ctx.translate(w - 14, pad.t + (h - pad.t - pad.b) / 2);
    ctx.rotate(Math.PI / 2);
    ctx.font = '600 14px "DM Sans", sans-serif';
    ctx.fillStyle = DARK;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('Temperature (\u00B0C)', 0, 0);
    ctx.restore();

    // Element labels at top
    ctx.font = '700 14px "DM Sans", sans-serif';
    ctx.fillStyle = DARK;
    ctx.textAlign = 'center';
    ctx.fillText(el1, xS(toDisplay(0)), pad.t - 12);
    ctx.fillText(el2, xS(toDisplay(1)), pad.t - 12);

    // Invariant reaction labels (below isotherms)
    for (const iso of activeData.isotherms) {
      const midX = xS((toDisplay(iso.x_start) + toDisplay(iso.x_end)) / 2);
      ctx.font = '400 9px "DM Sans", sans-serif';
      ctx.fillStyle = MUTED;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(iso.name, midX, yS(iso.T) + 4);
      // Temperature label
      ctx.font = '600 9px "DM Sans", sans-serif';
      ctx.fillText(Math.round(iso.T) + ' K', midX, yS(iso.T) + 15);
    }

    // Phase region labels
    const LB = '#444';
    if (activeData.labels) {
      for (const lbl of activeData.labels) {
        const px = lbl.anchor === 'right' ? w - pad.r + 10 : xS(toDisplay(lbl.x));
        const py = yS(lbl.T);

        ctx.textBaseline = 'middle';

        if (lbl.style === 'phase') {
          ctx.font = '700 14px "DM Sans", sans-serif';
          ctx.fillStyle = LB;
          ctx.fontStyle = 'italic';
        } else if (lbl.style === 'phase-large') {
          ctx.font = '700 15px "DM Sans", sans-serif';
          ctx.fillStyle = LB;
        } else if (lbl.style === 'region') {
          ctx.font = '600 11px "DM Sans", sans-serif';
          ctx.fillStyle = LB;
        } else {
          ctx.font = '600 10px "DM Sans", sans-serif';
          ctx.fillStyle = LB;
        }

        ctx.textAlign = lbl.anchor === 'right' ? 'left' : 'center';

        if (lbl.rotate) {
          ctx.save();
          ctx.translate(px, py);
          ctx.rotate(-Math.PI / 2);
          ctx.fillText(lbl.text, 0, 0);
          ctx.restore();
        } else {
          ctx.fillText(lbl.text, px, py);
        }

        // Arrow from label to narrow region
        if (lbl.arrow) {
          const ax = xS(toDisplay(lbl.arrow[0]));
          const ay = yS(lbl.arrow[1]);
          // Start from side of text, not centre
          const textW = ctx.measureText(lbl.text).width;
          let startX = px;
          if (lbl.arrow_from === 'right') startX = px + textW / 2 + 4;
          else if (lbl.arrow_from === 'left') startX = px - textW / 2 - 4;
          else startX = ax > px ? px + textW / 2 + 4 : px - textW / 2 - 4;
          const startY = py;
          const dx = ax - startX;
          const dy = ay - startY;
          const len = Math.sqrt(dx * dx + dy * dy);
          if (len > 10) {
            const ux = dx / len;
            const uy = dy / len;
            ctx.strokeStyle = LB;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(ax, ay);
            ctx.stroke();
            // Arrowhead
            ctx.fillStyle = LB;
            ctx.beginPath();
            ctx.moveTo(ax, ay);
            ctx.lineTo(ax - ux * 5 - uy * 2.5, ay - uy * 5 + ux * 2.5);
            ctx.lineTo(ax - ux * 5 + uy * 2.5, ay - uy * 5 - ux * 2.5);
            ctx.closePath();
            ctx.fill();
          }
        }
      }
    }

    // Hover
    if (hover) {
      const isPoint = hover.type === 'triple' || hover.type === 'melt' || hover.type === 'critical' || hover.type === 'junction';
      const isBound = hover.type === 'boundary';
      const col = isPoint ? MARKER_RED : isBound ? MARKER_BLUE : CURVE_COLOR;

      // Crosshair (faint)
      ctx.strokeStyle = CURVE_COLOR;
      ctx.lineWidth = 0.3;
      ctx.setLineDash([3, 3]);
      ctx.globalAlpha = 0.12;
      ctx.beginPath();
      ctx.moveTo(hover.rawX, pad.t);
      ctx.lineTo(hover.rawX, h - pad.b);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(pad.l, hover.rawY);
      ctx.lineTo(w - pad.r, hover.rawY);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.setLineDash([]);

      // Guide lines to axes
      ctx.strokeStyle = col;
      ctx.lineWidth = 0.7;
      ctx.setLineDash([4, 2]);
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.moveTo(hover.px, h - pad.b);
      ctx.lineTo(hover.px, hover.py);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(pad.l, hover.py);
      ctx.lineTo(hover.px, hover.py);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.setLineDash([]);

      // Marker
      if (isPoint) {
        // Diamond + dot
        ctx.beginPath();
        ctx.moveTo(hover.px, hover.py - 9);
        ctx.lineTo(hover.px + 7, hover.py);
        ctx.lineTo(hover.px, hover.py + 9);
        ctx.lineTo(hover.px - 7, hover.py);
        ctx.closePath();
        ctx.strokeStyle = MARKER_RED;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(hover.px, hover.py, 3, 0, Math.PI * 2);
        ctx.fillStyle = MARKER_RED;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(hover.px, hover.py, 1.2, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
      } else if (isBound) {
        ctx.beginPath();
        ctx.arc(hover.px, hover.py, 6, 0, Math.PI * 2);
        ctx.strokeStyle = MARKER_BLUE;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.5;
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.arc(hover.px, hover.py, 3, 0, Math.PI * 2);
        ctx.fillStyle = MARKER_BLUE;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(hover.px, hover.py, 1, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(hover.px, hover.py, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = CURVE_COLOR;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(hover.px, hover.py, 1, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
      }

      // Info bar
      const region = getRegion(hover.xVal, hover.T);
      info.innerHTML = `
        <span>${useWt ? 'wt%' : 'x'}<sub>${el2}</sub> = <b>${useWt ? (toDisplay(hover.xVal) * 100).toFixed(2) + '%' : hover.xVal.toFixed(4)}</b></span>
        <span>T = <b>${hover.T.toFixed(0)} K</b> (${(hover.T - 273.15).toFixed(0)} \u00B0C)</span>
        ${region ? `<span style="font-weight:600;background:#333;color:#fff;border-radius:3px;padding:3px 10px;font-size:14px">${region}</span>` : ''}
        ${hover.reaction ? `<span class="pd-snap-label" style="color:${col}">${hover.reaction}</span>` : hover.name ? `<span class="pd-snap-label" style="color:${col}">${hover.name}</span>` : ''}
      `;
    }
  }

  function onMove(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = w / rect.width;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleX;

    const xDisplay = xS.inv(mx);
    const tV = yS.inv(my);
    const xF = fromDisplay(xDisplay);  // convert back to mol fraction

    if (xDisplay < Xmin - 0.02 || xDisplay > Xmax + 0.02 || tV < Tmin - 10 || tV > Tmax + 10) {
      hover = null;
      render();
      info.innerHTML = '<span class="pd-hint">Hover to inspect \u00B7 snaps to boundaries and invariant points</span>';
      return;
    }

    const snap = findSnap(activeData, mx, my, xS, yS, toDisplay, fromDisplay);
    if (snap) {
      hover = { ...snap, rawX: mx, rawY: my };
    } else {
      const cx = Math.max(0, Math.min(1, xF));
      const ct = Math.max(Tmin, Math.min(Tmax, tV));
      hover = {
        px: xS(toDisplay(cx)), py: yS(ct), rawX: mx, rawY: my,
        xVal: cx, T: ct, name: null, type: null
      };
    }
    render();
  }

  function onLeave() {
    hover = null;
    render();
    info.innerHTML = '<span class="pd-hint">Hover to inspect \u00B7 snaps to boundaries and invariant points</span>';
  }

  canvas.addEventListener('mousemove', onMove);
  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    onMove({ clientX: touch.clientX, clientY: touch.clientY });
  }, { passive: false });
  canvas.addEventListener('mouseleave', onLeave);
  canvas.addEventListener('touchend', onLeave);

  // Initial render
  render();
  window.addEventListener('resize', render);

  return {
    destroy() {
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('mouseleave', onLeave);
      window.removeEventListener('resize', render);
    }
  };
}
