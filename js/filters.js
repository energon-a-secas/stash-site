import { state, voteCount } from './state.js';

/** Submissions rendered as entry-shaped objects so one card template serves both. */
export function freshEntries() {
  return state.submissions.map((s) => ({
    id: s.id,
    name: s.name,
    url: s.url,
    section: s.section,
    why: s.why,
    price: s.price,
    tags: s.tags || [],
    status: 'untried',
    pick: false,
    fresh: true,
    addedBy: s.submittedBy,
    createdAt: s.createdAt,
  }));
}

function matchesQuery(entry, needle) {
  if (!needle) return true;
  const haystack = [entry.name, entry.why, entry.section, ...(entry.tags || [])]
    .join(' ')
    .toLowerCase();
  return needle.split(/\s+/).every((word) => haystack.includes(word));
}

function matchesFilters(entry) {
  if (state.prices.size && !state.prices.has(entry.price)) return false;
  for (const tag of state.tags) {
    if (!(entry.tags || []).includes(tag)) return false;
  }
  return true;
}

function sortEntries(entries) {
  const list = [...entries];
  if (state.sort === 'name') {
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }
  if (state.sort === 'wanted') {
    return list.sort((a, b) => voteCount(b.id) - voteCount(a.id) || a.name.localeCompare(b.name));
  }
  // Curated: the curator's picks lead each shelf, then original order.
  return list.sort((a, b) => Number(Boolean(b.pick)) - Number(Boolean(a.pick)));
}

/** The flat list for the current shelf, query, filters and sort. */
export function visibleEntries() {
  const needle = state.query.trim().toLowerCase();
  const pool = state.shelf === 'fresh'
    ? freshEntries()
    : [...state.entries, ...(state.query ? freshEntries() : [])];

  const filtered = pool.filter(
    (entry) =>
      (state.shelf === 'all' || state.shelf === 'fresh' || entry.section === state.shelf) &&
      matchesQuery(entry, needle) &&
      matchesFilters(entry),
  );
  return sortEntries(filtered);
}

/** Grouped by shelf, in section order, for the "All" view. */
export function groupedEntries() {
  const visible = visibleEntries();
  return state.sections
    .map((section) => ({
      section,
      entries: visible.filter((entry) => entry.section === section.id),
    }))
    .filter((group) => group.entries.length > 0);
}

export function shelfCount(sectionId) {
  return state.entries.filter((entry) => entry.section === sectionId).length;
}

export const PRICE_LABELS = {
  free: 'Free',
  freemium: 'Freemium',
  paid: 'Paid',
  unknown: 'Unclear',
};
