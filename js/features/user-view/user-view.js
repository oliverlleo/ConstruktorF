import { getAuth, getFirestore } from '../../core/firebase-app.js';
import { createElement, setText } from '../../core/security.js';

const state = {
  auth: null,
  db: null,
  user: null,
  workspaces: [],
  workspace: null,
  modules: [],
  entities: []
};

function byId(id) {
  return document.getElementById(id);
}

function workspaceKey(workspace) {
  return `${workspace.ownerId}:${workspace.id}`;
}

function basePath() {
  return `users/${state.workspace.ownerId}/workspaces/${state.workspace.id}`;
}

async function waitForAuth() {
  return new Promise((resolve) => {
    const unsubscribe = state.auth.onAuthStateChanged((user) => {
      unsubscribe();
      resolve(user || null);
    });
  });
}

async function loadWorkspaces() {
  const ownSnapshot = await state.db.collection(`users/${state.user.uid}/workspaces`).get();
  const own = ownSnapshot.docs.map((doc) => ({
    id: doc.id,
    ownerId: state.user.uid,
    name: doc.data().name || 'Área sem nome',
    role: 'admin',
    isOwner: true
  }));

  const shared = [];
  const accessSnapshot = await state.db.doc(`accessControl/${state.user.uid}`).get();
  if (accessSnapshot.exists) {
    const access = accessSnapshot.data() || {};
    const ids = Object.keys(access).filter((key) => key !== 'updatedAt' && typeof access[key] === 'string');
    const docs = await Promise.all(ids.map(async (id) => {
      const snapshot = await state.db.doc(`sharedWorkspaces/${id}`).get();
      if (!snapshot.exists) return null;
      const data = snapshot.data();
      return {
        id,
        ownerId: data.ownerId,
        name: data.name || 'Área compartilhada',
        ownerName: data.ownerName || 'Usuário',
        role: access[id],
        isOwner: false
      };
    }));
    shared.push(...docs.filter(Boolean));
  }

  state.workspaces = [...own, ...shared];
  renderWorkspaceSelector(own, shared);
}

function renderWorkspaceSelector(own, shared) {
  const select = byId('workspace-select');
  select.textContent = '';

  const appendGroup = (label, workspaces) => {
    if (!workspaces.length) return;
    const group = createElement('optgroup', { attributes: { label } });
    workspaces.forEach((workspace) => {
      const detail = workspace.isOwner ? '' : ` — ${workspace.ownerName} (${workspace.role})`;
      group.appendChild(createElement('option', {
        text: `${workspace.name}${detail}`,
        attributes: { value: workspaceKey(workspace) }
      }));
    });
    select.appendChild(group);
  };

  appendGroup('Minhas áreas de trabalho', own);
  appendGroup('Compartilhadas comigo', shared);
}

async function switchWorkspace() {
  const key = byId('workspace-select').value;
  state.workspace = state.workspaces.find((workspace) => workspaceKey(workspace) === key) || null;
  if (!state.workspace) return;

  setText(byId('workspace-role'), state.workspace.isOwner ? 'Proprietário' : state.workspace.role);
  await loadStructure();
}

async function loadStructure() {
  setLoading(true);
  try {
    const [modulesSnapshot, entitiesSnapshot] = await Promise.all([
      state.db.collection(`${basePath()}/modules`).get(),
      state.db.collection(`${basePath()}/entities`).get()
    ]);

    state.modules = modulesSnapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    state.entities = entitiesSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    renderModules();
    const firstEntity = state.entities.find((entity) => entity.moduleId === state.modules[0]?.id) || state.entities[0];
    if (firstEntity) await showEntity(firstEntity.id);
    else renderEmpty('Nenhuma entidade configurada nesta área de trabalho.');
  } finally {
    setLoading(false);
  }
}

function renderModules() {
  const container = byId('navigation');
  container.textContent = '';

  state.modules.forEach((module) => {
    const section = createElement('section', { className: 'mb-5' });
    section.appendChild(createElement('h2', {
      className: 'px-3 mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500',
      text: module.name || 'Módulo'
    }));

    const entities = state.entities.filter((entity) => entity.moduleId === module.id);
    entities.forEach((entity) => {
      const button = createElement('button', {
        className: 'entity-nav w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700',
        attributes: { type: 'button', 'data-entity-id': entity.id }
      });
      const icon = createElement('i', { attributes: { 'data-lucide': entity.icon || 'table-2' } });
      button.append(icon, createElement('span', { text: entity.name || 'Entidade' }));
      button.addEventListener('click', () => showEntity(entity.id));
      section.appendChild(button);
    });

    if (!entities.length) {
      section.appendChild(createElement('p', { className: 'px-3 text-xs text-slate-400', text: 'Sem entidades' }));
    }
    container.appendChild(section);
  });

  const unassigned = state.entities.filter((entity) => !entity.moduleId);
  if (unassigned.length) {
    const section = createElement('section');
    section.appendChild(createElement('h2', { className: 'px-3 mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500', text: 'Sem módulo' }));
    unassigned.forEach((entity) => {
      const button = createElement('button', {
        className: 'entity-nav w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-indigo-50',
        text: entity.name || 'Entidade',
        attributes: { type: 'button' }
      });
      button.addEventListener('click', () => showEntity(entity.id));
      section.appendChild(button);
    });
    container.appendChild(section);
  }

  window.lucide?.createIcons?.();
}

