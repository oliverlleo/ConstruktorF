import { getUsuarioId, getUsuarioEmail } from './autenticacao.js';
import { showError, showSuccess, showLoading, hideLoading } from './ui.js';
import { getFirebaseNamespace } from './core/firebase-app.js';
import { commitInBatches, deleteCollectionDocuments } from './core/firestore-utils.js';

let db = null;
let allEntities = [];
let modulesOrder = [];
let userPreferences = {};
let sharedResources = [];

function assertDb() {
  if (!db) throw new Error('Banco de dados não inicializado.');
}

function requireCurrentUserId() {
  const userId = getUsuarioId();
  if (!userId) throw new Error('Usuário não autenticado.');
  return userId;
}

function resolveOwnerId(ownerId = null) {
  return ownerId || requireCurrentUserId();
}

function workspacePath(workspaceId = 'default', ownerId = null) {
  return `users/${resolveOwnerId(ownerId)}/workspaces/${workspaceId}`;
}

function entitiesPath(workspaceId = 'default', ownerId = null) {
  return `${workspacePath(workspaceId, ownerId)}/entities`;
}

function modulesPath(workspaceId = 'default', ownerId = null) {
  return `${workspacePath(workspaceId, ownerId)}/modules`;
}

function recordsPath(entityId, workspaceId = 'default', ownerId = null) {
  return `${entitiesPath(workspaceId, ownerId)}/${entityId}/records`;
}

function serverTimestamp() {
  return getFirebaseNamespace().firestore.FieldValue.serverTimestamp();
}

export async function initDatabase(firebaseOrFirestore) {
  try {
    db = typeof firebaseOrFirestore?.collection === 'function'
      ? firebaseOrFirestore
      : firebaseOrFirestore?.firestore?.();

    assertDb();
    await Promise.all([loadUserPreferences(), loadSharedResources()]);
  } catch (error) {
    console.error('Erro ao inicializar banco de dados:', error);
    showError('Erro de Conexão', 'Não foi possível conectar ao banco de dados.');
    throw error;
  }
}

export async function loadAllEntities(workspaceId = 'default', ownerId = null) {
  assertDb();
  const path = entitiesPath(workspaceId, ownerId);
  try {
    const snapshot = await db.collection(path).get();
    const entities = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    allEntities = entities;
    return entities;
  } catch (error) {
    console.error(`Erro ao carregar entidades de ${path}:`, error);
    showError('Erro de Dados', 'Não foi possível carregar as entidades. Verifique as permissões.');
    throw error;
  }
}

export function getEntities() {
  return allEntities;
}

export async function loadAndRenderModules(renderCallback, workspaceId = 'default', ownerId = null) {
  assertDb();
  const path = modulesPath(workspaceId, ownerId);

  try {
    let snapshot;
    try {
      snapshot = await db.collection(path).orderBy('order').get();
    } catch (orderError) {
      console.warn('Falha ao ordenar módulos pelo Firestore; aplicando ordenação local.', orderError);
      snapshot = await db.collection(path).get();
    }

    const modules = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER));

    modulesOrder = modules.map((module) => module.id);
    if (typeof renderCallback === 'function') modules.forEach(renderCallback);
    return modules;
  } catch (error) {
    console.error(`Erro ao carregar módulos de ${path}:`, error);
    showError('Erro de Dados', 'Não foi possível carregar os módulos.');
    throw error;
  }
}

