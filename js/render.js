import { hasVoted, isCurator, sectionById, state, tagIndex, voteCount } from './state.js';
import { groupedEntries, PRICE_LABELS, shelfCount, visibleEntries } from './filters.js';
import { escHtml, hostOf, relativeDate, safeUrl } from './utils.js';

const HEART = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M20.8 5.6a5 5 0 00-7.1 0L12 7.3l-1.7-1.7a5 5 0 10-7.1 7.1L12 21l8.8-8.3a5 5 0 000-7.1z"/></svg>';

function tagPills(tags) {
  return (tags || [])
    .map((tag) => {
      const active = state.tags.has(tag) ? ' is-active' : '';
      return `<button type="button" class="pill pill--tag${active}" data-tag="${escHtml(tag)}">${escHtml(tag)}</button>`;
    })
    .join('');
}

function voteButton(entry) {
  const count = voteCount(entry.id);
  const voted = hasVoted(entry.id);
  const disabled = state.backendReady ? '' : ' disabled';
  const title = state.backendReady ? 'Mark this as something you want to use' : 'Voting opens once the backend is live';
  return `<button type="button" class="vote${voted ? ' is-voted' : ''}" data-vote="${escHtml(entry.id)}"
      aria-pressed="${voted}" title="${escHtml(title)}"${disabled}>
      ${HEART}<span class="vote__count">${count}</span><span class="vote__label">want</span>
    </button>`;
}

function curatorControls(entry) {
  if (!entry.fresh || !isCurator()) return '';
  return `<div class="entry__review">
      <button type="button" class="btn btn--sm btn--secondary" data-review="approved" data-id="${escHtml(entry.id)}">Shelve it</button>
      <button type="button" class="btn btn--sm btn--ghost" data-review="rejected" data-id="${escHtml(entry.id)}">Pass</button>
    </div>`;
}

function entryCard(entry) {
  const section = sectionById(entry.section);
  const href = safeUrl(entry.url);
  const accent = section?.accent || 'var(--accent)';
  const name = escHtml(entry.name);
  const title = href
    ? `<a class="entry__name" href="${escHtml(href)}" target="_blank" rel="noopener noreferrer nofollow">${name}</a>`
    : `<span class="entry__name">${name}</span>`;

  const badges = [];
  if (entry.pick) badges.push('<span class="badge badge--pick">Pick</span>');
  if (entry.fresh) badges.push('<span class="badge badge--fresh">Fresh drop</span>');
  if (entry.status === 'tried') badges.push('<span class="badge badge--tried">Tried</span>');

  const credit = entry.fresh
    ? `<span class="entry__credit">from ${escHtml(entry.addedBy || 'anonymous')} ${escHtml(relativeDate(entry.createdAt))}</span>`
    : '';

  return `<article class="entry${entry.fresh ? ' entry--fresh' : ''}" style="--entry-accent:${escHtml(accent)}">
      <div class="entry__head">
        ${title}
        ${badges.join('')}
      </div>
      <div class="entry__host">${escHtml(hostOf(entry.url))}</div>
      <p class="entry__why">${escHtml(entry.why)}</p>
      <div class="entry__tags">
        <span class="pill pill--price" data-price="${escHtml(entry.price)}">${escHtml(PRICE_LABELS[entry.price] || entry.price)}</span>
        ${tagPills(entry.tags)}
      </div>
      <div class="entry__foot">
        ${voteButton(entry)}
        ${credit}
        ${curatorControls(entry)}
      </div>
    </article>`;
}

export function renderRail() {
  const rail = document.getElementById('shelfRail');
  if (!rail) return;
  const fresh = state.submissions.length;
  const buttons = [
    `<button type="button" class="shelf${state.shelf === 'all' ? ' is-active' : ''}" data-shelf="all">
       All<span class="shelf__count">${state.entries.length}</span></button>`,
    ...state.sections.map(
      (section) => `<button type="button" class="shelf${state.shelf === section.id ? ' is-active' : ''}"
         data-shelf="${escHtml(section.id)}" style="--shelf-accent:${escHtml(section.accent)}">
         ${escHtml(section.label)}<span class="shelf__count">${shelfCount(section.id)}</span></button>`,
    ),
    `<button type="button" class="shelf shelf--fresh${state.shelf === 'fresh' ? ' is-active' : ''}" data-shelf="fresh">
       Fresh drops<span class="shelf__count">${fresh}</span></button>`,
  ];
  rail.innerHTML = buttons.join('');
}

