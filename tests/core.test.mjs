import test from 'node:test';
import assert from 'node:assert/strict';
import { chunk } from '../js/core/firestore-utils.js';
import { canRead, canWrite, canAdmin, hasAtLeastRole } from '../js/core/permissions.js';
import { escapeHtml } from '../js/core/security.js';

test('chunk divide lotes sem perder itens', () => {
  const source = Array.from({ length: 1001 }, (_, index) => index);
  const result = chunk(source, 400);
  assert.deepEqual(result.map((group) => group.length), [400, 400, 201]);
  assert.deepEqual(result.flat(), source);
});

test('permissões respeitam viewer/editor/admin', () => {
  assert.equal(canRead('viewer'), true);
  assert.equal(canWrite('viewer'), false);
  assert.equal(canWrite('editor'), true);
  assert.equal(canAdmin('editor'), false);
  assert.equal(canAdmin('admin'), true);
  assert.equal(hasAtLeastRole('admin', 'editor'), true);
  assert.equal(hasAtLeastRole('viewer', 'editor'), false);
});

test('escapeHtml neutraliza marcação injetável', () => {
  assert.equal(
    escapeHtml('<img src=x onerror="alert(1)">'),
    '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;'
  );
});
