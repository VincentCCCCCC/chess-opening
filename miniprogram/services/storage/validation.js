const { SCHEMA_VERSION } = require('../../models/index.js');
const { corruptedData, unsupportedSchema } = require('./errors.js');

function assertObject(value, path) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw corruptedData(`${path} must be an object`, { path });
  }
}

function assertArray(value, path) {
  if (!Array.isArray(value)) {
    throw corruptedData(`${path} must be an array`, { path });
  }
}

function assertString(value, path) {
  if (typeof value !== 'string' || !value.trim()) {
    throw corruptedData(`${path} must be a non-empty string`, { path });
  }
}

function assertNumber(value, path) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw corruptedData(`${path} must be a number`, { path });
  }
}

function assertSide(value, path) {
  if (value !== 'white' && value !== 'black') {
    throw corruptedData(`${path} must be white or black`, { path, value });
  }
}

function validateOpening(opening, index) {
  const path = `openings[${index}]`;
  assertObject(opening, path);
  assertString(opening.id, `${path}.id`);
  assertString(opening.name, `${path}.name`);
  assertSide(opening.practiceSide, `${path}.practiceSide`);
  assertArray(opening.tags, `${path}.tags`);
  opening.tags.forEach((tag, tagIndex) => assertString(tag, `${path}.tags[${tagIndex}]`));
  assertString(opening.color, `${path}.color`);
  assertNumber(opening.createdAt, `${path}.createdAt`);
  assertNumber(opening.updatedAt, `${path}.updatedAt`);
}

function validateVariation(variation, index) {
  const path = `variations[${index}]`;
  assertObject(variation, path);
  assertString(variation.id, `${path}.id`);
  assertString(variation.openingId, `${path}.openingId`);
  assertString(variation.name, `${path}.name`);
  if (typeof variation.notes !== 'string') {
    throw corruptedData(`${path}.notes must be a string`, { path: `${path}.notes` });
  }
  assertString(variation.initialFen, `${path}.initialFen`);
  assertArray(variation.moves, `${path}.moves`);
  assertNumber(variation.plyCount, `${path}.plyCount`);
  assertObject(variation.stats, `${path}.stats`);
  assertNumber(variation.stats.practiceCount, `${path}.stats.practiceCount`);
  assertNumber(variation.stats.perfectCount, `${path}.stats.perfectCount`);
  assertNumber(variation.stats.streakPerfect, `${path}.stats.streakPerfect`);
  assertNumber(variation.createdAt, `${path}.createdAt`);
  assertNumber(variation.updatedAt, `${path}.updatedAt`);
}

function validateAppData(data) {
  assertObject(data, 'appData');
  if (data.schemaVersion !== SCHEMA_VERSION) {
    throw unsupportedSchema(data.schemaVersion);
  }
  assertArray(data.openings, 'openings');
  assertArray(data.variations, 'variations');
  assertArray(data.practiceSessions, 'practiceSessions');
  assertObject(data.settings, 'settings');
  if (typeof data.settings.enableHaptics !== 'boolean') {
    throw corruptedData('settings.enableHaptics must be a boolean', { path: 'settings.enableHaptics' });
  }
  assertSide(data.settings.defaultPracticeSide, 'settings.defaultPracticeSide');
  assertNumber(data.createdAt, 'createdAt');
  assertNumber(data.updatedAt, 'updatedAt');

  data.openings.forEach(validateOpening);
  data.variations.forEach(validateVariation);
  return data;
}

module.exports = {
  validateAppData,
};
