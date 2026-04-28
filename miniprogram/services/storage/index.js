const { createDefaultAppData } = require('../../models/index.js');
const { validateAppData } = require('./validation.js');

const STORAGE_KEY = 'chessOpening.appData.v1';
const DEFAULT_OPENING_COLOR = '#2f6f4e';

function getStorageApi() {
  if (typeof wx === 'undefined') {
    throw new Error('wx storage API is not available outside WeChat runtime');
  }
  return wx;
}

function createId(prefix) {
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now().toString(36)}_${random}`;
}

function loadAppData() {
  const storage = getStorageApi();
  const stored = storage.getStorageSync(STORAGE_KEY);
  if (!stored) {
    const data = createDefaultAppData();
    storage.setStorageSync(STORAGE_KEY, data);
    return data;
  }

  return validateAppData(stored);
}

function saveAppData(appData) {
  const storage = getStorageApi();
  const nextData = Object.assign({}, appData, { updatedAt: Date.now() });
  validateAppData(nextData);
  storage.setStorageSync(STORAGE_KEY, nextData);
  return nextData;
}

function resetAppData() {
  return saveAppData(createDefaultAppData());
}

function listOpenings() {
  return loadAppData().openings;
}

function createOpening(input) {
  const data = loadAppData();
  const now = Date.now();
  const name = input && typeof input.name === 'string' ? input.name.trim() : '';
  const opening = {
    id: createId('opening'),
    name: name || `开局 ${data.openings.length + 1}`,
    practiceSide: input && input.practiceSide === 'black' ? 'black' : 'white',
    tags: Array.isArray(input && input.tags) ? input.tags.filter(Boolean).map(String) : [],
    color: input && input.color ? String(input.color) : DEFAULT_OPENING_COLOR,
    createdAt: now,
    updatedAt: now,
  };

  data.openings.push(opening);
  saveAppData(data);
  return opening;
}

function updateOpening(openingId, patch) {
  patch = patch || {};
  const data = loadAppData();
  const opening = data.openings.find((item) => item.id === openingId);
  if (!opening) return null;

  if (patch.name !== undefined) {
    const name = String(patch.name).trim();
    if (name) opening.name = name;
  }
  if (patch.practiceSide === 'white' || patch.practiceSide === 'black') {
    opening.practiceSide = patch.practiceSide;
  }
  if (Array.isArray(patch.tags)) {
    opening.tags = patch.tags.filter(Boolean).map(String);
  }
  if (patch.color) opening.color = String(patch.color);
  opening.updatedAt = Date.now();

  saveAppData(data);
  return opening;
}

function deleteOpening(openingId) {
  const data = loadAppData();
  const beforeCount = data.openings.length;
  data.openings = data.openings.filter((opening) => opening.id !== openingId);
  if (data.openings.length === beforeCount) return false;

  const removedVariationIds = new Set(
    data.variations
      .filter((variation) => variation.openingId === openingId)
      .map((variation) => variation.id)
  );
  data.variations = data.variations.filter((variation) => variation.openingId !== openingId);
  data.practiceSessions = data.practiceSessions
    .map((session) => {
      if (session.openingId === openingId) return null;
      return Object.assign({}, session, {
        variationIds: session.variationIds.filter((id) => !removedVariationIds.has(id)),
        results: session.results.filter((result) => !removedVariationIds.has(result.variationId)),
      });
    })
    .filter(Boolean);

  saveAppData(data);
  return true;
}

function runOpeningCrudSmokeTest() {
  const created = createOpening({
    name: 'Phase 2 测试开局',
    practiceSide: 'black',
    tags: ['debug'],
  });
  const updated = updateOpening(created.id, { name: 'Phase 2 已更新开局', tags: ['debug', 'updated'] });
  const countAfterCreate = listOpenings().length;
  const deleted = deleteOpening(created.id);
  const countAfterDelete = listOpenings().length;

  return {
    ok: Boolean(created && updated && deleted),
    createdId: created.id,
    countAfterCreate,
    countAfterDelete,
  };
}

module.exports = {
  STORAGE_KEY,
  loadAppData,
  saveAppData,
  resetAppData,
  listOpenings,
  createOpening,
  updateOpening,
  deleteOpening,
  runOpeningCrudSmokeTest,
};
