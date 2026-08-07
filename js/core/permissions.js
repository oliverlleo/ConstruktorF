export const ROLES = Object.freeze({
  VIEWER: 'viewer',
  EDITOR: 'editor',
  ADMIN: 'admin'
});

const ROLE_RANK = Object.freeze({
  [ROLES.VIEWER]: 1,
  [ROLES.EDITOR]: 2,
  [ROLES.ADMIN]: 3
});

export function normalizeRole(role) {
  return ROLE_RANK[role] ? role : null;
}

export function canRead(role) {
  return Boolean(normalizeRole(role));
}

export function canWrite(role) {
  const normalized = normalizeRole(role);
  return normalized === ROLES.EDITOR || normalized === ROLES.ADMIN;
}

export function canAdmin(role) {
  return normalizeRole(role) === ROLES.ADMIN;
}

export function hasAtLeastRole(role, minimumRole) {
  return (ROLE_RANK[normalizeRole(role)] || 0) >= (ROLE_RANK[normalizeRole(minimumRole)] || Infinity);
}
