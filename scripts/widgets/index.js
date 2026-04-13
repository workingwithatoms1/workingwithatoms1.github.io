/* ==========================================================================
   Widget registry — maps widget IDs to their initialisation modules.
   Each widget is lazy-loaded only when the article uses it.
   ========================================================================== */

const registry = {
  'hess-diagram':        () => import('./hess-diagram.js'),
  'kirchhoff-diagram':   () => import('./kirchhoff-diagram.js'),
  'carnot-cycle':        () => import('./carnot-cycle.js'),
  'pv-work':             () => import('./pv-work.js'),
  'entropy-microstates': () => import('./entropy-microstates.js'),
  'g-vs-t':              () => import('./g-vs-t.js'),
  'tangent-construction': () => import('./tangent-construction.js'),
  'activity-plot':       () => import('./activity-plot.js'),
  'mixing-curves':       () => import('./mixing-curves.js'),
  'regular-solution':    () => import('./regular-solution.js'),
  'common-tangent':      () => import('./common-tangent.js'),
  'ellingham-chart':     () => import('./ellingham-chart.js'),
  'pourbaix-diagram':    () => import('./pourbaix-diagram.js'),
  'lever-rule':          () => import('./lever-rule.js'),
  'edge-dislocation':    () => import('./edge-dislocation.js'),
  'lennard-jones':       () => import('./lennard-jones.js'),
  'electronegativity-scale': () => import('./electronegativity-scale.js'),
  'diffusion-profile':     () => import('./diffusion-profile.js'),
  'avrami-curve':          () => import('./avrami-curve.js'),
  'arrhenius-plot':          () => import('./arrhenius-plot.js'),
  'density-of-states':       () => import('./density-of-states.js'),
  'nucleation-barrier':      () => import('./nucleation-barrier.js'),
  'band-diagram':            () => import('./band-diagram.js'),
  'hysteresis-loop':         () => import('./hysteresis-loop.js'),
  'butler-volmer':           () => import('./butler-volmer.js'),
  'stress-strain':           () => import('./stress-strain.js'),
  'mohr-circle':             () => import('./mohr-circle.js'),
  'hall-petch':              () => import('./hall-petch.js'),
  'creep-curve':             () => import('./creep-curve.js'),
  'sn-curve':                () => import('./sn-curve.js'),
  'nernst-equation':         () => import('./nernst-equation.js'),
  'rule-of-mixtures':        () => import('./rule-of-mixtures.js'),
  'polymer-chain':           () => import('./polymer-chain.js'),
  'paris-law':               () => import('./paris-law.js'),
  'schmid-factor':           () => import('./schmid-factor.js'),
  'kirkendall-effect':       () => import('./kirkendall-effect.js'),
  'unit-cell':               () => import('./unit-cell.js'),
  'miller-index':            () => import('./miller-index.js'),
  'yield-surface':           () => import('./yield-surface.js'),
  'resistivity-temperature': () => import('./resistivity-temperature.js'),
  'clausius-clapeyron':      () => import('./clausius-clapeyron.js'),
  'orowan-bowing':           () => import('./orowan-bowing.js'),
  'bragg-diffraction':       () => import('./bragg-diffraction.js'),
  'griffith-energy':         () => import('./griffith-energy.js'),
  'maxwell-boltzmann':       () => import('./maxwell-boltzmann.js'),
};

/**
 * Initialise a widget by ID into a container element.
 */
export async function initWidget(id, container, config) {
  const loader = registry[id];
  if (!loader) {
    container.innerHTML = `
      <div style="padding:24px;font-family:'DM Sans',sans-serif;font-size:13px;color:#888;text-align:center;">
        Widget "${id}" is under development.
      </div>
    `;
    return;
  }

  const module = await loader();
  module.create(container, config);
}
