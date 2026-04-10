/* ==========================================================================
   Sidenotes — Tufte-style margin notes anchored to highlighted text
   Fetches approved comments from the Apps Script backend and renders
   them as sidenotes in the right margin on desktop, or inline on mobile.
   ========================================================================== */

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwBxJoFlK2UhUmprySuuPFkVzySZB5UJO_fdFX4KG8sti0I7TPT-IC-rx9THrFQa-8C/exec';

/**
 * Find the DOM position of a text snippet within a container.
 * Returns the element and vertical offset, or null if not found.
 */
function findTextAnchor(container, selectedText) {
  if (!selectedText || selectedText.length < 5) return null;

  // Check if the selected text looks like a LaTeX equation
  // (contains backslashes, braces, or common LaTeX commands)
  const looksLikeEquation = /[\\{}]|frac|int|sum|partial|Delta|alpha|beta|gamma/.test(selectedText);

  if (looksLikeEquation) {
    // Find the nearest equation element whose rendered text matches
    const equations = container.querySelectorAll('.article-eq, .inline-eq');
    for (const eq of equations) {
      const rendered = eq.textContent.trim();
      // Check if the equation's rendered output overlaps with the selected text
      // (KaTeX renders to visible text that may partially match)
      const snippet = selectedText.replace(/[\\{}$]/g, '').substring(0, 20);
      if (snippet.length > 3 && rendered.includes(snippet)) {
        eq.classList.add('sidenote-anchor');
        const rect = eq.getBoundingClientRect();
        return { top: rect.top + window.scrollY, span: eq };
      }
    }
  }

  // Normal text search
  const searchText = selectedText.substring(0, 60);
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let node;

  while ((node = walker.nextNode())) {
    const idx = node.textContent.indexOf(searchText.substring(0, 40));
    if (idx === -1) continue;

    try {
      const range = document.createRange();
      range.setStart(node, idx);
      range.setEnd(node, Math.min(idx + selectedText.length, node.textContent.length));

      const span = document.createElement('span');
      span.className = 'sidenote-anchor';
      range.surroundContents(span);

      const rect = span.getBoundingClientRect();
      return { top: rect.top + window.scrollY, span: span };
    } catch (e) {
      const rect = node.parentElement.getBoundingClientRect();
      return { top: rect.top + window.scrollY, span: null };
    }
  }

  return null;
}

/**
 * Create a sidenote element with collapsed/expanded states.
 */
function createSidenoteEl(comment) {
  const note = document.createElement('div');
  note.className = 'sidenote';
  note.dataset.commentId = comment.id;

  const previewText = truncate(comment.comment, 30);
  const quote = comment.selectedText
    ? `<div class="sidenote-quote">\u201C${truncate(comment.selectedText, 60)}\u201D</div>`
    : '';

  note.innerHTML = `
    <div class="sidenote-marker">
      <span class="sidenote-dot"></span>
      <span class="sidenote-preview">${escapeHtml(previewText)}</span>
    </div>
    <div class="sidenote-expanded">
      ${quote}
      <div class="sidenote-body">${escapeHtml(comment.comment)}</div>
      <div class="sidenote-meta">
        <span class="sidenote-author">${escapeHtml(comment.name)}</span>
        <div class="sidenote-votes">
          <button class="sidenote-vote-btn" data-dir="up" data-id="${comment.id}">\u25B2</button>
          <span class="sidenote-vote-count">${comment.votes}</span>
        </div>
      </div>
    </div>
  `;

  // Click to toggle expanded
  note.addEventListener('click', (e) => {
    if (e.target.closest('.sidenote-vote-btn')) return;
    note.classList.toggle('open');
  });

  return note;
}

function truncate(str, maxLen) {
  if (!str) return '';
  if (str.length <= maxLen) return str;
  return str.substring(0, maxLen).trim() + '\u2026';
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Handle vote clicks.
 */
function handleVote(commentId) {
  const voteKey = `vote_${commentId}`;
  const already = localStorage.getItem(voteKey);

  // Toggle: if already upvoted, undo; otherwise upvote
  const direction = already ? 'down' : 'up';

  const form = new FormData();
  form.append('action', 'vote');
  form.append('commentId', commentId);
  form.append('direction', direction);
  fetch(APPS_SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: form });

  const note = document.querySelector(`.sidenote[data-comment-id="${commentId}"]`);
  if (note) {
    const countEl = note.querySelector('.sidenote-vote-count');
    let count = parseInt(countEl.textContent) || 0;
    count += already ? -1 : 1;
    countEl.textContent = count;

    const btn = note.querySelector('.sidenote-vote-btn');
    btn.classList.toggle('voted');
  }

  if (already) {
    localStorage.removeItem(voteKey);
  } else {
    localStorage.setItem(voteKey, 'up');
  }
}

