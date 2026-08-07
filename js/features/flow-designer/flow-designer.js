import { getAuth, getFirestore, getFirebaseNamespace } from '../../core/firebase-app.js';
import { createElement, setText } from '../../core/security.js';
import { canWrite } from '../../core/permissions.js';

class FlowDesigner {
  constructor() {
    this.auth = null;
    this.db = null;
    this.currentUser = null;
    this.workspaces = [];
    this.currentWorkspace = null;
    this.modules = [];
    this.flows = new Map();

    this.zoomLevel = 1;
    this.panX = 0;
    this.panY = 0;
    this.panState = null;
    this.minZoom = 0.25;
    this.maxZoom = 2.5;
    this.zoomStep = 0.1;

    this.canvas = document.getElementById('flow-canvas');
    this.viewport = document.getElementById('flow-viewport');
    this.zoomIndicator = document.getElementById('zoom-indicator');
    this.moduleList = document.getElementById('module-list');
    this.workspaceSelect = document.getElementById('workspace-select');
  }

  async init() {
    if (!this.canvas || !this.viewport || !this.moduleList || !this.workspaceSelect) {
      throw new Error('Estrutura HTML do Designer de Fluxos incompleta.');
    }

    this.auth = await getAuth();
    this.db = getFirestore();
    this.currentUser = await this.waitForAuth();
    if (!this.currentUser) return;

    this.setupEvents();
    this.updateUserUi();
    await this.loadWorkspaces();

    document.getElementById('loading-overlay')?.style.setProperty('display', 'none');
    const app = document.getElementById('app');
    if (app) app.style.display = 'flex';
    window.lucide?.createIcons?.();
  }

  waitForAuth() {
    return new Promise((resolve) => {
      const unsubscribe = this.auth.onAuthStateChanged((user) => {
        unsubscribe();
        if (!user) {
          window.location.replace('login.html');
          resolve(null);
          return;
        }
        resolve(user);
      });
    });
  }

