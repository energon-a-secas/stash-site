import { CATALOG_URL, CONVEX_CLIENT, CONVEX_URL, hasBackend } from './config.js';
import { state } from './state.js';

/**
 * Two sources, on purpose.
 *
 *   data/ -> api/v1/*.json   the curated shelves. Static, cacheable, readable by
 *                            agents and search engines with no backend running.
 *   Convex                   the live layer: submissions and votes.
 *
 * The catalog renders first and never depends on Convex being reachable.
 */

let clientPromise = null;

async function convex() {
  if (!hasBackend()) return null;
  if (!clientPromise) {
    clientPromise = import(/* @vite-ignore */ CONVEX_CLIENT)
      .then(({ ConvexHttpClient }) => new ConvexHttpClient(CONVEX_URL))
      .catch(() => null);
  }
  return clientPromise;
}

/** Static catalog, with the raw data/ files as a development fallback. */
export async function loadCatalog() {
  try {
    const res = await fetch(CATALOG_URL, { cache: 'no-cache' });
    if (res.ok) {
      const json = await res.json();
      return { sections: json.sections || [], entries: json.entries || [] };
    }
  } catch { /* fall through to the source files */ }

  const [sections, entries] = await Promise.all([
    fetch('data/sections.json').then((r) => r.json()).then((j) => j.sections),
    fetch('data/entries.json').then((r) => r.json()).then((j) => j.entries),
  ]);
  return { sections, entries };
}

/** Fresh drops. Returns an empty list when no backend is configured. */
export async function loadSubmissions() {
  const client = await convex();
  if (!client) return [];
  try {
    return await client.query('submissions:listPending', {});
  } catch {
    return [];
  }
}

export async function loadVotes() {
  const client = await convex();
  if (!client) return { counts: {}, mine: [] };
  try {
    return await client.query('votes:summary', { visitorId: state.visitor });
  } catch {
    return { counts: {}, mine: [] };
  }
}

export async function submitEntry(payload) {
  const client = await convex();
  if (!client) return { ok: false, error: 'offline' };
  try {
    return await client.mutation('submissions:submit', { ...payload, visitorId: state.visitor });
  } catch {
    return { ok: false, error: 'Could not reach the shelf. Try again in a moment.' };
  }
}

export async function toggleVote(targetId) {
  const client = await convex();
  if (!client) return { ok: false, error: 'offline' };
  try {
    return await client.mutation('votes:toggle', { targetId, visitorId: state.visitor });
  } catch {
    return { ok: false, error: 'Could not record that vote.' };
  }
}

/** Curator: verify a passphrase without changing anything. */
export async function checkCurator(password) {
  const client = await convex();
  if (!client) return { ok: false, error: 'Moderation needs the backend to be running.' };
  try {
    return await client.action('admin:check', { password });
  } catch {
    return { ok: false, error: 'Could not reach the backend.' };
  }
}

export async function reviewSubmission(password, id, decision) {
  const client = await convex();
  if (!client) return { ok: false, error: 'Moderation needs the backend to be running.' };
  try {
    return await client.action('admin:review', { password, id, decision });
  } catch {
    return { ok: false, error: 'Could not reach the backend.' };
  }
}

export async function refreshLive() {
  if (!hasBackend()) return;
  const [submissions, votes] = await Promise.all([loadSubmissions(), loadVotes()]);
  state.submissions = submissions;
  state.votes = votes;
  state.backendReady = true;
}