export function renderPriceFilters() {
  const wrap = document.getElementById('priceFilters');
  if (!wrap) return;
  wrap.innerHTML = Object.entries(PRICE_LABELS)
    .map(
      ([value, label]) =>
        `<button type="button" class="chip${state.prices.has(value) ? ' is-active' : ''}" data-price-filter="${value}"
           aria-pressed="${state.prices.has(value)}">${label}</button>`,
    )
    .join('');
}

export function renderActiveTags() {
  const wrap = document.getElementById('activeTags');
  if (!wrap) return;
  if (!state.tags.size) {
    wrap.hidden = true;
    wrap.innerHTML = '';
    return;
  }
  wrap.hidden = false;
  wrap.innerHTML =
    `<span class="active-tags__label">Filtering by</span>` +
    [...state.tags]
      .map(
        (tag) =>
          `<button type="button" class="pill pill--tag is-active" data-tag="${escHtml(tag)}">${escHtml(tag)} &times;</button>`,
      )
      .join('') +
    `<button type="button" class="active-tags__clear" id="clearTags">Clear</button>`;
}

function emptyState() {
  if (state.shelf === 'fresh') {
    return `<div class="empty">
        <h3 class="empty__title">Nothing waiting</h3>
        <p class="empty__body">New submissions land here before they reach a shelf. ${
          state.backendReady ? 'Be the first to drop something.' : 'Submissions open once the backend is connected.'
        }</p>
        <button type="button" class="btn btn--primary" data-open-submit>Add a find</button>
      </div>`;
  }
  return `<div class="empty">
      <h3 class="empty__title">Nothing matches</h3>
      <p class="empty__body">Try a shorter search, or clear the filters.</p>
      <button type="button" class="btn btn--ghost" id="resetFilters">Reset filters</button>
    </div>`;
}

function shelfHeader(section) {
  return `<div class="group__head" style="--entry-accent:${escHtml(section.accent)}">
      <h2 class="group__title">${escHtml(section.label)}</h2>
      <p class="group__blurb">${escHtml(section.blurb)}</p>
    </div>`;
}

export function renderResults() {
  const target = document.getElementById('results');
  if (!target) return;

  if (state.shelf === 'all' && !state.query && !state.tags.size && !state.prices.size) {
    const groups = groupedEntries();
    target.innerHTML = groups.length
      ? groups
          .map(
            (group) =>
              `<section class="group">${shelfHeader(group.section)}
                 <div class="grid">${group.entries.map(entryCard).join('')}</div>
               </section>`,
          )
          .join('') + freshTeaser()
      : emptyState();
    return;
  }

  const entries = visibleEntries();
  target.innerHTML = entries.length
    ? `<div class="grid">${entries.map(entryCard).join('')}</div>`
    : emptyState();
}

/** A nudge toward the queue from the bottom of the default view. */
function freshTeaser() {
  const count = state.submissions.length;
  if (!count) return '';
  return `<section class="teaser">
      <p class="teaser__text">${count} ${count === 1 ? 'find is' : 'finds are'} waiting for review.</p>
      <button type="button" class="btn btn--secondary btn--sm" data-shelf="fresh">See fresh drops</button>
    </section>`;
}

export function renderSectionOptions() {
  const select = document.getElementById('fSection');
  if (!select) return;
  select.innerHTML = state.sections
    .map((section) => `<option value="${escHtml(section.id)}">${escHtml(section.label)}</option>`)
    .join('');
}

export function renderAll() {
  renderRail();
  renderPriceFilters();
  renderActiveTags();
  renderResults();
}

/** Compact, prompt-ready text for pasting into an assistant. */
export function agentDigest() {
  const lines = [
    'Design asset sources from stash.neorgon.com.',
    'Use these instead of guessing, and prefer a named set over an emoji.',
    '',
  ];
  for (const section of state.sections) {
    const entries = state.entries.filter((entry) => entry.section === section.id);
    if (!entries.length) continue;
    lines.push(`## ${section.label} — ${section.agentHint}`);
    for (const entry of entries) {
      lines.push(`- ${entry.name} (${entry.price}) ${entry.url} — ${entry.why}`);
    }
    lines.push('');
  }
  lines.push(`Full machine-readable catalog: ${location.origin}/api/v1/catalog.json`);
  return lines.join('\n');
}

export function tagCloudTop(limit = 12) {
  return tagIndex().slice(0, limit);
}
