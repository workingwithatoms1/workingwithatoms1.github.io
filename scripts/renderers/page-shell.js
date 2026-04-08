/* ==========================================================================
   Page shell — builds the common chrome shared by all content pages
   (site background canvas, nav, footer, and initialises their renderers)
   ========================================================================== */

import { initSiteBackground } from '../site-bg.js';
import { initNav } from '../nav.js';

const KATEX_CSS = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css';
const KATEX_JS  = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js';
const KATEX_AUTO = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/contrib/auto-render.min.js';

/** Load KaTeX CSS + JS once, return a promise that resolves when ready. */
let katexReady;
export function loadKaTeX() {
  if (katexReady) return katexReady;
  katexReady = new Promise((resolve) => {
    // CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = KATEX_CSS;
    document.head.appendChild(link);

    // JS
    const script = document.createElement('script');
    script.src = KATEX_JS;
    script.onload = () => {
      const auto = document.createElement('script');
      auto.src = KATEX_AUTO;
      auto.onload = () => resolve();
      document.head.appendChild(auto);
    };
    document.head.appendChild(script);
  });
  return katexReady;
}

/**
 * Build the page shell and return a reference to the main content container.
 *
 * @param {string} rootPath — relative path back to site root (e.g. '../')
 * @returns {HTMLElement} — the <main> element to inject page content into
 */
export function createPageShell(rootPath = '../') {
  const body = document.body;

  // Site background canvas
  const bg = document.createElement('canvas');
  bg.id = 'siteBgCanvas';
  body.appendChild(bg);

  // Navigation
  const nav = document.createElement('nav');
  nav.innerHTML = `
    <canvas class="nav-bg" id="navCanvas"></canvas>
    <a href="${rootPath}index.html" class="logo">Working with atoms.</a>
    <button class="nav-toggle" aria-label="Menu"><span></span><span></span><span></span></button>
    <ul class="nav-links">
      <li><a href="${rootPath}index.html#curriculum">Learn</a></li>
      <li><a href="#">Phase Diagrams</a></li>
    </ul>
  `;
  body.appendChild(nav);

  // Main content area
  const main = document.createElement('main');
  body.appendChild(main);

  // Footer
  const footer = document.createElement('footer');
  footer.innerHTML = `
    <div class="footer-logo">Working with atoms.</div>
    <div>Materials science, explored.</div>
  `;
  body.appendChild(footer);

  // Initialise background renderers
  initSiteBackground('siteBgCanvas');
  initNav();

  return main;
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
