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

  // Try exact match first
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    const idx = node.textContent.indexOf(selectedText.substring(0, 40));
    if (idx !== -1) {
      const range = document.createRange();
      range.setStart(node, idx);
      range.setEnd(node, Math.min(idx + selectedText.length, node.textContent.length));
      const rect = range.getBoundingClientRect();
      return {
        top: rect.top + window.scrollY,
        element: node.parentElement,
      };
    }
  }

  // Fuzzy: try first 20 chars
  const snippet = selectedText.substring(0, 20);
  const walker2 = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  while ((node = walker2.nextNode())) {
    if (node.textContent.includes(snippet)) {
      const rect = node.parentElement.getBoundingClientRect();
      return {
        top: rect.top + window.scrollY,
        element: node.parentElement,
      };
    }
  }

  return null;
}

/**
 * Create a sidenote element.
 */
function createSidenoteEl(comment) {
  const note = document.createElement('div');
  note.className = 'sidenote';
  note.dataset.commentId = comment.id;

  const quote = comment.selectedText
    ? `<div class="sidenote-quote">\u201C${truncate(comment.selectedText, 60)}\u201D</div>`
    : '';

  note.innerHTML = `
    ${quote}
    <div class="sidenote-body">${escapeHtml(comment.comment)}</div>
    <div class="sidenote-meta">
      <span class="sidenote-author">${escapeHtml(comment.name)}</span>
      <div class="sidenote-votes">
        <button class="sidenote-vote-btn" data-dir="up" data-id="${comment.id}">\u25B2</button>
        <span class="sidenote-vote-count">${comment.votes}</span>
        <button class="sidenote-vote-btn" data-dir="down" data-id="${comment.id}">\u25BC</button>
      </div>
    </div>
  `;

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
function handleVote(commentId, direction) {
  // Check localStorage to prevent double voting
  const voteKey = `vote_${commentId}`;
  const existing = localStorage.getItem(voteKey);
  if (existing === direction) return; // already voted this way

  const form = new FormData();
  form.append('action', 'vote');
  form.append('commentId', commentId);
  form.append('direction', direction);

  fetch(APPS_SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: form });

  // Update UI optimistically
  const note = document.querySelector(`.sidenote[data-comment-id="${commentId}"]`);
  if (note) {
    const countEl = note.querySelector('.sidenote-vote-count');
    let count = parseInt(countEl.textContent) || 0;
    // Undo previous vote if switching
    if (existing === 'up') count--;
    if (existing === 'down') count++;
    // Apply new vote
    if (direction === 'up') count++;
    if (direction === 'down') count--;
    countEl.textContent = count;

    // Highlight voted button
    note.querySelectorAll('.sidenote-vote-btn').forEach(b => b.classList.remove('voted'));
    note.querySelector(`.sidenote-vote-btn[data-dir="${direction}"]`).classList.add('voted');
  }

  localStorage.setItem(voteKey, direction);
}

/**
 * Render sidenotes for an article.
 *
 * @param {string} articleSlug — e.g. 'thermodynamics/carnot-cycle'
 * @param {HTMLElement} articleBody — the .article-body element
 */
export async function renderSidenotes(articleSlug, articleBody) {
  if (!APPS_SCRIPT_URL || !articleBody) return;

  // Create the sidenotes container in the margin
  let container = document.querySelector('.sidenotes-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'sidenotes-container';
    // Position relative to the article card
    const card = articleBody.closest('.article-card');
    if (card) {
      card.style.position = 'relative';
      card.appendChild(container);
    } else {
      articleBody.parentElement.appendChild(container);
    }
  }
  container.innerHTML = '';

  // Fetch approved comments
  let comments;
  try {
    const res = await fetch(`${APPS_SCRIPT_URL}?slug=${encodeURIComponent(articleSlug)}`);
    const data = await res.json();
    if (data.status !== 'ok' || !data.comments) return;
    comments = data.comments;
  } catch (e) {
    // Silently fail — sidenotes are non-essential
    return;
  }

  if (comments.length === 0) return;

  // Position each sidenote at the anchor text location
  const positions = [];
  for (const comment of comments) {
    const anchor = findTextAnchor(articleBody, comment.selectedText);
    const noteEl = createSidenoteEl(comment);

    if (anchor) {
      noteEl.style.top = anchor.top + 'px';
      // Highlight the anchored text
      if (anchor.element) {
        anchor.element.classList.add('sidenote-anchor');
      }
    }

    positions.push({ el: noteEl, top: anchor ? anchor.top : null, comment });
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
    handleVote(btn.dataset.id, btn.dataset.dir);
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
