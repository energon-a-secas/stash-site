// Generic helpers come from the DOM Kit (js/neorgon-dom.js, vendored from
// packages/neorgon-ui/dom/). They are re-exported so every existing
// `import { escHtml } from './utils.js'` keeps working.
//
// Do not edit js/neorgon-dom.js. Edit the canonical source and run
// packages/neorgon-ui/sync-dom.sh.
import { escHtml, debounce } from './neorgon-dom.js';
export { escHtml, debounce };

/** Only http(s) links ever become an href. Anything else renders as plain text. */
export function safeUrl(value) {
  try {
    const url = new URL(String(value));
    if (url.protocol === 'http:' || url.protocol === 'https:') return url.toString();
  } catch { /* fall through */ }
  return null;
}

export function hostOf(value) {
  try {
    return new URL(String(value)).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}


let toastTimer;
export function toast(message) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = message;
  el.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('visible'), 2600);
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function relativeDate(ms) {
  const days = Math.floor((Date.now() - ms) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? 'a month ago' : `${months} months ago`;
}

/** Stable per-browser id for rate limiting and vote de-duplication. Not a login. */
export function visitorId() {
  const KEY = 'stash_visitor';
  let id = localStorage.getItem(KEY);
  if (!id || !/^[a-zA-Z0-9-]{8,64}$/.test(id)) {
    id = (crypto.randomUUID?.() || `v${Date.now()}${Math.random().toString(36).slice(2)}`);
    localStorage.setItem(KEY, id);
  }
  return id;
}
