import { visitorId } from './utils.js';

const FILTER_KEY = 'stash_view';

export const state = {
  sections: [],
  entries: [],
  /** Live submissions awaiting review. Empty without a Convex deployment. */
  submissions: [],
  votes: { counts: {}, mine: [] },

  shelf: 'all',
  query: '',
  prices: new Set(),
  tags: new Set(),
  sort: 'curated',

  visitor: visitorId(),
  backendReady: false,

  /**
   * Curator passphrase, held in memory for this tab only so moderation calls can
   * be verified server-side each time.
   * SECURITY-REVIEW: intentionally never written to localStorage or sessionStorage.
   * Closing the tab locks moderation again.
   */
  curatorPass: null,
};

export const isCurator = () => typeof state.curatorPass === 'string';

/** Remember the shelf and sort between visits. Filters stay per-session. */
export function saveView() {
  try {
    localStorage.setItem(FILTER_KEY, JSON.stringify({ shelf: state.shelf, sort: state.sort }));
  } catch { /* storage disabled, not fatal */ }
}

export function loadView() {
  try {
    const saved = JSON.parse(localStorage.getItem(FILTER_KEY) || '{}');
    if (typeof saved.shelf === 'string') state.shelf = saved.shelf;
    if (['curated', 'wanted', 'name'].includes(saved.sort)) state.sort = saved.sort;
  } catch { /* ignore malformed state */ }
}

export function sectionById(id) {
  return state.sections.find((s) => s.id === id) || null;
}

export function voteCount(id) {
  return state.votes.counts[id] || 0;
}

export function hasVoted(id) {
  return state.votes.mine.includes(id);
}

/** Every tag in use, with counts, most common first. */
export function tagIndex() {
  const counts = new Map();
  for (const entry of state.entries) {
    for (const tag of entry.tags || []) counts.set(tag, (counts.get(tag) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}