/**
 * Render sidenotes for an article.
 *
 * @param {string} articleSlug — e.g. 'thermodynamics/carnot-cycle'
 * @param {HTMLElement} articleBody — the .article-body element
 * @param {Array} bakedComments — pre-baked comments from the article JSON (optional)
 */
export async function renderSidenotes(articleSlug, articleBody, bakedComments) {
  if (!articleBody) return;

  // Create the sidenotes container — positioned to the right of the article card
  let container = document.querySelector('.sidenotes-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'sidenotes-container';
    document.body.appendChild(container);
  }

  // Position container at the right edge of the article card
  function positionContainer() {
    const card = articleBody.closest('.article-card');
    if (!card) return;
    const rect = card.getBoundingClientRect();
    container.style.left = (rect.right + window.scrollX + 16) + 'px';
    container.style.top = (rect.top + window.scrollY) + 'px';
  }
  positionContainer();
  window.addEventListener('resize', positionContainer);

  // Phase 1: render baked-in comments instantly
  let knownIds = new Set();
  if (bakedComments && bakedComments.length > 0) {
    renderComments(bakedComments, articleBody, container, knownIds);
  }

  // Phase 2: fetch fresh comments from API in background, merge any new ones
  if (APPS_SCRIPT_URL) {
    try {
      const res = await fetch(`${APPS_SCRIPT_URL}?slug=${encodeURIComponent(articleSlug)}`);
      const data = await res.json();
      if (data.status === 'ok' && data.comments) {
        const fresh = data.comments.filter(c => !knownIds.has(c.id));
        if (fresh.length > 0) {
          renderComments(fresh, articleBody, container, knownIds);
        }
      }
    } catch (e) {
      // Silently fail
    }
  }
}

function renderComments(comments, articleBody, container, knownIds) {
  if (!comments || comments.length === 0) return;

  // Position each sidenote at the anchor text location
  for (const comment of comments) {
    if (knownIds.has(comment.id)) continue;
    knownIds.add(comment.id);
    const anchor = findTextAnchor(articleBody, comment.selectedText);
    const noteEl = createSidenoteEl(comment);

    if (anchor) {
      noteEl.style.top = anchor.top + 'px';
      // Link the anchor span to the sidenote
      if (anchor.span) {
        anchor.span.dataset.noteId = comment.id;
        // Clicking anchor text opens the sidenote
        anchor.span.addEventListener('click', () => {
          container.querySelectorAll('.sidenote.open').forEach(n => n.classList.remove('open'));
          noteEl.classList.add('open');
          noteEl.classList.add('active');
        });
        // Hovering anchor text highlights the sidenote
        anchor.span.addEventListener('mouseenter', () => {
          noteEl.classList.add('hover');
          anchor.span.classList.add('sidenote-anchor-hover');
        });
        anchor.span.addEventListener('mouseleave', () => {
          noteEl.classList.remove('hover');
          anchor.span.classList.remove('sidenote-anchor-hover');
        });
        // Hovering the sidenote highlights the anchor text
        noteEl.addEventListener('mouseenter', () => {
          anchor.span.classList.add('sidenote-anchor-hover');
        });
        noteEl.addEventListener('mouseleave', () => {
          if (!noteEl.classList.contains('open')) {
            anchor.span.classList.remove('sidenote-anchor-hover');
          }
        });
      }
    }

    container.appendChild(noteEl);
  }

  // Resolve overlaps — push notes down if they overlap
  const rendered = container.querySelectorAll('.sidenote');
  let lastBottom = 0;
  for (const note of rendered) {
    const top = parseInt(note.style.top) || 0;
    if (top < lastBottom + 8) {
      note.style.top = (lastBottom + 8) + 'px';
    }
    lastBottom = note.offsetTop + note.offsetHeight;
  }

  // Wire up vote buttons
  container.addEventListener('click', (e) => {
    const btn = e.target.closest('.sidenote-vote-btn');
    if (!btn) return;
    handleVote(btn.dataset.id);
  });

  // Restore previous votes from localStorage
  for (const comment of comments) {
    const voteKey = `vote_${comment.id}`;
    const existing = localStorage.getItem(voteKey);
    if (existing) {
      const note = container.querySelector(`.sidenote[data-comment-id="${comment.id}"]`);
      if (note) {
        const btn = note.querySelector(`.sidenote-vote-btn[data-dir="${existing}"]`);
        if (btn) btn.classList.add('voted');
      }
    }
  }
}
