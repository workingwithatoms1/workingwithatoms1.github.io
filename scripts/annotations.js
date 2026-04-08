/* ==========================================================================
   Highlight-to-comment annotation system
   Self-contained module. Attach to any element with data-annotatable="true".
   Posts annotations to a Google Apps Script endpoint.
   ========================================================================== */

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwBxJoFlK2UhUmprySuuPFkVzySZB5UJO_fdFX4KG8sti0I7TPT-IC-rx9THrFQa-8C/exec'; // Set this to the deployed Google Apps Script web app URL


let buttonEl = null;
let popupEl = null;
let toastEl = null;
let currentSelection = null;
let currentRect = null;

function injectStyles() {
  if (document.getElementById('annotation-styles')) return;
  const style = document.createElement('style');
  style.id = 'annotation-styles';
  style.textContent = `
    .ann-button {
      position: absolute;
      z-index: 10000;
      width: 32px;
      height: 32px;
      border: none;
      border-radius: 0;
      background: var(--blue, #2a2f7c);
      color: #fff;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      line-height: 1;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      transition: opacity 0.15s;
      pointer-events: auto;
    }
    .ann-button:hover { opacity: 0.85; }
    .ann-button svg { width: 18px; height: 18px; fill: #fff; }

    .ann-popup {
      position: absolute;
      z-index: 10001;
      width: 360px;
      max-width: calc(100vw - 32px);
      background: #fff;
      box-shadow: 0 4px 20px rgba(0,0,0,0.12);
      font-family: 'DM Sans', sans-serif;
      font-size: 13px;
      color: #1a1d3a;
    }

    .ann-popup-inner { padding: 20px; }

    .ann-quote {
      font-family: 'Lora', serif;
      font-size: 13px;
      font-style: italic;
      color: #3a3d5a;
      line-height: 1.5;
      margin-bottom: 16px;
      padding-left: 12px;
      border-left: 2px solid var(--blue, #2a2f7c);
    }

    .ann-types {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      margin-bottom: 14px;
    }

    .ann-type-tag {
      padding: 4px 10px;
      font-size: 11px;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      border: 1px solid #c8c6d0;
      background: transparent;
      color: #3a3d5a;
      cursor: pointer;
      transition: all 0.15s;
      font-family: 'DM Sans', sans-serif;
    }
    .ann-type-tag:hover { border-color: var(--blue, #2a2f7c); color: var(--blue, #2a2f7c); }
    .ann-type-tag.active {
      background: var(--blue, #2a2f7c);
      color: #fff;
      border-color: var(--blue, #2a2f7c);
    }

    .ann-textarea {
      width: 100%;
      min-height: 72px;
      padding: 10px;
      font-family: 'Lora', serif;
      font-size: 13px;
      line-height: 1.5;
      color: #1a1d3a;
      background: #fff;
      border: 1px solid #c8c6d0;
      resize: vertical;
      margin-bottom: 10px;
    }
    .ann-textarea:focus { outline: none; border-color: var(--blue, #2a2f7c); }
    .ann-textarea::placeholder { color: #999; }

    .ann-row {
      display: flex;
      gap: 8px;
      margin-bottom: 8px;
    }

    .ann-input {
      flex: 1;
      padding: 7px 10px;
      font-family: 'DM Sans', sans-serif;
      font-size: 12px;
      color: #1a1d3a;
      background: #fff;
      border: 1px solid #c8c6d0;
    }
    .ann-input:focus { outline: none; border-color: var(--blue, #2a2f7c); }
    .ann-input::placeholder { color: #999; }

    .ann-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 14px;
    }

    .ann-btn {
      padding: 6px 16px;
      font-family: 'DM Sans', sans-serif;
      font-size: 12px;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      border: 1px solid #c8c6d0;
      background: transparent;
      color: #3a3d5a;
      cursor: pointer;
      transition: all 0.15s;
    }
    .ann-btn:hover { border-color: #3a3d5a; }

    .ann-btn-submit {
      background: var(--blue, #2a2f7c);
      color: #fff;
      border-color: var(--blue, #2a2f7c);
    }
    .ann-btn-submit:hover { opacity: 0.85; }
    .ann-btn-submit:disabled {
      opacity: 0.35;
      cursor: not-allowed;
    }

    .ann-toast {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%) translateY(80px);
      background: var(--blue, #2a2f7c);
      color: #fff;
      font-family: 'DM Sans', sans-serif;
      font-size: 13px;
      padding: 10px 24px;
      z-index: 10002;
      opacity: 0;
      transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s;
      pointer-events: none;
    }
    .ann-toast.visible {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  `;
  document.head.appendChild(style);
}

function createButton() {
  const btn = document.createElement('button');
  btn.className = 'ann-button';
  btn.setAttribute('aria-label', 'Add comment');
  btn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.2L4 17.2V4h16v12z"/></svg>`;
  btn.style.display = 'none';
  document.body.appendChild(btn);
  return btn;
}

function createPopup() {
  const popup = document.createElement('div');
  popup.className = 'ann-popup';
  popup.style.display = 'none';
  popup.innerHTML = `
    <div class="ann-popup-inner">
      <div class="ann-quote" id="annQuote"></div>
      <textarea class="ann-textarea" id="annComment" placeholder="What should we know about this?"></textarea>
      <div class="ann-row">
        <input class="ann-input" id="annName" placeholder="Name (optional)">
        <input class="ann-input" id="annEmail" placeholder="Email (optional)">
      </div>
      <div style="font-size:10px;color:#999;margin-top:4px;">Your details are stored only to follow up on contributions. They will not be shared.</div>
      <div class="ann-actions">
        <button class="ann-btn" id="annCancel">Cancel</button>
        <button class="ann-btn ann-btn-submit" id="annSubmit" disabled>Submit</button>
      </div>
    </div>
  `;
  document.body.appendChild(popup);
  return popup;
}