export async function createEntity(entityData, workspaceId = 'default', ownerId = null) {
  assertDb();
  showLoading('Criando entidade...');
  try {
    const data = {
      name: String(entityData?.name || 'Nova Entidade').trim(),
      icon: entityData?.icon || 'box',
      ...entityData,
      attributes: Array.isArray(entityData?.attributes) ? entityData.attributes : [],
      moduleId: entityData?.moduleId || null,
      createdAt: entityData?.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const ref = await db.collection(entitiesPath(workspaceId, ownerId)).add(data);
    if (!ownerId || ownerId === getUsuarioId()) allEntities.push({ id: ref.id, ...data });
    return ref.id;
  } catch (error) {
    console.error('Erro ao criar entidade:', error);
    showError('Erro ao Criar', 'Não foi possível criar a entidade.');
    throw error;
  } finally {
    hideLoading();
  }
}

export async function createModule(name, workspaceId = 'default', ownerId = null) {
  assertDb();
  showLoading('Criando módulo...');
  try {
    const path = modulesPath(workspaceId, ownerId);
    const snapshot = await db.collection(path).get();
    const currentOrders = snapshot.docs.map((doc) => Number(doc.data().order)).filter(Number.isFinite);
    const nextOrder = currentOrders.length ? Math.max(...currentOrders) + 1 : 0;

    const ref = await db.collection(path).add({
      name: String(name || 'Novo Módulo').trim(),
      order: nextOrder,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    if (!ownerId || ownerId === getUsuarioId()) modulesOrder.push(ref.id);
    return ref.id;
  } catch (error) {
    console.error('Erro ao criar módulo:', error);
    showError('Erro ao Criar', 'Não foi possível criar o módulo.');
    throw error;
  } finally {
    hideLoading();
  }
}

export async function saveEntityToModule(moduleId, entityId, _entityName, workspaceId = 'default', ownerId = null) {
  assertDb();
  const ref = db.doc(`${entitiesPath(workspaceId, ownerId)}/${entityId}`);
  await ref.update({ moduleId: moduleId || null, updatedAt: serverTimestamp() });
  const local = allEntities.find((entity) => entity.id === entityId);
  if (local) local.moduleId = moduleId || null;
}

export async function moveEntityToModule(entityId, targetModuleId, workspaceId = 'default', ownerId = null) {
  return saveEntityToModule(targetModuleId, entityId, null, workspaceId, ownerId);
}

export async function deleteEntityFromModule(_moduleId, entityId, workspaceId = 'default', ownerId = null) {
  return saveEntityToModule(null, entityId, null, workspaceId, ownerId);
}

export async function copyEntityToModule(sourceEntityId, targetModuleId, workspaceId = 'default', ownerId = null) {
  assertDb();
  showLoading('Copiando entidade e dados...');

  try {
    const path = entitiesPath(workspaceId, ownerId);
    const sourceRef = db.doc(`${path}/${sourceEntityId}`);
    const sourceSnapshot = await sourceRef.get();
    if (!sourceSnapshot.exists) throw new Error('Entidade de origem não encontrada.');

    const sourceData = sourceSnapshot.data();
    const newEntityData = {
      ...sourceData,
      moduleId: targetModuleId || null,
      name: `${sourceData.name || 'Entidade'} (Cópia)`,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const newEntityRef = await db.collection(path).add(newEntityData);
    const recordsSnapshot = await sourceRef.collection('records').get();

    await commitInBatches(db, recordsSnapshot.docs, (batch, sourceRecord) => {
      batch.set(newEntityRef.collection('records').doc(), {
        ...sourceRecord.data(),
        copiedAt: serverTimestamp()
      });
    });

    if (!ownerId || ownerId === getUsuarioId()) {
      allEntities.push({ id: newEntityRef.id, ...newEntityData });
    }

    showSuccess('Copiado!', 'A entidade e seus registros foram copiados.');
    return { id: newEntityRef.id, name: newEntityData.name, icon: newEntityData.icon };
  } catch (error) {
    console.error('Erro ao copiar entidade:', error);
    showError('Erro ao Copiar', 'Não foi possível copiar a entidade e seus dados.');
    throw error;
  } finally {
    hideLoading();
  }
}

export async function deleteEntity(entityId, workspaceId = 'default', ownerId = null) {
  assertDb();
  showLoading('Excluindo entidade...');
  try {
    const entityRef = db.doc(`${entitiesPath(workspaceId, ownerId)}/${entityId}`);
    await deleteCollectionDocuments(db, entityRef.collection('records'));
    await entityRef.delete();
    if (!ownerId || ownerId === getUsuarioId()) allEntities = allEntities.filter((entity) => entity.id !== entityId);
  } catch (error) {
    console.error('Erro ao excluir entidade:', error);
    showError('Erro ao Excluir', 'Não foi possível excluir a entidade.');
    throw error;
  } finally {
    hideLoading();
  }
}

export async function deleteModule(moduleId, workspaceId = 'default', ownerId = null) {
  assertDb();
  showLoading('Excluindo módulo...');
  try {
    const path = entitiesPath(workspaceId, ownerId);
    const snapshot = await db.collection(path).where('moduleId', '==', moduleId).get();
    await commitInBatches(db, snapshot.docs, (batch, doc) => {
      batch.update(doc.ref, { moduleId: null, updatedAt: serverTimestamp() });
    });

    await db.doc(`${modulesPath(workspaceId, ownerId)}/${moduleId}`).delete();
    modulesOrder = modulesOrder.filter((id) => id !== moduleId);
    allEntities.forEach((entity) => {
      if (entity.moduleId === moduleId) entity.moduleId = null;
    });
  } catch (error) {
    console.error('Erro ao excluir módulo:', error);
    showError('Erro ao Excluir', 'Não foi possível excluir o módulo.');
    throw error;
  } finally {
    hideLoading();
  }
}

export async function saveEntityStructure(_moduleId, entityId, entityName, attributes, workspaceId = 'default', ownerId = null) {
  assertDb();
  showLoading('Salvando estrutura...');
  try {
    const ref = db.doc(`${entitiesPath(workspaceId, ownerId)}/${entityId}`);
    await ref.update({
      name: String(entityName || '').trim(),
      attributes: Array.isArray(attributes) ? attributes : [],
      updatedAt: serverTimestamp()
    });

    const local = allEntities.find((entity) => entity.id === entityId);
    if (local) {
      local.name = String(entityName || '').trim();
      local.attributes = Array.isArray(attributes) ? attributes : [];
    }
  } catch (error) {
    console.error('Erro ao salvar estrutura:', error);
    showError('Erro ao Salvar', 'Não foi possível salvar a estrutura da entidade.');
    throw error;
  } finally {
    hideLoading();
  }
}

export async function saveSubEntityStructure(_moduleId, entityId, parentFieldId, attributes, workspaceId = 'default', ownerId = null) {
  assertDb();
  showLoading('Salvando estrutura...');
  try {
    const ref = db.doc(`${entitiesPath(workspaceId, ownerId)}/${entityId}`);
    const snapshot = await ref.get();
    if (!snapshot.exists) throw new Error('Entidade não encontrada.');

    const entityData = snapshot.data();
    const entityAttributes = Array.isArray(entityData.attributes) ? [...entityData.attributes] : [];
    const index = entityAttributes.findIndex((attribute) => attribute.id === parentFieldId);
    if (index < 0) throw new Error('Campo pai não encontrado.');

    entityAttributes[index] = {
      ...entityAttributes[index],
      subSchema: {
        ...(entityAttributes[index].subSchema || {}),
        attributes: Array.isArray(attributes) ? attributes : []
      }
    };

    await ref.update({ attributes: entityAttributes, updatedAt: serverTimestamp() });
  } catch (error) {
    console.error('Erro ao salvar sub-entidade:', error);
    showError('Erro ao Salvar', 'Não foi possível salvar a estrutura da sub-entidade.');
    throw error;
  } finally {
    hideLoading();
  }
}

export async function saveModulesOrder(orderArray, workspaceId = 'default', ownerId = null) {
  assertDb();
  const ids = Array.isArray(orderArray) ? orderArray.filter(Boolean) : [];
  const path = modulesPath(workspaceId, ownerId);

  await commitInBatches(db, ids, (batch, moduleId, index) => {
    batch.update(db.doc(`${path}/${moduleId}`), { order: index, updatedAt: serverTimestamp() });
  });

  if (!ownerId || ownerId === getUsuarioId()) modulesOrder = [...ids];
}

export function getModulesOrder() {
  return [...modulesOrder];
}

export async function loadUserPreferences() {
  assertDb();
  const userId = getUsuarioId();
  if (!userId) return {};

  try {
    const snapshot = await db.collection(`users/${userId}/preferences`).get();
    userPreferences = {};
    snapshot.docs.forEach((doc) => { userPreferences[doc.id] = doc.data().value; });
    return { ...userPreferences };
  } catch (error) {
    console.warn('Não foi possível carregar preferências do Firestore:', error);
    return {};
  }
}

export async function saveUserPreference(key, value) {
  const userId = getUsuarioId();
  userPreferences[key] = value;

  try {
    if (db && userId) await db.doc(`users/${userId}/preferences/${key}`).set({ value, updatedAt: serverTimestamp() });
  } catch (error) {
    console.warn(`Preferência ${key} salva apenas localmente:`, error);
  }

  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn('localStorage indisponível:', error);
  }
}

export function getUserPreference(key, defaultValue = null) {
  if (Object.prototype.hasOwnProperty.call(userPreferences, key)) return userPreferences[key];
  try {
    const stored = localStorage.getItem(key);
    return stored === null ? defaultValue : JSON.parse(stored);
  } catch {
    return defaultValue;
  }
}

export async function saveEntityData(_moduleId, entityId, data, workspaceId = 'default', ownerId = null) {
  assertDb();
  showLoading('Salvando dados...');
  try {
    const userId = requireCurrentUserId();
    const ref = await db.collection(recordsPath(entityId, workspaceId, ownerId)).add({
      ...(data || {}),
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
      created_by: userId,
      last_edited_by: userId
    });
    return ref.id;
  } catch (error) {
    console.error('Erro ao salvar dados:', error);
    showError('Erro ao Salvar', 'Não foi possível salvar os dados.');
    throw error;
  } finally {
    hideLoading();
  }
}

export async function updateEntityData(_moduleId, entityId, recordId, data, workspaceId = 'default', ownerId = null) {
  assertDb();
  showLoading('Atualizando dados...');
  try {
    const userId = requireCurrentUserId();
    await db.doc(`${recordsPath(entityId, workspaceId, ownerId)}/${recordId}`).update({
      ...(data || {}),
      updated_at: serverTimestamp(),
      last_edited_by: userId
    });
  } catch (error) {
    console.error('Erro ao atualizar dados:', error);
    showError('Erro ao Atualizar', 'Não foi possível atualizar os dados.');
    throw error;
  } finally {
    hideLoading();
  }
}

export async function loadEntityData(_moduleId, entityId, workspaceId = 'default', ownerId = null) {
  assertDb();
  try {
    const snapshot = await db.collection(recordsPath(entityId, workspaceId, ownerId)).get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Erro ao carregar dados:', error);
    showError('Erro ao Carregar', 'Não foi possível carregar os dados.');
    throw error;
  }
}

export async function deleteEntityRecord(_moduleId, entityId, recordId, workspaceId = 'default', ownerId = null) {
  assertDb();
  showLoading('Excluindo registro...');
  try {
    await db.doc(`${recordsPath(entityId, workspaceId, ownerId)}/${recordId}`).delete();
  } catch (error) {
    console.error('Erro ao excluir registro:', error);
    showError('Erro ao Excluir', 'Não foi possível excluir o registro.');
    throw error;
  } finally {
    hideLoading();
  }
}

export async function loadSharedResources() {
  if (!db) return [];
  const userId = getUsuarioId();
  if (!userId) return [];

  try {
    const accessSnapshot = await db.doc(`accessControl/${userId}`).get();
    if (!accessSnapshot.exists) {
      sharedResources = [];
      return [];
    }

    const access = accessSnapshot.data() || {};
    const resourceIds = Object.keys(access).filter((key) => key !== 'updatedAt' && typeof access[key] === 'string');
    const resources = await Promise.all(resourceIds.map(async (resourceId) => {
      try {
        const snapshot = await db.doc(`sharedWorkspaces/${resourceId}`).get();
        if (!snapshot.exists) return null;
        return { id: resourceId, ...snapshot.data(), role: access[resourceId], type: 'workspace' };
      } catch (error) {
        console.warn(`Falha ao carregar recurso compartilhado ${resourceId}:`, error);
        return null;
      }
    }));

    sharedResources = resources.filter(Boolean);
    return [...sharedResources];
  } catch (error) {
    console.warn('Erro ao carregar recursos compartilhados:', error);
    sharedResources = [];
    return [];
  }
}

export function getSharedResources() {
  return [...sharedResources];
}

export async function checkResourceAccess(resourceId) {
  if (!db) return null;
  const userId = getUsuarioId();
  if (!userId || !resourceId) return null;
  try {
    const snapshot = await db.doc(`accessControl/${userId}`).get();
    return snapshot.exists ? snapshot.data()?.[resourceId] || null : null;
  } catch {
    return null;
  }
}

export async function loadSharedUserModules(ownerId, workspaceId = 'default') {
  assertDb();
  if (!ownerId) return [];
  try {
    const snapshot = await db.collection(modulesPath(workspaceId, ownerId)).get();
    return snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data(), isShared: true, ownerId }))
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  } catch (error) {
    console.error('Erro ao carregar módulos compartilhados:', error);
    return [];
  }
}

export async function loadSharedUserEntities(ownerId, workspaceId = 'default') {
  assertDb();
  if (!ownerId) return [];
  try {
    const snapshot = await db.collection(entitiesPath(workspaceId, ownerId)).get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data(), isShared: true, ownerId }));
  } catch (error) {
    console.error('Erro ao carregar entidades compartilhadas:', error);
    return [];
  }
}

export async function loadSharedModuleSchemas(ownerId, workspaceId = 'default', moduleId) {
  const entities = await loadSharedUserEntities(ownerId, workspaceId);
  return entities
    .filter((entity) => entity.moduleId === moduleId)
    .reduce((result, entity) => {
      result[entity.id] = { name: entity.name, attributes: entity.attributes || [] };
      return result;
    }, {});
}

export function getDatabaseInstance() {
  return db;
}

export function getCurrentUserEmail() {
  return getUsuarioEmail();
}
