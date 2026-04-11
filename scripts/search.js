/* ==========================================================================
   Site search — overlay with keyboard shortcut
   Press / to open, Esc to close, type to search articles.
   ========================================================================== */

let searchIndex = null;
let overlay = null;
let input = null;
let results = null;

function createOverlay() {
  overlay = document.createElement('div');
  overlay.className = 'search-overlay';
  overlay.innerHTML = `
    <div class="search-box">
      <input class="search-input" type="text" placeholder="Search articles..." autocomplete="off">
      <div class="search-results"></div>
      <div class="search-hint">Press <kbd>Esc</kbd> to close</div>
    </div>
  `;
  document.body.appendChild(overlay);

  input = overlay.querySelector('.search-input');
  results = overlay.querySelector('.search-results');

  // Close on backdrop click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  // Search on input
  input.addEventListener('input', () => {
    search(input.value.trim());
  });

  // Keyboard navigation
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      close();
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
        window.location.href = active.dataset.href;
        close();
      }
    }
  });
}

function open() {
  if (!overlay) createOverlay();
  overlay.classList.add('open');
  input.value = '';
  results.innerHTML = '';
  input.focus();
  loadIndex();
}

function close() {
  if (overlay) overlay.classList.remove('open');
}

async function loadIndex() {
  if (searchIndex) return;
  try {
    // Determine root path
    const depth = window.location.pathname.split('/').filter(Boolean).length;
    const root = depth === 0 ? './' : '../'.repeat(depth);
    const res = await fetch(root + 'content/search-index.json');
    searchIndex = await res.json();
  } catch (e) {
    results.innerHTML = '<div class="search-empty">Could not load search index.</div>';
  }
}

function search(query) {
  if (!query || !searchIndex) {
    results.innerHTML = '';
    return;
  }

  const terms = query.toLowerCase().split(/\s+/);
  const scored = [];

  for (const entry of searchIndex) {
    let score = 0;
    const titleLower = entry.title.toLowerCase();
    const textLower = entry.text;

    for (const term of terms) {
      // Title match (highest weight)
      if (titleLower.includes(term)) score += 10;
      // Exact title start
      if (titleLower.startsWith(term)) score += 5;
      // Heading/description match
      if (textLower.includes(term)) score += 3;
    }

    if (score > 0) {
      scored.push({ entry, score });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, 8);

  if (top.length === 0) {
    results.innerHTML = '<div class="search-empty">No results</div>';
    return;
  }

  results.innerHTML = top.map((s, i) => {
    const e = s.entry;
    const href = `/${e.module}/${e.id}/`;
    return `
      <a class="search-result${i === 0 ? ' active' : ''}" data-href="${href}" href="${href}">
        <span class="search-result-number">${e.number}</span>
        <div class="search-result-body">
          <span class="search-result-title">${e.title}</span>
          <span class="search-result-module">${e.moduleTitle}</span>
        </div>
      </a>
    `;
  }).join('');
}

// Global keyboard shortcut
document.addEventListener('keydown', (e) => {
  // Don't trigger if user is typing in an input/textarea
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  if (e.key === '/') {
    e.preventDefault();
    open();
  }
  if (e.key === 'Escape') {
    close();
  }
});

// Export for nav button
export { open as openSearch };