  updateUserUi() {
    const displayName = this.currentUser.displayName || this.currentUser.email || 'Usuário';
    setText(document.getElementById('user-display-name'), displayName);

    const avatar = document.getElementById('user-avatar-preview');
    if (avatar) {
      const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=6366f1&color=fff`;
      avatar.src = this.currentUser.photoURL || fallback;
      avatar.alt = `Avatar de ${displayName}`;
    }
  }

  setupEvents() {
    this.canvas.addEventListener('wheel', (event) => this.handleWheel(event), { passive: false });
    this.canvas.addEventListener('pointerdown', (event) => this.startPan(event));
    window.addEventListener('pointermove', (event) => this.movePan(event));
    window.addEventListener('pointerup', () => this.endPan());

    this.viewport.addEventListener('dragover', (event) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
    });
    this.viewport.addEventListener('drop', (event) => this.handleDrop(event));

    document.getElementById('zoom-in-btn')?.addEventListener('click', () => this.setZoom(this.zoomLevel + this.zoomStep));
    document.getElementById('zoom-out-btn')?.addEventListener('click', () => this.setZoom(this.zoomLevel - this.zoomStep));
    document.getElementById('zoom-reset-btn')?.addEventListener('click', () => this.resetView());
    this.workspaceSelect.addEventListener('change', () => this.switchWorkspace());

    document.getElementById('logout-button')?.addEventListener('click', async (event) => {
      event.preventDefault();
      await this.auth.signOut();
      window.location.replace('login.html');
    });

    document.addEventListener('keydown', (event) => {
      if (event.code === 'Space' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)) {
        event.preventDefault();
        this.resetView();
      }
    });

    this.setupMenus();
    this.setupTips();
  }

  setupMenus() {
    const menuButton = document.getElementById('construktor-menu-toggle');
    const menu = document.getElementById('construktor-menu-dropdown');
    const menuIcon = document.getElementById('construktor-toggle-icon');
    if (menuButton && menu) {
      menuButton.addEventListener('click', (event) => {
        event.stopPropagation();
        const willOpen = menu.classList.contains('hidden');
        menu.classList.toggle('hidden', !willOpen);
        if (menuIcon) menuIcon.style.transform = willOpen ? 'rotate(180deg)' : '';
      });
    }

    const settingsButton = document.getElementById('settings-menu-button');
    const userMenu = document.getElementById('user-menu-dropdown');
    settingsButton?.addEventListener('click', (event) => {
      event.stopPropagation();
      userMenu?.classList.toggle('hidden');
    });

    document.addEventListener('click', () => {
      menu?.classList.add('hidden');
      userMenu?.classList.add('hidden');
      if (menuIcon) menuIcon.style.transform = '';
    });
    menu?.addEventListener('click', (event) => event.stopPropagation());
    userMenu?.addEventListener('click', (event) => event.stopPropagation());
  }

  setupTips() {
    let state = {};
    try {
      state = JSON.parse(localStorage.getItem('flowDesigner_tipsState') || '{}');
    } catch {
      state = {};
    }

    const apply = () => {
      document.querySelectorAll('.close-tip-btn').forEach((button) => {
        const tip = document.getElementById(button.dataset.tipId);
        if (tip && state[button.dataset.tipId] === false) tip.style.display = 'none';
      });
    };
    apply();

    document.querySelectorAll('.close-tip-btn').forEach((button) => {
      button.addEventListener('click', () => {
        const id = button.dataset.tipId;
        const tip = document.getElementById(id);
        if (tip) tip.style.display = 'none';
        state[id] = false;
        localStorage.setItem('flowDesigner_tipsState', JSON.stringify(state));
      });
    });

    document.getElementById('help-button')?.addEventListener('click', () => {
      document.querySelectorAll('.close-tip-btn').forEach((button) => {
        const id = button.dataset.tipId;
        const tip = document.getElementById(id);
        if (tip) tip.style.display = '';
        state[id] = true;
      });
      localStorage.setItem('flowDesigner_tipsState', JSON.stringify(state));
    });
  }

  async loadWorkspaces() {
    const ownSnapshot = await this.db.collection(`users/${this.currentUser.uid}/workspaces`).get();
    const own = ownSnapshot.docs.map((doc) => ({
      id: doc.id,
      ownerId: this.currentUser.uid,
      name: doc.data().name || 'Área sem nome',
      isOwner: true,
      role: 'admin'
    }));

    const shared = [];
    const accessSnapshot = await this.db.doc(`accessControl/${this.currentUser.uid}`).get();
    if (accessSnapshot.exists) {
      const access = accessSnapshot.data() || {};
      const ids = Object.keys(access).filter((key) => key !== 'updatedAt' && typeof access[key] === 'string');
      const docs = await Promise.all(ids.map(async (id) => {
        const workspaceSnapshot = await this.db.doc(`sharedWorkspaces/${id}`).get();
        if (!workspaceSnapshot.exists) return null;
        const data = workspaceSnapshot.data();
        return {
          id,
          ownerId: data.ownerId,
          name: data.name || 'Área compartilhada',
          ownerName: data.ownerName || 'Usuário',
          isOwner: false,
          role: access[id]
        };
      }));
      shared.push(...docs.filter(Boolean));
    }

    this.workspaces = [...own, ...shared];
    this.renderWorkspaceOptions(own, shared);

    if (this.workspaces.length) {
      this.workspaceSelect.value = this.workspaceKey(this.workspaces[0]);
      await this.switchWorkspace();
    } else {
      setText(document.getElementById('no-modules-message'), 'Nenhuma área de trabalho encontrada.');
    }
  }

  workspaceKey(workspace) {
    return `${workspace.ownerId}:${workspace.id}`;
  }

  renderWorkspaceOptions(own, shared) {
    this.workspaceSelect.textContent = '';
    const addGroup = (label, items) => {
      if (!items.length) return;
      const group = createElement('optgroup', { attributes: { label } });
      items.forEach((workspace) => {
        const suffix = workspace.isOwner ? '' : ` — ${workspace.ownerName} (${workspace.role})`;
        const option = createElement('option', {
          text: `${workspace.name}${suffix}`,
          attributes: { value: this.workspaceKey(workspace) }
        });
        group.appendChild(option);
      });
      this.workspaceSelect.appendChild(group);
    };
    addGroup('Minhas áreas de trabalho', own);
    addGroup('Compartilhadas comigo', shared);
  }

  async switchWorkspace() {
    const workspace = this.workspaces.find((item) => this.workspaceKey(item) === this.workspaceSelect.value);
    if (!workspace) return;

    this.currentWorkspace = workspace;
    this.clearCanvas();
    await this.loadModules();
    await this.loadFlows();
  }

  getWorkspaceBasePath() {
    const workspace = this.currentWorkspace;
    if (!workspace) throw new Error('Nenhuma área de trabalho selecionada.');
    return `users/${workspace.ownerId}/workspaces/${workspace.id}`;
  }

  async loadModules() {
    const basePath = this.getWorkspaceBasePath();
    const [modulesSnapshot, entitiesSnapshot] = await Promise.all([
      this.db.collection(`${basePath}/modules`).get(),
      this.db.collection(`${basePath}/entities`).get()
    ]);

    const counts = new Map();
    entitiesSnapshot.docs.forEach((doc) => {
      const moduleId = doc.data().moduleId;
      if (moduleId) counts.set(moduleId, (counts.get(moduleId) || 0) + 1);
    });

    this.modules = modulesSnapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data(), entitiesCount: counts.get(doc.id) || 0 }))
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    this.moduleList.textContent = '';
    const empty = document.getElementById('no-modules-message');
    empty?.classList.toggle('hidden', this.modules.length > 0);

    this.modules.forEach((module) => this.moduleList.appendChild(this.createModuleLibraryCard(module)));
  }

  createModuleLibraryCard(module) {
    const card = createElement('div', {
      className: 'module-card bg-white p-3 sm:p-3.5 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between cursor-grab transition-all hover:shadow-md hover:border-indigo-200 active:shadow-inner',
      attributes: { draggable: 'true', 'data-module-id': module.id }
    });

    const left = createElement('div', { className: 'flex items-center gap-3' });
    const icon = createElement('div', { className: 'h-8 w-8 rounded-md bg-indigo-100 flex items-center justify-center text-indigo-600' });
    const iconNode = createElement('i', { className: 'fa-solid fa-puzzle-piece' });
    icon.appendChild(iconNode);
    const text = createElement('div');
    text.appendChild(createElement('div', { className: 'font-medium text-slate-700 text-sm', text: module.name || 'Módulo sem nome' }));
    text.appendChild(createElement('div', { className: 'text-xs text-slate-500', text: `${module.entitiesCount} entidades` }));
    left.append(icon, text);
    card.append(left, createElement('i', { className: 'fa-solid fa-grip-vertical text-slate-400' }));

    card.addEventListener('dragstart', (event) => {
      event.dataTransfer.setData('application/x-construktor-module', JSON.stringify({ moduleId: module.id }));
      event.dataTransfer.effectAllowed = 'copy';
    });
    return card;
  }

  handleWheel(event) {
    event.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    const worldX = (mouseX - this.panX) / this.zoomLevel;
    const worldY = (mouseY - this.panY) / this.zoomLevel;
    const next = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoomLevel + (event.deltaY > 0 ? -this.zoomStep : this.zoomStep)));
    if (next === this.zoomLevel) return;
    this.panX = mouseX - worldX * next;
    this.panY = mouseY - worldY * next;
    this.zoomLevel = next;
    this.updateViewport();
  }

  startPan(event) {
    if (event.button !== 0 || event.target.closest('.flow-module')) return;
    this.panState = { startX: event.clientX, startY: event.clientY, panX: this.panX, panY: this.panY };
    this.canvas.setPointerCapture?.(event.pointerId);
    this.canvas.style.cursor = 'grabbing';
  }

  movePan(event) {
    if (!this.panState) return;
    this.panX = this.panState.panX + event.clientX - this.panState.startX;
    this.panY = this.panState.panY + event.clientY - this.panState.startY;
    this.updateViewport();
  }

  endPan() {
    if (!this.panState) return;
    this.panState = null;
    this.canvas.style.cursor = 'grab';
  }

  setZoom(value) {
    this.zoomLevel = Math.max(this.minZoom, Math.min(this.maxZoom, value));
    this.updateViewport();
  }

  resetView() {
    this.zoomLevel = 1;
    this.panX = 0;
    this.panY = 0;
    this.updateViewport();
  }

  updateViewport() {
    this.viewport.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoomLevel})`;
    setText(this.zoomIndicator, `Zoom: ${Math.round(this.zoomLevel * 100)}%`);
    const grid = 20 * this.zoomLevel;
    this.canvas.style.backgroundSize = `${grid}px ${grid}px`;
    this.canvas.style.backgroundPosition = `${this.panX}px ${this.panY}px`;
  }

  handleDrop(event) {
    event.preventDefault();
    if (!canWrite(this.currentWorkspace?.role)) return;

    let payload;
    try {
      payload = JSON.parse(event.dataTransfer.getData('application/x-construktor-module'));
    } catch {
      return;
    }

    const module = this.modules.find((item) => item.id === payload.moduleId);
    if (!module || this.flows.has(module.id)) return;

    const rect = this.canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left - this.panX) / this.zoomLevel;
    const y = (event.clientY - rect.top - this.panY) / this.zoomLevel;
    this.addFlow(module, x, y, true);
  }

