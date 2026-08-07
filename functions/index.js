const { onDocumentUpdated, onDocumentDeleted, onDocumentWritten } = require('firebase-functions/v2/firestore');
const { logger } = require('firebase-functions');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

initializeApp();
const db = getFirestore();

const VALID_ROLES = new Set(['viewer', 'editor', 'admin']);

function isWorkspaceInvite(invite) {
  return invite?.resourceType === 'workspace' && Boolean(invite.resourceId) && Boolean(invite.fromUserId);
}

async function getOwnerName(ownerId, fallback = 'Usuário') {
  const profile = await db.doc(`users/${ownerId}`).get();
  return profile.exists ? profile.data()?.displayName || fallback : fallback;
}

async function syncAcceptedInvite(invite) {
  if (!isWorkspaceInvite(invite) || !invite.toUserId || !VALID_ROLES.has(invite.role)) return;

  const workspaceRef = db.doc(`users/${invite.fromUserId}/workspaces/${invite.resourceId}`);
  const workspace = await workspaceRef.get();
  if (!workspace.exists) {
    logger.warn('Workspace do convite não encontrado', { resourceId: invite.resourceId, ownerId: invite.fromUserId });
    return;
  }

  const ownerName = invite.fromUserName || await getOwnerName(invite.fromUserId);
  const batch = db.batch();
  batch.set(db.doc(`sharedWorkspaces/${invite.resourceId}`), {
    ownerId: invite.fromUserId,
    ownerName,
    name: workspace.data()?.name || invite.resourceName || 'Área compartilhada',
    updatedAt: FieldValue.serverTimestamp()
  }, { merge: true });
  batch.set(db.doc(`accessControl/${invite.toUserId}`), {
    [invite.resourceId]: invite.role,
    updatedAt: FieldValue.serverTimestamp()
  }, { merge: true });
  await batch.commit();
}

async function removeInviteAccess(invite) {
  if (!isWorkspaceInvite(invite) || !invite.toUserId) return;

  const accessRef = db.doc(`accessControl/${invite.toUserId}`);
  const access = await accessRef.get();
  if (!access.exists) return;

  await accessRef.update({
    [invite.resourceId]: FieldValue.delete(),
    updatedAt: FieldValue.serverTimestamp()
  });
}

exports.onInvitationUpdated = onDocumentUpdated('invitations/{inviteId}', async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (!before || !after || !isWorkspaceInvite(after)) return;

  if (after.status === 'accepted') {
    const needsSync = before.status !== 'accepted' || before.role !== after.role || before.toUserId !== after.toUserId;
    if (needsSync) await syncAcceptedInvite(after);
    return;
  }

  if (before.status === 'accepted' || ['revoked', 'canceled', 'declined'].includes(after.status)) {
    await removeInviteAccess(after.toUserId ? after : before);
  }
});

exports.onInvitationDeleted = onDocumentDeleted('invitations/{inviteId}', async (event) => {
  const invite = event.data?.data();
  if (invite?.status === 'accepted') await removeInviteAccess(invite);
});

exports.onWorkspaceWritten = onDocumentWritten('users/{ownerId}/workspaces/{workspaceId}', async (event) => {
  const { ownerId, workspaceId } = event.params;
  const after = event.data?.after;
  const sharedRef = db.doc(`sharedWorkspaces/${workspaceId}`);
  const shared = await sharedRef.get();

  if (!after?.exists) {
    if (shared.exists && shared.data()?.ownerId === ownerId) await sharedRef.delete();
    return;
  }

  if (!shared.exists || shared.data()?.ownerId !== ownerId) return;
  await sharedRef.set({
    name: after.data()?.name || 'Área compartilhada',
    updatedAt: FieldValue.serverTimestamp()
  }, { merge: true });
});
