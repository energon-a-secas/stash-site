import { REPO, hasBackend } from './config.js';
import { checkCurator, refreshLive, submitEntry } from './data.js';
import { closeModal, openModal } from './modal.js';
import { renderAll, renderSectionOptions } from './render.js';
import { state } from './state.js';
import { safeUrl, toast } from './utils.js';

const $ = (id) => document.getElementById(id);

function showError(el, message) {
  if (!el) return;
  el.textContent = message || '';
  el.hidden = !message;
}

/** Existing links, so a duplicate is caught before it reaches the queue. */
function alreadyStashed(url) {
  const key = (value) => {
    try {
      const parsed = new URL(value);
      return parsed.hostname.replace(/^www\./, '').toLowerCase() + parsed.pathname.replace(/\/+$/, '').toLowerCase();
    } catch {
      return String(value).toLowerCase();
    }
  };
  const target = key(url);
  return [...state.entries, ...state.submissions].some((entry) => key(entry.url) === target);
}

/** Without Convex, a submission becomes a prefilled GitHub issue instead. */
function githubFallback(payload) {
  const body = [
    `**Link:** ${payload.url}`,
    `**Name:** ${payload.name}`,
    `**Shelf:** ${payload.section}`,
    `**Price:** ${payload.price}`,
    `**Tags:** ${payload.tags.join(', ') || 'none'}`,
    '',
    '**Why it is worth using**',
    payload.why,
    '',
    `Submitted by ${payload.submittedBy}`,
  ].join('\n');
  const url = new URL(`https://github.com/${REPO}/issues/new`);
  url.searchParams.set('title', `Stash: ${payload.name}`);
  url.searchParams.set('body', body);
  url.searchParams.set('labels', 'submission');
  window.open(url.toString(), '_blank', 'noopener');
}

function readForm() {
  return {
    url: $('fUrl').value.trim(),
    name: $('fName').value.trim(),
    section: $('fSection').value,
    price: $('fPrice').value,
    why: $('fWhy').value.trim(),
    submittedBy: $('fBy').value.trim() || 'anonymous',
    tags: $('fTags')
      .value.split(',')
      .map((tag) => tag.trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 6),
  };
}

function resetForm() {
  ['fUrl', 'fName', 'fWhy', 'fTags', 'fBy'].forEach((id) => {
    $(id).value = '';
  });
  $('whyCount').textContent = '0';
  showError($('submitError'), '');
}

export function openSubmit() {
  renderSectionOptions();
  if (state.shelf !== 'all' && state.shelf !== 'fresh') $('fSection').value = state.shelf;
  $('submitNote').textContent = hasBackend()
    ? 'Lands on the Fresh drops shelf right away, then gets reviewed before it joins a shelf.'
    : 'Opens a prefilled GitHub issue, since live submissions are not switched on yet.';
  openModal('submitModal');
}

async function handleSubmit(event) {
  event.preventDefault();
  const error = $('submitError');
  const payload = readForm();

  if (!safeUrl(payload.url)) return showError(error, 'Use a full web address starting with http.');
  if (payload.name.length < 2) return showError(error, 'Give it a name.');
  if (payload.why.length < 15) return showError(error, 'Say why it is worth using, in a sentence or two.');
  if (alreadyStashed(payload.url)) return showError(error, 'That one is already in the stash.');
  showError(error, '');

  const button = $('submitSend');
  button.disabled = true;

  if (!hasBackend()) {
    githubFallback(payload);
    button.disabled = false;
    closeModal('submitModal');
    resetForm();
    toast('Opening a GitHub issue with your find');
    return;
  }

  const result = await submitEntry(payload);
  button.disabled = false;

  if (!result?.ok) {
    showError(error, result?.error === 'offline' ? 'The shelf is not reachable right now.' : result?.error);
    return;
  }

  await refreshLive();
  renderAll();
  closeModal('submitModal');
  resetForm();
  toast('On the shelf. Thanks for the find.');
}

async function handleCurate(event) {
  event.preventDefault();
  const error = $('curateError');
  const password = $('fPass').value;
  const button = $('curateSend');

  showError(error, '');
  button.disabled = true;
  const result = await checkCurator(password);
  button.disabled = false;

  if (!result?.ok) {
    showError(error, result?.error || 'Could not verify that passphrase.');
    return;
  }

  // Held in memory only, for this tab. Never persisted.
  state.curatorPass = password;
  $('fPass').value = '';
  closeModal('curateModal');
  state.shelf = 'fresh';
  renderAll();
  toast('Moderation unlocked for this tab');
}

export function wireForms() {
  $('submitForm')?.addEventListener('submit', handleSubmit);
  $('curateForm')?.addEventListener('submit', handleCurate);
  $('fWhy')?.addEventListener('input', (event) => {
    $('whyCount').textContent = String(event.target.value.length);
  });
}
