import { hasBackend } from './config.js';
import { loadCatalog, refreshLive } from './data.js';
import { wireEvents } from './events.js';
import { wireModals } from './modal.js';
import { renderAll, renderSectionOptions } from './render.js';
import { loadView, state } from './state.js';
import { wireForms } from './submit.js';

async function init() {
  loadView();

  const { sections, entries } = await loadCatalog();
  state.sections = sections;
  state.entries = entries;

  // Votes and Fresh drops need the backend; without it, offer neither (a saved view may name them).
  if (!hasBackend()) {
    document.querySelector('#sortSelect option[value="wanted"]')?.remove();
    if (state.sort === 'wanted') state.sort = 'curated';
    if (state.shelf === 'fresh') state.shelf = 'all';
  }

  document.getElementById('sortSelect').value = state.sort;
  renderSectionOptions();
  renderAll();

  wireModals();
  wireForms();
  wireEvents();

  // The live layer arrives after the shelves are already on screen.
  await refreshLive();
  renderAll();
}

init();
