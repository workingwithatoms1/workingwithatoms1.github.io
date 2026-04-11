/* ==========================================================================
   Site search — inline nav box with dropdown results
   Press / to focus, Esc to blur, type to search articles.
   ========================================================================== */

let searchIndex = null;
let input = null;
let results = null;
let box = null;

function init() {
  if (input) return; // already initialised

  const wrapper = document.querySelector('.nav-search-wrapper');
  if (!wrapper) return;

  box = wrapper.querySelector('.nav-search-box');
  input = wrapper.querySelector('.nav-search-input');
  results = wrapper.querySelector('.search-results');

  if (!input || !results) return;

  // Focus states
  input.addEventListener('focus', () => {
    box.classList.add('focused');
    loadIndex();
  });

  input.addEventListener('blur', () => {
    // Delay to allow click on results
    setTimeout(() => {
      box.classList.remove('focused');
      results.classList.remove('open');
    }, 200);
  });

  // Search on input
  input.addEventListener('input', () => {
    search(input.value.trim());
  });

  // Keyboard navigation
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      input.blur();
      input.value = '';
      results.classList.remove('open');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const items = results.querySelectorAll('.search-result');
      const active = results.querySelector('.search-result.active');
      if (active) {
        active.classList.remove('active');
        const next = active.nextElementSibling;
        if (next) next.classList.add('active');
        else items[0]?.classList.add('active');
      } else {
        items[0]?.classList.add('active');
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const items = results.querySelectorAll('.search-result');
      const active = results.querySelector('.search-result.active');
      if (active) {
        active.classList.remove('active');
        const prev = active.previousElementSibling;
        if (prev) prev.classList.add('active');
        else items[items.length - 1]?.classList.add('active');
      }
    } else if (e.key === 'Enter') {
      const active = results.querySelector('.search-result.active');
      if (active) {
        window.location.href = active.getAttribute('href');
      }
    }
  });

  // Click on box focuses input
  box.addEventListener('click', () => input.focus());
}

async function loadIndex() {
  if (searchIndex) return;
  try {
    const depth = window.location.pathname.split('/').filter(Boolean).length;
    const root = depth === 0 ? './' : '../'.repeat(depth);
    const res = await fetch(root + 'content/search-index.json');
    searchIndex = await res.json();
  } catch (e) {
    // silently fail
  }
}

function search(query) {
  if (!query || !searchIndex) {
    results.classList.remove('open');
    return;
  }

  const terms = query.toLowerCase().split(/\s+/);
  const scored = [];

  for (const entry of searchIndex) {
    let score = 0;
    const titleLower = entry.title.toLowerCase();

    for (const term of terms) {
      if (titleLower.includes(term)) score += 10;
      if (titleLower.startsWith(term)) score += 5;
      if (entry.text.includes(term)) score += 3;
    }

    if (score > 0) scored.push({ entry, score });
  }

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, 8);

  if (top.length === 0) {
    results.innerHTML = '<div class="search-empty">No results</div>';
    results.classList.add('open');
    return;
  }

  results.innerHTML = top.map((s, i) => {
    const e = s.entry;
    const href = `/${e.module}/${e.id}/`;
    return `
      <a class="search-result${i === 0 ? ' active' : ''}" href="${href}">
        <span class="search-result-number">${e.number}</span>
        <div class="search-result-body">
          <span class="search-result-title">${e.title}</span>
          <span class="search-result-module">${e.moduleTitle}</span>
        </div>
      </a>
    `;
  }).join('');

  results.classList.add('open');
}

export function openSearch() {
  init();
  if (input) input.focus();
}

// Auto-init when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
