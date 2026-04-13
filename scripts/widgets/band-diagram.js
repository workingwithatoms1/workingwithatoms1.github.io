/* ==========================================================================
   Semiconductor band diagram widget
   Interactive visualisation of conduction band (Ec), valence band (Ev),
   Fermi level (Ef), electrons and holes for intrinsic, n-type and p-type
   semiconductors. Sliders for band gap Eg and temperature T.
   ========================================================================== */

import * as C from './chart-utils.js';

const kB = 8.617e-5; // Boltzmann constant in eV/K

/** Intrinsic carrier concentration (simplified) for Fermi-level shift calc */
function niApprox(Eg, T) {
  // ni ~ T^(3/2) * exp(-Eg / 2kT) — prefactor cancels in ratio
  return Math.pow(T, 1.5) * Math.exp(-Eg / (2 * kB * T));
}

export function create(container) {
  const canvas = C.createWidgetShell(container, 0.45);

  /* ---- Controls ---- */
  const controls = document.createElement('div');
  controls.style.cssText =
    'padding: 12px 16px; display: flex; flex-wrap: wrap; gap: 12px; ' +
    'align-items: center; font-family: "DM Sans", sans-serif; ' +
    'font-size: 12px; color: #3a3d5a;';

  controls.innerHTML = `
    <div style="display:flex;gap:4px;" id="bd-type-btns">
      <button data-type="intrinsic" class="bd-btn bd-btn-active">Intrinsic</button>
      <button data-type="n-type" class="bd-btn">n-type</button>
      <button data-type="p-type" class="bd-btn">p-type</button>
    </div>
    <label style="display:flex;align-items:center;gap:6px;">
      E<sub>g</sub>
      <input type="range" min="50" max="350" value="112" id="bd-eg"
             style="width:100px;accent-color:#2a2f7c;">
      <span id="bd-eg-val" style="min-width:52px;font-family:'Lora',serif;font-size:13px;">1.12 eV</span>
    </label>
    <label style="display:flex;align-items:center;gap:6px;">
      T
      <input type="range" min="100" max="600" value="300" id="bd-t"
             style="width:90px;accent-color:#2a2f7c;">
      <span id="bd-t-val" style="min-width:40px;font-family:'Lora',serif;font-size:13px;">300 K</span>
    </label>
    <select id="bd-preset" style="padding:3px 6px;font-size:11px;border:1px solid #c8c6d0;background:#fff;color:#3a3d5a;border-radius:3px;">
      <option value="">Preset...</option>
      <option value="1.12">Si (1.12 eV)</option>
      <option value="0.67">Ge (0.67 eV)</option>
      <option value="1.42">GaAs (1.42 eV)</option>
    </select>
  `;

  /* Inject scoped button styles */
  const style = document.createElement('style');
  style.textContent = `
    .bd-btn {
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
    .bd-btn:hover { background: #f0f0f6; }
    .bd-btn-active {
      background: #2a2f7c;
      color: #fff;
      border-color: #2a2f7c;
    }
    .bd-btn-active:hover { background: #3a40a0; }
  `;
  container.appendChild(style);
  container.appendChild(controls);

  const egSlider = controls.querySelector('#bd-eg');
  const tSlider  = controls.querySelector('#bd-t');
  const egVal    = controls.querySelector('#bd-eg-val');
  const tVal     = controls.querySelector('#bd-t-val');
  const preset   = controls.querySelector('#bd-preset');
  const typeBtns = controls.querySelectorAll('.bd-btn');

  let dopingType = 'intrinsic';

  /* ---- Toggle buttons ---- */
  typeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      typeBtns.forEach(b => b.classList.remove('bd-btn-active'));
      btn.classList.add('bd-btn-active');
      dopingType = btn.dataset.type;
      render();
    });
  });

  /* ---- Preset selector ---- */
  preset.addEventListener('change', () => {
    if (!preset.value) return;
    const eg = parseFloat(preset.value);
    egSlider.value = Math.round(eg * 100);
    egVal.textContent = eg.toFixed(2) + ' eV';
    render();
    preset.value = '';
  });

  /* ---- Render ---- */
  function render() {
    const { ctx, w, h } = C.setupCanvas(canvas, container, 0.45);

    const Eg = parseInt(egSlider.value) / 100;
    const T  = parseInt(tSlider.value);
    egVal.textContent = Eg.toFixed(2) + ' eV';
    tVal.textContent  = T + ' K';

    const pad = { l: 60, r: 40, t: 30, b: 30 };
    const plotW = w - pad.l - pad.r;
    const plotH = h - pad.t - pad.b;

    /* Energy scale: Ev at 0, Ec at Eg */
    const Ev = 0;
    const Ec = Eg;
    const margin = Math.max(Eg * 0.35, 0.4);
    const eMin = Ev - margin;
    const eMax = Ec + margin;
    const yS = C.scale(eMin, eMax, h - pad.b, pad.t);

    /* Horizontal extent of the band diagram */
    const xLeft  = pad.l + plotW * 0.15;
    const xRight = pad.l + plotW * 0.85;
    /* Background fill for the band gap region */
    ctx.fillStyle = 'rgba(77, 92, 242, 0.06)';
    ctx.fillRect(xLeft, yS(Ec), xRight - xLeft, yS(Ev) - yS(Ec));

    /* --- Draw conduction band (Ec) --- */
    ctx.strokeStyle = C.BLUE;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(xLeft, yS(Ec));
    ctx.lineTo(xRight, yS(Ec));
    ctx.stroke();

    /* --- Draw valence band (Ev) --- */
    ctx.strokeStyle = C.BLUE;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(xLeft, yS(Ev));
    ctx.lineTo(xRight, yS(Ev));
    ctx.stroke();

    /* --- Fermi level position --- */
    let Ef;
    const kT = kB * T;
    const midgap = (Ec + Ev) / 2;

    if (dopingType === 'intrinsic') {
      Ef = midgap;
    } else if (dopingType === 'n-type') {
      // Shift toward Ec: approximate Ef = midgap + kT * ln(Nd/ni)
      // Use a representative Nd/ni ratio that gives a visible shift
      const Nd_ni = 1e4; // representative doping ratio
      const shift = kT * Math.log(Nd_ni);
      Ef = Math.min(midgap + shift, Ec - 0.05 * Eg);
    } else {
      // p-type: Ef closer to Ev
      const Na_ni = 1e4;
      const shift = kT * Math.log(Na_ni);
      Ef = Math.max(midgap - shift, Ev + 0.05 * Eg);
    }

    /* Clamp Ef within band gap */
    Ef = Math.max(Ev + 0.02, Math.min(Ec - 0.02, Ef));

    /* Draw Fermi level (dashed) */
    ctx.strokeStyle = C.RED;
    ctx.lineWidth = 1.8;
    ctx.setLineDash([8, 5]);
    ctx.beginPath();
    ctx.moveTo(xLeft, yS(Ef));
    ctx.lineTo(xRight, yS(Ef));
    ctx.stroke();
    ctx.setLineDash([]);

    /* --- Band-edge and Fermi-level labels (right side) --- */
    function drawSubscriptLabel(x, y, letter, sub, color) {
      ctx.fillStyle = color;
      ctx.font = '500 12px "DM Sans", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(letter, x, y);
      ctx.font = '400 9px "DM Sans", sans-serif';
      ctx.fillText(sub, x + 11, y + 1);
    }

    drawSubscriptLabel(xRight + 8, yS(Ec) + 4, 'E', 'c', C.BLUE);
    drawSubscriptLabel(xRight + 8, yS(Ef) + 4, 'E', 'f', C.RED);
    drawSubscriptLabel(xRight + 8, yS(Ev) + 4, 'E', 'v', C.BLUE);

    /* --- Band gap annotation (vertical bracket with label) --- */
    const bracketX = pad.l + 4;
    ctx.strokeStyle = C.MUTED;
    ctx.lineWidth = 1;

    // Vertical line
    ctx.beginPath();
    ctx.moveTo(bracketX, yS(Ec));
    ctx.lineTo(bracketX, yS(Ev));
    ctx.stroke();

    // Top tick
    ctx.beginPath();
    ctx.moveTo(bracketX - 3, yS(Ec));
    ctx.lineTo(bracketX + 3, yS(Ec));
    ctx.stroke();

    // Bottom tick
    ctx.beginPath();
    ctx.moveTo(bracketX - 3, yS(Ev));
    ctx.lineTo(bracketX + 3, yS(Ev));
    ctx.stroke();

    // Eg label
    ctx.save();
    ctx.translate(bracketX - 6, (yS(Ec) + yS(Ev)) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.font = C.VALUE_FONT;
    ctx.fillStyle = C.DARK;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Eg = ' + Eg.toFixed(2) + ' eV', 0, 0);
    ctx.restore();

    /* --- Carrier symbols --- */
    const ni = niApprox(Eg, T);
    const maxCarriers = 12;
    const minCarriers = 1;

    // Base count scales with temperature (more carriers at higher T)
    const baseFrac = Math.min(ni / niApprox(1.12, 300) * 3, maxCarriers);
    const baseCount = Math.max(minCarriers, Math.round(baseFrac));

    let nElectrons, nHoles;
    if (dopingType === 'intrinsic') {
      nElectrons = baseCount;
      nHoles = baseCount;
    } else if (dopingType === 'n-type') {
      nElectrons = Math.min(baseCount + 6, maxCarriers);
      nHoles = Math.max(1, baseCount - 2);
    } else {
      nElectrons = Math.max(1, baseCount - 2);
      nHoles = Math.min(baseCount + 6, maxCarriers);
    }

    // Seed a deterministic random for carrier positions
    function seededPos(i, count, yBase, spread) {
      const xSpread = (xRight - xLeft) * 0.8;
      const xStart = xLeft + (xRight - xLeft) * 0.1;
      // Spread carriers evenly with slight offsets
      const xPos = xStart + (i + 0.5) * xSpread / count;
      // Vertical offset based on index
      const yOff = ((i * 7 + 3) % 5 - 2) * spread * 0.3;
      return { x: xPos, y: yBase + yOff };
    }

    // Electrons (filled dots) near Ec
    const electronY = yS(Ec) - 10;
    const electronSpread = Math.min(18, plotH * 0.08);
    for (let i = 0; i < nElectrons; i++) {
      const pos = seededPos(i, nElectrons, electronY, electronSpread);
      // Filled circle = electron
      ctx.fillStyle = C.BLUE;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y - ((i * 3 + 1) % 4) * 2, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Holes (open circles) near Ev
    const holeY = yS(Ev) + 10;
    const holeSpread = Math.min(18, plotH * 0.08);
    for (let i = 0; i < nHoles; i++) {
      const pos = seededPos(i, nHoles, holeY, holeSpread);
      // Open circle = hole
      ctx.strokeStyle = C.RED;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y + ((i * 3 + 1) % 4) * 2, 3.5, 0, Math.PI * 2);
      ctx.stroke();
    }

    /* --- Legend --- */
    const legX = xLeft;
    const legY = pad.t + 8;
    ctx.font = '400 10px "DM Sans", sans-serif';

    // Electron symbol
    ctx.fillStyle = C.BLUE;
    ctx.beginPath();
    ctx.arc(legX, legY, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.textAlign = 'left';
    ctx.fillText('Electron', legX + 7, legY + 3);

    // Hole symbol
    ctx.strokeStyle = C.RED;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(legX + 62, legY, 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = C.RED;
    ctx.fillText('Hole', legX + 69, legY + 3);

    /* --- Doping type label --- */
    ctx.font = C.TITLE_FONT;
    ctx.fillStyle = C.DARK;
    ctx.textAlign = 'right';
    const typeLabel = dopingType === 'intrinsic' ? 'Intrinsic' :
                      dopingType === 'n-type' ? 'n-type (donor doped)' :
                      'p-type (acceptor doped)';
    ctx.fillText(typeLabel, xRight, pad.t + 10);

    /* --- Temperature annotation --- */
    ctx.font = C.TICK_FONT;
    ctx.fillStyle = C.MUTED;
    ctx.textAlign = 'right';
    ctx.fillText('T = ' + T + ' K,  kT = ' + (kT * 1000).toFixed(1) + ' meV', xRight, pad.t + 24);
  }

  /* ---- Event wiring ---- */
  egSlider.addEventListener('input', render);
  tSlider.addEventListener('input', render);

  render();
  window.addEventListener('resize', render);
}
