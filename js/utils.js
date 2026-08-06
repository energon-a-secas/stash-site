/** Escape anything that reaches innerHTML. All catalog copy and every submission
 *  is treated as untrusted text, never as markup. */
export function escHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

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

export function debounce(fn, ms = 200) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
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