function normalizeValue(value) {
  if (value === null || value === undefined) return '';
  if (value?.toDate instanceof Function) return value.toDate().toLocaleString('pt-BR');
  if (Array.isArray(value)) return value.map(normalizeValue).join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
  return String(value);
}

async function showEntity(entityId) {
  const entity = state.entities.find((item) => item.id === entityId);
  if (!entity) return;

  document.querySelectorAll('.entity-nav').forEach((button) => {
    button.classList.toggle('bg-indigo-100', button.dataset.entityId === entityId);
  });

  setText(byId('entity-title'), entity.name || 'Entidade');
  setText(byId('entity-description'), `${(entity.attributes || []).length} propriedades configuradas`);
  setLoading(true);

  try {
    const recordsSnapshot = await state.db.collection(`${basePath()}/entities/${entity.id}/records`).get();
    const records = recordsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    renderRecords(entity, records);
  } catch (error) {
    console.error('Erro ao carregar registros:', error);
    renderEmpty('Não foi possível carregar os registros desta entidade.');
  } finally {
    setLoading(false);
  }
}

function renderRecords(entity, records) {
  const content = byId('content');
  content.textContent = '';

  if (!records.length) {
    renderEmpty('Nenhum registro cadastrado nesta entidade.');
    return;
  }

  const configuredFields = Array.isArray(entity.attributes) ? entity.attributes : [];
  const systemKeys = new Set(['id', 'created_at', 'updated_at', 'created_by', 'last_edited_by']);
  const configuredKeys = configuredFields.map((field) => field.id || field.name).filter(Boolean);
  const discoveredKeys = [...new Set(records.flatMap((record) => Object.keys(record).filter((key) => !systemKeys.has(key))))];
  const keys = [...new Set([...configuredKeys, ...discoveredKeys])];
  const labelByKey = new Map(configuredFields.map((field) => [field.id || field.name, field.label || field.name || field.id]));

  const wrapper = createElement('div', { className: 'overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm' });
  const table = createElement('table', { className: 'min-w-full divide-y divide-slate-200 text-sm' });
  const thead = createElement('thead', { className: 'bg-slate-50' });
  const headerRow = createElement('tr');
  keys.forEach((key) => headerRow.appendChild(createElement('th', {
    className: 'px-4 py-3 text-left font-semibold text-slate-600 whitespace-nowrap',
    text: labelByKey.get(key) || key
  })));
  thead.appendChild(headerRow);

  const tbody = createElement('tbody', { className: 'divide-y divide-slate-100' });
  records.forEach((record) => {
    const row = createElement('tr', { className: 'hover:bg-slate-50' });
    keys.forEach((key) => row.appendChild(createElement('td', {
      className: 'max-w-xs px-4 py-3 text-slate-700 align-top',
      text: normalizeValue(record[key])
    })));
    tbody.appendChild(row);
  });

  table.append(thead, tbody);
  wrapper.appendChild(table);
  content.appendChild(wrapper);
}

function renderEmpty(message) {
  const content = byId('content');
  content.textContent = '';
  const empty = createElement('div', { className: 'rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center' });
  empty.appendChild(createElement('p', { className: 'text-slate-500', text: message }));
  content.appendChild(empty);
}

function setLoading(visible) {
  byId('loading')?.classList.toggle('hidden', !visible);
}

async function init() {
  state.auth = await getAuth();
  state.db = getFirestore();
  state.user = await waitForAuth();
  if (!state.user) {
    window.location.replace('login.html');
    return;
  }

  const name = state.user.displayName || state.user.email || 'Usuário';
  setText(byId('user-name'), name);
  byId('logout')?.addEventListener('click', async () => {
    await state.auth.signOut();
    window.location.replace('login.html');
  });
  byId('workspace-select')?.addEventListener('change', switchWorkspace);

  await loadWorkspaces();
  if (state.workspaces.length) {
    byId('workspace-select').value = workspaceKey(state.workspaces[0]);
    await switchWorkspace();
  } else {
    renderEmpty('Nenhuma área de trabalho disponível.');
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
