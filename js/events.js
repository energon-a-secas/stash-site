import { refreshLive, reviewSubmission, toggleVote } from './data.js';
import { openModal } from './modal.js';
import { agentDigest, renderAll, renderResults } from './render.js';
import { isCurator, saveView, state } from './state.js';
import { openSubmit } from './submit.js';
import { copyText, debounce, toast } from './utils.js';

const $ = (id) => document.getElementById(id);

function setShelf(shelf) {
  state.shelf = shelf;
  saveView();
  renderAll();
  document.getElementById('results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function toggleSetValue(set, value) {
  if (set.has(value)) set.delete(value);
  else set.add(value);
}

async function handleVote(id, button) {
  if (!state.backendReady) return toast('Voting opens once the backend is live');
  button.disabled = true;
  const result = await toggleVote(id);
  if (result?.ok) {
    const counts = state.votes.counts;
    counts[id] = (counts[id] || 0) + (result.voted ? 1 : -1);
    if (counts[id] < 0) counts[id] = 0;
    state.votes.mine = result.voted
      ? [...state.votes.mine, id]
      : state.votes.mine.filter((entry) => entry !== id);
    renderResults();
  } else {
    button.disabled = false;
    toast(result?.error || 'Could not record that vote');
  }
}

async function handleReview(id, decision, button) {
  if (!isCurator()) return;
  button.disabled = true;
  const result = await reviewSubmission(state.curatorPass, id, decision);
  if (!result?.ok) {
    button.disabled = false;
    toast(result?.error || 'That did not go through');
    return;
  }
  await refreshLive();
  renderAll();
  toast(decision === 'approved' ? 'Shelved. Run make sync to write it into the catalog.' : 'Passed on it');
}

function onClick(event) {
  const shelfBtn = event.target.closest('[data-shelf]');
  if (shelfBtn) return setShelf(shelfBtn.dataset.shelf);

  const tagBtn = event.target.closest('[data-tag]');
  if (tagBtn) {
    toggleSetValue(state.tags, tagBtn.dataset.tag);
    return renderAll();
  }

  const priceBtn = event.target.closest('[data-price-filter]');
  if (priceBtn) {
    toggleSetValue(state.prices, priceBtn.dataset.priceFilter);
    return renderAll();
  }

  const voteBtn = event.target.closest('[data-vote]');
  if (voteBtn) return handleVote(voteBtn.dataset.vote, voteBtn);

  const reviewBtn = event.target.closest('[data-review]');
  if (reviewBtn) return handleReview(reviewBtn.dataset.id, reviewBtn.dataset.review, reviewBtn);

  if (event.target.closest('[data-open-submit]')) return openSubmit();

  if (event.target.closest('#clearTags')) {
    state.tags.clear();
    return renderAll();
  }

  if (event.target.closest('#resetFilters')) {
    state.tags.clear();
    state.prices.clear();
    state.query = '';
    $('searchInput').value = '';
    return renderAll();
  }
}

function onKeydown(event) {
  const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName);
  if (event.key === '/' && !typing) {
    event.preventDefault();
    $('searchInput')?.focus();
  }
  if (event.key === 'n' && !typing && !event.metaKey && !event.ctrlKey) {
    event.preventDefault();
    openSubmit();
  }
}

async function copyForAgent() {
  const ok = await copyText(agentDigest());
  toast(ok ? 'Copied. Paste it into your assistant.' : 'Could not reach the clipboard');
}

/** #curate opens the curator prompt. Nothing on the page advertises it. */
function checkCurateHash() {
  if (location.hash === '#curate') openModal('curateModal');
}

export function wireEvents() {
  document.addEventListener('click', onClick);
  document.addEventListener('keydown', onKeydown);
  window.addEventListener('hashchange', checkCurateHash);

  $('searchInput')?.addEventListener(
    'input',
    debounce((event) => {
      state.query = event.target.value;
      renderResults();
    }, 150),
  );

  $('sortSelect')?.addEventListener('change', (event) => {
    state.sort = event.target.value;
    saveView();
    renderResults();
  });

  $('submitBtn')?.addEventListener('click', openSubmit);
  $('introSubmitBtn')?.addEventListener('click', openSubmit);
  $('copyAgentBtn')?.addEventListener('click', copyForAgent);

  checkCurateHash();
}
