/* ==========================================================================
   Page shell — builds the common chrome shared by all content pages
   (site background canvas, nav, footer, and initialises their renderers)
   ========================================================================== */

import { initSiteBackground } from '../site-bg.js';
import { initNav } from '../nav.js';

const KATEX_CSS = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css';
const KATEX_JS  = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js';

/** Load KaTeX CSS + JS once, return a promise that resolves when ready. */
let katexReady;
export function loadKaTeX() {
  if (katexReady) return katexReady;
  katexReady = new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = KATEX_CSS;
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = KATEX_JS;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('KaTeX failed to load'));
    document.head.appendChild(script);
  });
  return katexReady;
}

/**
 * Initialise the page shell and return a reference to the main content container.
 * Reuses elements already present in the HTML (nav, footer, canvases) rather
 * than creating them from scratch, so the chrome is visible before JS loads.
 *
 * @param {string} rootPath — relative path back to site root (e.g. '../')
 * @returns {HTMLElement} — the <main> element to inject page content into
 */
export function createPageShell(rootPath = '../') {
  // Initialise background renderers on existing elements
  initSiteBackground('siteBgCanvas');
  initNav();

  return document.querySelector('main');
}

/**
 * Fetch a module's JSON content file.
 *
 * @param {string} moduleId — e.g. 'crystallography'
 * @param {string} rootPath — relative path to site root
 * @returns {Promise<Object>}
 */
export async function fetchModule(moduleId, rootPath = '../') {
  const res = await fetch(`${rootPath}content/modules/${moduleId}.json`);
  if (!res.ok) throw new Error(`Module "${moduleId}" not found`);
  return res.json();
}
