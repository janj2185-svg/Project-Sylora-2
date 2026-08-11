/** Content provenance layer — prepared for open standards compatibility. */

export function ensureProvenance(store) {
  store.data.provenanceRecords ??= [];
  return store;
}

export function createProvenanceRecord(store, {
  id,
  contentId,
  contentType,
  creatorId,
  origin = 'sylora',
  creationMethod = 'human',
  aiInvolvement = 'none',
  parentId = null,
  metadata = {}
}, now) {
  ensureProvenance(store);
  const record = {
    id,
    contentId,
    contentType,
    creatorId,
    origin,
    creationMethod,
    aiInvolvement,
    parentId,
    editHistory: [],
    timestamps: { createdAt: now(), updatedAt: now() },
    verification: {
      contentHash: metadata.contentHash || null,
      standard: 'sylora-provenance-v0',
      openStandardReady: true,
      c2paCompatible: false
    },
    metadata
  };
  store.data.provenanceRecords.push(record);
  store.save();
  return record;
}

export function appendEdit(store, contentId, edit, now) {
  ensureProvenance(store);
  const record = store.data.provenanceRecords.find(r => r.contentId === contentId);
  if (!record) return null;
  record.editHistory.push({ ...edit, at: now() });
  record.timestamps.updatedAt = now();
  if (edit.aiInvolvement) record.aiInvolvement = edit.aiInvolvement;
  store.save();
  return record;
}

export function getProvenance(store, contentId) {
  ensureProvenance(store);
  return store.data.provenanceRecords.find(r => r.contentId === contentId) || null;
}
