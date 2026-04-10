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
