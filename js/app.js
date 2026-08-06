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
