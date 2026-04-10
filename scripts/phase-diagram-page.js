/* ==========================================================================
   Phase diagram page — periodic table selector + diagram renderer
   ========================================================================== */

import { initSiteBackground } from './site-bg.js';
import { initNav } from './nav.js';
import { createPeriodicTable } from './periodic-table.js';
import { createPhaseDiagram } from './phase-diagram-renderer.js';

const ROOT = '../';

async function init() {
  initSiteBackground('siteBgCanvas');
  initNav();

  const main = document.querySelector('main');

  // Load available systems index
  const indexRes = await fetch(ROOT + 'content/phase-diagrams/index.json');
  const index = await indexRes.json();

  // Build lookup set: "Al-Zn" style (alphabetical)
  const availablePairs = new Set();
  const fileMap = {};
  for (const sys of index.systems) {
    const key = sys.els.slice().sort().join('-');
    availablePairs.add(key);
    fileMap[key] = sys;
  }

  // Page structure
  const section = document.createElement('section');
  section.className = 'article-section';

  const inner = document.createElement('div');
  inner.className = 'article-inner';

  // Breadcrumb
  const crumb = document.createElement('a');
  crumb.className = 'article-breadcrumb';
  crumb.href = ROOT;
  crumb.textContent = 'Home';
  inner.appendChild(crumb);

  // Content card — everything sits on one white card
  const card = document.createElement('div');
  card.className = 'article-card pd-page-card';

  card.innerHTML = `
    <h2 class="article-title">Binary Phase Diagrams</h2>
    <p class="article-intro">Select two elements to view their equilibrium phase diagram. Computed from assessed CALPHAD thermodynamic databases using PyCalphad.</p>
  `;

  const ptContainer = document.createElement('div');
  ptContainer.className = 'pd-periodic-table';
  card.appendChild(ptContainer);

  const diagramContainer = document.createElement('div');
  diagramContainer.className = 'pd-diagram-container';
  diagramContainer.style.display = 'none';
  card.appendChild(diagramContainer);

  inner.appendChild(card);

  section.appendChild(inner);
  main.appendChild(section);

  // Show footer
  const footer = document.querySelector('footer');
  if (footer) footer.style.display = '';

  // Current renderer state
  let currentRenderer = null;
  let currentData = null;
  let currentFlipped = false;

  function renderDiagram() {
    if (!currentData) return;
    diagramContainer.innerHTML = '';
    diagramContainer.style.display = '';
    diagramContainer.style.position = 'relative';

    // Flip button in top right of diagram container
    const flipBtn = document.createElement('button');
    flipBtn.className = 'pd-flip-btn';
    flipBtn.title = 'Swap axes';
    flipBtn.textContent = '\u21CC';
    flipBtn.addEventListener('click', () => {
      currentFlipped = !currentFlipped;
      if (currentRenderer) currentRenderer.destroy();
      renderDiagram();
      // Update URL
      const [a, b] = currentData.system.split('-');
      const newEl1 = currentFlipped ? b : a;
      const newEl2 = currentFlipped ? a : b;
      history.replaceState(null, '', '#' + newEl1 + '-' + newEl2);
    });
    diagramContainer.appendChild(flipBtn);

    if (currentRenderer) currentRenderer.destroy();
    currentRenderer = createPhaseDiagram(diagramContainer, currentData, currentFlipped);
  }

  function onSelect(el1, el2, skipHistory) {
    const key = [el1, el2].sort().join('-');
    const sys = fileMap[key];
    if (!sys) return;

    // Determine flip after loading — compare el1 against the JSON system order
    let flipped = false;

    // Update URL hash with click order for sharing
    const hashKey = el1 + '-' + el2;
    if (!skipHistory) {
      history.pushState({ system: hashKey }, '', '#' + hashKey);
    }

    // Show loading state
    diagramContainer.style.display = '';
    diagramContainer.innerHTML = '<p class="pd-loading">Loading diagram...</p>';

    // Destroy previous
    if (currentRenderer) {
      currentRenderer.destroy();
      currentRenderer = null;
    }

    // Fetch and render
    fetch(ROOT + 'content/phase-diagrams/' + sys.file)
      .then(r => r.json())
      .then(data => {
        currentData = data;
        // JSON system "Fe-C" means Fe is at x=0. If user clicked el1=Fe, no flip needed.
        const jsonEl1 = data.system.split('-')[0];
        currentFlipped = el1 !== jsonEl1;
        renderDiagram();
        diagramContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      })
      .catch(() => {
        diagramContainer.innerHTML = '<p class="pd-loading">Failed to load diagram data.</p>';
      });
  }

  const pt = createPeriodicTable(ptContainer, availablePairs, onSelect);

  // Load system from URL hash (e.g. #Al-Zn, #Zn-Al, #Fe-C)
  function loadFromHash() {
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    const parts = hash.split('-');
    if (parts.length !== 2) return;
    const [a, b] = parts;
    const key = [a, b].sort().join('-');
    if (availablePairs.has(key)) {
      onSelect(a, b, true);
    }
  }

  loadFromHash();
  window.addEventListener('popstate', loadFromHash);
}

init();
