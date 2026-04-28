const {
  STANDARD_INITIAL_FEN,
  createDefaultAppData,
  createDefaultVariationStats,
} = require('../../models/index.js');
const { validateAppData } = require('./validation.js');
const chess = require('../chess/index.js');

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
    initialFen: input && input.initialFen ? String(input.initialFen) : STANDARD_INITIAL_FEN,
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
  if (patch.initialFen) {
    opening.initialFen = String(patch.initialFen);
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

function listVariations(openingId) {
  const variations = loadAppData().variations;
  return openingId
    ? variations.filter((variation) => variation.openingId === openingId)
    : variations;
}

function cloneMoves(moves) {
  return (Array.isArray(moves) ? moves : []).map((move) => {
    const cloned = {
      ply: move.ply,
      side: move.side,
      from: move.from,
      to: move.to,
      san: move.san,
      fenAfter: move.fenAfter,
    };
    if (move.promotion) cloned.promotion = move.promotion;
    return cloned;
  });
}

function createVariation(input) {
  input = input || {};
  const data = loadAppData();
  const opening = data.openings.find((item) => item.id === input.openingId);
  if (!opening) return null;

  const moves = cloneMoves(input.moves);
  if (!moves.length) return null;

  const initialFen = input.initialFen || opening.initialFen || STANDARD_INITIAL_FEN;
  chess.assertLegalVariation(initialFen, moves);

  const now = Date.now();
  const existingCount = data.variations.filter((variation) => variation.openingId === opening.id).length;
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  const variation = {
    id: createId('variation'),
    openingId: opening.id,
    name: name || `变例 ${existingCount + 1}`,
    notes: typeof input.notes === 'string' ? input.notes : '',
    initialFen,
    moves,
    plyCount: moves.length,
    stats: createDefaultVariationStats(),
    createdAt: now,
    updatedAt: now,
  };

  data.variations.push(variation);
  opening.updatedAt = now;
  saveAppData(data);
  return variation;
}

function deleteVariation(variationId) {
  const data = loadAppData();
  const variation = data.variations.find((item) => item.id === variationId);
  if (!variation) return false;

  data.variations = data.variations.filter((item) => item.id !== variationId);
  data.practiceSessions = data.practiceSessions.map((session) => Object.assign({}, session, {
    variationIds: session.variationIds.filter((id) => id !== variationId),
    results: session.results.filter((result) => result.variationId !== variationId),
  }));

  const opening = data.openings.find((item) => item.id === variation.openingId);
  if (opening) opening.updatedAt = Date.now();
  saveAppData(data);
  return true;
}

function recordPracticeResult(input) {
  input = input || {};
  const data = loadAppData();
  const now = Date.now();
  const opening = data.openings.find((item) => item.id === input.openingId);
  const variation = data.variations.find((item) => item.id === input.variationId);
  if (!opening || !variation) return null;

  const mistakeCount = Number(input.mistakeCount) || 0;
  const status = mistakeCount ? 'completed_with_errors' : 'perfect';
  variation.stats.practiceCount += 1;
  variation.stats.lastPracticedAt = now;
  variation.stats.lastResult = status;
  variation.stats.lastMistakePly = input.lastMistakePly;
  if (status === 'perfect') {
    variation.stats.perfectCount += 1;
    variation.stats.streakPerfect += 1;
  } else {
    variation.stats.streakPerfect = 0;
  }
  variation.updatedAt = now;

  opening.lastPracticedAt = now;
  opening.updatedAt = now;

  const result = {
    variationId: variation.id,
    status,
    mistakeCount,
    durationMs: Number(input.durationMs) || 0,
    mistakes: Array.isArray(input.mistakes) ? input.mistakes : [],
  };
  data.practiceSessions.push({
    id: createId('session'),
    openingId: opening.id,
    mode: input.mode || 'single',
    variationIds: [variation.id],
    results: [result],
    startedAt: input.startedAt || now,
    completedAt: now,
  });

  saveAppData(data);
  return result;
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
  listVariations,
  createVariation,
  deleteVariation,
  recordPracticeResult,
  runOpeningCrudSmokeTest,
};
