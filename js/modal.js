let lastFocused = null;

export function openModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  lastFocused = document.activeElement;
  modal.hidden = false;
  document.body.classList.add('modal-open');
  const focusTarget = modal.querySelector('input, select, textarea, button');
  focusTarget?.focus();
}

export function closeModal(id) {
  const modal = id ? document.getElementById(id) : document.querySelector('.modal:not([hidden])');
  if (!modal) return;
  modal.hidden = true;
  document.body.classList.remove('modal-open');
  lastFocused?.focus?.();
}

export function isModalOpen() {
  return Boolean(document.querySelector('.modal:not([hidden])'));
}

/** Backdrop clicks, close buttons and Escape, for every modal on the page. */
export function wireModals() {
  document.addEventListener('click', (event) => {
    if (event.target.closest('[data-modal-close]')) {
      closeModal(event.target.closest('.modal')?.id);
    }
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isModalOpen()) closeModal();
  });
}
