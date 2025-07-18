// ===== FLOW DESIGNER - CONSTRUKTOR =====
// Sistema de design de fluxos com zoom, pan e drag-drop

// Configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyAtuwWlErlNOW_c5BlBE_ktwSSmHGLjN2c",
    authDomain: "prototipoos.firebaseapp.com",
    projectId: "prototipoos",
    storageBucket: "prototipoos.firebasestorage.app",
    messagingSenderId: "969276068015",
    appId: "1:969276068015:web:ef7d8c7bfc6f8d5104445a",
    measurementId: "G-85EK8CECR5"
};

if (firebase.apps.length === 0) {
    firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();

// Configura persistência de autenticação
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

// ===== CLASSE PRINCIPAL DO FLOW DESIGNER =====
class FlowDesigner {
    constructor() {
        // Estado da aplicação
        this.currentUser = null;
        this.currentWorkspace = null;
        this.modules = [];
        this.flows = [];
        
        // Estado do canvas
        this.zoomLevel = 1;
        this.panX = 0;
        this.panY = 0;
        this.isDragging = false;
        this.isSpacePressed = false;
        this.dragStart = { x: 0, y: 0 };
        this.lastPan = { x: 0, y: 0 };
        
        // Elementos DOM
        this.flowCanvas = document.getElementById('flow-canvas');
        this.flowViewport = document.getElementById('flow-viewport');
        this.zoomIndicator = document.getElementById('zoom-indicator');
        
        // Configurações
        this.minZoom = 0.1;
        this.maxZoom = 3;
        this.zoomStep = 0.1;
        
        this.init();
    }
    
    async init() {
        console.log('🎯 Inicializando Flow Designer...');
        
        // Aguardar autenticação
        await this.waitForAuth();
        
        // Configurar eventos
        this.setupEventListeners();
        
        // Carregar workspaces
        await this.loadWorkspaces();
        
        // Ocultar loading
        document.getElementById('loading-overlay').style.display = 'none';
        document.getElementById('app').style.display = 'flex';
        
        console.log('✅ Flow Designer inicializado com sucesso');
    }
    
    waitForAuth() {
        return new Promise((resolve) => {
            // Adiciona um timeout para evitar verificação muito rápida
            setTimeout(() => {
                auth.onAuthStateChanged(async (user) => {
                    if (user) {
                        this.currentUser = user;
                        console.log('👤 Usuário autenticado:', user.email);
                        await this.updateUserInterface();
                        resolve();
                    } else {
                        console.log('❌ Usuário não autenticado, redirecionando...');
                        window.location.href = 'login.html';
                    }
                });
            }, 500); // Espera 500ms para dar tempo do Firebase carregar
        });
    }
    
    async updateUserInterface() {
        const userDisplayName = document.getElementById('user-display-name');
        const userAvatarPreview = document.getElementById('user-avatar-preview');
        const modalAvatarPreview = document.getElementById('modal-avatar-preview');
        
        if (userDisplayName) {
            userDisplayName.textContent = this.currentUser.displayName || this.currentUser.email;
        }
        
        if (userAvatarPreview) {
            userAvatarPreview.src = this.currentUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(this.currentUser.displayName || this.currentUser.email)}&background=6366f1&color=fff`;
        }
        
        if (modalAvatarPreview) {
            modalAvatarPreview.src = this.currentUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(this.currentUser.displayName || this.currentUser.email)}&background=6366f1&color=fff`;
        }
    }
    
    setupEventListeners() {
        // Eventos de zoom e pan no canvas
        this.flowCanvas.addEventListener('wheel', this.handleWheel.bind(this));
        this.flowCanvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.flowCanvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.flowCanvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.flowCanvas.addEventListener('mouseleave', this.handleMouseUp.bind(this));
        
        // Eventos de teclado
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        document.addEventListener('keyup', this.handleKeyUp.bind(this));
        
        // Controles de zoom
        document.getElementById('zoom-in-btn').addEventListener('click', () => this.zoomIn());
        document.getElementById('zoom-out-btn').addEventListener('click', () => this.zoomOut());
        document.getElementById('zoom-reset-btn').addEventListener('click', () => this.resetView());
        
        // Seletor de workspace
        document.getElementById('workspace-select').addEventListener('change', this.handleWorkspaceChange.bind(this));
        
        // Menu de navegação
        this.setupNavigationMenu();
        
        // Logout
        const logoutButton = document.getElementById('logout-button');
        if (logoutButton) {
            logoutButton.addEventListener('click', this.handleLogout.bind(this));
        }
        
        // Sistema de gerenciamento de dicas
        this.setupTipsSystem();
    }
    
    setupNavigationMenu() {
        const menuToggle = document.getElementById('construktor-menu-toggle');
        const menuDropdown = document.getElementById('construktor-menu-dropdown');
        const menuIcon = document.getElementById('construktor-toggle-icon');
        
        if (menuToggle && menuDropdown) {
            menuToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                const isVisible = !menuDropdown.classList.contains('hidden');
                
                if (isVisible) {
                    menuDropdown.classList.add('hidden');
                    menuIcon.style.transform = 'rotate(0deg)';
                } else {
                    menuDropdown.classList.remove('hidden');
                    menuIcon.style.transform = 'rotate(180deg)';
                }
            });
            
            // Fechar ao clicar fora
            document.addEventListener('click', () => {
                menuDropdown.classList.add('hidden');
                menuIcon.style.transform = 'rotate(0deg)';
            });
            
            menuDropdown.addEventListener('click', (e) => e.stopPropagation());
        }
    }
    
    // ===== EVENTOS DE ZOOM E PAN =====
    handleWheel(e) {
        e.preventDefault();
        
        const rect = this.flowCanvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // Calcular posição do mouse no viewport
        const viewportMouseX = (mouseX - this.panX) / this.zoomLevel;
        const viewportMouseY = (mouseY - this.panY) / this.zoomLevel;
        
        // Aplicar zoom
        const zoomDelta = e.deltaY > 0 ? -this.zoomStep : this.zoomStep;
        const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoomLevel + zoomDelta));
        
        if (newZoom !== this.zoomLevel) {
            // Ajustar pan para manter o mouse na mesma posição
            this.panX = mouseX - viewportMouseX * newZoom;
            this.panY = mouseY - viewportMouseY * newZoom;
            this.zoomLevel = newZoom;
            
            this.updateViewport();
        }
    }
    
    handleMouseDown(e) {
        if (e.button === 0 && !e.target.closest('.flow-module')) { // Botão esquerdo
            this.isDragging = true;
            this.dragStart.x = e.clientX;
            this.dragStart.y = e.clientY;
            this.lastPan.x = this.panX;
            this.lastPan.y = this.panY;
            this.flowCanvas.style.cursor = 'grabbing';
        }
    }
    
    handleMouseMove(e) {
        if (this.isDragging) {
            const deltaX = e.clientX - this.dragStart.x;
            const deltaY = e.clientY - this.dragStart.y;
            
            this.panX = this.lastPan.x + deltaX;
            this.panY = this.lastPan.y + deltaY;
            
            this.updateViewport();
        }
    }
    
    handleMouseUp(e) {
        if (this.isDragging) {
            this.isDragging = false;
            this.flowCanvas.style.cursor = 'grab';
        }
    }
    
    handleKeyDown(e) {
        if (e.code === 'Space') {
            e.preventDefault();
            if (!this.isSpacePressed) {
                this.isSpacePressed = true;
                this.resetView();
            }
        }
    }
    
    handleKeyUp(e) {
        if (e.code === 'Space') {
            this.isSpacePressed = false;
        }
    }
    
    // ===== CONTROLES DE ZOOM =====
    zoomIn() {
        const newZoom = Math.min(this.maxZoom, this.zoomLevel + this.zoomStep);
        if (newZoom !== this.zoomLevel) {
            // Zoom centralizando na tela
            const rect = this.flowCanvas.getBoundingClientRect();
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            const viewportCenterX = (centerX - this.panX) / this.zoomLevel;
            const viewportCenterY = (centerY - this.panY) / this.zoomLevel;
            
            this.panX = centerX - viewportCenterX * newZoom;
            this.panY = centerY - viewportCenterY * newZoom;
            this.zoomLevel = newZoom;
            
            this.updateViewport();
        }
    }
    
    zoomOut() {
        const newZoom = Math.max(this.minZoom, this.zoomLevel - this.zoomStep);
        if (newZoom !== this.zoomLevel) {
            // Zoom centralizando na tela
            const rect = this.flowCanvas.getBoundingClientRect();
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            const viewportCenterX = (centerX - this.panX) / this.zoomLevel;
            const viewportCenterY = (centerY - this.panY) / this.zoomLevel;
            
            this.panX = centerX - viewportCenterX * newZoom;
            this.panY = centerY - viewportCenterY * newZoom;
            this.zoomLevel = newZoom;
            
            this.updateViewport();
        }
    }
    
    resetView() {
        this.zoomLevel = 1;
        this.panX = 0;
        this.panY = 0;
        this.updateViewport();
    }
    
    updateViewport() {
        this.flowViewport.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoomLevel})`;
        this.zoomIndicator.textContent = `Zoom: ${Math.round(this.zoomLevel * 100)}%`;
        
        // Atualizar grid de fundo
        const gridSize = 20 * this.zoomLevel;
        this.flowCanvas.style.backgroundSize = `${gridSize}px ${gridSize}px`;
        this.flowCanvas.style.backgroundPosition = `${this.panX}px ${this.panY}px`;
    }
    
    // ===== GERENCIAMENTO DE WORKSPACES =====
    async loadWorkspaces() {
        try {
            const workspacesRef = db.collection('users').doc(this.currentUser.uid).collection('workspaces');
            const snapshot = await workspacesRef.get();
            
            console.log('🔍 Carregando workspaces para usuário:', this.currentUser.uid);
            
            const workspaceSelect = document.getElementById('workspace-select');
            workspaceSelect.innerHTML = '<option value="">Selecione uma área de trabalho...</option>';
            
            if (snapshot.empty) {
                workspaceSelect.innerHTML = '<option value="">Nenhuma área de trabalho encontrada</option>';
                return;
            }
            
            snapshot.forEach(doc => {
                const workspace = doc.data();
                const option = document.createElement('option');
                option.value = doc.id;
                option.textContent = workspace.name || 'Área sem nome';
                workspaceSelect.appendChild(option);
            });
            
            // Selecionar primeira workspace automaticamente
            if (workspaceSelect.children.length > 1) {
                workspaceSelect.selectedIndex = 1;
                this.handleWorkspaceChange();
            }
            
        } catch (error) {
            console.error('❌ Erro ao carregar workspaces:', error);
            Swal.fire('Erro', 'Não foi possível carregar as áreas de trabalho.', 'error');
        }
    }
    
    async handleWorkspaceChange() {
        const workspaceSelect = document.getElementById('workspace-select');
        const workspaceId = workspaceSelect.value;
        
        if (!workspaceId) {
            this.currentWorkspace = null;
            this.clearModules();
            this.clearFlowCanvas();
            return;
        }
        
        this.currentWorkspace = workspaceId;
        await this.loadModules();
        await this.loadFlowPositions();
    }
    
    // ===== GERENCIAMENTO DE MÓDULOS =====
    async loadModules() {
        if (!this.currentWorkspace) return;
        
        try {
            const collectionPath = `users/${this.currentUser.uid}/workspaces/${this.currentWorkspace}/modules`;
            console.log('🔍 Carregando módulos de:', collectionPath);
            const snapshot = await db.collection(collectionPath).orderBy('order').get();
            
            this.modules = [];
            const moduleList = document.getElementById('module-list');
            const noModulesMessage = document.getElementById('no-modules-message');
            
            moduleList.innerHTML = '';
            
            if (snapshot.empty) {
                noModulesMessage.classList.remove('hidden');
                return;
            }
            
            noModulesMessage.classList.add('hidden');
            
            // Carregar entidades para contar por módulo
            const entitiesPath = `users/${this.currentUser.uid}/workspaces/${this.currentWorkspace}/entities`;
            const entitiesSnapshot = await db.collection(entitiesPath).get();
            
            // Criar mapa de contagem de entidades por módulo
            const entityCount = {};
            entitiesSnapshot.forEach(doc => {
                const entity = doc.data();
                if (entity.moduleId) {
                    entityCount[entity.moduleId] = (entityCount[entity.moduleId] || 0) + 1;
                }
            });
            
            snapshot.forEach(doc => {
                const module = { id: doc.id, ...doc.data() };
                module.entitiesCount = entityCount[module.id] || 0;
                this.modules.push(module);
                this.createModuleCard(module);
            });
            
        } catch (error) {
            console.error('❌ Erro ao carregar módulos:', error);
            Swal.fire('Erro', 'Não foi possível carregar os módulos.', 'error');
        }
    }
    
    createModuleCard(module) {
        const moduleList = document.getElementById('module-list');
        
        const moduleCard = document.createElement('div');
        moduleCard.className = 'module-card bg-white p-3 sm:p-3.5 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between cursor-grab transition-all hover:shadow-md hover:border-indigo-200 active:shadow-inner';
        moduleCard.setAttribute('data-module-id', module.id);
        moduleCard.setAttribute('data-module-name', module.name || 'Módulo sem nome');
        moduleCard.draggable = true;
        
        const entitiesCount = module.entitiesCount || 0;
        
        moduleCard.innerHTML = `
            <div class="flex items-center gap-2 sm:gap-3">
                <div class="h-7 w-7 sm:h-8 sm:w-8 rounded-md bg-indigo-100 flex items-center justify-center text-indigo-600">
                    <i class="fa-solid fa-puzzle-piece"></i>
                </div>
                <div>
                    <span class="module-name font-medium text-slate-700 text-sm sm:text-base">${module.name || 'Módulo sem nome'}</span>
                    <p class="text-xs text-slate-500">${entitiesCount} entidades</p>
                </div>
            </div>
            <div class="flex items-center gap-1 sm:gap-2">
                <i class="fa-solid fa-grip-vertical text-slate-400 h-4 w-4 sm:h-5 sm:w-5"></i>
            </div>
        `;
        
        // Eventos de drag
        moduleCard.addEventListener('dragstart', this.handleModuleDragStart.bind(this));
        
        moduleList.appendChild(moduleCard);
    }
    
    handleModuleDragStart(e) {
        const moduleCard = e.target.closest('.module-card');
        const moduleId = moduleCard.getAttribute('data-module-id');
        const moduleName = moduleCard.getAttribute('data-module-name');
        
        e.dataTransfer.setData('text/plain', JSON.stringify({
            moduleId,
            moduleName,
            entitiesCount: moduleCard.querySelector('.text-xs').textContent
        }));
        
        // Visual feedback
        moduleCard.style.opacity = '0.5';
        setTimeout(() => {
            if (moduleCard) moduleCard.style.opacity = '1';
        }, 100);
    }
    
    clearModules() {
        const moduleList = document.getElementById('module-list');
        const noModulesMessage = document.getElementById('no-modules-message');
        
        moduleList.innerHTML = '';
        noModulesMessage.classList.remove('hidden');
        this.modules = [];
    }
    
    clearFlowCanvas() {
        // Limpar todos os módulos do canvas
        const flowModules = this.flowViewport.querySelectorAll('.flow-module');
        flowModules.forEach(module => module.remove());
        this.flows = [];
    }
    
    // ===== GERENCIAMENTO DE FLUXOS =====
    setupFlowDropZone() {
        // Permitir drop na área de fluxos
        this.flowViewport.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
        });
        
        this.flowViewport.addEventListener('drop', this.handleFlowDrop.bind(this));
    }
    
    handleFlowDrop(e) {
        e.preventDefault();
        
        try {
            const data = JSON.parse(e.dataTransfer.getData('text/plain'));
            const rect = this.flowCanvas.getBoundingClientRect();
            
            // Calcular posição no viewport considerando zoom e pan
            const x = (e.clientX - rect.left - this.panX) / this.zoomLevel;
            const y = (e.clientY - rect.top - this.panY) / this.zoomLevel;
            
            this.createFlowModule(data, x, y);
            
        } catch (error) {
            console.error('❌ Erro ao processar drop:', error);
        }
    }
    
    createFlowModule(moduleData, x, y) {
        const template = document.getElementById('flow-module-template');
        const flowModule = template.content.cloneNode(true);
        
        const moduleElement = flowModule.querySelector('.flow-module');
        moduleElement.setAttribute('data-module-id', moduleData.moduleId);
        moduleElement.setAttribute('data-module-name', moduleData.moduleName);
        moduleElement.style.left = `${x}px`;
        moduleElement.style.top = `${y}px`;
        
        // Preencher dados
        moduleElement.querySelector('.module-title').textContent = moduleData.moduleName;
        moduleElement.querySelector('.entities-count').textContent = moduleData.entitiesCount || '0 entidades';
        
        // Configurar evento do botão de remover
        const removeBtn = moduleElement.querySelector('.remove-module-btn');
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.removeFlowModule(moduleElement);
        });
        
        // Configurar drag dentro do canvas
        this.setupModuleDrag(moduleElement);
        
        this.flowViewport.appendChild(moduleElement);
        
        // Adicionar aos fluxos
        const flowItem = {
            id: Date.now().toString(),
            moduleId: moduleData.moduleId,
            moduleName: moduleData.moduleName,
            x: x,
            y: y
        };
        
        this.flows.push(flowItem);
        
        // Salvar posição no Firebase
        this.saveFlowPosition(flowItem);
        
        console.log('✅ Módulo adicionado ao fluxo:', moduleData.moduleName);
    }
    
    setupModuleDrag(moduleElement) {
        let isDragging = false;
        let dragStart = { x: 0, y: 0 };
        let moduleStart = { x: 0, y: 0 };
        
        moduleElement.addEventListener('mousedown', (e) => {
            // Não iniciar drag se clicar no botão de remover
            if (e.target.closest('.remove-module-btn')) {
                return;
            }
            
            if (e.button === 0) { // Botão esquerdo
                e.stopPropagation(); // Impedir pan do canvas
                
                isDragging = true;
                dragStart.x = e.clientX;
                dragStart.y = e.clientY;
                
                const rect = moduleElement.getBoundingClientRect();
                const canvasRect = this.flowCanvas.getBoundingClientRect();
                
                moduleStart.x = (rect.left - canvasRect.left - this.panX) / this.zoomLevel;
                moduleStart.y = (rect.top - canvasRect.top - this.panY) / this.zoomLevel;
                
                moduleElement.classList.add('dragging');
                
                const handleMouseMove = (e) => {
                    if (isDragging) {
                        const deltaX = (e.clientX - dragStart.x) / this.zoomLevel;
                        const deltaY = (e.clientY - dragStart.y) / this.zoomLevel;
                        
                        const newX = moduleStart.x + deltaX;
                        const newY = moduleStart.y + deltaY;
                        
                        moduleElement.style.left = `${newX}px`;
                        moduleElement.style.top = `${newY}px`;
                    }
                };
                
                const handleMouseUp = () => {
                    if (isDragging) {
                        isDragging = false;
                        moduleElement.classList.remove('dragging');
                        
                        // Atualizar posição nos fluxos
                        const moduleId = moduleElement.getAttribute('data-module-id');
                        const flow = this.flows.find(f => f.moduleId === moduleId);
                        if (flow) {
                            flow.x = parseFloat(moduleElement.style.left);
                            flow.y = parseFloat(moduleElement.style.top);
                            
                            // Salvar nova posição no Firebase
                            this.saveFlowPosition(flow);
                        }
                        
                        document.removeEventListener('mousemove', handleMouseMove);
                        document.removeEventListener('mouseup', handleMouseUp);
                    }
                };
                
                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', handleMouseUp);
            }
        });
    }
    
    removeFlowModule(moduleElement) {
        const moduleId = moduleElement.getAttribute('data-module-id');
        const moduleName = moduleElement.getAttribute('data-module-name');
        
        // Confirmar remoção
        Swal.fire({
            title: 'Remover Módulo?',
            text: `Deseja remover "${moduleName}" do fluxo?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Sim, remover',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                // Remover do DOM
                moduleElement.remove();
                
                // Remover do array de fluxos
                const flowToRemove = this.flows.find(flow => flow.moduleId === moduleId);
                this.flows = this.flows.filter(flow => flow.moduleId !== moduleId);
                
                // Remover do Firebase
                if (flowToRemove) {
                    this.removeFlowPosition(flowToRemove.id);
                }
                
                console.log('✅ Módulo removido do fluxo:', moduleName);
                
                Swal.fire({
                    title: 'Removido!',
                    text: `O módulo "${moduleName}" foi removido do fluxo.`,
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                });
            }
        });
    }
    
    // ===== PERSISTÊNCIA DE FLUXOS =====
    async saveFlowPosition(flowItem) {
        if (!this.currentWorkspace || !this.currentUser) return;
        
        try {
            const flowPath = `users/${this.currentUser.uid}/workspaces/${this.currentWorkspace}/flows`;
            await db.collection(flowPath).doc(flowItem.id).set({
                moduleId: flowItem.moduleId,
                moduleName: flowItem.moduleName,
                x: flowItem.x,
                y: flowItem.y,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            console.log('💾 Posição do módulo salva:', flowItem.moduleName);
        } catch (error) {
            console.error('❌ Erro ao salvar posição do módulo:', error);
        }
    }
    
    async loadFlowPositions() {
        if (!this.currentWorkspace || !this.currentUser) return;
        
        try {
            const flowPath = `users/${this.currentUser.uid}/workspaces/${this.currentWorkspace}/flows`;
            const snapshot = await db.collection(flowPath).get();
            
            // Limpar canvas antes de carregar
            this.clearFlowCanvas();
            
            if (snapshot.empty) {
                console.log('📋 Nenhum módulo posicionado encontrado no fluxo');
                return;
            }
            
            console.log('🔄 Carregando posições dos módulos no fluxo...');
            
            snapshot.forEach(doc => {
                const flowData = { id: doc.id, ...doc.data() };
                this.recreateFlowModule(flowData);
            });
            
            console.log('✅ Posições dos módulos carregadas com sucesso');
            
        } catch (error) {
            console.error('❌ Erro ao carregar posições dos módulos:', error);
        }
    }
    
    recreateFlowModule(flowData) {
        const template = document.getElementById('flow-module-template');
        const flowModule = template.content.cloneNode(true);
        
        const moduleElement = flowModule.querySelector('.flow-module');
        moduleElement.setAttribute('data-module-id', flowData.moduleId);
        moduleElement.setAttribute('data-module-name', flowData.moduleName);
        moduleElement.style.left = `${flowData.x}px`;
        moduleElement.style.top = `${flowData.y}px`;
        
        // Buscar informações atualizadas do módulo
        const module = this.modules.find(m => m.id === flowData.moduleId);
        const entitiesCount = module ? `${module.entitiesCount || 0} entidades` : '0 entidades';
        
        // Preencher dados
        moduleElement.querySelector('.module-title').textContent = flowData.moduleName;
        moduleElement.querySelector('.entities-count').textContent = entitiesCount;
        
        // Configurar evento do botão de remover
        const removeBtn = moduleElement.querySelector('.remove-module-btn');
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.removeFlowModule(moduleElement);
        });
        
        // Configurar drag dentro do canvas
        this.setupModuleDrag(moduleElement);
        
        this.flowViewport.appendChild(moduleElement);
        
        // Adicionar aos fluxos em memória
        this.flows.push({
            id: flowData.id,
            moduleId: flowData.moduleId,
            moduleName: flowData.moduleName,
            x: flowData.x,
            y: flowData.y
        });
    }
    
    async removeFlowPosition(flowId) {
        if (!this.currentWorkspace || !this.currentUser) return;
        
        try {
            const flowPath = `users/${this.currentUser.uid}/workspaces/${this.currentWorkspace}/flows`;
            await db.collection(flowPath).doc(flowId).delete();
            
            console.log('🗑️ Posição do módulo removida do Firebase');
        } catch (error) {
            console.error('❌ Erro ao remover posição do módulo:', error);
        }
    }
    
    // ===== SISTEMA DE DICAS =====
    setupTipsSystem() {
        // Carregar estado das dicas do localStorage
        this.loadTipsState();
        
        // Configurar botões de fechar dicas
        const closeButtons = document.querySelectorAll('.close-tip-btn');
        closeButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const tipId = btn.getAttribute('data-tip-id');
                this.hideTip(tipId);
            });
        });
        
        // Configurar botão de ajuda
        const helpButton = document.getElementById('help-button');
        if (helpButton) {
            helpButton.addEventListener('click', () => {
                this.toggleAllTips();
            });
        }
    }
    
    loadTipsState() {
        // Estado padrão das dicas (true = visível, false = oculto)
        const defaultTipsState = {
            'quick-tip': true,
            'flow-instructions': true
        };
        
        // Carregar estado salvo ou usar padrão
        const savedState = localStorage.getItem('flowDesigner_tipsState');
        this.tipsState = savedState ? JSON.parse(savedState) : defaultTipsState;
        
        // Aplicar estado das dicas
        Object.keys(this.tipsState).forEach(tipId => {
            const tipElement = document.getElementById(tipId);
            if (tipElement) {
                if (this.tipsState[tipId]) {
                    tipElement.style.display = 'block';
                } else {
                    tipElement.style.display = 'none';
                }
            }
        });
        
        console.log('🔧 Estado das dicas carregado:', this.tipsState);
    }
    
    saveTipsState() {
        localStorage.setItem('flowDesigner_tipsState', JSON.stringify(this.tipsState));
        console.log('💾 Estado das dicas salvo:', this.tipsState);
    }
    
    hideTip(tipId) {
        const tipElement = document.getElementById(tipId);
        if (tipElement) {
            tipElement.style.display = 'none';
            this.tipsState[tipId] = false;
            this.saveTipsState();
            
            console.log(`✅ Dica "${tipId}" ocultada`);
        }
    }
    
    showTip(tipId) {
        const tipElement = document.getElementById(tipId);
        if (tipElement) {
            tipElement.style.display = 'block';
            this.tipsState[tipId] = true;
            this.saveTipsState();
            
            console.log(`✅ Dica "${tipId}" exibida`);
        }
    }
    
    toggleAllTips() {
        // Verificar se alguma dica está visível
        const anyTipVisible = Object.values(this.tipsState).some(state => state === true);
        
        if (anyTipVisible) {
            // Ocultar todas as dicas
            Object.keys(this.tipsState).forEach(tipId => {
                this.hideTip(tipId);
            });
            
            Swal.fire({
                title: 'Dicas Ocultadas',
                text: 'Todas as dicas foram ocultadas. Clique em "Ajuda" novamente para exibi-las.',
                icon: 'info',
                timer: 2000,
                showConfirmButton: false
            });
        } else {
            // Exibir todas as dicas
            Object.keys(this.tipsState).forEach(tipId => {
                this.showTip(tipId);
            });
            
            Swal.fire({
                title: 'Dicas Exibidas',
                text: 'Todas as dicas foram exibidas. Use os botões ✕ para ocultar individualmente.',
                icon: 'success',
                timer: 2000,
                showConfirmButton: false
            });
        }
    }
    
    // ===== LOGOUT =====
    async handleLogout() {
        try {
            await auth.signOut();
            window.location.href = '../pages/login.html';
        } catch (error) {
            console.error('❌ Erro no logout:', error);
            Swal.fire('Erro', 'Não foi possível fazer logout.', 'error');
        }
    }
}

// ===== INICIALIZAÇÃO =====
document.addEventListener('DOMContentLoaded', () => {
    const flowDesigner = new FlowDesigner();
    
    // Configurar drop zone após inicialização
    setTimeout(() => {
        flowDesigner.setupFlowDropZone();
    }, 1000);
    
    // Expor globalmente para debug
    window.flowDesigner = flowDesigner;
});