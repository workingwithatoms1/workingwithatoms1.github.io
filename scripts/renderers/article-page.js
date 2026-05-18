/* ==========================================================================
   Article page renderer — builds an article page from JSON
   Supports client-side navigation between articles in the same module
   (no page reload, card stays visible, content swaps instantly).
   ========================================================================== */

import { createPageShell, fetchModule, loadKaTeX } from './page-shell.js';
import { renderSidenotes } from '../sidenotes.js';

// Persistent references — survive across article swaps
let innerEl;
let moduleData;
let katexLoaded = false;

/**
 * Replace $...$ with <span class="inline-eq">...</span> in a text string.
 * Avoids the expensive DOM walk that renderMathInElement does.
 */
function markInlineMath(text) {
  return text.replace(/\$([^$]+?)\$/g, '<span class="inline-eq">$1</span>');
}

/**
 * Convert a body block array into HTML string.
 */
function renderBody(blocks) {
  return blocks.map(block => {
    const type = block[0];
    switch (type) {
      case 'h3':
        return `<h3>${markInlineMath(block[1])}</h3>`;
      case 'p':
        return `<p>${markInlineMath(block[1])}</p>`;
      case 'eq':
        return `<div class="article-eq">${block[1]}</div>`;
      case 'callout':
        return `
          <div class="article-callout">
            <div class="callout-label">${block[1]}</div>
            ${block[2].split('\n\n').map(p => `<p>${markInlineMath(p.trim())}</p>`).join('\n            ')}
          </div>`;
      case 'ul':
        return `<ul class="article-list">${block[1].map(li => `<li>${markInlineMath(li)}</li>`).join('')}</ul>`;
      case 'ol':
        return `<ol class="article-list">${block[1].map(li => `<li>${markInlineMath(li)}</li>`).join('')}</ol>`;
      case 'figure':
        return `
          <figure class="article-figure">
            <img src="${block[1]}" alt="${block[2] || ''}" loading="lazy">
            ${block[2] ? `<figcaption>${block[2]}</figcaption>` : ''}
          </figure>`;
      case 'problem':
        return `
          <div class="article-problem">
            <div class="problem-question">
              <div class="callout-label">Problem</div>
              <p>${markInlineMath(block[1])}</p>
            </div>
            <button class="derivation-toggle">Show solution</button>
            <div class="derivation-body">
              <div class="callout-label">Solution</div>
              ${renderBody(block[2])}
            </div>
          </div>`;
      case 'derivation':
        return `
          <div class="article-derivation">
            <div class="derivation-result"><p>${markInlineMath(block[1])}</p></div>
            <button class="derivation-toggle">Show derivation</button>
            <div class="derivation-body">${renderBody(block[2])}</div>
          </div>`;
      case 'widget':
        return `<div class="article-widget" data-widget="${block[1]}" data-config='${JSON.stringify(block[2] || {})}'></div>`;
      default:
        return `<p>${markInlineMath(block[1] || '')}</p>`;
    }
  }).join('\n');
}

/**
 * Process math in the rendered content:
 * - Display equations: render .article-eq elements
 * - Inline math: process $...$ in all text nodes
 */
/**
 * Render all pre-marked math elements in a container (or the whole page).
 * Display equations: .article-eq elements rendered in display mode.
 * Inline equations: .inline-eq spans rendered in inline mode.
 * Skips elements inside hidden .derivation-body (rendered on first open).
 */
function renderMathIn(root, skipHidden = true) {
  root.querySelectorAll('.article-eq').forEach(el => {
    if (skipHidden && el.closest('.derivation-body')) return;
    window.katex.render(el.textContent, el, { displayMode: true, throwOnError: false });
  });
  root.querySelectorAll('.inline-eq').forEach(el => {
    if (skipHidden && el.closest('.derivation-body')) return;
    let tex = el.textContent;
    // Bare subscript/superscript (e.g. "$_2$" in "CaF$_2$") needs an empty base
    if (tex.charAt(0) === '_' || tex.charAt(0) === '^') tex = '{}' + tex;
    window.katex.render(tex, el, { displayMode: false, throwOnError: false });
  });
}

async function processMath() {
  try {
    if (!katexLoaded) {
      await loadKaTeX();
      katexLoaded = true;
    }
    renderMathIn(document, true);
  } catch (e) {
    console.error('processMath failed:', e);
  }
}

/**
 * Wire up expandable derivation cards via event delegation.
 * Uses a single document-level listener so it survives content swaps.
 */
let derivationListenerBound = false;

function initDerivationToggles() {
  if (derivationListenerBound) return;
  derivationListenerBound = true;

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.derivation-toggle');
    if (!btn) return;

    const card = btn.closest('.article-derivation, .article-problem');
    const open = card.classList.toggle('derivation-open');
    btn.textContent = open ? 'Hide derivation' : 'Show derivation';

    // Render math inside on first open
    if (open) {
      const body = card.querySelector('.derivation-body');
      if (body && !body.dataset.mathRendered) {
        body.dataset.mathRendered = '1';
        renderMathIn(body, false);
      }
    }
  });
}

/**
 * Initialise any interactive widgets in the rendered content.
 */
async function initWidgets() {
  const containers = document.querySelectorAll('.article-widget');
  if (containers.length === 0) return;

  // Dynamically import the widget registry
  const { initWidget } = await import('../widgets/index.js');
  for (const el of containers) {
    const id = el.dataset.widget;
    const config = JSON.parse(el.dataset.config || '{}');
    initWidget(id, el, config);
  }
}