  createFlowElement(module, x, y) {
    const template = document.getElementById('flow-module-template');
    const fragment = template.content.cloneNode(true);
    const element = fragment.querySelector('.flow-module');
    element.dataset.moduleId = module.id;
    element.dataset.moduleName = module.name || 'Módulo sem nome';
    element.style.left = `${x}px`;
    element.style.top = `${y}px`;
    setText(element.querySelector('.module-title'), module.name || 'Módulo sem nome');
    setText(element.querySelector('.entities-count'), `${module.entitiesCount || 0} entidades`);

    const removeButton = element.querySelector('.remove-module-btn');
    if (!canWrite(this.currentWorkspace?.role)) removeButton?.remove();
    else removeButton?.addEventListener('click', (event) => {
      event.stopPropagation();
      this.removeFlow(module.id);
    });

    if (canWrite(this.currentWorkspace?.role)) this.setupModuleDrag(element);
    return element;
  }

  async addFlow(module, x, y, persist) {
    const element = this.createFlowElement(module, x, y);
    this.viewport.appendChild(element);
    this.flows.set(module.id, { moduleId: module.id, moduleName: module.name, x, y, element });
    if (persist) await this.saveFlow(module.id);
  }

  setupModuleDrag(element) {
    element.addEventListener('pointerdown', (event) => {
      if (event.button !== 0 || event.target.closest('.remove-module-btn')) return;
      event.stopPropagation();

      const moduleId = element.dataset.moduleId;
      const flow = this.flows.get(moduleId);
      if (!flow) return;

      const canvasRect = this.canvas.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      const mouseWorldX = (event.clientX - canvasRect.left - this.panX) / this.zoomLevel;
      const mouseWorldY = (event.clientY - canvasRect.top - this.panY) / this.zoomLevel;
      const elementWorldX = (elementRect.left - canvasRect.left - this.panX) / this.zoomLevel;
      const elementWorldY = (elementRect.top - canvasRect.top - this.panY) / this.zoomLevel;
      const offsetX = mouseWorldX - elementWorldX;
      const offsetY = mouseWorldY - elementWorldY;

      let latest = event;
      let frame = 0;
      let dragging = true;
      element.classList.add('dragging');

      const render = () => {
        if (!dragging) return;
        const x = (latest.clientX - canvasRect.left - this.panX) / this.zoomLevel - offsetX;
        const y = (latest.clientY - canvasRect.top - this.panY) / this.zoomLevel - offsetY;
        flow.x = x;
        flow.y = y;
        element.style.left = `${x}px`;
        element.style.top = `${y}px`;
        frame = requestAnimationFrame(render);
      };

      const move = (moveEvent) => { latest = moveEvent; };
      const up = async () => {
        dragging = false;
        cancelAnimationFrame(frame);
        element.classList.remove('dragging');
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        await this.saveFlow(moduleId);
      };

      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up, { once: true });
      frame = requestAnimationFrame(render);
    });
  }

  async saveFlow(moduleId) {
    const flow = this.flows.get(moduleId);
    if (!flow || !this.currentWorkspace || !canWrite(this.currentWorkspace.role)) return;

    await this.db.doc(`${this.getWorkspaceBasePath()}/flows/${moduleId}`).set({
      moduleId,
      moduleName: flow.moduleName || 'Módulo',
      x: Number(flow.x) || 0,
      y: Number(flow.y) || 0,
      updatedAt: getFirebaseNamespace().firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  }

  async loadFlows() {
    const snapshot = await this.db.collection(`${this.getWorkspaceBasePath()}/flows`).get();
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const module = this.modules.find((item) => item.id === data.moduleId);
      if (!module) continue;
      await this.addFlow(module, Number(data.x) || 0, Number(data.y) || 0, false);
    }
  }

  async removeFlow(moduleId) {
    const flow = this.flows.get(moduleId);
    if (!flow || !canWrite(this.currentWorkspace?.role)) return;

    const confirmed = typeof Swal === 'undefined' || (await Swal.fire({
      title: 'Remover módulo do fluxo?',
      text: flow.moduleName || 'Módulo',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Remover',
      cancelButtonText: 'Cancelar'
    })).isConfirmed;
    if (!confirmed) return;

    flow.element.remove();
    this.flows.delete(moduleId);
    await this.db.doc(`${this.getWorkspaceBasePath()}/flows/${moduleId}`).delete();
  }

  clearCanvas() {
    this.viewport.querySelectorAll('.flow-module').forEach((node) => node.remove());
    this.flows.clear();
  }
}

async function boot() {
  try {
    const designer = new FlowDesigner();
    await designer.init();
    window.flowDesigner = designer;
  } catch (error) {
    console.error('Falha ao inicializar Designer de Fluxos:', error);
    document.getElementById('loading-overlay')?.style.setProperty('display', 'none');
    if (typeof Swal !== 'undefined') Swal.fire('Erro', 'Não foi possível inicializar o Designer de Fluxos.', 'error');
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
