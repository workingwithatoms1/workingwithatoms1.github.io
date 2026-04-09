/* ==========================================================================
   Section page renderer — builds a module landing page from JSON
   ========================================================================== */

import { createPageShell, fetchModule, loadKaTeX } from './page-shell.js';

function markInlineMath(text) {
  return text.replace(/\$([^$]+?)\$/g, '<span class="inline-eq">$1</span>');
}

/**
 * Render a module section (landing) page.
 *
 * @param {string} moduleId — e.g. 'crystallography'
 * @param {string} rootPath — relative path to site root
 */
export async function renderSectionPage(moduleId, rootPath = '../') {
  const data = await fetchModule(moduleId, rootPath);
  const mod  = data.module;
  const arts = data.articles;

  document.title = `${mod.title} — Working with atoms.`;

  const main = createPageShell(rootPath);

  // Build section
  const section = document.createElement('section');
  section.className = 'article-section';

  const inner = document.createElement('div');
  inner.className = 'article-inner';

  // Breadcrumb
  const crumb = document.createElement('a');
  crumb.className = 'article-breadcrumb';
  crumb.href = `${rootPath}index.html#curriculum`;
  crumb.innerHTML = `Part ${mod.part} &mdash; ${mod.partTitle}`;
  inner.appendChild(crumb);

  // Module header card
  const card = document.createElement('div');
  card.className = 'article-card section-card';
  card.innerHTML = `
    <div class="article-header">
      <span class="article-topic">Module ${mod.number}</span>
      <span class="article-reading">${arts.length} article${arts.length !== 1 ? 's' : ''}</span>
    </div>
    <h2 class="article-title">${mod.title}</h2>
    <p class="article-intro">${mod.intro}</p>
  `;
  inner.appendChild(card);

  // Sub-section list
  const list = document.createElement('div');
  list.className = 'section-list';

  for (const art of arts) {
    const hasContent = art.body && art.body.length > 0;
    const row = document.createElement('a');
    row.className = 'section-row' + (hasContent ? '' : ' section-row--draft');
    row.href = `${art.id}/`;
    row.innerHTML = `
      <span class="section-row-number">${art.number}</span>
      <div class="section-row-body">
        <span class="section-row-title">${markInlineMath(art.title)}</span>
        <span class="section-row-desc">${art.description}</span>
      </div>
      <span class="section-row-time">${hasContent ? art.readingTime : 'Coming soon'}</span>
    `;
    list.appendChild(row);
  }

  inner.appendChild(list);
  section.appendChild(inner);
  main.appendChild(section);

  // Render any inline math in titles
  const hasInlineEq = section.querySelector('.inline-eq');
  if (hasInlineEq) {
    loadKaTeX().then(() => {
      section.querySelectorAll('.inline-eq').forEach(el => {
        let tex = el.textContent;
        if (tex.charAt(0) === '_' || tex.charAt(0) === '^') tex = '{}' + tex;
        window.katex.render(tex, el, { displayMode: false, throwOnError: false });
      });
    });
  }
}