function createToast() {
  const toast = document.createElement('div');
  toast.className = 'ann-toast';
  document.body.appendChild(toast);
  return toast;
}

function showToast(message, duration = 3000) {
  toastEl.textContent = message;
  toastEl.classList.add('visible');
  setTimeout(() => toastEl.classList.remove('visible'), duration);
}

function positionElement(el, rect, preferAbove = true) {
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;
  const elW = el.offsetWidth || 360;
  const elH = el.offsetHeight || 300;

  let left = rect.left + scrollX + rect.width / 2 - elW / 2;
  let top = preferAbove
    ? rect.top + scrollY - elH - 8
    : rect.bottom + scrollY + 8;

  // Keep within viewport
  left = Math.max(8, Math.min(left, window.innerWidth - elW - 8 + scrollX));
  if (top < scrollY + 8) top = rect.bottom + scrollY + 8;

  el.style.left = left + 'px';
  el.style.top = top + 'px';
}

function hideButton() {
  buttonEl.style.display = 'none';
}

function hidePopup() {
  popupEl.style.display = 'none';
}

function getArticleSlug() {
  // Try to extract from URL path
  const parts = window.location.pathname.split('/').filter(Boolean);
  // e.g. /thermodynamics/carnot-cycle/ → "thermodynamics/carnot-cycle"
  return parts.join('/') || 'unknown';
}

function truncate(str, maxLen = 120) {
  if (str.length <= maxLen) return str;
  return str.substring(0, maxLen).trim() + '...';
}

function initAnnotations() {
  injectStyles();
  buttonEl = createButton();
  popupEl = createPopup();
  toastEl = createToast();

  const containers = document.querySelectorAll('[data-annotatable="true"]');
  if (containers.length === 0) return;

  // Comment textarea enables submit
  const commentEl = popupEl.querySelector('#annComment');
  const submitBtn = popupEl.querySelector('#annSubmit');
  commentEl.addEventListener('input', () => {
    submitBtn.disabled = commentEl.value.trim().length === 0;
  });

  // Cancel
  popupEl.querySelector('#annCancel').addEventListener('click', (e) => {
    e.stopPropagation();
    hidePopup();
    hideButton();
  });

  // Submit
  submitBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';

    const payload = {
      pageUrl: window.location.href,
      articleSlug: getArticleSlug(),
      selectedText: currentSelection || '',
      commentType: 'general',
      comment: commentEl.value.trim(),
      name: popupEl.querySelector('#annName').value.trim(),
      email: popupEl.querySelector('#annEmail').value.trim(),
    };

    try {
      if (!APPS_SCRIPT_URL) throw new Error('Apps Script URL not configured');
      // Use form submission to avoid CORS issues with Apps Script
      const form = new FormData();
      for (const [key, val] of Object.entries(payload)) {
        form.append(key, val);
      }
      await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        body: form,
      });
      showToast('Comment submitted. Thank you.');
    } catch (err) {
      showToast('Could not submit. Please try again.');
    }

    // Reset
    submitBtn.textContent = 'Submit';
    submitBtn.disabled = true;
    commentEl.value = '';
    popupEl.querySelector('#annName').value = '';
    popupEl.querySelector('#annEmail').value = '';
    hidePopup();
    hideButton();
  });

  // Selection handler
  function onSelectionChange(e) {
    // Ignore if popup is open
    if (popupEl.style.display !== 'none') return;

    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.toString().trim().length === 0) {
      hideButton();
      return;
    }

    // Check selection is within an annotatable container
    const anchor = sel.anchorNode;
    const isInContainer = anchor && Array.from(containers).some(c => c.contains(anchor));
    if (!isInContainer) {
      hideButton();
      return;
    }

    currentSelection = sel.toString().trim();
    currentRect = sel.getRangeAt(0).getBoundingClientRect();

    // Position and show button above selection
    buttonEl.style.display = 'flex';
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    buttonEl.style.left = (currentRect.left + scrollX + currentRect.width / 2 - 16) + 'px';
    buttonEl.style.top = (currentRect.top + scrollY - 40) + 'px';
  }

  document.addEventListener('mouseup', (e) => {
    // Small delay to let selection settle
    setTimeout(() => onSelectionChange(e), 10);
  });

  // Button click → open popup
  buttonEl.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();

    // Populate quote
    popupEl.querySelector('#annQuote').textContent = '"' + truncate(currentSelection) + '"';

    // Reset form
    const commentInput = popupEl.querySelector('#annComment');
    commentInput.value = '';
    submitBtn.disabled = true;

    // Show and position popup
    popupEl.style.display = 'block';
    positionElement(popupEl, currentRect, true);

    hideButton();
    commentInput.focus();
  });

  // Click outside popup closes it
  document.addEventListener('mousedown', (e) => {
    if (popupEl.style.display !== 'none' && !popupEl.contains(e.target) && e.target !== buttonEl) {
      hidePopup();
    }
  });
}

export { initAnnotations };
