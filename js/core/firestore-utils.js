export const MAX_SAFE_BATCH_OPERATIONS = 400;

export function chunk(items, size = MAX_SAFE_BATCH_OPERATIONS) {
  if (!Array.isArray(items)) throw new TypeError('items deve ser um array');
  if (!Number.isInteger(size) || size <= 0) throw new RangeError('size deve ser um inteiro positivo');

  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

export async function commitInBatches(db, items, applyOperation, batchSize = MAX_SAFE_BATCH_OPERATIONS) {
  if (!db?.batch) throw new Error('Instância do Firestore inválida.');
  if (typeof applyOperation !== 'function') throw new TypeError('applyOperation deve ser uma função');

  let committed = 0;
  for (const group of chunk(items, batchSize)) {
    const batch = db.batch();
    group.forEach((item, index) => applyOperation(batch, item, committed + index));
    await batch.commit();
    committed += group.length;
  }
  return committed;
}

export async function deleteCollectionDocuments(db, collectionRef, batchSize = MAX_SAFE_BATCH_OPERATIONS) {
  let deleted = 0;

  while (true) {
    const snapshot = await collectionRef.limit(batchSize).get();
    if (snapshot.empty) break;

    const docs = snapshot.docs;
    await commitInBatches(db, docs, (batch, doc) => batch.delete(doc.ref), batchSize);
    deleted += docs.length;

    if (docs.length < batchSize) break;
  }

  return deleted;
}
