import { canWrite } from '../../core/permissions.js';

const WRITE_SELECTORS = [
  '#add-new-entity-btn',
  '#add-new-module-btn',
  '#empty-add-module-btn',
  '#mobile-add-module-btn',
  '#save-structure-btn',
  '.delete-entity-btn',
  '.delete-custom-entity-btn',
  '.delete-module-btn',
  '.edit-module-btn',
  '.edit-entity-btn',
  '.edit-field-btn',
  '.delete-field-btn',
  '.edit-sub-entity-btn',
  '#add-select-option',
  '#add-button-action'
].join(',');

let activeWorkspace = null;
let readonlyBanner = null;

function isReadonly() {
  return Boolean(activeWorkspace && !activeWorkspace.isOwner && !canWrite(activeWorkspace.role));
}

function ensureBanner() {
  if (readonlyBanner?.isConnected) return readonlyBanner;
  readonlyBanner = document.createElement('div');
  readonlyBanner.id = 'workspace-readonly-banner';
  readonlyBanner.className = 'hidden border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm font-medium text-amber-800';
  readonlyBanner.textContent = 'Modo somente leitura: você tem permissão de Leitor neste workspace.';
  const header = document.querySelector('#app > header');
  header?.insertAdjacentElement('afterend', readonlyBanner);
  return readonlyBanner;
}

function updateButtons() {
  const readonly = isReadonly();
  ensureBanner()?.classList.toggle('hidden', !readonly);

  document.querySelectorAll(WRITE_SELECTORS).forEach((element) => {
    if ('disabled' in element) element.disabled = readonly;
    element.classList.toggle('opacity-50', readonly);
    element.classList.toggle('cursor-not-allowed', readonly);
    if (readonly) element.setAttribute('aria-disabled', 'true');
    else element.removeAttribute('aria-disabled');
  });

  document.querySelectorAll('#entity-list, #module-container, #form-builder-dropzone, #fields-toolbox').forEach((element) => {
    if (element._sortable?.option) element._sortable.option('disabled', readonly);
  });
}

function setWorkspace(workspace) {
  activeWorkspace = workspace || null;
  queueMicrotask(updateButtons);
}

function blockReadonlyMutation(event) {
  if (!isReadonly()) return;
  const target = event.target instanceof Element ? event.target : null;
  if (!target?.closest(WRITE_SELECTORS) && !target?.closest('.sortable-drag, .sortable-chosen, .entity-card, .module-quadro, .toolbox-item')) return;

  event.preventDefault();
  event.stopImmediatePropagation();
  if (event.type === 'click' && typeof Swal !== 'undefined') {
    Swal.fire({
      icon: 'info',
      title: 'Somente leitura',
      text: 'Este workspace foi compartilhado com permissão de Leitor.'
    });
  }
}

window.addEventListener('workspaceChanged', (event) => {
  setWorkspace(event.detail?.workspace);
});

['click', 'pointerdown', 'dragstart', 'drop'].forEach((eventName) => {
  document.addEventListener(eventName, blockReadonlyMutation, true);
});

new MutationObserver(() => {
  if (activeWorkspace) updateButtons();
}).observe(document.documentElement, { childList: true, subtree: true });

function syncInitialWorkspace(attempt = 0) {
  if (typeof window.getCurrentWorkspace === 'function') {
    const workspace = window.getCurrentWorkspace();
    if (workspace) {
      setWorkspace(workspace);
      return;
    }
  }
  if (attempt < 40) window.setTimeout(() => syncInitialWorkspace(attempt + 1), 100);
}

function init() {
  ensureBanner();
  syncInitialWorkspace();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