/**
 * Build the article card + prev/next nav HTML for a given article.
 */
function buildArticleContent(articleId) {
  const mod  = moduleData.module;
  const arts = moduleData.articles;
  const idx  = arts.findIndex(a => a.id === articleId);
  const art  = arts[idx];

  if (!art) return;

  document.title = `${art.title} — Working with atoms.`;

  const hasContent = art.body && art.body.length > 0;

  // Breadcrumb
  let html = `<a href="../" class="article-breadcrumb">${mod.title} &mdash; ${art.number}</a>`;

  // Article card
  html += `<div class="article-card" data-annotatable="true">`;
  html += `
    <div class="article-header">
      <span class="article-topic">${mod.topic}</span>
      <span class="article-reading">${art.readingTime} read</span>
    </div>
    <h2 class="article-title">${markInlineMath(art.title)}</h2>
  `;

  if (hasContent) {
    // Separate problems from main body
    const mainBlocks = art.body.filter(b => b[0] !== 'problem');
    const problemBlocks = art.body.filter(b => b[0] === 'problem');

    html += `
      <p class="article-intro">${art.intro}</p>
      <div class="article-body">
        ${renderBody(mainBlocks)}
    `;

    // Related topics
    if (art.related && art.related.length > 0) {
      html += `
        <div class="article-refs">
          <div class="refs-label">Related Topics</div>
          ${art.related.map(r => {
            const href = r.url.startsWith('../') ? r.url : `../${r.url}/`;
            return `<a href="${href}" class="ref-link">${r.title}</a>`;
          }).join('\n        ')}
        </div>
      `;
    }

    html += '</div>'; // close .article-body

    // Problems at the very end of the card
    if (problemBlocks.length > 0) {
      html += `<div class="article-problems">${renderBody(problemBlocks)}</div>`;
    }
  } else {
    html += `
      <div class="article-body"
        <div class="article-callout">
          <div class="callout-label">Under Development</div>
          <p>This article is currently being written. Check back soon.</p>
        </div>
      </div>
    `;
  }

  html += '</div>'; // close .article-card

  // Prev / Next navigation
  const prev = idx > 0 ? arts[idx - 1] : null;
  const next = idx < arts.length - 1 ? arts[idx + 1] : null;

  if (prev || next) {
    html += '<div class="article-nav">';
    if (prev) {
      html += `
        <a href="../${prev.id}/" class="article-nav-prev">
          <span class="article-nav-label">Previous</span>
          <span class="article-nav-title">${markInlineMath(prev.title)}</span>
        </a>
      `;
    }
    if (next) {
      html += `
        <a href="../${next.id}/" class="article-nav-next">
          <span class="article-nav-label">Next</span>
          <span class="article-nav-title">${markInlineMath(next.title)}</span>
        </a>
      `;
    }
    html += '</div>';
  }

  innerEl.innerHTML = html;

  // Post-render: equations, widgets, derivation toggles
  processMath();
  initWidgets();
  initDerivationToggles();

  // Load and render community sidenotes
  const articleBody = innerEl.querySelector('.article-body');
  if (articleBody) {
    const slug = moduleData.module.id + '/' + articleId;
    const art = moduleData.articles.find(a => a.id === articleId);
    const bakedComments = art && art.comments ? art.comments : [];
    renderSidenotes(slug, articleBody, bakedComments);
  }
}

/**
 * Set up client-side navigation for same-module article links.
 * Intercepts prev/next and related-topic clicks, swaps content without reload.
 */
function setupNavigation(moduleId) {
  document.addEventListener('click', (e) => {
    const link = e.target.closest('.article-nav a, .ref-link');
    if (!link) return;

    const href = link.getAttribute('href');
    if (!href) return;

    // Only intercept same-module article links (../slug/ pattern)
    const match = href.match(/^\.\.\/([a-z0-9-]+)\/?$/);
    if (!match) return;

    const targetId = match[1];
    if (!moduleData.articles.find(a => a.id === targetId)) return;

    e.preventDefault();
    history.pushState({ moduleId, articleId: targetId }, '', href);
    buildArticleContent(targetId);
    window.scrollTo({ top: 0 });
  });

  window.addEventListener('popstate', (e) => {
    if (e.state && e.state.articleId) {
      buildArticleContent(e.state.articleId);
      window.scrollTo({ top: 0 });
    }
  });
}

/**
 * Render an article page.
 * Builds the page shell once, then swaps article content on navigation.
 *
 * @param {string} moduleId  — e.g. 'crystallography'
 * @param {string} articleId — e.g. 'crystal-systems'
 * @param {string} rootPath  — relative path to site root
 */
export async function renderArticlePage(moduleId, articleId, rootPath = '../') {
  moduleData = await fetchModule(moduleId, rootPath);

  const main = createPageShell(rootPath);

  // Build the page structure once
  const section = document.createElement('section');
  section.className = 'article-section';

  innerEl = document.createElement('div');
  innerEl.className = 'article-inner';
  section.appendChild(innerEl);
  main.appendChild(section);

  // Render the first article
  buildArticleContent(articleId);

  // Show footer now that content is in place
  const footer = document.querySelector('footer');
  if (footer) footer.style.display = '';

  // Set initial history state so popstate works on back
  history.replaceState({ moduleId, articleId }, '');

  // Enable client-side navigation
  setupNavigation(moduleId);

  // Initialise highlight-to-comment annotations
  import('../annotations.js').then(m => m.initAnnotations());
}
